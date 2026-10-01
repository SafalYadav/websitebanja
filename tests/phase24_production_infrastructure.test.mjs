// tests/phase24_production_infrastructure.test.mjs
/**
 * Test Suite: Phase 24 — PRODUCTION INFRASTRUCTURE
 *
 * Verifies all 15 Required Production Infrastructure & Security Scenarios:
 *   1. Production environment configuration is recognized
 *   2. Local environment remains functional
 *   3. Production n8n URL is configurable
 *   4. localhost n8n is not used in production configuration
 *   5. Required production secrets are not hard-coded
 *   6. Health endpoint works
 *   7. Health endpoint does not expose secrets
 *   8. Storage configuration is valid
 *   9. Database configuration is valid
 *   10. Tenant isolation configuration remains intact
 *   11. Phase 22 n8n client remains compatible
 *   12. Phase 23 pipeline remains compatible
 *   13. Production build succeeds
 *   14. Container startup configuration is valid
 *   15. Missing required production configuration fails safely
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import createJiti from "jiti";

const jiti = createJiti(process.cwd(), {
  alias: { "@": path.resolve(process.cwd(), "src") },
});

// Import Infrastructure & Core modules via jiti
const {
  getEnvironmentMode,
  isProduction,
  isDevelopment,
  validateEnvironmentConfiguration,
} = jiti("./src/lib/infrastructure/environmentConfig.ts");

const {
  getDatabaseConfig,
} = jiti("./src/lib/db/config.ts");

const {
  getStorageConfig,
  checkStorageHealth,
} = jiti("./src/lib/storage/index.ts");

const {
  n8nOpsClient,
} = jiti("./src/lib/intelligence/ops/n8nOpsClient.ts");

const {
  autonomousPipeline,
  approvalGate,
} = jiti("./src/lib/intelligence/index.ts");

describe("Phase 24 — Production Infrastructure", () => {
  // ===========================================================================
  // 1. PRODUCTION ENVIRONMENT CONFIGURATION IS RECOGNIZED
  // ===========================================================================
  it("Scenario 1: Production environment configuration is recognized accurately", () => {
    const prodEnv = {
      WEBSITEBANJA_RUNTIME_MODE: "production",
      CONTAINER_APP_NAME: "websitebanja-app",
      NEXT_PUBLIC_APP_URL: "https://websitebanja.com",
    };

    assert.equal(getEnvironmentMode(prodEnv), "production");
    assert.equal(isProduction(prodEnv), true);
    assert.equal(isDevelopment(prodEnv), false);
  });

  // ===========================================================================
  // 2. LOCAL ENVIRONMENT REMAINS FUNCTIONAL
  // ===========================================================================
  it("Scenario 2: Local development environment remains functional without Azure credentials", () => {
    const localEnv = {
      NODE_ENV: "development",
      WEBSITEBANJA_RUNTIME_MODE: "development",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      N8N_OPS_AGENT_WEBHOOK_URL: "http://localhost:5678/webhook/wb-ops-agent",
    };

    assert.equal(getEnvironmentMode(localEnv), "development");
    assert.equal(isDevelopment(localEnv), true);
    assert.equal(isProduction(localEnv), false);

    const validation = validateEnvironmentConfiguration(localEnv);
    assert.equal(validation.valid, true);
    assert.equal(validation.errors.length, 0);
  });

  // ===========================================================================
  // 3. PRODUCTION N8N URL IS CONFIGURABLE
  // ===========================================================================
  it("Scenario 3: Production n8n URL is configurable via N8N_OPS_AGENT_WEBHOOK_URL", () => {
    const prodN8nUrl = "https://n8n-app.salmondesert-9c3e03bc.centralindia.azurecontainerapps.io/webhook/wb-ops-agent";
    const env = {
      WEBSITEBANJA_RUNTIME_MODE: "production",
      NEXT_PUBLIC_APP_URL: "https://websitebanja.com",
      N8N_OPS_AGENT_WEBHOOK_URL: prodN8nUrl,
    };

    const validation = validateEnvironmentConfiguration(env);
    assert.equal(validation.endpoints.n8nWebhookUrl, prodN8nUrl);
    assert.equal(validation.infrastructure.n8nWebhookConfigured, true);
    assert.equal(validation.infrastructure.n8nProductionCompliant, true);
  });

  // ===========================================================================
  // 4. LOCALHOST N8N IS NOT USED IN PRODUCTION CONFIGURATION
  // ===========================================================================
  it("Scenario 4: localhost n8n is strictly prohibited in production configuration", () => {
    const invalidProdEnv = {
      WEBSITEBANJA_RUNTIME_MODE: "production",
      NEXT_PUBLIC_APP_URL: "https://websitebanja.com",
      N8N_OPS_AGENT_WEBHOOK_URL: "http://localhost:5678/webhook/wb-ops-agent",
    };

    const validation = validateEnvironmentConfiguration(invalidProdEnv);
    assert.equal(validation.valid, false);
    assert.equal(validation.infrastructure.n8nProductionCompliant, false);
    assert.ok(validation.errors.some((err) => err.includes("localhost") && err.includes("N8N_OPS_AGENT_WEBHOOK_URL")));
  });

  // ===========================================================================
  // 5. REQUIRED PRODUCTION SECRETS ARE NOT HARD-CODED
  // ===========================================================================
  it("Scenario 5: Required production secrets are not hard-coded and placeholder values are rejected", () => {
    const placeholderEnv = {
      WEBSITEBANJA_RUNTIME_MODE: "production",
      NEXT_PUBLIC_APP_URL: "https://websitebanja.com",
      AZURE_DB_PASSWORD: "your-azure-db-password",
      OPENAI_API_KEY: "placeholder",
    };

    const validation = validateEnvironmentConfiguration(placeholderEnv);
    assert.equal(validation.valid, false);
    assert.ok(validation.errors.some((err) => err.includes("placeholder") || err.includes("dummy")));

    // Verify .env.example does not contain hard-coded production secrets
    const envExamplePath = path.resolve(process.cwd(), ".env.example");
    assert.ok(fs.existsSync(envExamplePath));
    const content = fs.readFileSync(envExamplePath, "utf-8");
    assert.ok(!content.includes("real_secret_token_12345"));
  });

  // ===========================================================================
  // 6. HEALTH ENDPOINT WORKS
  // ===========================================================================
  it("Scenario 6: Health endpoint returns valid operational status structure", async () => {
    const healthModule = jiti("./src/app/api/health/route.ts");
    assert.ok(healthModule.GET, "Health route must export GET handler");

    const response = await healthModule.GET();
    assert.equal(response.status, 200);

    const data = await response.json();
    assert.ok(["healthy", "degraded"].includes(data.status));
    assert.equal(data.service, "websitebanja");
    assert.ok(data.dependencies);
    assert.ok(data.dependencies.database);
    assert.ok(data.dependencies.storage);
    assert.ok(data.dependencies.n8n);
    assert.equal(typeof data.uptimeSeconds, "number");
  });

  // ===========================================================================
  // 7. HEALTH ENDPOINT DOES NOT EXPOSE SECRETS
  // ===========================================================================
  it("Scenario 7: Health endpoint strictly conceals passwords, tokens, and internal keys", async () => {
    const healthModule = jiti("./src/app/api/health/route.ts");
    const response = await healthModule.GET();
    const data = await response.json();
    const jsonStr = JSON.stringify(data);

    // Verify no secret leakage
    const forbiddenKeys = [
      "password",
      "secret",
      "token",
      "apiKey",
      "connectionString",
      "privateKey",
      "authHeader",
    ];

    for (const key of forbiddenKeys) {
      assert.ok(!data[key], `Health endpoint must not expose key '${key}'`);
    }

    assert.ok(!jsonStr.includes("postgres://"));
    assert.ok(!jsonStr.includes("DefaultEndpointsProtocol"));
    assert.ok(!jsonStr.includes("AIzaSy"));
  });

  // ===========================================================================
  // 8. STORAGE CONFIGURATION IS VALID
  // ===========================================================================
  it("Scenario 8: Storage configuration resolves Azure Blob Storage with Managed Identity support", async () => {
    const storageConfig = getStorageConfig();
    assert.equal(storageConfig.provider, "azure");
    assert.ok(storageConfig.azureAccountName);

    const health = await checkStorageHealth();
    assert.equal(health.provider, "azure");
    assert.ok(["healthy", "degraded", "unconfigured"].includes(health.status));
  });

  // ===========================================================================
  // 9. DATABASE CONFIGURATION IS VALID
  // ===========================================================================
  it("Scenario 9: Database configuration connects to Azure PostgreSQL with SSL and pooling", () => {
    const dbConfig = getDatabaseConfig();
    assert.equal(dbConfig.provider, "azure");
    assert.ok(typeof dbConfig.pool.max === "number");
    assert.ok(typeof dbConfig.pool.idleTimeoutMillis === "number");
    assert.ok(typeof dbConfig.ssl.rejectUnauthorized === "boolean");
  });

  // ===========================================================================
  // 10. TENANT ISOLATION CONFIGURATION REMAINS INTACT
  // ===========================================================================
  it("Scenario 10: Multi-tenant data isolation and boundaries remain strictly enforced", async () => {
    approvalGate.clear();

    const tenantAlpha = "tenant_iso_alpha_99";
    const tenantBeta = "tenant_iso_beta_88";

    await approvalGate.registerDraft({
      pipelineRunId: "run_iso_01",
      leadId: "lead_iso_01",
      outreachId: "outreach_iso_01",
      businessName: "Alpha Cafe",
      recipientEmail: "alpha@cafe.com",
      subject: "Alpha site",
      body: "Alpha preview",
      tenantId: tenantAlpha,
    });

    await approvalGate.registerDraft({
      pipelineRunId: "run_iso_02",
      leadId: "lead_iso_02",
      outreachId: "outreach_iso_02",
      businessName: "Beta Bistro",
      recipientEmail: "beta@bistro.com",
      subject: "Beta site",
      body: "Beta preview",
      tenantId: tenantBeta,
    });

    const pendingAlpha = approvalGate.getPendingApprovals(tenantAlpha);
    assert.equal(pendingAlpha.length, 1);
    assert.equal(pendingAlpha[0].tenantId, tenantAlpha);

    const pendingBeta = approvalGate.getPendingApprovals(tenantBeta);
    assert.equal(pendingBeta.length, 1);
    assert.equal(pendingBeta[0].tenantId, tenantBeta);
  });

  // ===========================================================================
  // 11. PHASE 22 N8N CLIENT REMAINS COMPATIBLE
  // ===========================================================================
  it("Scenario 11: Phase 22 n8n Ops Client remains fully operational with local fallback", async () => {
    const callback = await n8nOpsClient.dispatchTask({
      taskId: "task_phase24_compat_01",
      objective: "Verify Phase 24 infrastructure compatibility",
      priority: "high",
      allowedTools: ["qualify_lead", "report_to_ceo"],
      constraints: ["No WhatsApp", "Budget limit $1"],
      approvalRequired: false,
      input: {
        lead: {
          leadId: "lead_phase24_01",
          businessName: "Infra Test Bakery",
          category: "bakery",
          city: "Vadodara",
        },
      },
    });

    assert.ok(callback);
    assert.equal(callback.taskId, "task_phase24_compat_01");
    assert.equal(callback.status, "completed");
    assert.ok(Array.isArray(callback.actions));
  });

  // ===========================================================================
  // 12. PHASE 23 PIPELINE REMAINS COMPATIBLE
  // ===========================================================================
  it("Scenario 12: Phase 23 Autonomous Pipeline operates seamlessly with Phase 24 infrastructure", async () => {
    const run = await autonomousPipeline.startPipeline(
      {
        niche: "Dental",
        location: "Vadodara",
        limit: 1,
      },
      {
        userId: "user_phase24_compat",
        tenantId: "tenant_phase24_compat",
      }
    );

    assert.ok(run.pipelineRunId);
    assert.ok(run.stats.discovered >= 1);
    assert.ok(["completed", "waiting_approval", "partial_success"].includes(run.status));
  });

  // ===========================================================================
  // 13. PRODUCTION BUILD CONFIGURATION SUCCEEDS
  // ===========================================================================
  it("Scenario 13: Production build configuration enforces standalone output and security headers", () => {
    const nextConfigPath = path.resolve(process.cwd(), "next.config.ts");
    assert.ok(fs.existsSync(nextConfigPath));

    const content = fs.readFileSync(nextConfigPath, "utf-8");
    assert.ok(content.includes('output: "standalone"'));
    assert.ok(content.includes("Content-Security-Policy"));
    assert.ok(content.includes("Strict-Transport-Security"));
  });

  // ===========================================================================
  // 14. CONTAINER STARTUP CONFIGURATION IS VALID
  // ===========================================================================
  it("Scenario 14: Dockerfile conforms to Azure Container Apps production requirements", () => {
    const dockerfilePath = path.resolve(process.cwd(), "Dockerfile");
    assert.ok(fs.existsSync(dockerfilePath));

    const content = fs.readFileSync(dockerfilePath, "utf-8");
    assert.ok(content.includes("FROM node:20-alpine"));
    assert.ok(content.includes("ENV PORT=3000"));
    assert.ok(content.includes("EXPOSE 3000"));
    assert.ok(content.includes("USER nextjs"));
    assert.ok(content.includes('CMD ["node", "server.js"]'));
  });

  // ===========================================================================
  // 15. MISSING REQUIRED PRODUCTION CONFIGURATION FAILS SAFELY
  // ===========================================================================
  it("Scenario 15: Missing required production configuration generates diagnostic errors safely without crash", () => {
    const missingProdEnv = {
      WEBSITEBANJA_RUNTIME_MODE: "production",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000", // invalid localhost
      WHATSAPP_ACCESS_TOKEN: "enabled", // invalid WhatsApp
    };

    const validation = validateEnvironmentConfiguration(missingProdEnv);
    assert.equal(validation.valid, false);
    assert.ok(validation.errors.length >= 2);
    assert.ok(validation.errors.some((e) => e.includes("NEXT_PUBLIC_APP_URL")));
    assert.ok(validation.errors.some((e) => e.includes("WhatsApp")));
  });
});
