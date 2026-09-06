// src/lib/ai/agentProviderFactory.ts

import { OpenAIProvider } from './openaiProvider';
import { GeminiProvider } from './geminiProvider';
import type { ModelProvider } from './provider';

/**
 * Factory for the conversational Agent.
 * It supports a primary provider and a fallback provider to be used only when the primary fails.
 * Configuration is via environment variables so it does not interfere with the website generator
 * which still uses the original ProviderFactory (controlled by AI_PROVIDER if present).
 */
export class AgentProviderFactory {
  /** Create an instance of the primary provider (OpenAI by default). */
  static createPrimary(): ModelProvider {
    const primary = process.env.AGENT_PRIMARY_PROVIDER ?? 'openai';
    return this.createByName(primary);
  }

  /** Create an instance of the fallback provider (Gemini by default). */
  static createFallback(): ModelProvider {
    const fallback = process.env.AGENT_FALLBACK_PROVIDER ?? 'gemini';
    return this.createByName(fallback);
  }

  private static createByName(name: string): ModelProvider {
    switch (name.toLowerCase()) {
      case 'gemini':
        return new GeminiProvider();
      case 'openai':
      default:
        return new OpenAIProvider();
    }
  }
}
