import OpenAI from "openai";
import { MODEL_CONFIG } from "@/lib/ai/router/modelConfig";

export const OPENAI_GENERATION_MODEL = MODEL_CONFIG.defaults.generationModel;

let _client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || "missing-openai-key",
    });
  }
  return _client;
}

export const openai: OpenAI = new Proxy({} as OpenAI, {
  get(_target, prop, receiver) {
    const client = getOpenAIClient();
    const value = Reflect.get(client, prop, receiver);
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});