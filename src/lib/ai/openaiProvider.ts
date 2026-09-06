// src/lib/ai/openaiProvider.ts

import OpenAI from 'openai';
import type { ModelProvider, Message, ModelResponse, GenerateOptions } from './provider';

/**
 * OpenAI implementation of the generic ModelProvider.
 */
export class OpenAIProvider implements ModelProvider {
  /** Indicates native tool calling support */
  readonly supportsToolCalls = true;

  private client: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required for OpenAIProvider');
    }
    this.client = new OpenAI({ apiKey });
  }

  /**
   * Generate a response using OpenAI's native tool calling API.
   * Passes `tools` and `tool_choice` from options if provided.
   */
  async generate(messages: Message[], options?: GenerateOptions): Promise<ModelResponse> {
    // Convert to OpenAI SDK message params, filtering out tool role messages.
    const apiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = messages
      .filter((m) => m.role !== 'tool')
      .map((m) => {
        // Types for system, user, assistant are covered by the SDK.
        return { role: m.role as any, content: m.content };
      });

    // Build request payload with optional tool definitions.
    const requestPayload: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      messages: apiMessages,
      max_tokens: options?.maxTokens,
      temperature: options?.temperature,
    } as any;

    // Attach native tool calling fields if supplied.
    if ((options as any)?.tools) {
      (requestPayload as any).tools = (options as any).tools;
    }
    if ((options as any)?.toolChoice) {
      (requestPayload as any).tool_choice = (options as any).toolChoice;
    }
    if ((options as any)?.jsonMode || (options as any)?.responseFormat) {
      (requestPayload as any).response_format = (options as any)?.responseFormat ?? { type: 'json_object' };
    }

    const response = await this.client.chat.completions.create(requestPayload);
    const choice = response.choices?.[0];
    let text = choice?.message?.content ?? '';
    let toolCall: any | undefined;

    // OpenAI returns tool calls under choice.message.tool_calls when finish_reason is 'tool_calls'.
    if (choice?.message?.tool_calls?.length) {
      const call = choice.message.tool_calls[0];
      // The SDK defines `function` property on tool call objects.
      const fn = (call as any).function;
      if (fn) {
        toolCall = {
          name: fn.name,
          arguments: JSON.parse(fn.arguments ?? '{}'),
        };
        // When a tool call is present we may omit text.
        text = '';
      }
    }

    if (!text && !toolCall) {
      text = 'No response from OpenAI model.';
    }

    return { text, toolCall };
  }

  parseToolCall(response: ModelResponse): any {
    return response.toolCall;
  }
}
