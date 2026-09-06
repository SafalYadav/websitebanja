// src/lib/ai/geminiTTS.ts
import { GoogleGenAI } from '@google/genai';

export interface GeminiTtsOptions {
  voice?: string;
  model?: string;
}

export interface GeminiTtsResult {
  audioBuffer: Buffer;
  contentType: string;
}

// In-memory LRU cache for synthesized speech to provide instant response for greetings & repeated phrases
const speechCache = new Map<string, { audioBuffer: Buffer; contentType: string }>();
const MAX_CACHE_SIZE = 50;

/**
 * Packs 16-bit linear PCM audio into a standard RIFF/WAVE container.
 * Gemini TTS default output: 24,000 Hz, 1 channel (mono), 16 bits per sample (2 bytes).
 */
export function pcmToWav(
  pcmBuffer: Buffer,
  sampleRate: number = 24000,
  numChannels: number = 1,
  bitsPerSample: number = 16
): Buffer {
  const dataLength = pcmBuffer.length;
  const buffer = Buffer.alloc(44 + dataLength);
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;

  // RIFF identifier
  buffer.write('RIFF', 0);
  // File length minus RIFF identifier and length field (36 + dataLength)
  buffer.writeUInt32LE(36 + dataLength, 4);
  // WAVE identifier
  buffer.write('WAVE', 8);
  // Format subchunk identifier
  buffer.write('fmt ', 12);
  // Subchunk1 size (16 for PCM)
  buffer.writeUInt32LE(16, 16);
  // Audio format (1 = PCM)
  buffer.writeUInt16LE(1, 20);
  // Channels
  buffer.writeUInt16LE(numChannels, 22);
  // Sample rate
  buffer.writeUInt32LE(sampleRate, 24);
  // Byte rate
  buffer.writeUInt32LE(byteRate, 28);
  // Block align
  buffer.writeUInt16LE(blockAlign, 32);
  // Bits per sample
  buffer.writeUInt16LE(bitsPerSample, 34);
  // Data subchunk identifier
  buffer.write('data', 36);
  // Data size
  buffer.writeUInt32LE(dataLength, 40);

  // Copy raw PCM data after 44-byte header
  pcmBuffer.copy(buffer, 44);

  return buffer;
}

/**
 * Checks if Gemini TTS can be invoked (requires GEMINI_API_KEY).
 */
export function isGeminiTtsAvailable(): boolean {
  return Boolean(
    (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0) ||
    (process.env.GOOGLE_API_KEY && process.env.GOOGLE_API_KEY.trim().length > 0) ||
    (process.env.GOOGLE_GENAI_API_KEY && process.env.GOOGLE_GENAI_API_KEY.trim().length > 0)
  );
}

/**
 * Generates natural neural speech from text using Google Gemini TTS API.
 * Converts output linear PCM into browser-playable audio/wav with latency optimization.
 */
export async function generateGeminiSpeech(
  text: string,
  options?: GeminiTtsOptions
): Promise<GeminiTtsResult> {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY or GOOGLE_API_KEY environment variable is not configured');
  }

  const cleanText = text.trim();
  if (!cleanText) {
    throw new Error('Speech text cannot be empty');
  }

  if (cleanText.length > 1500) {
    throw new Error('Speech text exceeds maximum allowed length (1500 characters)');
  }

  const voiceName = process.env.GEMINI_TTS_VOICE || options?.voice || 'Aoede';

  // Check cache for instant (0ms) playback of repeated phrases
  const cacheKey = `${voiceName}:${cleanText.toLowerCase()}`;
  if (speechCache.has(cacheKey)) {
    const cached = speechCache.get(cacheKey)!;
    return cached;
  }

  // Model prioritization: gemini-3.1-flash-tts-preview is tested and active
  const primaryModel = process.env.GEMINI_TTS_MODEL || options?.model || 'gemini-3.1-flash-tts-preview';
  const fallbackModel = primaryModel === 'gemini-3.1-flash-tts-preview' ? 'gemini-2.5-flash-preview-tts' : 'gemini-3.1-flash-tts-preview';

  const ai = new GoogleGenAI({ apiKey });
  const t0 = Date.now();

  async function tryGenerate(targetModel: string): Promise<Buffer> {
    const response = await ai.models.generateContent({
      model: targetModel,
      contents: [{ parts: [{ text: cleanText }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName,
            },
          },
        },
      },
    });

    const candidate = response.candidates?.[0];
    const part = candidate?.content?.parts?.find((p) => Boolean(p.inlineData?.data));

    if (!part?.inlineData?.data) {
      throw new Error(`Gemini TTS returned no audio data for model ${targetModel}`);
    }

    const pcmBuffer = Buffer.from(part.inlineData.data, 'base64');
    return pcmToWav(pcmBuffer, 24000, 1, 16);
  }

  try {
    let wavBuffer: Buffer;
    let usedModel = primaryModel;

    try {
      wavBuffer = await tryGenerate(primaryModel);
    } catch (primaryErr) {
      const pMsg = primaryErr instanceof Error ? primaryErr.message : String(primaryErr);
      console.warn(`[GeminiTTS] Primary model ${primaryModel} failed (${pMsg.slice(0, 100)}), attempting fallback ${fallbackModel}`);
      usedModel = fallbackModel;
      wavBuffer = await tryGenerate(fallbackModel);
    }

    const duration = Date.now() - t0;
    console.log(`[GeminiTTS] Generated speech in ${duration}ms using ${usedModel} (${cleanText.length} chars)`);

    const result = {
      audioBuffer: wavBuffer,
      contentType: 'audio/wav',
    };

    // Store in cache (evict oldest if full)
    if (speechCache.size >= MAX_CACHE_SIZE) {
      const firstKey = speechCache.keys().next().value;
      if (firstKey) speechCache.delete(firstKey);
    }
    speechCache.set(cacheKey, result);

    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[GeminiTTS Error] Voice: ${voiceName} - ${message}`);
    throw new Error(`Gemini Neural TTS generation failed: ${message}`);
  }
}

import { pcmCache } from '@/lib/ai/geminiLiveVoice';
import { getCachedGreetingPcm } from '@/lib/ai/cachedAudio';

/**
 * Streams raw 24kHz 16-bit linear PCM audio chunks using Google Gemini Flash TTS.
 * Checked against the in-memory PCM cache for 0ms instant playback.
 */
export async function streamGeminiTtsAudio(
  text: string,
  onChunk: (chunk: Buffer) => void,
  options?: { voice?: string; model?: string }
): Promise<{ totalBytes: number; firstChunkTime: number }> {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key is not configured on the server');
  }

  const cleanText = text.trim();
  if (!cleanText) {
    throw new Error('Speech text cannot be empty');
  }

  const voiceName = process.env.GEMINI_TTS_VOICE || options?.voice || 'Aoede';
  const cleanLower = cleanText.toLowerCase();
  const cacheKey = `${voiceName}:${cleanLower}`;

  // Instant 0ms Cache Check: Canonical greeting or repeated conversational phrases
  const isGreeting = cleanLower.includes("i'm mitra") && cleanLower.includes("website architect");
  const cachedBuffer = pcmCache.get(cacheKey) || (isGreeting ? getCachedGreetingPcm() : null);

  if (cachedBuffer && cachedBuffer.length > 0) {
    const CHUNK_SIZE = 8192;
    for (let i = 0; i < cachedBuffer.length; i += CHUNK_SIZE) {
      onChunk(cachedBuffer.subarray(i, Math.min(i + CHUNK_SIZE, cachedBuffer.length)));
    }
    return {
      totalBytes: cachedBuffer.length,
      firstChunkTime: 0,
    };
  }

  const primaryModel = options?.model || process.env.GEMINI_TTS_MODEL || 'gemini-3.1-flash-tts-preview';
  const fallbackModel = primaryModel === 'gemini-3.1-flash-tts-preview' ? 'gemini-2.5-flash-preview-tts' : 'gemini-3.1-flash-tts-preview';

  const ai = new GoogleGenAI({ apiKey });
  const t0 = performance.now();
  let firstChunkTime = 0;
  let totalBytes = 0;
  const collectedChunks: Buffer[] = [];

  const executeStream = async (targetModel: string) => {
    const responseStream = await ai.models.generateContentStream({
      model: targetModel,
      contents: [{ parts: [{ text: cleanText }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    for await (const chunk of responseStream) {
      const data = chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (data) {
        const buf = Buffer.from(data, 'base64');
        if (buf.length > 0) {
          if (!firstChunkTime) {
            firstChunkTime = performance.now() - t0;
          }
          totalBytes += buf.length;
          collectedChunks.push(buf);
          onChunk(buf);
        }
      }
    }
  };

  try {
    await executeStream(primaryModel);
  } catch (primaryErr) {
    console.warn(`[GeminiTTS Stream] Primary model ${primaryModel} failed, trying fallback ${fallbackModel}:`, primaryErr);
    await executeStream(fallbackModel);
  }

  if (totalBytes === 0) {
    throw new Error('Gemini TTS stream yielded 0 audio bytes');
  }

  // Cache full PCM buffer for subsequent 0ms response
  if (collectedChunks.length > 0) {
    const fullBuf = Buffer.concat(collectedChunks);
    if (pcmCache.size >= 100) {
      const firstKey = pcmCache.keys().next().value;
      if (firstKey) pcmCache.delete(firstKey);
    }
    pcmCache.set(cacheKey, fullBuf);
  }

  return { totalBytes, firstChunkTime };
}

