// src/app/api/agent/live-token/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { checkMemoryRateLimit } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const { success: withinRateLimit } = checkMemoryRateLimit(`live_token_${ip}`, 10, 60 * 1000);
    if (!withinRateLimit) {
      return NextResponse.json(
        { success: false, error: 'Too many token requests. Please wait a moment.' },
        { status: 429 }
      );
    }

    const rawKey =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.GOOGLE_GENAI_API_KEY;
    if (!rawKey) {
      return NextResponse.json(
        { success: false, error: 'Gemini Live API is not configured on the server.' },
        { status: 503 }
      );
    }

    const apiKey = rawKey.trim().replace(/^["']|["']$/g, '').replace(/^Bearer\s+/i, '');
    const targetModel = process.env.GEMINI_LIVE_MODEL || 'gemini-3.1-flash-live-preview';
    const voiceName = process.env.GEMINI_TTS_VOICE || 'Aoede';

    // Ephemeral token expires in 30 minutes, must be used to open a session within 2 minutes
    const now = Date.now();
    const expireTime = new Date(now + 30 * 60 * 1000).toISOString();
    const newSessionExpireTime = new Date(now + 2 * 60 * 1000).toISOString();

    const formattedModel = targetModel.startsWith('models/') ? targetModel : `models/${targetModel}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/auth_tokens?key=${encodeURIComponent(apiKey)}`;
    const tokenRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        uses: 1,
        expireTime,
        newSessionExpireTime,
        bidiGenerateContentSetup: {
          model: formattedModel,
        },
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error(`[API /api/agent/live-token] Gemini AuthToken service HTTP ${tokenRes.status}: ${errText}`);
      return NextResponse.json(
        { success: false, error: 'Failed to negotiate ephemeral session token.' },
        { status: 502 }
      );
    }

    const tokenData = await tokenRes.json();
    if (!tokenData?.name) {
      console.error('[API /api/agent/live-token] Missing token name in response:', tokenData);
      return NextResponse.json(
        { success: false, error: 'Unexpected authentication response format.' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      token: tokenData.name,
      model: targetModel,
      voice: voiceName,
      sampleRate: 24000,
      expireTime,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error generating Live API token';
    console.error('[API /api/agent/live-token Error]:', errorMsg);
    return NextResponse.json(
      { success: false, error: 'Failed to generate session token.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { success: false, error: 'Method Not Allowed. Use POST to obtain a Live API token.' },
    { status: 405, headers: { Allow: 'POST' } }
  );
}
