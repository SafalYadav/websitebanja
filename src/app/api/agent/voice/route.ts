// src/app/api/agent/voice/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { generateGeminiSpeech, isGeminiTtsAvailable, streamGeminiTtsAudio } from '@/lib/ai/geminiTTS';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const hasGemini = isGeminiTtsAvailable();

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

        // Fallback: Gemini Batch TTS (stripped 44-byte WAV header = raw 24kHz PCM)
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
          try {
            // Exclusively Google Gemini 3.1 Flash TTS (voice: Aoede)
            // Delivers progressive 24kHz linear PCM streaming chunks identically on Localhost and Vercel
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
          console.error('[API /api/agent/voice] Gemini voice synthesis failed:', fatalErr);
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
