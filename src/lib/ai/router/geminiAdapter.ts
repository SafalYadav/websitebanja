// src/lib/ai/router/geminiAdapter.ts
import { GoogleGenAI } from "@google/genai";
import type { ModelProviderAdapter, ModelRequest, ModelResponse } from "./types";
import { MODEL_CONFIG, sanitizeErrorOutput } from "./modelConfig";

export class GeminiAdapter implements ModelProviderAdapter {
  readonly providerName = "gemini" as const;

  isConfigured(): boolean {
    return Boolean(MODEL_CONFIG.keys.gemini().trim());
  }

  async generate<T = unknown>(req: ModelRequest<T>): Promise<ModelResponse<T>> {
    const startTime = performance.now();
    const apiKey = MODEL_CONFIG.keys.gemini().trim();
    const model = req.model || MODEL_CONFIG.defaults.geminiModel;

    if (!apiKey) {
      return {
        success: false,
        provider: this.providerName,
        model,
        latencyMs: Math.round(performance.now() - startTime),
        error: {
          type: "AUTH_ERROR",
          message: "Gemini API key is not configured in environment variables (GEMINI_API_KEY).",
          statusCode: 401,
          retryable: false,
        },
      };
    }

    const timeoutMs = req.timeoutMs ?? MODEL_CONFIG.timeouts.standard;
    const timeoutPromise = new Promise<never>((_, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Gemini request timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      if (typeof timer.unref === "function") timer.unref();
    });

    try {
      const client = new GoogleGenAI({ apiKey, vertexai: false });

      // Build generation config
      const config: Record<string, unknown> = {};
      if (req.systemPrompt) {
        config.systemInstruction = req.systemPrompt;
      }
      if (typeof req.temperature === "number") {
        config.temperature = req.temperature;
      }
      if (typeof req.maxTokens === "number") {
        config.maxOutputTokens = req.maxTokens;
      }

      // If JSON structured output is expected
      if (req.responseSchema || req.zodSchema) {
        config.responseMimeType = "application/json";
        if (req.responseSchema) {
          config.responseSchema = req.responseSchema;
        }
      }

      const contents = [{ role: "user", parts: [
        { text: req.userPrompt },
        ...(req.images || []).map(image => ({ inlineData: image })),
      ] }];

      const apiCall = client.models.generateContent({
        model,
        contents,
        config: Object.keys(config).length > 0 ? config : undefined,
      });

      const response = await Promise.race([apiCall, timeoutPromise]);
      const latencyMs = Math.round(performance.now() - startTime);

      const rawText = response.text ?? "";

      // Structured output parsing if requested
      if (req.responseSchema || req.zodSchema) {
        try {
          // Clean potential markdown fences e.g. ```json ... ```
          let cleaned = rawText.trim();
          if (cleaned.startsWith("```")) {
            cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
          }

          const parsedJson = JSON.parse(cleaned);

          if (req.zodSchema) {
            const validation = req.zodSchema.safeParse(parsedJson);
            if (!validation.success) {
              return {
                success: false,
                rawText,
                provider: this.providerName,
                model,
                latencyMs,
                error: {
                  type: "PARSE_ERROR",
                  message: `Zod schema validation failed: ${validation.error.message}`,
                  retryable: false,
                },
              };
            }
            return {
              success: true,
              data: validation.data as T,
              rawText,
              provider: this.providerName,
              model,
              latencyMs,
            };
          }

          return {
            success: true,
            data: parsedJson as T,
            rawText,
            provider: this.providerName,
            model,
            latencyMs,
          };
        } catch (parseErr) {
          return {
            success: false,
            rawText,
            provider: this.providerName,
            model,
            latencyMs,
            error: {
              type: "PARSE_ERROR",
              message: `Failed to parse response as JSON: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`,
              retryable: false,
            },
          };
        }
      }

      return {
        success: true,
        data: rawText as unknown as T,
        rawText,
        provider: this.providerName,
        model,
        latencyMs,
      };
    } catch (err: unknown) {
      const latencyMs = Math.round(performance.now() - startTime);
      const rawErrorMsg = err instanceof Error ? err.message : String(err);
      const safeMessage = sanitizeErrorOutput(rawErrorMsg);

      const isTimeout = /timed out/i.test(safeMessage);
      const isRateLimit = /429|quota|rate limit/i.test(safeMessage);
      const isAuth = /401|403|unauthorized|api key/i.test(safeMessage);

      return {
        success: false,
        provider: this.providerName,
        model,
        latencyMs,
        error: {
          type: isTimeout ? "TIMEOUT" : isRateLimit ? "RATE_LIMIT" : isAuth ? "AUTH_ERROR" : "PROVIDER_UNAVAILABLE",
          message: safeMessage,
          statusCode: isRateLimit ? 429 : isAuth ? 401 : isTimeout ? 504 : 500,
          retryable: isRateLimit || isTimeout,
        },
      };
    }
  }
}
