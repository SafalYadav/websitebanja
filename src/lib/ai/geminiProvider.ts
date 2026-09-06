// src/lib/ai/geminiProvider.ts

// Server‑side import for the Gemini SDK (Node)
import { GoogleGenAI } from '@google/genai';
import type { ModelProvider, Message, ModelResponse, GenerateOptions } from './provider';

/**
 * Gemini implementation of the generic ModelProvider.
 * Uses the new @google/genai SDK which supports native function calling.
 */
export class GeminiProvider implements ModelProvider {
  readonly supportsToolCalls = true;

  private client: GoogleGenAI;

  constructor() {
    const rawKey =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.GOOGLE_GENAI_API_KEY;
    if (!rawKey) {
      throw new Error('GEMINI_API_KEY environment variable is required for GeminiProvider');
    }
    const apiKey = rawKey.trim().replace(/^["']|["']$/g, '').replace(/^Bearer\s+/i, '');
    this.client = new GoogleGenAI({ apiKey, vertexai: false });
  }

  async generate(messages: Message[], options?: GenerateOptions): Promise<ModelResponse> {
    const model = process.env.GEMINI_MODEL ?? 'gemini-3.6-flash';

    // Separate system instruction from other messages
    const systemMsg = messages.find((m) => m.role === 'system');
    const userAssistantMsgs = messages.filter((m) => m.role !== 'system');
    const geminiMessages = userAssistantMsgs.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const config: any = {};
    if (systemMsg) {
      config.systemInstruction = systemMsg.content;
    }
    if ((options as any)?.tools) {
      config.tools = (options as any).tools;
    }
    if ((options as any)?.jsonMode || (options as any)?.responseMimeType) {
      config.responseMimeType = (options as any)?.responseMimeType ?? 'application/json';
    }

    const response = await this.client.models.generateContent({
      model,
      contents: geminiMessages,
      config: Object.keys(config).length > 0 ? config : undefined,
    });

    let text = response.text ?? '';
    let toolCall: any | undefined;

    if (response.functionCalls && response.functionCalls.length > 0) {
      const fnCall = response.functionCalls[0];
      toolCall = {
        name: fnCall.name,
        arguments: typeof fnCall.args === 'string' ? JSON.parse(fnCall.args) : (fnCall.args ?? {}),
      };
    }

    if (!text && !toolCall) {
      const candidates = response.candidates ?? [];
      const err = new Error('Gemini model returned empty response');
      (err as any).details = JSON.stringify({ candidatesCount: candidates.length });
      throw err;
    }

    return { text, toolCall };
  }

  parseToolCall(response: ModelResponse): any {
    return response.toolCall;
  }
}
