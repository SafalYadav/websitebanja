// src/lib/ai/providerFactory.ts
import 'dotenv/config'; // Load environment variables

import { OpenAIProvider } from './openaiProvider';
import { GeminiProvider } from './geminiProvider';
import type { ModelProvider } from './provider';

/**
 * Factory to create the appropriate LLM provider based on environment.
 * Defaults to OpenAI.
 */
export class ProviderFactory {
  static create(): ModelProvider {
    const provider = process.env.AI_PROVIDER ?? 'openai';
    switch (provider.toLowerCase()) {
      case 'gemini':
        return new GeminiProvider();
      case 'openai':
      default:
        return new OpenAIProvider();
    }
  }
}
