// src/app/api/agent/voice/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { streamGeminiLiveVoice, isGeminiLiveAvailable } from '@/lib/ai/geminiLiveVoice';
import { generateGeminiSpeech, isGeminiTtsAvailable } from '@/lib/ai/geminiTTS';
import { streamOpenAiSpeech, isOpenAiTtsAvailable } from '@/lib/ai/openAiTTS';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
        const runOpenAiFallback = async () => {
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
        const runGeminiBatchFallback = async () => {
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
          if (hasGemini) {
            try {
              // Priority 1: Gemini Live verbatim 24kHz PCM streaming
              await streamGeminiLiveVoice(
                trimmedText,
                (chunk) => {
                  safeEnqueue(chunk);
                },
                { voice: typeof voice === 'string' ? voice : undefined }
              );
              safeClose();
              return;
            } catch (liveErr) {
              console.warn('[API /api/agent/voice] Gemini Live failed, attempting Gemini batch fallback:', liveErr);
              if (isClosed) return;
              try {
                // Priority 2: Gemini Batch TTS
                await runGeminiBatchFallback();
                safeClose();
                return;
              } catch (batchErr) {
                console.warn('[API /api/agent/voice] Gemini batch failed, attempting OpenAI fallback:', batchErr);
                if (isClosed) return;
                // Priority 3: OpenAI TTS
                await runOpenAiFallback();
                safeClose();
                return;
              }
            }
          } else {
            // Direct OpenAI TTS when Gemini credentials are not present (e.g. Vercel deployment)
            await runOpenAiFallback();
            safeClose();
            return;
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
