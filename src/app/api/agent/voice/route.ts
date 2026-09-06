// src/app/api/agent/voice/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { generateGeminiSpeech, isGeminiTtsAvailable, streamGeminiTtsAudio } from '@/lib/ai/geminiTTS';
import { streamGeminiLiveVoice, isGeminiLiveAvailable, pcmCache } from '@/lib/ai/geminiLiveVoice';
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

        const safeError = (err: any) => {
          if (isClosed) return;
          isClosed = true;
          try {
            controller.error(err);
          } catch {
            // ignore
          }
        };

        // Step 1: Instant 0ms Pre-cached buffer check
        const cleanLower = trimmedText.toLowerCase();
        const isGreeting = cleanLower.includes("i'm mitra") && cleanLower.includes("website architect");
        const getCached = PRECACHED_PHRASES[cleanLower] || (isGreeting ? getCachedGreetingPcm : null);

        if (getCached) {
          try {
            const cachedBuf = getCached();
            const CHUNK_SIZE = 8192;
            for (let i = 0; i < cachedBuf.length; i += CHUNK_SIZE) {
              if (isClosed) break;
              safeEnqueue(cachedBuf.subarray(i, Math.min(i + CHUNK_SIZE, cachedBuf.length)));
            }
            safeClose();
            return;
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

        // Helper: Gemini Batch TTS fallback (stripped 44-byte WAV header = raw 24kHz PCM)
        const runGeminiBatchPlayback = async () => {
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
        };

        try {
          // Step 3: Fast Gemini Live WebSocket synthesis (exact localhost engine, voice: Aoede)
          try {
            let hasReceivedFirstChunk = false;
            let onFirstChunk: () => void = () => {};
            const firstChunkPromise = new Promise<void>((resolve) => {
              onFirstChunk = resolve;
            });

            const livePromise = streamGeminiLiveVoice(
              trimmedText,
              (chunk) => {
                if (!hasReceivedFirstChunk) {
                  hasReceivedFirstChunk = true;
                  onFirstChunk();
                }
                safeEnqueue(chunk);
              },
              { voice: typeof voice === 'string' ? voice : undefined }
            );

            // Wait for either the first audio chunk or a 4.5s timeout
            await Promise.race([
              firstChunkPromise,
              livePromise,
              new Promise((_, reject) =>
                setTimeout(() => {
                  if (!hasReceivedFirstChunk) {
                    reject(new Error('Gemini Live WebSocket first chunk timeout'));
                  }
                }, 4500)
              ),
            ]);

            // Audio has started streaming! Now await full stream completion
            await livePromise;
            safeClose();
            return;
          } catch (liveErr) {
            console.warn('[API /api/agent/voice] Gemini Live stream failed/timed out, attempting Gemini TTS stream:', liveErr);
            if (isClosed) return;
          }

          // Step 4: Reliable HTTPS REST streaming with Google Gemini Flash TTS (voice: Aoede)
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
          } catch (geminiStreamErr) {
            console.warn('[API /api/agent/voice] Gemini TTS stream failed, attempting Gemini batch fallback:', geminiStreamErr);
            if (isClosed) return;
            await runGeminiBatchPlayback();
            safeClose();
            return;
          }
        } catch (fatalErr) {
          console.error('[API /api/agent/voice] All Gemini voice synthesis engines failed:', fatalErr);
          safeError(fatalErr);
        }
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'audio/pcm;rate=24000',
        'Transfer-Encoding': 'chunked',
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
