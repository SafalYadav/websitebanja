// src/lib/ai/geminiLiveVoice.ts
// Ensure ws uses pure JavaScript fallback and does not attempt to invoke broken Webpack stubs of bufferutil
process.env.WS_NO_BUFFER_UTIL = '1';
process.env.WS_NO_UTF_8_VALIDATE = '1';

import { GoogleGenAI, Modality } from '@google/genai';
import { PRECACHED_PHRASES, getCachedGreetingPcm } from '@/lib/ai/cachedAudio';

// In-memory LRU cache for synthesized speech chunks to provide instant (0ms) response
export const pcmCache = new Map<string, Buffer>();
const MAX_CACHE_ENTRIES = 100;

export const CANONICAL_INITIAL_GREETING =
  "Hey there! I'm Mitra, your AI Website Architect. What kind of business or website are you building today? Tell me your vision, or tap the mic and let's chat!";

// Pre-populate in-memory cache with pre-synthesized 24kHz linear PCM buffers
try {
  for (const [phrase, getBuf] of Object.entries(PRECACHED_PHRASES)) {
    const buf = getBuf();
    pcmCache.set(`Aoede:${phrase}`, buf);
  }
} catch (e) {
  console.warn('[GeminiLiveVoice] Failed to pre-populate static pcmCache:', e);
}

let isPrewarming = false;
export async function prewarmVoiceCache(): Promise<void> {
  if (isPrewarming) return;
  const voiceName = process.env.GEMINI_TTS_VOICE || 'Aoede';
  const cacheKey = `${voiceName}:${CANONICAL_INITIAL_GREETING.toLowerCase()}`;
  if (pcmCache.has(cacheKey)) return;
  isPrewarming = true;
  try {
    const greetingBuf = getCachedGreetingPcm();
    if (greetingBuf && greetingBuf.length > 0) {
      pcmCache.set(cacheKey, greetingBuf);
      console.log('[GeminiLiveVoice] Loaded initial greeting PCM into cache (0ms instant ready).');
    }
  } catch (err) {
    console.warn('[GeminiLiveVoice] Background cache pre-warm skipped:', err);
  } finally {
    isPrewarming = false;
  }
}

export function isGeminiLiveAvailable(): boolean {
  return Boolean(
    (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0) ||
    (process.env.GOOGLE_API_KEY && process.env.GOOGLE_API_KEY.trim().length > 0) ||
    (process.env.GOOGLE_GENAI_API_KEY && process.env.GOOGLE_GENAI_API_KEY.trim().length > 0)
  );
}

// Auto-trigger background pre-warm on module load during runtime (skip during build phase)
if (isGeminiLiveAvailable() && process.env.NEXT_PHASE !== 'phase-production-build') {
  setTimeout(() => {
    void prewarmVoiceCache();
  }, 500);
}

export interface StreamLiveVoiceResult {
  chunkCount: number;
  totalBytes: number;
  firstChunkTime: number;
}

/**
 * Streams 24kHz 16-bit linear PCM audio chunks from Google Gemini Live API
 * using a strict verbatim system instruction so Gemini acts purely as a voice synthesizer
 * and never generates independent conversational responses.
 */
export async function streamGeminiLiveVoice(
  text: string,
  onChunk: (chunk: Buffer) => void,
  options?: { voice?: string; model?: string }
): Promise<StreamLiveVoiceResult> {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key is not configured on the server');
  }

  const cleanText = text.trim();
  if (!cleanText) {
    throw new Error('Text to speak cannot be empty');
  }

  const voiceName = process.env.GEMINI_TTS_VOICE || options?.voice || 'Aoede';
  const cleanLower = cleanText.toLowerCase();
  const cacheKey = `${voiceName}:${cleanLower}`;

  // Check cache for instant (0ms) playback of repeated phrases or initial greeting
  const isGreeting = cleanLower.includes("i'm mitra") && cleanLower.includes("website architect");
  const cachedBuffer = pcmCache.get(cacheKey) || (isGreeting ? getCachedGreetingPcm() : null);

  if (cachedBuffer) {
    // Chunk the cached buffer into 8KB slices to simulate smooth streaming
    const CHUNK_SIZE = 8192;
    for (let i = 0; i < cachedBuffer.length; i += CHUNK_SIZE) {
      onChunk(cachedBuffer.subarray(i, Math.min(i + CHUNK_SIZE, cachedBuffer.length)));
    }
    return {
      chunkCount: Math.ceil(cachedBuffer.length / CHUNK_SIZE),
      totalBytes: cachedBuffer.length,
      firstChunkTime: 0,
    };
  }

  const ai = new GoogleGenAI({ apiKey });
  const targetModel = options?.model || process.env.GEMINI_LIVE_MODEL || 'gemini-3.1-flash-live-preview';

  const systemInstruction =
    "You are WebsiteBanja's voice synthesis engine. Your ONLY job is to read aloud the exact text provided inside <speak></speak> tags VERBATIM. Do NOT generate conversational replies. Do NOT answer questions. Do NOT add any greeting or commentary. Speak only the exact words provided.";

  const collectedChunks: Buffer[] = [];
  let chunkCount = 0;
  let totalBytes = 0;
  let firstChunkTime = 0;
  let tSend = 0;
  let isSettled = false;
  let onDone: () => void = () => {};
  let onErr: (err: Error) => void = () => {};

  const donePromise = new Promise<void>((resolve, reject) => {
    onDone = () => {
      if (isSettled) return;
      isSettled = true;
      resolve();
    };
    onErr = (err: Error) => {
      if (isSettled) return;
      isSettled = true;
      reject(err);
    };
  });

  const session = await ai.live.connect({
    model: targetModel,
    config: {
      responseModalities: [Modality.AUDIO],
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName,
          },
        },
      },
    },
    callbacks: {
      onopen: () => {
        // WebSocket connected
      },
      onmessage: (msg: any) => {
        const content = msg.serverContent;
        if (content?.modelTurn?.parts) {
          for (const part of content.modelTurn.parts) {
            if (part.inlineData?.data) {
              const buffer = Buffer.from(part.inlineData.data, 'base64');
              if (buffer.length > 0) {
                chunkCount++;
                totalBytes += buffer.length;
                if (!firstChunkTime) {
                  firstChunkTime = performance.now() - tSend;
                }
                collectedChunks.push(buffer);
                try {
                  onChunk(buffer);
                } catch {
                  // Consumer stream closed or canceled
                }
              }
            }
          }
        }
        if (content?.generationComplete || content?.turnComplete) {
          onDone();
        }
      },
      onerror: (err: any) => {
        const errorDetail = err?.error?.message || err?.message || (err ? String(err) : "WebSocket error");
        console.error('[GeminiLiveVoice] WebSocket error:', errorDetail);
        onErr(new Error(errorDetail));
      },
      onclose: () => {
        onDone();
      },
    },
  });

  tSend = performance.now();

  try {
    session.sendClientContent({
      turns: [
        {
          role: 'user',
          parts: [{ text: `<speak>${cleanText}</speak>` }],
        },
      ],
      turnComplete: true,
    });
  } catch {
    session.sendRealtimeInput({ text: `<speak>${cleanText}</speak>` });
  }

  // Safety timeout in case turnComplete is delayed
  const safetyTimeout = setTimeout(() => {
    onDone();
  }, 10000);

  await donePromise;
  clearTimeout(safetyTimeout);

  try {
    session.close();
  } catch {
    // ignore
  }

  // Cache full PCM buffer if valid
  if (collectedChunks.length > 0) {
    const fullBuffer = Buffer.concat(collectedChunks);
    if (pcmCache.size >= MAX_CACHE_ENTRIES) {
      const firstKey = pcmCache.keys().next().value;
      if (firstKey) pcmCache.delete(firstKey);
    }
    pcmCache.set(cacheKey, fullBuffer);
  }

  return {
    chunkCount,
    totalBytes,
    firstChunkTime,
  };
}
