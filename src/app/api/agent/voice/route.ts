// src/app/api/agent/voice/route.ts
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { openai } from '@/lib/openai';
import { generateGeminiSpeech, isGeminiTtsAvailable } from '@/lib/ai/geminiTTS';
import { isGeminiLiveAvailable, pcmCache, CANONICAL_INITIAL_GREETING } from '@/lib/ai/geminiLiveVoice';
import { getCachedGreetingPcm } from '@/lib/ai/cachedAudio';
import { checkMemoryRateLimit } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const { success: withinRateLimit } = checkMemoryRateLimit(`agent_voice_${ip}`, 20, 60 * 1000);
    if (!withinRateLimit) {
      return NextResponse.json(
        { error: 'Rate limit reached. Please wait a moment before sending more voice requests.' },
        { status: 429 }
      );
    }

    const hasVoice = Boolean(process.env.OPENAI_API_KEY) || isGeminiLiveAvailable() || isGeminiTtsAvailable();

    if (!hasVoice) {
      return NextResponse.json(
        { error: 'Neural Voice is not configured on this server.' },
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

    if (trimmedText.length > 1000) {
      return NextResponse.json(
        { error: 'Invalid request: "text" exceeds 1000 character limit.' },
        { status: 400 }
      );
    }

    const voiceName = typeof voice === 'string' ? voice.slice(0, 50) : 'nova';
    const textHash = crypto.createHash('sha256').update(`${voiceName}:${trimmedText}`).digest('hex');

    console.log(`[CanonicalVoice] SERVER_TTS | hash: ${textHash.slice(0, 10)} | len: ${trimmedText.length}`);

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

        // Step 1: Strict exact match for canonical initial greeting
        const cleanInput = trimmedText.toLowerCase().replace(/\s+/g, ' ').replace(/[\u2018\u2019`\\]/g, "'");
        const cleanGreeting = CANONICAL_INITIAL_GREETING.toLowerCase().replace(/\s+/g, ' ').replace(/[\u2018\u2019`\\]/g, "'");
        if (cleanInput === cleanGreeting) {
          try {
            const greetingBuf = getCachedGreetingPcm();
            if (greetingBuf && greetingBuf.length > 0) {
              const CHUNK_SIZE = 8192;
              for (let i = 0; i < greetingBuf.length; i += CHUNK_SIZE) {
                if (isClosed) break;
                safeEnqueue(greetingBuf.subarray(i, Math.min(i + CHUNK_SIZE, greetingBuf.length)));
              }
              safeClose();
              return;
            }
          } catch (cachedErr) {
            console.warn('[CanonicalVoice] Pre-cached greeting read warning:', cachedErr);
          }
        }

        // Step 2: Instant 0ms in-memory LRU pcmCache check by cryptographic SHA-256 hash
        if (pcmCache.has(textHash)) {
          const cachedBuf = pcmCache.get(textHash)!;
          const CHUNK_SIZE = 8192;
          for (let i = 0; i < cachedBuf.length; i += CHUNK_SIZE) {
            if (isClosed) break;
            safeEnqueue(cachedBuf.subarray(i, Math.min(i + CHUNK_SIZE, cachedBuf.length)));
          }
          safeClose();
          return;
        }

        // Step 3: High-fidelity Primary Neural TTS via OpenAI tts-1 (produces exact 24kHz linear PCM)
        if (process.env.OPENAI_API_KEY) {
          try {
            const openAiRes = await openai.audio.speech.create({
              model: 'tts-1',
              voice: 'nova',
              input: trimmedText,
              response_format: 'pcm',
            });
            const rawPcm = Buffer.from(await openAiRes.arrayBuffer());
            if (rawPcm && rawPcm.length > 0) {
              pcmCache.set(textHash, rawPcm);
              const CHUNK_SIZE = 8192;
              for (let i = 0; i < rawPcm.length; i += CHUNK_SIZE) {
                if (isClosed) break;
                safeEnqueue(rawPcm.subarray(i, Math.min(i + CHUNK_SIZE, rawPcm.length)));
              }
              safeClose();
              return;
            }
          } catch (openAiErr) {
            console.warn('[CanonicalVoice] OpenAI TTS failed, trying Gemini TTS fallback:', openAiErr);
            if (isClosed) return;
          }
        }

        // Step 4: Secondary Neural TTS Fallback via Gemini Speech
        try {
          const { audioBuffer } = await generateGeminiSpeech(trimmedText, {
            voice: typeof voice === 'string' ? voice : undefined,
          });
          const rawPcm = audioBuffer.length > 44 ? audioBuffer.subarray(44) : audioBuffer;
          if (rawPcm && rawPcm.length > 0) {
            pcmCache.set(textHash, rawPcm);
            const CHUNK_SIZE = 8192;
            for (let i = 0; i < rawPcm.length; i += CHUNK_SIZE) {
              if (isClosed) break;
              safeEnqueue(rawPcm.subarray(i, Math.min(i + CHUNK_SIZE, rawPcm.length)));
            }
            safeClose();
            return;
          }
        } catch (geminiErr) {
          console.warn('[CanonicalVoice] Gemini TTS fallback failed:', geminiErr);
        }

        // All neural server synthesizers exhausted — close cleanly so client native SpeechSynthesis speaks the exact canonical text
        console.warn('[CanonicalVoice] All server TTS generators exhausted for text hash:', textHash.slice(0, 10));
        safeClose();
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
