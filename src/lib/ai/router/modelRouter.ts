// src/lib/ai/router/modelRouter.ts
import type {
  ModelProviderAdapter,
  ModelProviderName,
  ModelRequest,
  ModelResponse,
  RoutingPolicy,
} from "./types";
import { GeminiAdapter } from "./geminiAdapter";
import { GroqAdapter } from "./groqAdapter";
import { OpenRouterAdapter } from "./openRouterAdapter";
import { MODEL_CONFIG, sanitizeErrorOutput } from "./modelConfig";
import { emitAgentEvent } from "@/lib/telemetry/agentTelemetry";

/**
 * Registry of available model provider adapters.
 * Strictly Google Gemini, Groq, and OpenRouter for agents.
 * Never OpenAI / GPT!
 */
export class ModelRouter {
  private adapters: Map<ModelProviderName, ModelProviderAdapter> = new Map();

  constructor() {
    this.adapters.set("gemini", new GeminiAdapter());
    this.adapters.set("groq", new GroqAdapter());
    this.adapters.set("openrouter", new OpenRouterAdapter());
  }

  /**
   * Registers a custom or mocked adapter (useful for isolated unit testing).
   */
  registerAdapter(adapter: ModelProviderAdapter): void {
    this.adapters.set(adapter.providerName, adapter);
  }

  /**
   * Retrieves an adapter by name.
   */
  getAdapter(provider: ModelProviderName): ModelProviderAdapter | undefined {
    return this.adapters.get(provider);
  }

  /**
   * Routes a model request through a primary provider with intelligent fallback progression.
   *
   * Fallback Progression:
   * 1. Attempt primary provider.
   * 2. If transient failure (rate limit / timeout) and retries > 0, retry once with backoff.
   * 3. If primary fails, proceed sequentially to fallback providers.
   * 4. If all configured providers fail, return clean normalized error.
   * 5. Zero OpenAI / GPT fallback!
   */
  async route<T = unknown>(
    req: ModelRequest<T>,
    customPolicy?: Partial<RoutingPolicy>
  ): Promise<ModelResponse<T>> {
    const totalStart = performance.now();

    const policy: RoutingPolicy = {
      primaryProvider: customPolicy?.primaryProvider || "gemini",
      primaryModel: customPolicy?.primaryModel,
      fallbacks: customPolicy?.fallbacks ?? [
        { provider: "groq" },
        { provider: "openrouter" },
      ],
      maxRetries: customPolicy?.maxRetries ?? 1,
      timeoutMs: customPolicy?.timeoutMs ?? req.timeoutMs ?? MODEL_CONFIG.timeouts.standard,
    };

    // Construct execution pipeline: [Primary, ...Fallbacks]
    const pipeline: Array<{ provider: ModelProviderName; model?: string }> = [
      { provider: policy.primaryProvider, model: policy.primaryModel },
      ...(policy.fallbacks || []),
    ];

    let lastErrorResponse: ModelResponse<T> | null = null;
    const errorsEncountered: string[] = [];

    const agentName = (req.metadata?.agent as string) || "mitra";
    const requestId = (req.metadata?.requestId as string) || (req.metadata?.runId as string);
    const projectId = req.metadata?.projectId as string;
    const userId = req.metadata?.userId as string;

    for (let i = 0; i < pipeline.length; i++) {
      const target = pipeline[i];
      const adapter = this.adapters.get(target.provider);

      if (!adapter) {
        errorsEncountered.push(`Provider '${target.provider}' is not registered`);
        continue;
      }

      if (!adapter.isConfigured()) {
        errorsEncountered.push(`Provider '${target.provider}' has no API key configured`);
        continue;
      }

      const effectiveReq: ModelRequest<T> = {
        ...req,
        model: target.model || req.model,
        timeoutMs: policy.timeoutMs,
      };

      // Emit provider_call telemetry
      emitAgentEvent({
        event: "agent.provider_call",
        agent: agentName,
        requestId,
        projectId,
        userId,
        provider: target.provider,
        model: target.model || req.model || "default",
        status: "running",
      });

      // Attempt execution with transient retry
      let attempt = 0;
      const maxAttempts = 1 + (policy.maxRetries || 0);

      while (attempt < maxAttempts) {
        attempt++;
        const providerCallStart = performance.now();
        try {
          const response = await adapter.generate<T>(effectiveReq);
          const providerLatency = Math.round(performance.now() - providerCallStart);

          if (response.success) {
            emitAgentEvent({
              event: "agent.provider_success",
              agent: agentName,
              requestId,
              projectId,
              userId,
              provider: response.provider,
              model: response.model,
              status: "success",
              latencyMs: providerLatency,
            });

            return {
              ...response,
              fallbackCount: i,
              latencyMs: Math.round(performance.now() - totalStart),
            };
          }

          lastErrorResponse = response;
          const errorType = response.error?.type || "UNKNOWN";
          const errorMsg = response.error?.message || "Unknown error";
          errorsEncountered.push(`[${target.provider}:${response.model}] ${errorType}: ${errorMsg}`);

          emitAgentEvent({
            event: "agent.provider_error",
            agent: agentName,
            requestId,
            projectId,
            userId,
            provider: target.provider,
            model: response.model || target.model,
            status: "error",
            latencyMs: providerLatency,
            metadata: {
              error: sanitizeErrorOutput(errorMsg),
              errorType,
              fallback: i < pipeline.length - 1,
            },
          });

          // If error is retryable and we have attempts remaining, back off briefly
          if (response.error?.retryable && attempt < maxAttempts) {
            const backoffDelay = Math.min(attempt * 400, 1200);
            await new Promise((r) => setTimeout(r, backoffDelay));
            continue;
          }

          // If fallback is available, emit fallback event
          if (i < pipeline.length - 1) {
            const nextTarget = pipeline[i + 1];
            emitAgentEvent({
              event: "agent.fallback",
              agent: agentName,
              requestId,
              projectId,
              userId,
              provider: nextTarget.provider,
              model: nextTarget.model,
              status: "fallback",
              latencyMs: Math.round(performance.now() - totalStart),
              metadata: {
                fromProvider: target.provider,
                toProvider: nextTarget.provider,
                fallbackCount: i + 1,
                reason: sanitizeErrorOutput(errorMsg),
              },
            });
          }

          // Not retryable or attempts exhausted: move to next provider in fallback pipeline
          break;
        } catch (unhandledErr: unknown) {
          const safeMsg = sanitizeErrorOutput(
            unhandledErr instanceof Error ? unhandledErr.message : String(unhandledErr)
          );
          errorsEncountered.push(`[${target.provider}] Unhandled: ${safeMsg}`);

          emitAgentEvent({
            event: "agent.provider_error",
            agent: agentName,
            requestId,
            projectId,
            userId,
            provider: target.provider,
            model: target.model,
            status: "error",
            metadata: {
              error: safeMsg,
              unhandled: true,
              fallback: i < pipeline.length - 1,
            },
          });

          if (i < pipeline.length - 1) {
            const nextTarget = pipeline[i + 1];
            emitAgentEvent({
              event: "agent.fallback",
              agent: agentName,
              requestId,
              projectId,
              userId,
              provider: nextTarget.provider,
              model: nextTarget.model,
              status: "fallback",
              metadata: {
                fromProvider: target.provider,
                toProvider: nextTarget.provider,
                fallbackCount: i + 1,
                reason: safeMsg,
              },
            });
          }
          break;
        }
      }
    }

    // All providers in the pipeline failed: return controlled normalized error response
    const totalLatency = Math.round(performance.now() - totalStart);
    const combinedMessage = sanitizeErrorOutput(
      errorsEncountered.length > 0
        ? errorsEncountered.join(" | ")
        : "All configured model providers failed to respond."
    );

    emitAgentEvent({
      event: "agent.failed",
      agent: agentName,
      requestId,
      projectId,
      userId,
      status: "error",
      latencyMs: totalLatency,
      metadata: {
        error: combinedMessage,
      },
    });

    return {
      success: false,
      provider: lastErrorResponse?.provider || policy.primaryProvider,
      model: lastErrorResponse?.model || "unknown",
      latencyMs: totalLatency,
      fallbackCount: pipeline.length > 0 ? pipeline.length - 1 : 0,
      error: {
        type: "PROVIDER_UNAVAILABLE",
        message: combinedMessage,
        statusCode: lastErrorResponse?.error?.statusCode || 503,
        retryable: false,
      },
    };
  }
}

// Global router singleton instance
export const modelRouter = new ModelRouter();

/**
 * Universal helper for routing agent requests through the model router.
 */
export async function routeModelRequest<T = unknown>(
  req: ModelRequest<T>,
  policy?: Partial<RoutingPolicy>
): Promise<ModelResponse<T>> {
  return modelRouter.route<T>(req, policy);
}
