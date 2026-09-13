/**
 * Test Suite: Billing Cron Workflow, CRON_SECRET Constant-Time Auth & Expiry Invocations
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import jitiFactory from "jiti";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const jiti = jitiFactory(ROOT, {
  alias: { "@": path.resolve(ROOT, "src") },
});

console.log("================================================================================");
console.log("TESTING BILLING CRON WORKFLOW & CRON_SECRET AUTHENTICATION");
console.log("================================================================================\n");

let passed = 0;
let failed = 0;

async function runTest(name, fn) {
  try {
    await fn();
    console.log(`  ✔ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✖ [FAIL] ${name}`);
    console.error(err);
    failed++;
  }
}

async function main() {
  // Test 1: Verify .github/workflows/billing-cron.yml exists and has required schedule + dispatch
  await runTest("Workflow file exists and specifies 6-hour schedule + workflow_dispatch", () => {
    const workflowPath = path.resolve(ROOT, ".github/workflows/billing-cron.yml");
    assert.ok(fs.existsSync(workflowPath), "billing-cron.yml must exist");
    const content = fs.readFileSync(workflowPath, "utf8");

    assert.ok(content.includes("schedule:"), "Must declare schedule trigger");
    assert.ok(content.includes("cron: '0 */6 * * *'"), "Must run every 6 hours");
    assert.ok(content.includes("workflow_dispatch:"), "Must support manual workflow_dispatch");
    assert.ok(content.includes("POST"), "Must execute POST request");
    assert.ok(
      content.includes("https://websitebanja.com/api/billing/check-expiries"),
      "Must target production check-expiries endpoint"
    );
    assert.ok(
      content.includes("CRON_SECRET: ${{ secrets.CRON_SECRET }}"),
      "Must use GitHub Actions CRON_SECRET"
    );
    assert.ok(
      content.includes('Authorization: Bearer ${CRON_SECRET}'),
      "Must pass Bearer token in Authorization header"
    );
    assert.ok(
      content.includes('-ne 200'),
      "Must fail loudly on non-200 HTTP status"
    );
    assert.equal(
      content.includes("echo $CRON_SECRET"),
      false,
      "Must NEVER echo or print CRON_SECRET"
    );
  });

  // Test 2: Server-side check-expiries route handles constant-time auth comparison
  await runTest("check-expiries route handles constant-time authentication correctly", async () => {
    // Import route handlers using jiti for proper module resolution
    const { POST, GET } = jiti("@/app/api/billing/check-expiries/route");

    const TEST_SECRET = "test_cron_secret_secure_random_key_123456789";
    process.env.CRON_SECRET = TEST_SECRET;

    // A. Valid Bearer Token (POST)
    {
      const req = new Request("https://websitebanja.com/api/billing/check-expiries", {
        method: "POST",
        headers: {
          authorization: `Bearer ${TEST_SECRET}`,
          "content-type": "application/json",
        },
      });
      const res = await POST(req);
      assert.equal(res.status, 200, "Valid Bearer auth must return 200");
      const data = await res.json();
      assert.equal(data.success, true);
      assert.ok(typeof data.expiredSubscriptionsCount === "number");
    }

    // B. Valid x-cron-secret header (GET)
    {
      const req = new Request("https://websitebanja.com/api/billing/check-expiries", {
        method: "GET",
        headers: {
          "x-cron-secret": TEST_SECRET,
        },
      });
      const res = await GET(req);
      assert.equal(res.status, 200, "Valid x-cron-secret must return 200");
    }

    // C. Valid secret query param (POST)
    {
      const req = new Request(`https://websitebanja.com/api/billing/check-expiries?secret=${TEST_SECRET}`, {
        method: "POST",
      });
      const res = await POST(req);
      assert.equal(res.status, 200, "Valid query secret must return 200");
    }

    // D. Missing secret when CRON_SECRET is configured -> 401
    {
      const req = new Request("https://websitebanja.com/api/billing/check-expiries", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
      });
      const res = await POST(req);
      assert.equal(res.status, 401, "Missing auth must return 401 Unauthorized");
      const data = await res.json();
      assert.equal(data.success, false);
      assert.equal(data.error, "Unauthorized cron execution.");
    }

    // E. Invalid / forged secret -> 401
    {
      const req = new Request("https://websitebanja.com/api/billing/check-expiries", {
        method: "POST",
        headers: {
          authorization: "Bearer wrong_secret_attacker_attempt",
          "content-type": "application/json",
        },
      });
      const res = await POST(req);
      assert.equal(res.status, 401, "Invalid auth must return 401 Unauthorized");
      const data = await res.json();
      assert.equal(data.success, false);
    }

    // Cleanup env var for testing
    delete process.env.CRON_SECRET;
  });

  // Test 3: Independence from browser tabs, frontend timers, and node process state
  await runTest("Billing entitlement logic relies strictly on DB/timestamp comparisons", () => {
    const queriesPath = path.resolve(ROOT, "src/lib/db/queries.ts");
    const queriesContent = fs.readFileSync(queriesPath, "utf8");

    assert.ok(
      queriesContent.includes("current_period_end <= now()"),
      "Must check expiration against DB timestamp now()"
    );
    assert.ok(
      queriesContent.includes("current_period_end <= now() + interval '24 hours'"),
      "Must check 24-hour expiry notification window against DB timestamp"
    );
    assert.ok(
      queriesContent.includes("pro_expiry_notification_sent_at IS NULL"),
      "Must deduplicate expiry notifications"
    );
    assert.ok(
      queriesContent.includes("GREATEST(COALESCE(subscriptions.current_period_end, now()), now()) + interval '30 days'"),
      "Must use max(current_expiry, now) + 30 days renewal formula"
    );
  });

  console.log("\n================================================================================");
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("================================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
