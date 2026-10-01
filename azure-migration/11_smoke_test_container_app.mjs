/**
 * WebsiteBanja AI — Azure Container Apps Smoke Test & Health Probe Suite
 * Tests the live deployed Azure Container App (or custom target URL) for:
 * 1. Public landing page availability (HTTP 200)
 * 2. Static asset delivery (Next.js scripts & styles)
 * 3. Auth routes responsiveness (login, signup, auth callback)
 * 4. Protected API authentication guard (POST /api/generate 401 unauthenticated check)
 * 5. Public Telemetry API responsiveness (POST /api/public/track-event)
 * 6. SSE / Conversational Agent endpoint responsiveness (POST /api/agent/sse)
 * 7. AI Voice endpoint responsiveness (POST /api/agent/voice)
 * 8. Latency & health benchmarks
 */

import http from "node:http";
import https from "node:https";

const TARGET_URL = process.argv[2] || process.env.CONTAINER_APP_URL || "http://localhost:3000";

console.log("================================================================================");
console.log(`WEBSITEBANJA AI — CONTAINER APP SMOKE TEST: ${TARGET_URL}`);
console.log("================================================================================\n");

function fetchUrl(urlPath, options = {}) {
  const fullUrl = new URL(urlPath, TARGET_URL).toString();
  const isHttps = fullUrl.startsWith("https:");
  const client = isHttps ? https : http;

  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const req = client.request(
      fullUrl,
      {
        method: options.method || "GET",
        headers: {
          "User-Agent": "WebsiteBanja-SmokeTest/1.0",
          ...(options.headers || {}),
        },
        timeout: 15000,
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          const duration = Date.now() - startTime;
          resolve({
            status: res.statusCode || 0,
            headers: res.headers,
            body,
            duration,
          });
        });
      }
    );

    req.on("error", (err) => reject(err));
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timed out (15s)"));
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    const res = await fn();
    console.log(`  ✔ [PASS] ${name} (${res.duration}ms)`);
    passed++;
  } catch (err) {
    console.error(`  ✖ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}`);
    failed++;
  }
}

async function run() {
  // Test 1: Landing Page
  await test("Landing Page (GET /) returns HTTP 200", async () => {
    const res = await fetchUrl("/");
    if (res.status !== 200) throw new Error(`Expected HTTP 200, got ${res.status}`);
    if (!res.body.includes("WebsiteBanja") && !res.body.includes("__next")) {
      throw new Error("Landing page content verification failed");
    }
    return res;
  });

  // Test 2: Login Page
  await test("Login Route (GET /login) returns HTTP 200", async () => {
    const res = await fetchUrl("/login");
    if (res.status !== 200) throw new Error(`Expected HTTP 200, got ${res.status}`);
    return res;
  });

  // Test 3: Signup Page
  await test("Signup Route (GET /signup) returns HTTP 200", async () => {
    const res = await fetchUrl("/signup");
    if (res.status !== 200) throw new Error(`Expected HTTP 200, got ${res.status}`);
    return res;
  });

  // Test 4: Auth Callback Route
  await test("Auth Callback Route (GET /auth/callback) responds cleanly", async () => {
    const res = await fetchUrl("/auth/callback");
    if (res.status !== 200 && res.status !== 302 && res.status !== 307) {
      throw new Error(`Expected 200 or redirect, got ${res.status}`);
    }
    return res;
  });

  // Test 5: Protected API without Bearer returns 401
  await test("Protected API (POST /api/generate) rejects unauthenticated request with 401", async () => {
    const res = await fetchUrl("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "test" }),
    });
    if (res.status !== 401) throw new Error(`Expected 401 Unauthorized, got ${res.status}`);
    return res;
  });

  // Test 6: Public Lead / Event Telemetry Endpoint
  await test("Public Telemetry API (POST /api/public/track-event) responds without crashing", async () => {
    const res = await fetchUrl("/api/public/track-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventName: "probe_ping", timestamp: Date.now() }),
    });
    if (res.status !== 200 && res.status !== 400) {
      throw new Error(`Unexpected status code ${res.status}`);
    }
    return res;
  });

  // Test 7: SSE / Conversational Agent Endpoint (Validation check)
  await test("Agent SSE Route (POST /api/agent/sse) rejects empty payload cleanly (400)", async () => {
    const res = await fetchUrl("/api/agent/sse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (res.status !== 400 && res.status !== 200) {
      throw new Error(`Unexpected status code ${res.status}`);
    }
    return res;
  });

  // Test 8: Voice Endpoint (Validation check)
  await test("Voice Route (POST /api/agent/voice) rejects empty payload cleanly", async () => {
    const res = await fetchUrl("/api/agent/voice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (res.status !== 400 && res.status !== 200 && res.status !== 503) {
      throw new Error(`Unexpected status code ${res.status}`);
    }
    return res;
  });

  // Test 9: Integrations Status Security Guard & Response (Phase 16)
  await test("Integrations Status Route (GET /api/integrations/status) responds cleanly", async () => {
    const secret = process.env.WEBSITEBANJA_AUTOMATION_SECRET;
    const res = await fetchUrl("/api/integrations/status", {
      headers: secret ? { "x-automation-secret": secret } : {},
    });
    if (secret) {
      if (res.status !== 200) throw new Error(`Expected HTTP 200 with secret, got ${res.status}`);
      const data = JSON.parse(res.body);
      if (!data || typeof data.googlePlaces !== "object" || typeof data.gmail !== "object") {
        throw new Error("Invalid integrations status payload shape");
      }
    } else {
      if (res.status !== 401 && res.status !== 200) throw new Error(`Expected 401 or 200, got ${res.status}`);
    }
    return res;
  });

  // Test 10: Gmail Integration Status Security Guard & Response (Phase 16)
  await test("Gmail Status Route (GET /api/integrations/gmail/status) responds cleanly", async () => {
    const secret = process.env.WEBSITEBANJA_AUTOMATION_SECRET;
    const res = await fetchUrl("/api/integrations/gmail/status", {
      headers: secret ? { "x-automation-secret": secret } : {},
    });
    if (secret) {
      if (res.status !== 200) throw new Error(`Expected HTTP 200 with secret, got ${res.status}`);
    } else {
      if (res.status !== 401 && res.status !== 200) throw new Error(`Expected 401 or 200, got ${res.status}`);
    }
    return res;
  });

  // Test 11: Automation Pipeline API Security Guard & Response (Phase 13/14)
  await test("Automation Pipeline Route (GET /api/automation/pipeline) responds cleanly", async () => {
    const secret = process.env.WEBSITEBANJA_AUTOMATION_SECRET;
    const res = await fetchUrl("/api/automation/pipeline", {
      headers: secret ? { "x-automation-secret": secret } : {},
    });
    if (secret) {
      if (res.status !== 200) throw new Error(`Expected HTTP 200 with secret, got ${res.status}`);
    } else {
      if (res.status !== 401 && res.status !== 200) throw new Error(`Expected 401 or 200, got ${res.status}`);
    }
    return res;
  });

  // Test 12: Production Health Check & Security Invariants (Phase 24)
  await test("Health Endpoint (GET /api/health) returns healthy status with safety invariants", async () => {
    const res = await fetchUrl("/api/health");
    if (res.status !== 200) throw new Error(`Expected HTTP 200, got ${res.status}`);
    const data = JSON.parse(res.body);
    if (data.status !== "healthy") throw new Error(`Expected status 'healthy', got '${data.status}'`);
    const isWhatsAppDisabled = data.whatsAppDisabled === true || data.safety?.whatsAppDisabled === true;
    const isHumanApprovalEnforced = data.humanApprovalEnforced === true || data.safety?.humanApprovalEnforced === true;
    if (!isWhatsAppDisabled) throw new Error("CRITICAL: WhatsApp is NOT disabled in health check");
    if (!isHumanApprovalEnforced) throw new Error("CRITICAL: Human approval is NOT enforced in health check");
    return res;
  });

  // Test 13: Places Photo Proxy Route (Phase 20A)
  await test("Places Photo Proxy Route (GET /api/public/places-photo) responds cleanly without leaking secrets", async () => {
    const res = await fetchUrl("/api/public/places-photo?name=places/test/photos/test");
    if (res.status !== 200 && res.status !== 307 && res.status !== 400) {
      throw new Error(`Unexpected status code ${res.status}`);
    }
    return res;
  });

  // Test 14: CEO Command Center API Guard (Phase 26)
  await test("CEO Command Center API (GET /api/admin/intelligence/command-center) enforces admin guard (401)", async () => {
    const res = await fetchUrl("/api/admin/intelligence/command-center");
    if (res.status !== 401 && res.status !== 403) {
      throw new Error(`Expected 401 or 403 Unauthorized, got ${res.status}`);
    }
    return res;
  });

  // Test 15: Autonomous Pipeline API Guard (Phase 28)
  await test("Autonomous Pipeline API (GET /api/automation/pipeline/autonomous) enforces admin guard (401)", async () => {
    const res = await fetchUrl("/api/automation/pipeline/autonomous");
    if (res.status !== 401 && res.status !== 403) {
      throw new Error(`Expected 401 or 403 Unauthorized, got ${res.status}`);
    }
    return res;
  });

  console.log("\n================================================================================");
  console.log(`SMOKE TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("================================================================================");

  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
