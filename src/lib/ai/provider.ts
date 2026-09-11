// src/lib/ai/provider.ts

/**
 * Generic interface for LLM model providers.
 * Implementations must expose a `generate` method that accepts a list of messages
 * and optional generation options, returning a structured response.
 */
export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
}

export interface GenerateOptions {
  /** Optional max tokens for the response */
  maxTokens?: number;
  /** Temperature for sampling */
  temperature?: number;
  /** Any provider‑specific configuration */
  [key: string]: unknown;
}

export interface ModelResponse {
  /** The raw text returned by the model */
  text?: string;
  /** If the model emitted a tool call, include the JSON payload here */
  toolCall?: any;
  /** Optional finishing reason */
  finishReason?: string;
}

export interface ModelProvider {
  /**
   * Does this provider support native tool/function calls?
   */
  readonly supportsToolCalls: boolean;

  /**
   * Generate a response from the model.
   * @param messages Conversation history (including system prompt).
   * @param options Generation options.
   */
  generate(messages: Message[], options?: GenerateOptions): Promise<ModelResponse>;

  /**
   * Parse a native tool/function call payload from the provider's response.
   * Returns the tool call object (must include `name` and `arguments`).
   * Should return undefined if no tool call is present.
   */
  parseToolCall?(response: ModelResponse): any;
}

