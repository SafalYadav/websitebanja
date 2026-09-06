// src/lib/ai/openAiTTS.ts
import { OpenAI } from 'openai';

export interface OpenAiTtsOptions {
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  model?: string;
}

// In-memory cache for synthesized speech chunks to provide instant (0ms) response on common phrases
const openAiPcmCache = new Map<string, Buffer>();
const MAX_CACHE_ENTRIES = 50;

/**
 * Checks if OpenAI TTS is available on the server.
 */
export function isOpenAiTtsAvailable(): boolean {
  return Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim().length > 0);
}

/**
 * Generates and streams 24kHz 16-bit linear PCM audio chunks using OpenAI TTS.
 */
export async function streamOpenAiSpeech(
  text: string,
  onChunk: (chunk: Buffer) => void,
  options?: OpenAiTtsOptions
): Promise<{ totalBytes: number }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured on the server.');
  }

  const cleanText = text.trim();
  if (!cleanText) {
    throw new Error('Text to speak cannot be empty');
  }

  const voice = options?.voice || 'nova';
  const cacheKey = `${voice}:${cleanText.toLowerCase()}`;

  // Serve from cache if available
  if (openAiPcmCache.has(cacheKey)) {
    const cachedBuffer = openAiPcmCache.get(cacheKey)!;
    const CHUNK_SIZE = 8192;
    for (let i = 0; i < cachedBuffer.length; i += CHUNK_SIZE) {
      onChunk(cachedBuffer.subarray(i, Math.min(i + CHUNK_SIZE, cachedBuffer.length)));
    }
    return { totalBytes: cachedBuffer.length };
  }

  const openai = new OpenAI({ apiKey });
  const response = await openai.audio.speech.create({
    model: options?.model || 'tts-1',
    voice,
    input: cleanText,
    response_format: 'pcm', // 24kHz 16-bit linear PCM mono
  });

  const webStream = response.body;
  if (!webStream) {
    throw new Error('No response stream received from OpenAI audio endpoint.');
  }

  const reader = (webStream as unknown as ReadableStream<Uint8Array>).getReader();
  const collectedChunks: Buffer[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value && value.byteLength > 0) {
        const buf = Buffer.from(value);
        totalBytes += buf.length;
        collectedChunks.push(buf);
        onChunk(buf);
      }
    }
  } finally {
    reader.releaseLock();
  }

  // Cache full PCM buffer
  if (collectedChunks.length > 0) {
    const fullBuffer = Buffer.concat(collectedChunks);
    if (openAiPcmCache.size >= MAX_CACHE_ENTRIES) {
      const firstKey = openAiPcmCache.keys().next().value;
      if (firstKey) openAiPcmCache.delete(firstKey);
    }
    openAiPcmCache.set(cacheKey, fullBuffer);
  }

  return { totalBytes };
}
