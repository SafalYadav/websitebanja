// src/lib/ai/router/groqAdapter.ts
import type { ModelProviderAdapter, ModelRequest, ModelResponse } from "./types";
import { MODEL_CONFIG, sanitizeErrorOutput } from "./modelConfig";

export class GroqAdapter implements ModelProviderAdapter {
  readonly providerName = "groq" as const;

  isConfigured(): boolean {
    return Boolean(MODEL_CONFIG.keys.groq().trim());
  }

  async generate<T = unknown>(req: ModelRequest<T>): Promise<ModelResponse<T>> {
    const startTime = performance.now();
    const apiKey = MODEL_CONFIG.keys.groq().trim();
    const model = req.model || MODEL_CONFIG.defaults.groqModel;

    if (!apiKey) {
      return {
        success: false,
        provider: this.providerName,
        model,
        latencyMs: Math.round(performance.now() - startTime),
        error: {
          type: "AUTH_ERROR",
          message: "Groq API key is not configured in environment variables (GROQ_API_KEY).",
          statusCode: 401,
          retryable: false,
        },
      };
    }

    const timeoutMs = req.timeoutMs ?? MODEL_CONFIG.timeouts.fast;
    const controller = new AbortController();
    const timeoutTimer = setTimeout(() => controller.abort(), timeoutMs);
    if (typeof timeoutTimer.unref === "function") timeoutTimer.unref();

    try {
      const messages: Array<{ role: "system" | "user"; content: string }> = [];
      if (req.systemPrompt) {
        messages.push({ role: "system", content: req.systemPrompt });
      }
      messages.push({ role: "user", content: req.userPrompt });

      const payload: Record<string, unknown> = {
        model,
        messages,
        temperature: req.temperature ?? 0.2,
      };

      if (typeof req.maxTokens === "number") {
        payload.max_tokens = req.maxTokens;
      }

      if (req.responseSchema || req.zodSchema) {
        payload.response_format = { type: "json_object" };
      }

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutTimer);
      const latencyMs = Math.round(performance.now() - startTime);

      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        const safeMessage = sanitizeErrorOutput(errorText || `Groq API responded with status ${res.status}`);

        const isRateLimit = res.status === 429;
        const isAuth = res.status === 401 || res.status === 403;

        return {
          success: false,
          provider: this.providerName,
          model,
          latencyMs,
          error: {
            type: isRateLimit ? "RATE_LIMIT" : isAuth ? "AUTH_ERROR" : "PROVIDER_UNAVAILABLE",
            message: safeMessage,
            statusCode: res.status,
            retryable: isRateLimit || res.status >= 500,
          },
        };
      }

      const json = await res.json();
      const rawText = json.choices?.[0]?.message?.content ?? "";
      const tokensUsed = {
        prompt: json.usage?.prompt_tokens,
        completion: json.usage?.completion_tokens,
        total: json.usage?.total_tokens,
      };

      if (req.responseSchema || req.zodSchema) {
        try {
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
                tokensUsed,
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
              tokensUsed,
              provider: this.providerName,
              model,
              latencyMs,
            };
          }

          return {
            success: true,
            data: parsedJson as T,
            rawText,
            tokensUsed,
            provider: this.providerName,
            model,
            latencyMs,
          };
        } catch (parseErr) {
          return {
            success: false,
            rawText,
            tokensUsed,
            provider: this.providerName,
            model,
            latencyMs,
            error: {
              type: "PARSE_ERROR",
              message: `Failed to parse Groq response as JSON: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`,
              retryable: false,
            },
          };
        }
      }

      return {
        success: true,
        data: rawText as unknown as T,
        rawText,
        tokensUsed,
        provider: this.providerName,
        model,
        latencyMs,
      };
    } catch (err: unknown) {
      clearTimeout(timeoutTimer);
      const latencyMs = Math.round(performance.now() - startTime);
      const rawErrorMsg = err instanceof Error ? err.message : String(err);
      const safeMessage = sanitizeErrorOutput(rawErrorMsg);

      const isTimeout = err instanceof Error && (err.name === "AbortError" || /aborted|timed out/i.test(safeMessage));

      return {
        success: false,
        provider: this.providerName,
        model,
        latencyMs,
        error: {
          type: isTimeout ? "TIMEOUT" : "PROVIDER_UNAVAILABLE",
          message: isTimeout ? `Groq request timed out after ${timeoutMs}ms` : safeMessage,
          statusCode: isTimeout ? 504 : 500,
          retryable: isTimeout,
        },
      };
    }
  }
}
