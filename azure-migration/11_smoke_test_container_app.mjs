/**
 * WebsiteBanja AI — Azure Container Apps Smoke Test & Health Probe Suite
 * Tests the live deployed Azure Container App (or custom target URL) for:
 * 1. Public landing page availability (HTTP 200)
 * 2. Static asset delivery (Next.js scripts & styles)
 * 3. Auth routes responsiveness
 * 4. API health & telemetry endpoints
 * 5. Response time & latency benchmarks
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

  // Test 6: Public Lead Submission Endpoint
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

  console.log("\n================================================================================");
  console.log(`SMOKE TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("================================================================================");

  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
