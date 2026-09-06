// src/lib/ai/agent/providerFactory.ts

import { OpenAIProvider } from "./../openaiProvider";
import { GeminiProvider } from "./../geminiProvider";
import type { ModelProvider } from "../provider";

/**
 * Factory to obtain a ModelProvider based on environment configuration.
 * Prefer OpenAI if OPENAI_API_KEY is defined, otherwise fall back to Gemini if GEMINI_API_KEY is defined.
 * If neither is present, throws an error.
 *
 * The function documentation also explains the @ts-ignore workaround for Gemini SDK types.
 */
export function getModelProvider(): ModelProvider {
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasGemini = !!process.env.GEMINI_API_KEY;
  if (hasOpenAI) {
    return new OpenAIProvider();
  }
  if (hasGemini) {
    // The Gemini SDK does not have TypeScript declarations in this project.
    // We provide a minimal declaration file (generative-ai.d.ts) with @ts-ignore to silence import errors.
    // This is a pragmatic solution; a type‑safe alternative would be to install @google/generative-ai
    // with proper types, but that would require a dependency change which is disallowed.
    return new GeminiProvider();
  }
  throw new Error("No LLM provider credentials configured. Set OPENAI_API_KEY or GEMINI_API_KEY.");
}
