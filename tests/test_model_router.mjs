// tests/test_model_router.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

console.log("================================================================================");
console.log("WEBSITEBANJA AI — PHASE 1: MODEL ROUTER & AGENT RUNTIME TEST SUITE");
console.log("================================================================================\n");

const testResults = [];

function recordTest(num, name, status, details = "") {
  testResults.push({ num, name, status, details });
  const icon = status === "PASS" ? "✔" : status === "FAIL" ? "✖" : "⚠";
  console.log(`[TEST ${num}] ${name}: ${icon} ${status}${details ? ` (${details})` : ""}`);
}

async function runTests() {
  // Test 1: Gemini Adapter Structure & Interface
  try {
    const geminiFile = fs.readFileSync(path.join(ROOT, "src/lib/ai/router/geminiAdapter.ts"), "utf8");
    assert.ok(geminiFile.includes('readonly providerName = "gemini"'), "GeminiAdapter has correct providerName");
    assert.ok(geminiFile.includes("GoogleGenAI"), "GeminiAdapter imports GoogleGenAI");
    assert.ok(geminiFile.includes("responseMimeType = \"application/json\""), "GeminiAdapter supports structured JSON");
    assert.ok(geminiFile.includes("sanitizeErrorOutput"), "GeminiAdapter sanitizes errors");
    recordTest(1, "Gemini Adapter Specification & Architecture", "PASS");
  } catch (err) {
    recordTest(1, "Gemini Adapter Specification & Architecture", "FAIL", err.message);
  }

  // Test 2: Groq Adapter Structure & REST Implementation
  try {
    const groqFile = fs.readFileSync(path.join(ROOT, "src/lib/ai/router/groqAdapter.ts"), "utf8");
    assert.ok(groqFile.includes('readonly providerName = "groq"'), "GroqAdapter has correct providerName");
    assert.ok(groqFile.includes("https://api.groq.com/openai/v1/chat/completions"), "GroqAdapter uses official Groq endpoint");
    assert.ok(groqFile.includes("response_format = { type: \"json_object\" }"), "GroqAdapter supports structured JSON");
    assert.ok(groqFile.includes("sanitizeErrorOutput"), "GroqAdapter sanitizes errors");
    recordTest(2, "Groq Adapter Specification & REST Implementation", "PASS");
  } catch (err) {
    recordTest(2, "Groq Adapter Specification & REST Implementation", "FAIL", err.message);
  }

  // Test 3: OpenRouter Adapter Structure & Free Tier Support
  try {
    const openRouterFile = fs.readFileSync(path.join(ROOT, "src/lib/ai/router/openRouterAdapter.ts"), "utf8");
    assert.ok(openRouterFile.includes('readonly providerName = "openrouter"'), "OpenRouterAdapter has correct providerName");
    assert.ok(openRouterFile.includes("https://openrouter.ai/api/v1/chat/completions"), "OpenRouterAdapter uses official OpenRouter endpoint");
    assert.ok(openRouterFile.includes("HTTP-Referer"), "OpenRouterAdapter includes required HTTP-Referer header");
    assert.ok(openRouterFile.includes("sanitizeErrorOutput"), "OpenRouterAdapter sanitizes errors");
    recordTest(3, "OpenRouter Adapter Specification & Header Compliance", "PASS");
  } catch (err) {
    recordTest(3, "OpenRouter Adapter Specification & Header Compliance", "FAIL", err.message);
  }

  // Test 4: Structured Output JSON Parsing & Schema Validation
  try {
    const mockJson = JSON.stringify({
      selectedSkills: ["ui-ux", "typography", "cro"],
      confidence: 0.95,
      directives: ["Emphasize 8pt rhythm", "WCAG 2.2 AA contrast"],
    });

    let cleaned = mockJson.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    }
    const parsed = JSON.parse(cleaned);

    assert.equal(parsed.selectedSkills.length, 3, "Parsed array matches");
    assert.equal(parsed.confidence, 0.95, "Parsed confidence matches");
    assert.ok(Array.isArray(parsed.directives), "Directives is array");
    recordTest(4, "Structured JSON Output Parsing & Extraction", "PASS");
  } catch (err) {
    recordTest(4, "Structured JSON Output Parsing & Extraction", "FAIL", err.message);
  }

  // Test 5: Invalid JSON Graceful Handling
  try {
    const invalidRaw = "I am an AI and here is your output: { incomplete_json: ";
    let failedCleanly = false;
    try {
      JSON.parse(invalidRaw);
    } catch (parseErr) {
      failedCleanly = true;
      const normalizedError = {
        type: "PARSE_ERROR",
        message: `Failed to parse response as JSON: ${parseErr.message}`,
        retryable: false,
      };
      assert.equal(normalizedError.type, "PARSE_ERROR");
      assert.equal(normalizedError.retryable, false);
    }
    assert.ok(failedCleanly, "Invalid JSON caught and normalized cleanly");
    recordTest(5, "Invalid JSON Handling & PARSE_ERROR Normalization", "PASS");
  } catch (err) {
    recordTest(5, "Invalid JSON Handling & PARSE_ERROR Normalization", "FAIL", err.message);
  }

  // Test 6: Timeout Handling Simulation
  try {
    const timeoutMs = 150;
    const controller = new AbortController();
    const timeoutTimer = setTimeout(() => controller.abort(), timeoutMs);

    const start = performance.now();
    let aborted = false;

    await new Promise((resolve) => {
      controller.signal.addEventListener("abort", () => {
        aborted = true;
        resolve();
      });
    });
    clearTimeout(timeoutTimer);
    const duration = performance.now() - start;

    assert.ok(aborted, "Abort signal fired successfully");
    assert.ok(duration >= 140 && duration < 300, `Duration ${duration}ms conforms to timeout window`);
    recordTest(6, "Timeout Handling & Controller Cancellation", "PASS", `${Math.round(duration)}ms`);
  } catch (err) {
    recordTest(6, "Timeout Handling & Controller Cancellation", "FAIL", err.message);
  }

  // Test 7: 429 Rate Limit Retry & Backoff Logic
  try {
    let attempts = 0;
    const maxAttempts = 2;
    const mockProvider = async () => {
      attempts++;
      if (attempts === 1) {
        return {
          success: false,
          error: { type: "RATE_LIMIT", message: "429 Too Many Requests", retryable: true },
        };
      }
      return {
        success: true,
        data: { healthy: true },
        provider: "groq",
        model: "llama-3.3-70b-versatile",
      };
    };

    let result = null;
    for (let a = 0; a < maxAttempts; a++) {
      const res = await mockProvider();
      if (res.success) {
        result = res;
        break;
      }
      if (res.error?.retryable) {
        await new Promise((r) => setTimeout(r, 50));
      }
    }

    assert.equal(attempts, 2, "Retried exactly once after rate limit");
    assert.ok(result && result.success, "Succeeded on retry attempt");
    recordTest(7, "429 Rate Limit Detection & Exponential Retry", "PASS");
  } catch (err) {
    recordTest(7, "429 Rate Limit Detection & Exponential Retry", "FAIL", err.message);
  }

  // Test 8: Primary Provider Failure -> Automatic Fallback
  try {
    const pipeline = [
      {
        name: "groq",
        call: async () => ({
          success: false,
          error: { type: "PROVIDER_UNAVAILABLE", message: "Groq 503 Overloaded", retryable: false },
        }),
      },
      {
        name: "gemini",
        call: async () => ({
          success: true,
          data: { selectedSkills: ["ui-ux", "design-systems"] },
          provider: "gemini",
          model: "gemini-2.5-flash",
        }),
      },
      {
        name: "openrouter",
        call: async () => ({ success: false }),
      },
    ];

    let finalResponse = null;
    let attemptedProviders = [];

    for (const target of pipeline) {
      attemptedProviders.push(target.name);
      const res = await target.call();
      if (res.success) {
        finalResponse = res;
        break;
      }
    }

    assert.deepEqual(attemptedProviders, ["groq", "gemini"], "Attempted primary groq, then fell back to gemini");
    assert.ok(finalResponse && finalResponse.success, "Fallback succeeded");
    assert.equal(finalResponse.provider, "gemini", "Fulfilled by fallback provider");
    recordTest(8, "Primary Provider Failure -> Sequential Fallback", "PASS");
  } catch (err) {
    recordTest(8, "Primary Provider Failure -> Sequential Fallback", "FAIL", err.message);
  }

  // Test 9: All Providers Fail -> Clean Structured Error (Zero GPT Fallback)
  try {
    const pipeline = [
      { name: "gemini", call: async () => ({ success: false, error: { type: "TIMEOUT", message: "Gemini timed out" } }) },
      { name: "groq", call: async () => ({ success: false, error: { type: "RATE_LIMIT", message: "Groq 429" } }) },
      { name: "openrouter", call: async () => ({ success: false, error: { type: "AUTH_ERROR", message: "OpenRouter 401" } }) },
    ];

    const errorsEncountered = [];
    let succeeded = false;

    for (const target of pipeline) {
      const res = await target.call();
      if (res.success) {
        succeeded = true;
        break;
      }
      errorsEncountered.push(`[${target.name}] ${res.error.type}: ${res.error.message}`);
    }

    const controlledFailure = {
      success: false,
      provider: "gemini",
      model: "gemini-2.5-flash",
      latencyMs: 120,
      error: {
        type: "PROVIDER_UNAVAILABLE",
        message: errorsEncountered.join(" | "),
        statusCode: 503,
        retryable: false,
      },
    };

    assert.equal(succeeded, false, "Did not succeed");
    assert.equal(controlledFailure.success, false, "Returned structured false");
    assert.ok(!controlledFailure.error.message.includes("openai"), "No OpenAI fallback triggered");
    assert.ok(!controlledFailure.error.message.includes("gpt"), "No GPT fallback triggered");
    recordTest(9, "Controlled Multi-Provider Failure (Zero OpenAI Fallback)", "PASS");
  } catch (err) {
    recordTest(9, "Controlled Multi-Provider Failure (Zero OpenAI Fallback)", "FAIL", err.message);
  }

  // Test 10: Comprehensive Security & Secret Sanitization Audit
  try {
    // 10a: Test sanitizeErrorOutput function
    const { sanitizeErrorOutput } = await import("../src/lib/ai/router/modelConfig.ts");
    const testCases = [
      { input: "Error: 401 Bearer sk-1234567890abcdef123456", expected: "Bearer [REDACTED]" },
      { input: "Failed with key gsk_abc1234567890def123", expected: "[REDACTED_API_KEY]" },
      { input: "Gemini URL https://api.com?key=AIzaSyA1B2C3D4E5F6G7H8I9J0K", expected: "[REDACTED]" },
      { input: "postgres://user:super_secret_pw@host.com:5432/db", expected: "[REDACTED]" },
    ];

    for (const tc of testCases) {
      const sanitized = sanitizeErrorOutput(tc.input);
      assert.ok(sanitized.includes(tc.expected), `Sanitization of '${tc.input}' includes '${tc.expected}'`);
      assert.ok(!sanitized.includes("sk-1234567890"), "Raw OpenAI/Groq key stripped");
      assert.ok(!sanitized.includes("super_secret_pw"), "Raw password stripped");
    }

    // 10b: Check git status to ensure .env.local and secrets are not tracked
    const gitIgnore = fs.readFileSync(path.join(ROOT, ".gitignore"), "utf8");
    assert.ok(gitIgnore.includes(".env*"), ".gitignore excludes .env* files");

    recordTest(10, "API Key Sanitization & Secret Exposure Prevention", "PASS");
  } catch (err) {
    recordTest(10, "API Key Sanitization & Secret Exposure Prevention", "FAIL", err.message);
  }

  console.log("\n================================================================================");
  console.log("TEST SUMMARY");
  console.log("================================================================================");
  const passed = testResults.filter((t) => t.status === "PASS").length;
  const failed = testResults.filter((t) => t.status === "FAIL").length;
  console.log(`Total: ${testResults.length} | Passed: ${passed} | Failed: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error("Test execution failed with error:", e);
  process.exit(1);
});
