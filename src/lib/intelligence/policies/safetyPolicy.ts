// src/lib/intelligence/policies/safetyPolicy.ts
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";
import type { ToolPermissionLevel, ExecutiveContext } from "../executive/executiveTypes";

export interface ExecutionBounds {
  maxDurationMs: number;
  maxToolCalls: number;
  maxDelegationDepth: number;
  maxRetries: number;
  maxConsecutiveIdenticalFailures: number;
}

export const DEFAULT_EXECUTION_BOUNDS: ExecutionBounds = {
  maxDurationMs: 60_000, // 60 seconds
  maxToolCalls: 10,
  maxDelegationDepth: 3,
  maxRetries: 3,
  maxConsecutiveIdenticalFailures: 2,
};

export class SafetyPolicyViolationError extends Error {
  public code: string;
  public details?: Record<string, unknown>;

  constructor(message: string, code = "SAFETY_VIOLATION", details?: Record<string, unknown>) {
    super(message);
    this.name = "SafetyPolicyViolationError";
    this.code = code;
    this.details = details;
  }
}

/**
 * Tracks action signatures to detect infinite loops or repeated failures.
 */
export class LoopDetector {
  private history: Array<{ signature: string; success: boolean }> = [];

  private hashSignature(type: "agent" | "tool", name: string, params: Record<string, unknown>): string {
    const sortedKeys = Object.keys(params).sort();
    const normalizedParams = sortedKeys.reduce<Record<string, unknown>>((acc, key) => {
      // Ignore transient identifiers
      if (!["timestamp", "runId", "requestId"].includes(key)) {
        acc[key] = params[key];
      }
      return acc;
    }, {});

    return `${type}:${name.toLowerCase()}:${JSON.stringify(normalizedParams)}`;
  }

  public recordAttempt(type: "agent" | "tool", name: string, params: Record<string, unknown>, success: boolean): void {
    const signature = this.hashSignature(type, name, params);
    this.history.push({ signature, success });
  }

  public checkLoop(
    type: "agent" | "tool",
    name: string,
    params: Record<string, unknown>,
    maxConsecutiveFailures = 2
  ): boolean {
    const signature = this.hashSignature(type, name, params);
    let consecutiveFailures = 0;

    for (let i = this.history.length - 1; i >= 0; i--) {
      const item = this.history[i];
      if (item.signature === signature) {
        if (!item.success) {
          consecutiveFailures++;
          if (consecutiveFailures >= maxConsecutiveFailures) {
            return true; // Loop detected
          }
        } else {
          break; // Succeeded previously
        }
      }
    }

    return false;
  }

  public clear(): void {
    this.history = [];
  }
}

/**
 * Validates whether a tool execution is permissible under current executive context.
 */
export function validateToolSafety(
  toolName: string,
  permissionLevel: ToolPermissionLevel,
  params: Record<string, unknown>,
  context: ExecutiveContext,
  bounds: ExecutionBounds = DEFAULT_EXECUTION_BOUNDS
): { allowed: boolean; reason?: string } {
  // 1. WhatsApp is strictly and permanently disabled in production and staging
  if (
    toolName.toLowerCase().includes("whatsapp") ||
    params.channel === "whatsapp" ||
    params.platform === "whatsapp"
  ) {
    return {
      allowed: false,
      reason: "WhatsApp outbound communication is strictly disabled in WebsiteBanja safety policy.",
    };
  }

  // 2. High-risk / External write tools require explicit authorization
  if (permissionLevel === "HIGH_RISK_ACTION" || permissionLevel === "WRITE_EXTERNAL") {
    if (!context.allowExternalWrite) {
      return {
        allowed: false,
        reason: `Action '${toolName}' requires allowExternalWrite authorization flag. Automated external dispatch is blocked.`,
      };
    }

    // Auto-send emails without approval is strictly blocked
    if (toolName.toLowerCase().includes("send_outreach") || toolName.toLowerCase().includes("email_send")) {
      if (context.requireHumanApproval) {
        return {
          allowed: false,
          reason: "Real outbound email sending requires explicit human approval. Auto-send is disabled.",
        };
      }
    }
  }

  // 3. Execution time bound check
  const elapsed = Date.now() - context.startTime;
  if (elapsed > bounds.maxDurationMs) {
    return {
      allowed: false,
      reason: `Execution duration exceeded timeout limit (${bounds.maxDurationMs}ms). Current elapsed: ${elapsed}ms.`,
    };
  }

  return { allowed: true };
}

/**
 * Cleans sensitive credentials and tokens from data structures.
 */
export function sanitizeParameters(params: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(params)) {
    if (typeof val === "string") {
      sanitized[key] = sanitizeErrorOutput(val);
    } else if (typeof val === "object" && val !== null) {
      try {
        sanitized[key] = JSON.parse(sanitizeErrorOutput(JSON.stringify(val)));
      } catch {
        sanitized[key] = sanitizeErrorOutput(String(val));
      }
    } else {
      sanitized[key] = val;
    }
  }
  return sanitized;
}
