// src/lib/ai/mockProvider.ts

import type { ModelProvider, Message, ModelResponse, GenerateOptions } from './provider';

/**
 * Simple mock provider used when no real API keys are configured.
 * Returns a deterministic textual response so the rest of the system can operate.
 */
export class MockProvider implements ModelProvider {
  readonly supportsToolCalls = false;

  async generate(_messages: Message[], _options?: GenerateOptions): Promise<ModelResponse> {
    const reply = 'This is a mock response because no LLM provider is configured.';
    return { text: reply };
  }

  parseToolCall(_response: ModelResponse): any {
    return undefined;
  }
}
