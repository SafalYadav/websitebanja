// src/app/api/agent/live-token/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const rawKey =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.GOOGLE_GENAI_API_KEY;
    if (!rawKey) {
      return NextResponse.json(
        { success: false, error: 'GEMINI_API_KEY is not configured on the server.' },
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
      throw new Error(`Gemini AuthToken service HTTP ${tokenRes.status}: ${errText}`);
    }

    const tokenData = await tokenRes.json();
    if (!tokenData?.name) {
      throw new Error(`Failed to obtain token name: ${JSON.stringify(tokenData)}`);
    }

    return NextResponse.json({
      success: true,
      token: tokenData.name,
      model: targetModel,
      voice: voiceName,
      sampleRate: 24000,
      expireTime,
    });
    const errorMsg = err instanceof Error ? err.message : 'Unknown error generating Live API token';
    console.error('[API /api/agent/live-token Error]:', errorMsg);
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
