// src/lib/ai/cachedAudio.ts
import fs from 'fs';
import path from 'path';
import { MITRA_LANGUAGES } from '@/lib/constants/mitraLanguages';

export const CANONICAL_INITIAL_GREETING =
  "Hey there! I'm Mitra, your AI Website Architect. What kind of business or website are you building today? Tell me your vision, or tap the mic and let's chat!";

const pcmBuffers = new Map<string, Buffer>();

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

export function getCachedGreetingPcm(lang?: string): Buffer {
  const targetLang = lang ? lang.toLowerCase().trim() : 'english';
  const cacheKey = `greeting_${targetLang}.pcm`;
  if (pcmBuffers.has(cacheKey)) {
    return pcmBuffers.get(cacheKey)!;
  }
  let buf = loadPcmFile(cacheKey);
  if ((!buf || buf.length === 0) && (targetLang === 'english' || !lang)) {
    buf = loadPcmFile('initial_greeting_aoede.pcm');
  }
  if (buf && buf.length > 0) {
    pcmBuffers.set(cacheKey, buf);
  }
  return buf;
}

export function findMatchingGreetingPcm(text: string, lang?: string): Buffer | null {
  const cleanInput = text.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[\u2018\u2019`\\]/g, "'");

  // 1. Direct check by provided language identifier
  if (lang) {
    const config = Object.values(MITRA_LANGUAGES).find(
      (l) => l.id.toLowerCase() === lang.toLowerCase().trim() || l.name.toLowerCase() === lang.toLowerCase().trim()
    );
    if (config) {
      const cleanGreeting = config.greeting.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[\u2018\u2019`\\]/g, "'");
      if (cleanInput === cleanGreeting) {
        const buf = getCachedGreetingPcm(config.id);
        if (buf && buf.length > 0) return buf;
      }
    }
  }

  // 2. Exact match against any of the 14 language greetings
  for (const config of Object.values(MITRA_LANGUAGES)) {
    const cleanGreeting = config.greeting.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[\u2018\u2019`\\]/g, "'");
    if (cleanInput === cleanGreeting) {
      const buf = getCachedGreetingPcm(config.id);
      if (buf && buf.length > 0) return buf;
    }
  }

  return null;
}

export const PRECACHED_PHRASES: Record<string, () => Buffer> = {
  [CANONICAL_INITIAL_GREETING.toLowerCase().trim()]: () => getCachedGreetingPcm('english'),
};

