import { GeminiProvider } from './geminiProvider';
import type { ModelProvider } from './provider';

/**
 * Factory for the conversational Agent.
 * It supports a primary provider and a fallback provider to be used only when the primary fails.
 * Configuration is via environment variables so it does not interfere with the website generator
 * which still uses the original ProviderFactory (controlled by AI_PROVIDER if present).
 */
/**
 * Factory for the conversational Agent.
 * Strict Policy: Agent systems do NOT use OpenAI.
 * Defaults to GeminiProvider.
 */
export class AgentProviderFactory {
  /** Create an instance of the primary provider (Gemini by default). */
  static createPrimary(): ModelProvider {
    const primary = process.env.AGENT_PRIMARY_PROVIDER ?? 'gemini';
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
      default:
        return new GeminiProvider();
      case 'openai':
        console.warn('[AgentProviderFactory] OpenAI is prohibited for agent systems. Falling back to GeminiProvider.');
        return new GeminiProvider();
    }
  }
}
