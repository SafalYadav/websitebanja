// src/lib/ai/router/modelConfig.ts
import type { ModelProviderName, RoutingPolicy } from "./types";

/**
 * Secret-stripping sanitizer for error logs and telemetry.
 * Ensures no API key, bearer token, or auth header ever leaks into logs, databases, or client responses.
 */
export function sanitizeErrorOutput(text: string): string {
  if (!text) return "";
  return text
    // Strip Authorization / Bearer tokens
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [REDACTED]")
    // Strip OpenAI / Groq / OpenRouter style keys (sk-..., gsk_...)
    .replace(/\b(sk-[A-Za-z0-9_-]{12,}|gsk_[A-Za-z0-9_-]{12,})\b/g, "[REDACTED_API_KEY]")
    // Strip Gemini keys (AIzaSy...)
    .replace(/\bAIzaSy[A-Za-z0-9_-]{20,}\b/g, "[REDACTED_GEMINI_KEY]")
    // Strip generic query param keys (?key=..., &key=..., ?api_key=...)
    .replace(/([?&](?:api_)?key=)[^& \s]+/gi, "$1[REDACTED]")
    // Strip database connection strings with passwords
    .replace(/(postgres(?:ql)?:\/\/[^:]+:)[^@]+(@)/gi, "$1[REDACTED]$2")
    // Strip inline password/pwd key-value pairs
    .replace(/(?:password|pwd)\s*[=:]\s*['"][^'"]+['"]/gi, "password='[REDACTED]'");
}

/**
 * Centralized agent model configurations.
 * Reads environment variables dynamically so model targets can be tuned without code changes.
 */
export const MODEL_CONFIG = {
  // Provider API Keys (server-side only)
  keys: {
    gemini: () =>
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.GOOGLE_GENAI_API_KEY ||
      "",
    groq: () => process.env.GROQ_API_KEY || "",
    openrouter: () => process.env.OPENROUTER_API_KEY || "",
  },

  // Default models per provider
  defaults: {
    geminiModel: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    groqModel: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
    openrouterModel: process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct:free",
  },

  // Timeouts (milliseconds)
  timeouts: {
    fast: 4000,      // Quick classifications (Skills Agent)
    standard: 8000,  // Standard multi-step reasoning
    deep: 15000,     // AST analysis and comparisons (Uniqueness Agent)
  },

  // Pre-configured routing policies for future agent roles
  agentPolicies: {
    /**
     * Skills Agent: Requires sub-second classification speed.
     * Primary: Groq (LPU speed) -> Fallback: Gemini Flash -> Fallback: OpenRouter
     */
    skills: (): RoutingPolicy => ({
      primaryProvider: (process.env.SKILLS_AGENT_PROVIDER as ModelProviderName) || "groq",
      primaryModel: process.env.SKILLS_AGENT_MODEL || "llama-3.3-70b-versatile",
      fallbacks: [
        { provider: "gemini", model: process.env.GEMINI_MODEL || "gemini-2.5-flash" },
        { provider: "openrouter", model: process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct:free" },
      ],
      maxRetries: 1,
      timeoutMs: 5000,
    }),

    /**
     * Uniqueness Agent: Requires high context window to compare historical ASTs.
     * Primary: Gemini Flash (1M tokens context) -> Fallback: Groq -> Fallback: OpenRouter
     */
    uniqueness: (): RoutingPolicy => ({
      primaryProvider: (process.env.UNIQUENESS_AGENT_PROVIDER as ModelProviderName) || "gemini",
      primaryModel: process.env.UNIQUENESS_AGENT_MODEL || "gemini-2.5-flash",
      fallbacks: [
        { provider: "groq", model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile" },
        { provider: "openrouter", model: process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct:free" },
      ],
      maxRetries: 1,
      timeoutMs: 12000,
    }),

    /**
     * Mitra: Conversational AI Partner & Voice Assistant.
     * Primary: Gemini Flash (fast, low cost, native multilingual understanding)
     * Fallback: OpenRouter (open-source Llama-3.3)
     * Optional Fallback: Groq (if explicitly enabled)
     * Zero OpenAI / GPT fallback!
     */
    mitra: (): RoutingPolicy => {
      const fallbacks: Array<{ provider: ModelProviderName; model?: string }> = [
        {
          provider: (process.env.MITRA_FALLBACK_PROVIDER as ModelProviderName) || "openrouter",
          model: process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct:free",
        },
      ];

      // Groq is optional only if explicitly enabled or if GROQ_API_KEY is available and enabled
      if (process.env.MITRA_ENABLE_GROQ_FALLBACK === "true") {
        fallbacks.push({
          provider: "groq",
          model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
        });
      }

      return {
        primaryProvider: (process.env.MITRA_PRIMARY_PROVIDER as ModelProviderName) || "gemini",
        primaryModel: process.env.MITRA_PRIMARY_MODEL || process.env.GEMINI_MODEL || "gemini-2.5-flash",
        fallbacks,
        maxRetries: 1,
        timeoutMs: 8000,
      };
    },

    /**
     * Boss Agent: Read + Analyze + Report + Recommend.
     * Primary: Gemini -> Fallback: OpenRouter -> Optional Fallback: Groq
     * Zero OpenAI / GPT models!
     */
    boss: (): RoutingPolicy => {
      const fallbacks: Array<{ provider: ModelProviderName; model?: string }> = [
        {
          provider: (process.env.BOSS_FALLBACK_PROVIDER as ModelProviderName) || "openrouter",
          model: process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct:free",
        },
      ];

      if (process.env.BOSS_ENABLE_GROQ_FALLBACK === "true" || process.env.GROQ_API_KEY) {
        fallbacks.push({
          provider: "groq",
          model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
        });
      }

      return {
        primaryProvider: (process.env.BOSS_AGENT_PROVIDER as ModelProviderName) || "gemini",
        primaryModel: process.env.BOSS_AGENT_MODEL || process.env.GEMINI_MODEL || "gemini-2.5-flash",
        fallbacks,
        maxRetries: 1,
        timeoutMs: 12000,
      };
    },
  },
};
