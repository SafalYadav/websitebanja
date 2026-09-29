// tests/phase1_hardening.test.mjs
/**
 * WebsiteBanja Phase 1 Hardening Test Suite
 * Verifies:
 * 1. Secret & Key Sanitization (Google AIza keys, OpenAI sk-, query params, Bearer tokens)
 * 2. Centralized Model Configuration & Absence of invalid "gpt-4.1-mini" in production code
 * 3. Planner Multi-Tenant Isolation (In-memory generation without host disk mutations)
 * 4. Zero Secrets Exposed to Client (No server secrets in NEXT_PUBLIC_* or client components)
 * 5. Authentication & Rate-Limit Protection across AI routes
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import createJiti from "jiti";
import path from "node:path";

const jiti = createJiti(process.cwd(), {
  alias: { "@": path.resolve(process.cwd(), "src") },
});

// Load production modules via jiti
const { MODEL_CONFIG, sanitizeErrorOutput } = jiti("@/lib/ai/router/modelConfig.ts");
const { generateComponents } = jiti("@/lib/ai/generation/generator.ts");
const { createWebsitePlan, createDesignPlan, selectComponents } = jiti("@/lib/ai/planner.ts");

describe("Phase 1: Foundation, Security & Runtime Hardening", () => {

  test("1. Secret Sanitization scrubs Google AIza, OpenAI sk-, tokens, and query params", () => {
    // Test Google API key in query string (like live-token route)
    const googleQueryError = new Error(
      "Request failed: https://generativelanguage.googleapis.com/v1alpha/models/gemini-2.0-flash-exp:generateContent?key=AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6"
    );
    const sanitizedGoogle = sanitizeErrorOutput(googleQueryError);
    assert.ok(!sanitizedGoogle.includes("AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6"), "Google API key must be scrubbed");
    assert.ok(
      sanitizedGoogle.includes("[REDACTED_GEMINI_KEY]") || sanitizedGoogle.includes("[REDACTED]"),
      "Redacted placeholder must be present"
    );

    // Test OpenAI secret key
    const openAiError = "Failed with key sk-proj-1234567890abcdef1234567890abcdef in headers";
    const sanitizedOpenAi = sanitizeErrorOutput(openAiError);
    assert.ok(!sanitizedOpenAi.includes("sk-proj-1234567890abcdef1234567890abcdef"), "OpenAI key must be scrubbed");
    assert.ok(sanitizedOpenAi.includes("[REDACTED_API_KEY]"), "OpenAI key placeholder must be present");

    // Test Bearer token
    const bearerError = "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-ID";
    const sanitizedBearer = sanitizeErrorOutput(bearerError);
    assert.ok(!sanitizedBearer.includes("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-ID"), "Bearer token must be scrubbed");

    // Test URL query param auth_token
    const tokenQueryError = "Failed connecting to https://api.service.com/v1?auth_token=super_secret_token_12345";
    const sanitizedTokenQuery = sanitizeErrorOutput(tokenQueryError);
    assert.ok(!sanitizedTokenQuery.includes("super_secret_token_12345"), "Query token must be scrubbed");
  });

  test("2. Centralized Model Configuration is loaded with production-valid models", () => {
    assert.ok(MODEL_CONFIG.defaults, "MODEL_CONFIG.defaults must exist");
    assert.equal(MODEL_CONFIG.defaults.generationModel, process.env.OPENAI_GENERATION_MODEL || "gpt-5.6-luna");
    assert.equal(MODEL_CONFIG.defaults.generationFallbackModel, "gpt-4o-mini");
    assert.equal(MODEL_CONFIG.defaults.plannerModel, "gpt-4o-mini");
    assert.equal(MODEL_CONFIG.defaults.extractorModel, "gpt-4o-mini");
    assert.equal(MODEL_CONFIG.defaults.studioModel, "gpt-4o-mini");
    assert.equal(MODEL_CONFIG.defaults.studioFallbackModel, "gemini-2.5-flash");
    assert.equal(MODEL_CONFIG.defaults.geminiModel, "gemini-2.5-flash");
    assert.equal(MODEL_CONFIG.defaults.groqModel, "llama-3.3-70b-versatile");
    assert.ok(MODEL_CONFIG.defaults.openrouterModel.includes("llama-3.3-70b-instruct"));
  });

  test("3. Production code has ZERO instances of invalid 'gpt-4.1-mini'", () => {
    const srcDir = path.resolve(process.cwd(), "src");
    
    function scanDir(dir) {
      const files = fs.readdirSync(dir, { withFileTypes: true });
      const violations = [];
      for (const file of files) {
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory()) {
          violations.push(...scanDir(fullPath));
        } else if (/\.(ts|tsx|js|mjs)$/.test(file.name)) {
          const content = fs.readFileSync(fullPath, "utf8");
          if (content.includes("gpt-4.1-mini")) {
            violations.push(fullPath);
          }
        }
      }
      return violations;
    }

    const violations = scanDir(srcDir);
    assert.deepEqual(violations, [], `Production files in src/ contain invalid 'gpt-4.1-mini': ${violations.join(", ")}`);
  });

  test("4. Planner Multi-Tenant Isolation supports in-memory component generation", () => {
    const req = {
      intent: "create",
      business: { name: "Tenant A Cleaners", industry: "local_service", type: "cleaning service" },
      brand: { colors: { primary: "#10B981", secondary: "#059669" }, style: "modern" },
    };

    const websitePlan = createWebsitePlan(req);
    const designPlan = createDesignPlan(websitePlan, req);
    const componentPlan = selectComponents(designPlan, req);

    // Run with writeToDisk: false (multi-tenant safe)
    const inMemoryResult = generateComponents(req, componentPlan, websitePlan, designPlan, {
      writeToDisk: false,
    });

    assert.ok(inMemoryResult.files.length >= 3, "Must have generated component names");
    assert.ok(inMemoryResult.fileContents, "fileContents map must be populated");
    assert.ok(inMemoryResult.fileContents["Website.tsx"], "Website.tsx must be in fileContents");
    assert.ok(inMemoryResult.fileContents["Website.tsx"].includes("--wb-primary"), "Must inject CSS variables");
    assert.ok(inMemoryResult.fileContents["Website.tsx"].includes("#10B981"), "Must inject tenant primary color");

    // Run default (backward compatibility for test scripts)
    const diskResult = generateComponents(req, componentPlan, websitePlan, designPlan);
    assert.ok(diskResult.files.includes("Website.tsx"), "Website.tsx must be in files list");
    assert.ok(fs.existsSync(path.join(diskResult.outDir, "Website.tsx")), "Website.tsx exists on disk in default mode");
  });

  test("5. Zero Server Secrets Exposed to Client (NEXT_PUBLIC_* scan)", () => {
    const forbiddenSecrets = [
      "OPENAI_API_KEY",
      "GEMINI_API_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "UPSTASH_REDIS_REST_TOKEN",
      "RESEND_API_KEY",
      "GROQ_API_KEY",
      "OPENROUTER_API_KEY",
      "DATABASE_URL",
    ];

    const envFiles = [".env", ".env.local", ".env.example", ".env.production"];
    for (const envFile of envFiles) {
      const fullPath = path.resolve(process.cwd(), envFile);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, "utf8");
        for (const secret of forbiddenSecrets) {
          const publicPattern = new RegExp(`NEXT_PUBLIC_.*${secret}`, "i");
          assert.ok(!publicPattern.test(content), `Found dangerous ${secret} prefixed with NEXT_PUBLIC_ in ${envFile}`);
        }
      }
    }

    // Scan client component source files for direct server env usages
    const srcDir = path.resolve(process.cwd(), "src/components");
    if (fs.existsSync(srcDir)) {
      const clientFiles = fs.readdirSync(srcDir, { recursive: true });
      for (const relPath of clientFiles) {
        const fullPath = path.join(srcDir, String(relPath));
        if (fs.statSync(fullPath).isFile() && /\.(tsx|ts|js|jsx)$/.test(fullPath)) {
          const content = fs.readFileSync(fullPath, "utf8");
          for (const secret of forbiddenSecrets) {
            assert.ok(!content.includes(`process.env.${secret}`), `Client component ${relPath} directly accesses ${secret}`);
          }
        }
      }
    }
  });

  test("6. Protected AI Routes enforce auth or tenant rate limiting", () => {
    const protectedRoutes = [
      "src/app/api/generate/route.ts",
      "src/app/api/plan/route.ts",
      "src/app/api/extract/route.ts",
      "src/app/api/studio/ai-action/route.ts",
      "src/app/api/agent/live-token/route.ts",
    ];

    for (const routePath of protectedRoutes) {
      const fullPath = path.resolve(process.cwd(), routePath);
      assert.ok(fs.existsSync(fullPath), `${routePath} must exist`);
      const content = fs.readFileSync(fullPath, "utf8");
      
      const hasAuthOrRateLimit =
        content.includes("validateUserAuth") ||
        content.includes("authenticateRequest") ||
        content.includes("checkMemoryRateLimit") ||
        content.includes("userRatelimit") ||
        content.includes("verifyAdminAuth");

      assert.ok(
        hasAuthOrRateLimit,
        `${routePath} must implement auth validation or rate limiting`
      );
    }
  });
});
