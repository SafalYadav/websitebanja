// src/app/api/agent/voice/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { streamGeminiLiveVoice, isGeminiLiveAvailable } from '@/lib/ai/geminiLiveVoice';
import { generateGeminiSpeech, isGeminiTtsAvailable } from '@/lib/ai/geminiTTS';
import { streamOpenAiSpeech, isOpenAiTtsAvailable } from '@/lib/ai/openAiTTS';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const hasGemini = isGeminiLiveAvailable() || isGeminiTtsAvailable();
    const hasOpenAi = isOpenAiTtsAvailable();

    if (!hasGemini && !hasOpenAi) {
      return NextResponse.json(
        { error: 'Voice synthesis is not configured on this server. Please configure GEMINI_API_KEY or OPENAI_API_KEY.' },
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

    const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

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

        // Helper: Stream OpenAI linear 24kHz PCM
        const runOpenAiPlayback = async () => {
          if (!isOpenAiTtsAvailable()) {
            throw new Error('OpenAI voice synthesis is not configured.');
          }
          const validOpenAiVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] as const;
          const openAiVoice = validOpenAiVoices.includes(voice as any) ? (voice as any) : 'nova';
          await streamOpenAiSpeech(
            trimmedText,
            (chunk) => {
              safeEnqueue(chunk);
            },
            { voice: openAiVoice }
          );
        };

        // Helper: Stream Gemini Batch TTS (stripped 44-byte WAV header = raw 24kHz PCM)
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
          if (isServerless) {
            // On Vercel / Serverless:
            // Outbound WebSockets hang in Lambda environments, so use HTTP REST.
            // When Gemini is configured, use Gemini Neural Voice (Aoede) so voice matches localhost identically.
            if (hasGemini) {
              try {
                await runGeminiBatchPlayback();
                safeClose();
                return;
              } catch (geminiErr) {
                console.warn('[API /api/agent/voice] Serverless Gemini TTS failed, attempting OpenAI fallback:', geminiErr);
                if (isClosed) return;
                if (hasOpenAi) {
                  await runOpenAiPlayback();
                  safeClose();
                  return;
                }
                throw geminiErr;
              }
            } else if (hasOpenAi) {
              await runOpenAiPlayback();
              safeClose();
              return;
            }
          } else {
            // On Localhost:
            // Prefer ultra-low-latency (~670ms) Gemini Live verbatim streaming over WebSocket
            if (hasGemini) {
              try {
                const livePromise = streamGeminiLiveVoice(
                  trimmedText,
                  (chunk) => {
                    safeEnqueue(chunk);
                  },
                  { voice: typeof voice === 'string' ? voice : undefined }
                );

                await Promise.race([
                  livePromise,
                  new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Gemini Live WebSocket stream timeout')), 4000)
                  ),
                ]);
                safeClose();
                return;
              } catch (liveErr) {
                console.warn('[API /api/agent/voice] Local Gemini Live failed, attempting fallback:', liveErr);
                if (isClosed) return;
                if (hasOpenAi) {
                  try {
                    await runOpenAiPlayback();
                    safeClose();
                    return;
                  } catch (openAiErr) {
                    console.warn('[API /api/agent/voice] Local OpenAI fallback failed:', openAiErr);
                  }
                }
                if (isClosed) return;
                await runGeminiBatchPlayback();
                safeClose();
                return;
              }
            } else if (hasOpenAi) {
              await runOpenAiPlayback();
              safeClose();
              return;
            }
          }
        } catch (fatalErr) {
          console.error('[API /api/agent/voice] All voice synthesis providers failed:', fatalErr);
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
