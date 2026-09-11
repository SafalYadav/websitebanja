// src/lib/ai/uiux-pro-max/search/bm25.ts

/**
 * Official BM25 ranking algorithm implementation for UI/UX Pro Max in TypeScript.
 * Matches the upstream Python implementation in core.py.
 */

const STOPWORDS = new Set([
  "to", "in", "on", "at", "is", "of", "by", "or", "an", "if", "no", "so",
  "do", "be", "we", "it", "as", "the", "and", "for", "are", "was",
]);

const SYNONYMS: Record<string, string> = {
  "q&a": "question answer",
  "e-commerce": "ecommerce",
  "dark-mode": "dark",
  "darkmode": "dark",
  "light-mode": "light",
  "lightmode": "light",
  "a11y": "accessibility",
  "nav": "navigation",
  "sign-up": "signup",
  "log-in": "login",
  "colour": "color",
  "colours": "colors",
  "customisation": "customization",
  "organisation": "organization",
  "behaviour": "behavior",
  "ux/ui": "ux ui",
};

// Compile synonym regex patterns ordered longest-first
const SYNONYM_PATTERNS = Object.keys(SYNONYMS)
  .sort((a, b) => b.length - a.length)
  .map((variant) => ({
    pattern: new RegExp(`(?<!\\w)${variant.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?!\\w)`, "gi"),
    canonical: SYNONYMS[variant],
  }));

function normalize(text: string): string {
  let normalized = String(text);
  for (const { pattern, canonical } of SYNONYM_PATTERNS) {
    normalized = normalized.replace(pattern, canonical);
  }
  return normalized;
}

export class BM25 {
  public readonly k1: number;
  public readonly b: number;
  private corpus: string[][] = [];
  private docLengths: number[] = [];
  private avgdl: number = 1.0;
  private idf: Map<string, number> = new Map();
  private docFreqs: Map<string, number> = new Map();
  private termFreqs: Array<Map<string, number>> = [];
  public N: number = 0;

  constructor(k1 = 1.5, b = 0.75) {
    this.k1 = k1;
    this.b = b;
  }

  public tokenize(text: string): string[] {
    const norm = normalize(String(text).toLowerCase());
    const clean = norm.replace(/[^\w\s]/g, " ");
    return clean
      .split(/\s+/)
      .filter((w) => w.length >= 2 && !STOPWORDS.has(w));
  }

  public fit(documents: string[]): void {
    this.corpus = documents.map((doc) => this.tokenize(doc));
    this.N = this.corpus.length;
    if (this.N === 0) return;

    this.docLengths = this.corpus.map((doc) => doc.length);
    const sumLen = this.docLengths.reduce((acc, len) => acc + len, 0);
    this.avgdl = sumLen / this.N || 1.0;

    this.termFreqs = [];
    this.docFreqs.clear();
    this.idf.clear();

    for (const doc of this.corpus) {
      const tf = new Map<string, number>();
      for (const word of doc) {
        tf.set(word, (tf.get(word) || 0) + 1);
      }
      this.termFreqs.push(tf);
      for (const word of tf.keys()) {
        this.docFreqs.set(word, (this.docFreqs.get(word) || 0) + 1);
      }
    }

    for (const [word, freq] of this.docFreqs.entries()) {
      // BM25 standard Robertson-Spärck Jones IDF formula with add-1 smoothing
      const idfVal = Math.log((this.N - freq + 0.5) / (freq + 0.5) + 1);
      this.idf.set(word, idfVal);
    }
  }

  public score(query: string): Array<{ index: number; score: number }> {
    const queryTokens = this.tokenize(query);
    const scores: Array<{ index: number; score: number }> = [];

    for (let idx = 0; idx < this.N; idx++) {
      let docScore = 0;
      const docLen = this.docLengths[idx];
      const tfMap = this.termFreqs[idx];

      for (const token of queryTokens) {
        const idfVal = this.idf.get(token);
        if (idfVal !== undefined) {
          const tf = tfMap.get(token) || 0;
          const numerator = tf * (this.k1 + 1);
          const denominator = tf + this.k1 * (1 - this.b + (this.b * docLen) / this.avgdl);
          docScore += idfVal * (numerator / denominator);
        }
      }

      scores.push({ index: idx, score: docScore });
    }

    return scores.sort((a, b) => b.score - a.score);
  }

  public vocabulary(): string[] {
    return Array.from(this.idf.keys());
  }
}
