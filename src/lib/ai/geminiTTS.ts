// src/lib/ai/geminiTTS.ts
import { GoogleGenAI } from '@google/genai';
import { pcmCache } from '@/lib/ai/geminiLiveVoice';
import { getCachedGreetingPcm } from '@/lib/ai/cachedAudio';

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
 * Strips quotes, whitespace, and accidental 'Bearer ' prefix from environment API key.
 */
export function getCleanGeminiApiKey(): string | null {
  const raw =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY ||
    '';
  const clean = raw.trim().replace(/^["']|["']$/g, '').replace(/^Bearer\s+/i, '');
  return clean.length > 0 ? clean : null;
}

/**
 * Checks if Gemini TTS can be invoked (requires a valid GEMINI_API_KEY or GOOGLE_API_KEY).
 */
export function isGeminiTtsAvailable(): boolean {
  return Boolean(getCleanGeminiApiKey());
}

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
 * Executes a direct REST call to Google Generative Language API.
 * Uses x-goog-api-key header AND ?key= query parameter to guarantee
 * that the API key is passed directly without OAuth/Bearer ambiguity.
 */
async function callGeminiRestGenerate(
  apiKey: string,
  model: string,
  cleanText: string,
  voiceName: string
): Promise<Buffer> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const body = {
    contents: [{ parts: [{ text: cleanText }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName },
        },
      },
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Generative Language API HTTP ${res.status}: ${errText}`);
  }

  const json: any = await res.json();
  const candidate = json.candidates?.[0];
  const part = candidate?.content?.parts?.find((p: any) => Boolean(p.inlineData?.data));

  if (!part?.inlineData?.data) {
    throw new Error(`Gemini TTS returned no audio data for model ${model}: ${JSON.stringify(json)}`);
  }

  const pcmBuffer = Buffer.from(part.inlineData.data, 'base64');
  return pcmToWav(pcmBuffer, 24000, 1, 16);
}

/**
 * Streams raw linear PCM audio from Google Generative Language API using SSE.
 * Uses direct fetch with x-goog-api-key and ?key= to avoid SDK auth interference in container environments.
 */
async function callGeminiRestStream(
  apiKey: string,
  model: string,
  cleanText: string,
  voiceName: string,
  onChunk: (chunk: Buffer) => void
): Promise<{ totalBytes: number; firstChunkTime: number; collectedChunks: Buffer[] }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;

  const body = {
    contents: [{ parts: [{ text: cleanText }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName },
        },
      },
    },
  };

  const t0 = performance.now();
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Generative Language API stream HTTP ${res.status}: ${errText}`);
  }

  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error('Google Generative Language API response body is empty');
  }

  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let firstChunkTime = 0;
  let totalBytes = 0;
  const collectedChunks: Buffer[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    while (true) {
      let delimiterIndex = -1;
      let delimiterLen = 0;
      const d1 = buffer.indexOf('\n\n');
      const d2 = buffer.indexOf('\r\n\r\n');

      if (d1 !== -1 && (d2 === -1 || d1 < d2)) {
        delimiterIndex = d1;
        delimiterLen = 2;
      } else if (d2 !== -1) {
        delimiterIndex = d2;
        delimiterLen = 4;
      }

      if (delimiterIndex === -1) break;

      const eventStr = buffer.substring(0, delimiterIndex).trim();
      buffer = buffer.substring(delimiterIndex + delimiterLen);

      if (eventStr.startsWith('data:')) {
        const jsonStr = eventStr.substring(5).trim();
        if (!jsonStr) continue;

        let parsed: any;
        try {
          parsed = JSON.parse(jsonStr);
        } catch {
          continue;
        }

        if (parsed.error) {
          throw new Error(`Google Generative Language API error: ${JSON.stringify(parsed.error)}`);
        }

        const candidate = parsed.candidates?.[0];
        if (candidate?.content?.parts) {
          for (const part of candidate.content.parts) {
            if (part.inlineData?.data) {
              const buf = Buffer.from(part.inlineData.data, 'base64');
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
        }
      }
    }
  }

  return { totalBytes, firstChunkTime, collectedChunks };
}

/**
 * Generates natural neural speech from text using Google Gemini TTS API.
 * Converts output linear PCM into browser-playable audio/wav with latency optimization.
 */
export async function generateGeminiSpeech(
  text: string,
  options?: GeminiTtsOptions
): Promise<GeminiTtsResult> {
  const apiKey = getCleanGeminiApiKey();
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

  const primaryModel = process.env.GEMINI_TTS_MODEL || options?.model || 'gemini-3.1-flash-tts-preview';
  const fallbackModel = primaryModel === 'gemini-3.1-flash-tts-preview' ? 'gemini-2.5-flash-preview-tts' : 'gemini-3.1-flash-tts-preview';

  const t0 = Date.now();
  let wavBuffer: Buffer | null = null;
  let usedModel = primaryModel;

  // Attempt 1: Direct REST call with primary model
  try {
    wavBuffer = await callGeminiRestGenerate(apiKey, primaryModel, cleanText, voiceName);
  } catch (primaryErr) {
    const pMsg = primaryErr instanceof Error ? primaryErr.message : String(primaryErr);
    console.warn(`[GeminiTTS] Primary model ${primaryModel} failed (${pMsg.slice(0, 120)}), attempting fallback ${fallbackModel}`);
    usedModel = fallbackModel;
    try {
      wavBuffer = await callGeminiRestGenerate(apiKey, fallbackModel, cleanText, voiceName);
    } catch (fallbackErr) {
      const fMsg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
      console.warn(`[GeminiTTS] Fallback model ${fallbackModel} failed (${fMsg.slice(0, 120)}), attempting SDK fallback`);
      // Final attempt: GoogleGenAI SDK with explicit vertexai: false
      const ai = new GoogleGenAI({ apiKey, vertexai: false });
      const response = await ai.models.generateContent({
        model: primaryModel,
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
      const data = response.candidates?.[0]?.content?.parts?.find((p) => Boolean(p.inlineData?.data))?.inlineData?.data;
      if (!data) throw new Error('SDK fallback returned no audio data');
      const pcmBuffer = Buffer.from(data, 'base64');
      wavBuffer = pcmToWav(pcmBuffer, 24000, 1, 16);
    }
  }

  if (!wavBuffer) {
    throw new Error('Gemini TTS generation produced no audio');
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
}

/**
 * Streams raw 24kHz 16-bit linear PCM audio chunks using Google Gemini Flash TTS.
 * Checked against the in-memory PCM cache for 0ms instant playback.
 */
export async function streamGeminiTtsAudio(
  text: string,
  onChunk: (chunk: Buffer) => void,
  options?: { voice?: string; model?: string }
): Promise<{ totalBytes: number; firstChunkTime: number }> {
  const apiKey = getCleanGeminiApiKey();
  if (!apiKey) {
    throw new Error('Gemini API key is not configured on the server');
  }

  const cleanText = text.trim();
  if (!cleanText) {
    throw new Error('Speech text cannot be empty');
  }

  const voiceName = process.env.GEMINI_TTS_VOICE || options?.voice || 'Aoede';
  const cleanLower = cleanText.toLowerCase().replace(/[\u2018\u2019`\\]/g, "'");
  const cacheKey = `${voiceName}:${cleanLower}`;

  // Instant 0ms Cache Check: Canonical greeting or repeated conversational phrases
  const isGreeting = (cleanLower.includes("mitra") && (cleanLower.includes("architect") || cleanLower.includes("building today")));
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

  let totalBytes = 0;
  let firstChunkTime = 0;
  let collectedChunks: Buffer[] = [];

  // Attempt 1: Direct SSE Stream with primary model
  try {
    const res = await callGeminiRestStream(apiKey, primaryModel, cleanText, voiceName, onChunk);
    totalBytes = res.totalBytes;
    firstChunkTime = res.firstChunkTime;
    collectedChunks = res.collectedChunks;
  } catch (primaryErr) {
    const pMsg = primaryErr instanceof Error ? primaryErr.message : String(primaryErr);
    console.warn(`[GeminiTTS Stream] Primary model ${primaryModel} failed (${pMsg.slice(0, 120)}), trying fallback ${fallbackModel}`);
    try {
      const res = await callGeminiRestStream(apiKey, fallbackModel, cleanText, voiceName, onChunk);
      totalBytes = res.totalBytes;
      firstChunkTime = res.firstChunkTime;
      collectedChunks = res.collectedChunks;
    } catch (fallbackErr) {
      const fMsg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
      console.warn(`[GeminiTTS Stream] Fallback model ${fallbackModel} failed (${fMsg.slice(0, 120)}), trying SDK fallback`);
      // Final safety net: @google/genai SDK with explicit vertexai: false
      const ai = new GoogleGenAI({ apiKey, vertexai: false });
      const t0 = performance.now();
      const responseStream = await ai.models.generateContentStream({
        model: primaryModel,
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
    }
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


