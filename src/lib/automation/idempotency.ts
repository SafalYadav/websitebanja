// src/lib/automation/idempotency.ts
/**
 * In-memory idempotency cache for WebsiteBanja Automation API
 * Phase: Phase 7 (n8n Automation Foundation)
 */

import type { AutomationPreviewResponse } from "./types";
import crypto from "crypto";

interface CachedEntry {
  response: AutomationPreviewResponse;
  timestamp: number;
}

const IDEMPOTENCY_TTL_MS = 15 * 60 * 1000; // 15 minutes
const idempotencyStore = new Map<string, CachedEntry>();

export function computeIdempotencyKey(key?: string, payload?: Record<string, unknown>): string {
  if (key && key.trim().length > 0) {
    return key.trim();
  }
  const serialized = JSON.stringify({
    name: payload?.businessName,
    placeId: payload?.placeId,
    ind: payload?.industry,
    desc: payload?.description,
    serv: payload?.services,
    loc: payload?.location,
  });
  return crypto.createHash("sha256").update(serialized).digest("hex").slice(0, 32);
}

export function getIdempotentResult(key: string): AutomationPreviewResponse | null {
  const entry = idempotencyStore.get(key);
  if (!entry) return null;

  if (Date.now() - entry.timestamp > IDEMPOTENCY_TTL_MS) {
    idempotencyStore.delete(key);
    return null;
  }

  return {
    ...entry.response,
    cached: true,
  };
}

export function setIdempotentResult(key: string, response: AutomationPreviewResponse): void {
  // Prune expired entries periodically
  if (idempotencyStore.size > 200) {
    const now = Date.now();
    for (const [k, v] of idempotencyStore.entries()) {
      if (now - v.timestamp > IDEMPOTENCY_TTL_MS) {
        idempotencyStore.delete(k);
      }
    }
  }

  idempotencyStore.set(key, {
    response,
    timestamp: Date.now(),
  });
}
