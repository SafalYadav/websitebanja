// src/app/api/agent/voice/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { generateGeminiSpeech, isGeminiTtsAvailable, streamGeminiTtsAudio } from '@/lib/ai/geminiTTS';
import { isGeminiLiveAvailable, pcmCache } from '@/lib/ai/geminiLiveVoice';
import { PRECACHED_PHRASES, getCachedGreetingPcm } from '@/lib/ai/cachedAudio';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const hasGemini = isGeminiLiveAvailable() || isGeminiTtsAvailable();

    if (!hasGemini) {
      return NextResponse.json(
        { error: 'Gemini Neural Voice is not configured on this server. Please configure GEMINI_API_KEY.' },
        { status: 503 }
      );
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON request payload.' },
        { status: 400 }
      );
    }

    const { text, voice } = body || {};

    if (typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request: "text" must be a string.' },
        { status: 400 }
      );
    }

    const trimmedText = text.trim();
    if (!trimmedText) {
      return NextResponse.json(
        { error: 'Invalid request: "text" cannot be empty.' },
        { status: 400 }
      );
    }

    if (trimmedText.length > 1500) {
      return NextResponse.json(
        { error: 'Invalid request: "text" exceeds 1500 character limit.' },
        { status: 400 }
      );
    }

    const stream = new ReadableStream({
      async start(controller) {
        let isClosed = false;

        const safeEnqueue = (chunk: Uint8Array | Buffer) => {
          if (isClosed) return;
          try {
            controller.enqueue(new Uint8Array(chunk));
          } catch {
            isClosed = true;
          }
        };

        const safeClose = () => {
          if (isClosed) return;
          isClosed = true;
          try {
            controller.close();
          } catch {
            // ignore
          }
        };

        // Step 1: Instant 0ms Pre-cached buffer check
        const cleanLower = trimmedText.toLowerCase().replace(/[\u2018\u2019`\\]/g, "'");
        const isGreeting = (cleanLower.includes("mitra") && (cleanLower.includes("architect") || cleanLower.includes("building today")));
        const getCached = PRECACHED_PHRASES[cleanLower] || (isGreeting ? getCachedGreetingPcm : null);

        if (getCached) {
          try {
            const cachedBuf = getCached();
            if (cachedBuf && cachedBuf.length > 0) {
              const CHUNK_SIZE = 8192;
              for (let i = 0; i < cachedBuf.length; i += CHUNK_SIZE) {
                if (isClosed) break;
                safeEnqueue(cachedBuf.subarray(i, Math.min(i + CHUNK_SIZE, cachedBuf.length)));
              }
              safeClose();
              return;
            }
          } catch (cachedErr) {
            console.warn('[API /api/agent/voice] Pre-cached phrase read warning:', cachedErr);
          }
        }

        // Step 2: Instant 0ms in-memory LRU pcmCache check
        const voiceName = typeof voice === 'string' ? voice : 'Aoede';
        const cacheKey = `${voiceName}:${cleanLower}`;
        if (pcmCache.has(cacheKey)) {
          const cachedBuf = pcmCache.get(cacheKey)!;
          const CHUNK_SIZE = 8192;
          for (let i = 0; i < cachedBuf.length; i += CHUNK_SIZE) {
            if (isClosed) break;
            safeEnqueue(cachedBuf.subarray(i, Math.min(i + CHUNK_SIZE, cachedBuf.length)));
          }
          safeClose();
          return;
        }

        // Step 3: Progressive Gemini Flash TTS streaming (voice: Aoede)
        try {
          await streamGeminiTtsAudio(
            trimmedText,
            (chunk) => {
              safeEnqueue(chunk);
            },
            { voice: typeof voice === 'string' ? voice : undefined }
          );
          safeClose();
          return;
        } catch (streamErr) {
          console.warn('[API /api/agent/voice] Gemini TTS stream failed, attempting batch fallback:', streamErr);
          if (isClosed) return;
        }

        // Step 4: Batch Gemini TTS fallback
        try {
          const { audioBuffer } = await generateGeminiSpeech(trimmedText, {
            voice: typeof voice === 'string' ? voice : undefined,
          });
          const rawPcm = audioBuffer.length > 44 ? audioBuffer.subarray(44) : audioBuffer;
          const CHUNK_SIZE = 8192;
          for (let i = 0; i < rawPcm.length; i += CHUNK_SIZE) {
            if (isClosed) break;
            const slice = rawPcm.subarray(i, Math.min(i + CHUNK_SIZE, rawPcm.length));
            safeEnqueue(slice);
          }
          safeClose();
          return;
        } catch (batchErr) {
          console.warn('[API /api/agent/voice] Gemini batch fallback failed (e.g. quota limit):', batchErr);
          // Safely end stream so client does not hang or receive 500 HTML
          safeClose();
        }
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'audio/pcm;rate=24000',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error during voice generation';
    console.error('[API /api/agent/voice Error]:', errorMsg);
    return NextResponse.json(
      { error: 'Failed to generate voice audio.' },
      { status: 500 }
    );
  }
}
