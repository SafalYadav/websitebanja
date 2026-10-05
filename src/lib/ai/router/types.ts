// src/lib/ai/router/types.ts
import { z } from "zod";

export type ModelProviderName = "gemini" | "groq" | "openrouter";

/**
 * Universal model request contract for all agents.
 * Provider-agnostic.
 */
export interface ModelRequest<TSchema = unknown> {
  /** System-level behavior prompt and constraints */
  systemPrompt?: string;

  /** User prompt or task input */
  userPrompt: string;
  /** Pixel evidence; requests with images must use a vision-capable provider. */
  images?: Array<{ mimeType: "image/png" | "image/jpeg"; data: string }>;

  /** Optional JSON schema for structured output enforcement */
  responseSchema?: Record<string, unknown>;

  /** Optional Zod validator for strong runtime parsing */
  zodSchema?: z.ZodType<TSchema>;

  /** Sampling temperature (0.0 = deterministic, 1.0 = creative) */
  temperature?: number;

  /** Maximum tokens for completion */
  maxTokens?: number;

  /** Timeout in milliseconds before aborting the request */
  timeoutMs?: number;

  /** Specific model identifier override (optional) */
  model?: string;

  /** Tracing and diagnostic metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Normalized model response contract returned by all provider adapters.
 */
export interface ModelResponse<T = unknown> {
  /** Indicates whether the generation and parsing succeeded */
  success: boolean;

  /** Structured parsed data (if JSON schema/zod validation requested) */
  data?: T;

  /** Raw text response from the model */
  rawText?: string;

  /** Provider that fulfilled the response */
  provider: ModelProviderName;

  /** Exact model identifier utilized */
  model: string;

  /** Total latency in milliseconds */
  latencyMs: number;

  /** Number of fallback providers attempted before success (0 = primary) */
  fallbackCount?: number;
  /** Actual provider invocations across retries and fallbacks. */
  attemptCount?: number;

  /** Token consumption if provided by upstream */
  tokensUsed?: {
    prompt?: number;
    completion?: number;
    total?: number;
  };

  /** Normalized error details if unsuccessful */
  error?: {
    type: "TIMEOUT" | "RATE_LIMIT" | "AUTH_ERROR" | "PARSE_ERROR" | "PROVIDER_UNAVAILABLE" | "UNKNOWN";
    message: string;
    statusCode?: number;
    retryable: boolean;
  };
}

/**
 * Provider-specific fallback configuration.
 */
export interface FallbackTarget {
  provider: ModelProviderName;
  model?: string;
}

/**
 * Routing policy for an agent invocation.
 */
export interface RoutingPolicy {
  /** Primary provider to attempt first */
  primaryProvider: ModelProviderName;

  /** Primary model name */
  primaryModel?: string;

  /** Ordered list of fallback targets */
  fallbacks?: FallbackTarget[];

  /** Max retries for transient errors (429, 503, network) per provider */
  maxRetries?: number;
  /** Whole invocation cap, not a per-provider budget. */
  maxTotalAttempts?: number;
  /** Invalid/auth/unknown failures must not be hidden by another provider. */
  stopOnNonTransient?: boolean;

  /** Overall timeout in milliseconds */
  timeoutMs?: number;
}

/**
 * Standard contract that every Model Provider Adapter must implement.
 */
export interface ModelProviderAdapter {
  readonly providerName: ModelProviderName;

  /** Checks whether the provider credentials are configured in server environment */
  isConfigured(): boolean;

  /** Executes a model generation request */
  generate<T = unknown>(req: ModelRequest<T>): Promise<ModelResponse<T>>;
}

/**
 * Health check status of a model provider.
 */
export interface ProviderHealth {
  provider: ModelProviderName;
  status: "configured" | "missing_key" | "rate_limited" | "authentication_failed" | "unavailable";
  model: string;
  latencyMs?: number;
  message?: string;
}
