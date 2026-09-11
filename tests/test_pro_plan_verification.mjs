// tests/test_pro_plan_verification.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import jitiFactory from "jiti";

const jiti = jitiFactory(process.cwd(), {
  alias: { "@": path.resolve(process.cwd(), "src") },
});

console.log("================================================================================");
console.log("WEBSITEBANJA AI — PRO PLAN & SUBSCRIPTION VERIFICATION (₹500/mo)");
console.log("================================================================================\n");

let passed = 0;
let failed = 0;

function report(name, fn) {
  try {
    fn();
    console.log(`  ✔ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✘ [FAIL] ${name}: ${err.message}`);
    failed++;
  }
}

async function reportAsync(name, fn) {
  try {
    await fn();
    console.log(`  ✔ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✘ [FAIL] ${name}: ${err.message}`);
    failed++;
  }
}

// 1. Check Pricing.tsx
report("Verify Pricing.tsx has Free and Pro tiers with NO '$' dollar signs in pricing", () => {
  const content = fs.readFileSync("src/components/Pricing.tsx", "utf8");
  assert.ok(content.includes("freePlan"), "Pricing.tsx must include freePlan");
  assert.ok(content.includes("proPlan"), "Pricing.tsx must include proPlan");
  assert.ok(content.includes("formatINR(freePlan.priceINR)"), "Pricing.tsx must format free plan INR");
  assert.ok(content.includes("formatINR(proPlan.priceINR)"), "Pricing.tsx must format pro plan INR");
  
  const dollarMatch = content.match(/\$\s*\d+/g);
  assert.ok(!dollarMatch, `Found dollar pricing amounts in Pricing.tsx: ${dollarMatch}`);
});

// 2. Check 21st PricingTable21st.tsx
report("Verify PricingTable21st.tsx has ₹500/month and NO '$' dollar signs in pricing", () => {
  const content = fs.readFileSync("src/components/21st/PricingTable21st.tsx", "utf8");
  assert.ok(content.includes("₹500") || content.includes("formatINR"), "PricingTable21st.tsx must reflect ₹500");
  
  const dollarMatch = content.match(/\$\s*\d+/g);
  assert.ok(!dollarMatch, `Found dollar pricing amounts in PricingTable21st.tsx: ${dollarMatch}`);
});

// 3. Check src/lib/plans.ts
report("Verify src/lib/plans.ts defines Free (₹0) and Pro (₹500/month)", () => {
  const { PLANS, formatINR } = jiti("@/lib/plans");
  assert.equal(PLANS.free.priceINR, 0, "Free plan must be 0 INR");
  assert.equal(PLANS.paid_pro.priceINR, 500, "Paid pro plan must be 500 INR");
  assert.equal(formatINR(0).replace(/\s/g, ""), "₹0", "formatINR(0) should be ₹0");
  assert.equal(formatINR(500).replace(/\s/g, ""), "₹500", "formatINR(500) should be ₹500");
});

// 4. Check dashboard Plan upgrade integration
report("Verify dashboard page includes Pro Plan upgrade UI and ₹500/month badge", () => {
  const content = fs.readFileSync("src/app/dashboard/page.tsx", "utf8");
  assert.ok(content.includes("₹500"), "Dashboard must show ₹500/mo");
  assert.ok(content.includes("Upgrade to Pro") || content.includes("Paid Pro"), "Dashboard must have Upgrade to Pro flow");
  assert.ok(content.includes("/api/subscription"), "Dashboard must call /api/subscription");
});

// 5. Check API route /api/subscription handler rejects unauthenticated request cleanly
await reportAsync("Verify /api/subscription GET rejects unauthenticated request with 401", async () => {
  const { GET } = jiti("@/app/api/subscription/route");
  const dummyReq = new Request("http://localhost:3000/api/subscription");
  const res = await GET(dummyReq);
  assert.equal(res.status, 401, `Expected status 401, got ${res.status}`);
  const json = await res.json();
  assert.ok(json.error, "Response should contain error message");
});

await reportAsync("Verify /api/subscription POST rejects unauthenticated request with 401", async () => {
  const { POST } = jiti("@/app/api/subscription/route");
  const dummyReq = new Request("http://localhost:3000/api/subscription", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "upgrade" })
  });
  const res = await POST(dummyReq);
  assert.equal(res.status, 401, `Expected status 401, got ${res.status}`);
});

// 6. Verify dbUpsertUserSubscription function exists in db/queries.ts
report("Verify dbUpsertUserSubscription is exported in src/lib/db/queries.ts", () => {
  const { dbUpsertUserSubscription } = jiti("@/lib/db/queries");
  assert.equal(typeof dbUpsertUserSubscription, "function", "queries.ts must export dbUpsertUserSubscription");
});

console.log("\n" + "=".repeat(80));
console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log("=".repeat(80));

if (failed > 0) {
  process.exit(1);
}
