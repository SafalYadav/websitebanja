// src/lib/ai/cachedAudio.ts
import fs from 'fs';
import path from 'path';

export const CANONICAL_INITIAL_GREETING =
  "Hey there! I'm Mitra, your AI Website Architect. What kind of business or website are you building today? Tell me your vision, or tap the mic and let's chat!";

let cachedGreetingBuffer: Buffer | null = null;
let cachedPhrase0Buffer: Buffer | null = null;
let cachedPhrase1Buffer: Buffer | null = null;

function loadPcmFile(filename: string): Buffer {
  const candidates = [
    path.join(process.cwd(), 'src/lib/ai/cached', filename),
    path.join(process.cwd(), 'public/audio', filename),
    path.join(__dirname, 'cached', filename),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        return fs.readFileSync(p);
      }
    } catch {
      // try next candidate
    }
  }
  return Buffer.alloc(0);
}

export function getCachedGreetingPcm(): Buffer {
  if (!cachedGreetingBuffer || cachedGreetingBuffer.length === 0) {
    cachedGreetingBuffer = loadPcmFile('initial_greeting_aoede.pcm');
  }
  return cachedGreetingBuffer;
}

export function getCachedPhrase0Pcm(): Buffer {
  if (!cachedPhrase0Buffer || cachedPhrase0Buffer.length === 0) {
    cachedPhrase0Buffer = loadPcmFile('phrase_0.pcm');
  }
  return cachedPhrase0Buffer;
}

export function getCachedPhrase1Pcm(): Buffer {
  if (!cachedPhrase1Buffer || cachedPhrase1Buffer.length === 0) {
    cachedPhrase1Buffer = loadPcmFile('phrase_1.pcm');
  }
  return cachedPhrase1Buffer;
}

export const PRECACHED_PHRASES: Record<string, () => Buffer> = {
  [CANONICAL_INITIAL_GREETING.toLowerCase().trim()]: getCachedGreetingPcm,
  "awesome! let's get started.": getCachedPhrase0Pcm,
  'that sounds wonderful!': getCachedPhrase1Pcm,
};
