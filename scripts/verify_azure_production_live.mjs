// scripts/verify_azure_production_live.mjs
import https from "node:https";
import assert from "node:assert";

const PROD_URL = process.argv[2] || "https://websitebanja-app.salmondesert-9c3e03bc.centralindia.azurecontainerapps.io";

console.log("=".repeat(80));
console.log(`WEBSITEBANJA AI — LIVE AZURE PRODUCTION VERIFICATION SUITE`);
console.log(`Target: ${PROD_URL}`);
console.log("=".repeat(80) + "\n");

function fetchUrl(path, options = {}) {
  const url = new URL(path, PROD_URL).toString();
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const req = https.request(
      url,
      {
        method: options.method || "GET",
        headers: {
          "User-Agent": "WebsiteBanja-ProdVerification/1.0",
          ...(options.headers || {}),
        },
        timeout: 25000,
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          resolve({
            status: res.statusCode || 0,
            headers: res.headers,
            body,
            duration: Date.now() - startTime,
          });
        });
      }
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timed out (25s)"));
    });
    if (options.body) req.write(options.body);
    req.end();
  });
}

let passed = 0;
let failed = 0;

async function check(name, fn) {
  try {
    const result = await fn();
    console.log(`  ✔ [PASS] ${name} (${result?.duration ? result.duration + "ms" : "ok"})`);
    passed++;
  } catch (err) {
    console.error(`  ✘ [FAIL] ${name}: ${err.message}`);
    failed++;
  }
}

async function main() {
  // 1. Homepage
  await check("1. Production Homepage (GET /) returns 200 and loads successfully", async () => {
    const res = await fetchUrl("/");
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert.ok(res.body.includes("WebsiteBanja") || res.body.includes("__next"), "Body missing WebsiteBanja markers");
    assert.ok(!res.body.includes("NEXT_PUBLIC_SUPABASE_URL is not set"), "Found NEXT_PUBLIC_SUPABASE_URL error text in HTML");
    return res;
  });

  // 2. Login Page
  await check("2. Production Login Page (GET /login) returns 200 without Supabase env crash", async () => {
    const res = await fetchUrl("/login");
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert.ok(!res.body.includes("Server misconfiguration"), "Found Server misconfiguration in login page");
    assert.ok(!res.body.includes("NEXT_PUBLIC_SUPABASE_URL is not set"), "Found missing env error in login page");
    return res;
  });

  // 3. Subscriptions Endpoint (GET /api/subscription)
  await check("3. Subscription Endpoint (GET /api/subscription) guarded with 401 unauthenticated", async () => {
    const res = await fetchUrl("/api/subscription");
    assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
    const json = JSON.parse(res.body);
    assert.ok(json.error || json.message, "Expected error or message property");
    return res;
  });

  // 4. Projects Endpoint (GET /api/projects)
  await check("4. Projects Endpoint (GET /api/projects) guarded with 401 unauthenticated", async () => {
    const res = await fetchUrl("/api/projects");
    assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
    const json = JSON.parse(res.body);
    assert.ok(json.error || json.message, "Expected error or message property");
    return res;
  });

  // 5. Dashboard Route
  await check("5. Dashboard Route (GET /dashboard) responds cleanly", async () => {
    const res = await fetchUrl("/dashboard");
    assert.ok([200, 307, 302].includes(res.status), `Expected 200, 302, or 307, got ${res.status}`);
    return res;
  });

  // 6. Pricing Content & Strict INR (₹500/mo & ₹0, zero $ pollution)
  await check("6. Pricing verification (Free ₹0 / Pro ₹500/mo and zero visible $ pollution)", async () => {
    const res = await fetchUrl("/");
    const visibleText = res.body
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");
    
    assert.ok(visibleText.includes("₹500"), "Rendered text must include ₹500");
    assert.ok(visibleText.includes("₹0"), "Rendered text must include ₹0");
    
    const dollarMatch = visibleText.match(/\$\s*\d+/g);
    assert.ok(!dollarMatch, `Found dollar pricing in rendered text: ${dollarMatch}`);
    return res;
  });

  // 7. Studio Route
  await check("7. Visual Studio Editor loading check (GET /builder)", async () => {
    const res = await fetchUrl("/builder");
    assert.ok([200, 307, 302].includes(res.status), `Expected 200, 302, or 307, got ${res.status}`);
    return res;
  });

  // 8. Live Public Site Page
  await check("8. Public dynamic site route (GET /p/non-existent-test-slug) responds without 500 crash", async () => {
    const res = await fetchUrl("/p/non-existent-test-slug-12345");
    assert.ok([404, 200].includes(res.status), `Expected 404 or 200, got ${res.status}`);
    return res;
  });

  console.log("\n" + "=".repeat(80));
  console.log(`LIVE PRODUCTION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=".repeat(80));

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
