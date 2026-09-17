// src/lib/ai/agent/providerFactory.ts

import { GeminiProvider } from "./../geminiProvider";
import type { ModelProvider } from "../provider";

/**
 * Factory to obtain a ModelProvider for agent layers based on environment configuration.
 * Model Policy Invariant: Agent systems NEVER use OpenAI/GPT.
 * Defaults strictly to GeminiProvider.
 */
export function getModelProvider(): ModelProvider {
  const hasGemini = !!process.env.GEMINI_API_KEY || !!process.env.GOOGLE_API_KEY || !!process.env.GOOGLE_GENAI_API_KEY;
  if (hasGemini) {
    return new GeminiProvider();
  }
  // If agent credentials are not configured, fallback to GeminiProvider (which throws descriptive error on execute)
  return new GeminiProvider();
}
