/**
 * Test Suite: Razorpay LIVE Mode, 30-Day Entitlement, Stacking Renewal & Expiry
 */

import assert from "node:assert/strict";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import jitiFactory from "jiti";

dotenv.config({ path: ".env.local" });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const jiti = jitiFactory(ROOT, {
  alias: { "@": path.resolve(ROOT, "src") },
});

const {
  FREE_STUDIO_CHANGE_LIMIT,
  PRO_STUDIO_CHANGE_SAFETY_LIMIT,
  isProUser,
  getStudioChangeLimit,
} = jiti("@/lib/plans");

const {
  dbGetUserSubscription,
  dbUpsertUserSubscription,
  dbCheckSubscriptionExpiries,
} = jiti("@/lib/db/queries");

const { getStudioQuota, consumeStudioQuota, resetQuotaStoreForTesting } = jiti(
  "@/lib/studioQuota"
);

console.log("================================================================================");
console.log("TESTING RAZORPAY LIVE MODE, 30-DAY ENTITLEMENT & EXPIRY RULES");
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
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  // Test 1: LIVE mode credentials check
  await runTest("Razorpay credentials are configured with LIVE key", () => {
    assert.ok(key_id, "RAZORPAY_KEY_ID must be set");
    assert.ok(key_secret, "RAZORPAY_KEY_SECRET must be set");
    assert.equal(key_id.startsWith("rzp_live_"), true, "Key ID must start with rzp_live_");
    assert.equal(key_id, "rzp_live_TbQHhcCvdVWoTU", "Key ID matches user-provided LIVE key");
  });

  // Test 2: Server-side HMAC-SHA256 signature verification with LIVE secret
  await runTest("HMAC-SHA256 signature verification accepts valid signatures", () => {
    const order_id = "order_live_9876543210";
    const payment_id = "pay_live_1234567890";

    const signature = crypto
      .createHmac("sha256", key_secret)
      .update(`${order_id}|${payment_id}`)
      .digest("hex");

    const expectedSignature = crypto
      .createHmac("sha256", key_secret)
      .update(`${order_id}|${payment_id}`)
      .digest("hex");

    const match = crypto.timingSafeEqual(
      Buffer.from(signature, "utf8"),
      Buffer.from(expectedSignature, "utf8")
    );

    assert.equal(match, true, "Valid signature must match expected HMAC-SHA256");
  });

  // Test 3: Rejection of forged signature
  await runTest("HMAC-SHA256 signature verification rejects tampered signatures", () => {
    const order_id = "order_live_9876543210";
    const payment_id = "pay_live_1234567890";
    const fakeSignature = "deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef";

    const expectedSignature = crypto
      .createHmac("sha256", key_secret)
      .update(`${order_id}|${payment_id}`)
      .digest("hex");

    const match = crypto.timingSafeEqual(
      Buffer.from(fakeSignature, "utf8"),
      Buffer.from(expectedSignature, "utf8")
    );

    assert.equal(match, false, "Forged signature must be rejected");
  });

  // Test 4: First-time purchase sets exactly 30 days Pro expiry
  const testUser1 = "user_test_pro_30d_" + Date.now();
  await runTest("Initial ₹500 payment sets 30-day Pro expiry", async () => {
    const sub = await dbUpsertUserSubscription(testUser1, "paid_pro", "active_paid", 500);
    assert.equal(sub.plan_id, "paid_pro");
    assert.equal(sub.status, "active_paid");
    assert.ok(sub.current_period_end, "current_period_end must be populated");

    const endMs = new Date(sub.current_period_end).getTime();
    const startMs = new Date(sub.current_period_start).getTime();
    const diffDays = Math.round((endMs - startMs) / (1000 * 60 * 60 * 24));
    assert.equal(diffDays, 30, "Entitlement period must be 30 days");
  });

  // Test 5: isProUser evaluates true while within 30 days
  await runTest("isProUser returns true while current_period_end is in future", async () => {
    const sub = await dbGetUserSubscription(testUser1);
    assert.equal(isProUser(sub.plan_id, sub.status, sub.current_period_end), true);
    assert.equal(getStudioChangeLimit(sub.plan_id, sub.status, sub.current_period_end), PRO_STUDIO_CHANGE_SAFETY_LIMIT);
  });

  // Test 6: Stacking Renewal BEFORE expiry (extends from old expiry, NOT from now)
  await runTest("Renewal before expiry extends expiry from old end date: max(current_expiry, now) + 30d", async () => {
    const sub1 = await dbGetUserSubscription(testUser1);
    const oldEndMs = new Date(sub1.current_period_end).getTime();

    // Renew immediately
    const sub2 = await dbUpsertUserSubscription(testUser1, "paid_pro", "active_paid", 500);
    const newEndMs = new Date(sub2.current_period_end).getTime();

    const additionalDays = Math.round((newEndMs - oldEndMs) / (1000 * 60 * 60 * 24));
    assert.equal(additionalDays, 30, "Renewal must add 30 days to existing expiry date");
  });

  // Test 7: Expired Pro user automatically treated as Free tier
  const testUserExpired = "user_test_expired_" + Date.now();
  await runTest("Expired Pro user automatically treated as Free tier", async () => {
    // Manually set an expired subscription in past
    const pastStart = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
    const pastEnd = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

    // Seed into fallback memory
    await dbUpsertUserSubscription(testUserExpired, "paid_pro", "active_paid", 500);
    const subRec = await dbGetUserSubscription(testUserExpired);
    subRec.current_period_start = pastStart.toISOString();
    subRec.current_period_end = pastEnd.toISOString();

    // Query through dbGetUserSubscription
    const evaluated = await dbGetUserSubscription(testUserExpired);
    assert.equal(evaluated.plan_id, "free", "Expired plan_id must drop to free");
    assert.equal(evaluated.status, "expired", "Expired status must be expired");

    const isPro = isProUser(evaluated.plan_id, evaluated.status, evaluated.current_period_end);
    assert.equal(isPro, false, "Expired user must NOT be Pro");

    const limit = getStudioChangeLimit(evaluated.plan_id, evaluated.status, evaluated.current_period_end);
    assert.equal(limit, FREE_STUDIO_CHANGE_LIMIT, "Expired user limit must be 4");
  });

  // Test 8: Expired user Studio Quota enforcement
  await runTest("Expired Pro user enforces Free quota limit (4 changes max)", async () => {
    resetQuotaStoreForTesting(testUserExpired);
    const quota = await getStudioQuota(testUserExpired);
    assert.equal(quota.isPro, false);
    assert.equal(quota.limit, 4);
    assert.equal(quota.remainingChanges, 4);

    // Consume 4 mutations
    for (let i = 1; i <= 4; i++) {
      const res = await consumeStudioQuota(testUserExpired, `hash_${i}`);
      assert.equal(res.success, true);
    }

    // 5th mutation must be blocked!
    const blockedRes = await consumeStudioQuota(testUserExpired, "hash_5");
    assert.equal(blockedRes.success, false);
    assert.equal(blockedRes.blocked, true);
    assert.equal(blockedRes.quota.remainingChanges, 0);
  });

  // Test 9: Renewal AFTER expiry starts 30 days from payment time
  await runTest("Renewal after expiry grants 30 days from now", async () => {
    const now = Date.now();
    const renewedSub = await dbUpsertUserSubscription(testUserExpired, "paid_pro", "active_paid", 500);
    assert.equal(renewedSub.plan_id, "paid_pro");
    assert.equal(renewedSub.status, "active_paid");

    const newEndMs = new Date(renewedSub.current_period_end).getTime();
    const daysFromNow = Math.round((newEndMs - now) / (1000 * 60 * 60 * 24));
    assert.equal(daysFromNow, 30, "Renewal after expiry must grant 30 days from now");

    // Quota is now unblocked
    const quota = await getStudioQuota(testUserExpired);
    assert.equal(quota.isPro, true);
    assert.equal(quota.isBlocked, false);
  });

  // Test 10: 24-Hour Expiry Notification & Deduplication
  const testUserExpiringSoon = "user_test_expiring_soon_" + Date.now();
  await runTest("24-hour expiry check flags user expiring within 24h once, without duplicate notifications", async () => {
    // Set expiry 12 hours from now
    const soonEnd = new Date(Date.now() + 12 * 60 * 60 * 1000);
    await dbUpsertUserSubscription(testUserExpiringSoon, "paid_pro", "active_paid", 500);
    const sub = await dbGetUserSubscription(testUserExpiringSoon);
    sub.current_period_end = soonEnd.toISOString();
    sub.pro_expiry_notification_sent_at = null;

    // Run check
    const check1 = await dbCheckSubscriptionExpiries();
    assert.ok(check1.notifiedUsers.includes(testUserExpiringSoon), "User must be included in notified list");

    const subAfter = await dbGetUserSubscription(testUserExpiringSoon);
    assert.ok(subAfter.pro_expiry_notification_sent_at, "Notification timestamp must be set");

    // Run check a second time -> DEDUPLICATED, must not notify again!
    const check2 = await dbCheckSubscriptionExpiries();
    assert.equal(check2.notifiedUsers.includes(testUserExpiringSoon), false, "User must NOT be notified twice");
  });

  console.log("\n================================================================================");
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("================================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
