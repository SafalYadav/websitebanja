// src/app/api/agent/voice/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { streamGeminiLiveVoice } from '@/lib/ai/geminiLiveVoice';
import { generateGeminiSpeech, isGeminiTtsAvailable } from '@/lib/ai/geminiTTS';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    if (!isGeminiTtsAvailable()) {
      return NextResponse.json(
        { error: 'Gemini Neural Voice is not configured on this server.' },
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

    // Try low-latency Gemini Live verbatim PCM chunk streaming
    try {
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

          try {
            await streamGeminiLiveVoice(
              trimmedText,
              (chunk) => {
                safeEnqueue(chunk);
              },
              { voice: typeof voice === 'string' ? voice : undefined }
            );
            safeClose();
          } catch (streamErr) {
            console.warn('[API /api/agent/voice] Gemini Live stream failed, falling back to batch TTS:', streamErr);
            if (isClosed) return;
            try {
              const { audioBuffer } = await generateGeminiSpeech(trimmedText, {
                voice: typeof voice === 'string' ? voice : undefined,
              });
              // Strip 44-byte RIFF/WAV header to provide raw 24kHz linear PCM
              const rawPcm = audioBuffer.length > 44 ? audioBuffer.subarray(44) : audioBuffer;
              const CHUNK_SIZE = 8192;
              for (let i = 0; i < rawPcm.length; i += CHUNK_SIZE) {
                if (isClosed) break;
                const slice = rawPcm.subarray(i, Math.min(i + CHUNK_SIZE, rawPcm.length));
                safeEnqueue(slice);
              }
              safeClose();
            } catch (fallbackErr) {
              safeError(fallbackErr);
            }
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
    } catch (liveErr) {
      console.warn('[API /api/agent/voice] Live stream init failed, using batch fallback:', liveErr);
      const { audioBuffer, contentType } = await generateGeminiSpeech(trimmedText, {
        voice: typeof voice === 'string' ? voice : undefined,
      });

      return new Response(new Uint8Array(audioBuffer), {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Length': audioBuffer.length.toString(),
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      });
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error during voice generation';
    console.error('[API /api/agent/voice Error]:', errorMsg);
    return NextResponse.json(
      { error: 'Failed to generate voice audio.' },
      { status: 500 }
    );
  }
}
