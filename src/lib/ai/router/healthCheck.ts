// src/lib/ai/router/healthCheck.ts
import type { ModelProviderName, ProviderHealth } from "./types";
import { MODEL_CONFIG } from "./modelConfig";
import { modelRouter } from "./modelRouter";

/**
 * Checks whether credentials are configured for each provider without leaking secrets.
 */
export function getProviderConfigurationStatus(): Record<ModelProviderName, { isConfigured: boolean; model: string }> {
  return {
    gemini: {
      isConfigured: Boolean(MODEL_CONFIG.keys.gemini().trim()),
      model: MODEL_CONFIG.defaults.geminiModel,
    },
    groq: {
      isConfigured: Boolean(MODEL_CONFIG.keys.groq().trim()),
      model: MODEL_CONFIG.defaults.groqModel,
    },
    openrouter: {
      isConfigured: Boolean(MODEL_CONFIG.keys.openrouter().trim()),
      model: MODEL_CONFIG.defaults.openrouterModel,
    },
  };
}

/**
 * Runs a lightweight live health check against a designated provider.
 * Never prints or returns API keys.
 */
export async function checkProviderHealth(provider: ModelProviderName): Promise<ProviderHealth> {
  const adapter = modelRouter.getAdapter(provider);

  if (!adapter || !adapter.isConfigured()) {
    return {
      provider,
      status: "missing_key",
      model:
        provider === "gemini"
          ? MODEL_CONFIG.defaults.geminiModel
          : provider === "groq"
          ? MODEL_CONFIG.defaults.groqModel
          : MODEL_CONFIG.defaults.openrouterModel,
      message: `${provider.toUpperCase()}_API_KEY is not configured in server environment.`,
    };
  }

  const model =
    provider === "gemini"
      ? MODEL_CONFIG.defaults.geminiModel
      : provider === "groq"
      ? MODEL_CONFIG.defaults.groqModel
      : MODEL_CONFIG.defaults.openrouterModel;

  const start = performance.now();
  try {
    const res = await adapter.generate({
      userPrompt: "Respond with the single word 'healthy'.",
      maxTokens: 5,
      temperature: 0,
      timeoutMs: 4000,
    });

    const latencyMs = Math.round(performance.now() - start);

    if (res.success) {
      return {
        provider,
        status: "configured",
        model,
        latencyMs,
        message: "Provider operational.",
      };
    }

    if (res.error?.type === "AUTH_ERROR") {
      return {
        provider,
        status: "authentication_failed",
        model,
        latencyMs,
        message: "Authentication rejected by provider API.",
      };
    }

    if (res.error?.type === "RATE_LIMIT") {
      return {
        provider,
        status: "rate_limited",
        model,
        latencyMs,
        message: "Provider quota or rate limit exceeded.",
      };
    }

    return {
      provider,
      status: "unavailable",
      model,
      latencyMs,
      message: res.error?.message || "Provider service error.",
    };
  } catch (err: unknown) {
    const latencyMs = Math.round(performance.now() - start);
    return {
      provider,
      status: "unavailable",
      model,
      latencyMs,
      message: err instanceof Error ? err.message : "Health check connection failed.",
    };
  }
}
