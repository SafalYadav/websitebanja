// src/lib/ai/cachedAudio.ts
import fs from 'fs';
import path from 'path';

export const CANONICAL_INITIAL_GREETING =
  "Hey there! I'm Mitra, your AI Website Architect. What kind of business or website are you building today? Tell me your vision, or tap the mic and let's chat!";

let cachedGreetingBuffer: Buffer | null = null;

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

export const PRECACHED_PHRASES: Record<string, () => Buffer> = {
  [CANONICAL_INITIAL_GREETING.toLowerCase().trim()]: getCachedGreetingPcm,
};
