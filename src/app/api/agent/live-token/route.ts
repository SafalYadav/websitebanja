// src/app/api/agent/live-token/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Modality } from '@google/genai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'GEMINI_API_KEY is not configured on the server.' },
        { status: 503 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });
    const targetModel = process.env.GEMINI_LIVE_MODEL || 'gemini-3.1-flash-live-preview';
    const voiceName = process.env.GEMINI_TTS_VOICE || 'Aoede';

    // Ephemeral token expires in 30 minutes, must be used to open a session within 2 minutes
    const now = Date.now();
    const expireTime = new Date(now + 30 * 60 * 1000).toISOString();
    const newSessionExpireTime = new Date(now + 2 * 60 * 1000).toISOString();

    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime,
        newSessionExpireTime,
        liveConnectConstraints: {
          model: targetModel,
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName,
                },
              },
            },
          },
        },
      },
    });

    if (!token?.name) {
      throw new Error('Failed to obtain token name from Gemini AuthToken service');
    }

    return NextResponse.json({
      success: true,
      token: token.name,
      model: targetModel,
      voice: voiceName,
      sampleRate: 24000,
      expireTime,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error generating Live API token';
    console.error('[API /api/agent/live-token Error]:', errorMsg);
    return NextResponse.json(
      { success: false, error: 'Failed to create ephemeral session token.' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
