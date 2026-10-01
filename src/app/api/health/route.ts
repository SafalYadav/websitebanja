// src/app/api/health/route.ts
/**
 * WebsiteBanja AI — System Health & Operational Probe Endpoint
 * Phase: Phase 24 (Production Infrastructure)
 *
 * Implements standard health check probe for Azure Container Apps, load balancers,
 * and automated uptime monitors.
 *
 * Security & Information Disclosure Invariants:
 *   - NEVER exposes API keys, database passwords, tokens, or connection strings.
 *   - Reports dependency readiness: database, storage, n8n Ops Agent.
 *   - Returns HTTP 200 for healthy or degraded with graceful fallback.
 *   - Returns HTTP 503 only if a fatal non-recoverable internal error occurs.
 */

import { NextResponse } from "next/server";
import { getPool } from "@/lib/db/queries";
import { getDatabaseConfig } from "@/lib/db/config";
import { checkStorageHealth } from "@/lib/storage";
import { validateEnvironmentConfiguration } from "@/lib/infrastructure/environmentConfig";

export const dynamic = "force-dynamic";

export async function GET() {
  const startTime = performance.now();
  const envValidation = validateEnvironmentConfiguration();

  // 1. Database Health Check (non-blocking query probe)
  let databaseStatus: "healthy" | "degraded" | "unconfigured" = "unconfigured";
  let databaseLatencyMs: number | undefined;

  const dbConfig = getDatabaseConfig();
  if (dbConfig.isAzureConfigured) {
    try {
      const dbStart = performance.now();
      const pool = getPool();
      // Run quick lightweight ping with 3s timeout
      await Promise.race([
        pool.query("SELECT 1 AS health_check"),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Database health check timed out")), 3000)),
      ]);
      databaseLatencyMs = Math.round(performance.now() - dbStart);
      databaseStatus = "healthy";
    } catch {
      // Degraded: application has local memory/scratch fallback
      databaseStatus = "degraded";
    }
  }

  // 2. Storage Health Check
  let storageStatus: "healthy" | "degraded" | "unconfigured" = "unconfigured";
  try {
    const storageHealth = await checkStorageHealth();
    storageStatus = storageHealth.status;
  } catch {
    storageStatus = "degraded";
  }

  // 3. n8n Ops Agent Probe
  const n8nWebhookUrl = process.env.N8N_OPS_AGENT_WEBHOOK_URL || process.env.N8N_WEBHOOK_URL;
  const isProd = envValidation.mode === "production";
  const isLocalhostN8n = Boolean(n8nWebhookUrl && /localhost|127\.0\.0\.1/i.test(n8nWebhookUrl));

  let n8nStatus: "configured" | "unconfigured" | "local_fallback" = "local_fallback";
  if (n8nWebhookUrl && (!isProd || !isLocalhostN8n)) {
    n8nStatus = "configured";
  }

  // 4. Overall Health Determination
  const isHealthy = envValidation.valid && databaseStatus !== "degraded";
  const overallStatus = isHealthy ? "healthy" : "degraded";
  const statusCode = 200;

  const responsePayload = {
    status: overallStatus,
    service: "websitebanja",
    version: "0.1.0",
    environment: envValidation.mode,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    durationMs: Math.round(performance.now() - startTime),
    dependencies: {
      database: {
        status: databaseStatus,
        provider: "azure_postgresql",
        latencyMs: databaseLatencyMs,
      },
      storage: {
        status: storageStatus,
        provider: "azure_blob_storage",
      },
      n8n: {
        status: n8nStatus,
        mode: n8nStatus === "configured" ? "webhook" : "local_executor_loop",
      },
    },
    safety: {
      whatsAppDisabled: envValidation.infrastructure.whatsAppDisabled,
      humanApprovalEnforced: envValidation.infrastructure.humanApprovalEnforced,
    },
  };

  return NextResponse.json(responsePayload, {
    status: statusCode,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Content-Type": "application/json",
    },
  });
}

export async function HEAD() {
  return new Response(null, {
    status: 200,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
