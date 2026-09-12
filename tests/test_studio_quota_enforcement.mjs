/**
 * Test Suite: Free vs Pro Studio Change Quota Enforcement
 *
 * Verifies:
 * 1. Free user: 4 meaningful changes succeed (quota 3, 2, 1, 0 remaining).
 * 2. 5th meaningful change is BLOCKED with HTTP 403 QUOTA_EXCEEDED.
 * 3. Exact user messaging:
 *    - "You've reached your Free Plan Studio change limit."
 *    - "Upgrade to Pro to continue editing your website."
 *    - CTA: "Upgrade to Pro — ₹500/month"
 * 4. Read / preview / no-op / duplicate retries do NOT consume quota.
 * 5. Failed mutation does NOT consume quota.
 * 6. Pro user: UI "Unlimited Studio Changes", 60 safety cap, 61st blocked with:
 *    - "You've reached your current Studio change limit."
 */

import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import jitiFactory from "jiti";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const jiti = jitiFactory(ROOT, {
  alias: { "@": path.resolve(ROOT, "src") },
});

const {
  FREE_STUDIO_CHANGE_LIMIT,
  PRO_STUDIO_CHANGE_SAFETY_LIMIT,
  getStudioQuota,
  consumeStudioQuota,
  isMeaningfulStudioMutation,
  elevateQuotaToPro,
  resetQuotaStoreForTesting,
} = jiti("@/lib/studioQuota");

const { dbUpsertUserSubscription } = jiti("@/lib/db/queries");

console.log("================================================================================");
console.log("TESTING STUDIO CHANGE QUOTA ENFORCEMENT & RULES");
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
  const freeUserId = "test-free-user-" + Date.now();
  const proUserId = "test-pro-user-" + Date.now();

  resetQuotaStoreForTesting();

  // Test 1: Baseline Constants
  await runTest("Configurable limits match policy specifications", () => {
    assert.equal(FREE_STUDIO_CHANGE_LIMIT, 4, "FREE_STUDIO_CHANGE_LIMIT must equal 4");
    assert.equal(PRO_STUDIO_CHANGE_SAFETY_LIMIT, 60, "PRO_STUDIO_CHANGE_SAFETY_LIMIT must equal 60");
  });

  // Test 2: Initial Free Quota
  await runTest("Fresh Free user has 4 remaining Studio changes and is not blocked", async () => {
    const quota = await getStudioQuota(freeUserId);
    assert.equal(quota.planId, "free");
    assert.equal(quota.isPro, false);
    assert.equal(quota.changesUsed, 0);
    assert.equal(quota.limit, 4);
    assert.equal(quota.remainingChanges, 4);
    assert.equal(quota.isBlocked, false);
  });

  // Test 3: Meaningful Mutation Detection & Non-Countable Operations
  await runTest("Non-content operations (read, preview, empty) do NOT count as mutations", () => {
    const existing = {
      json_data: { hero: { title: "Welcome", subtitle: "Best Bakery" } },
      name: "Sweet Crust",
    };

    // No-op / identical content
    const noopResult = isMeaningfulStudioMutation(existing, {
      json_data: { hero: { title: "Welcome", subtitle: "Best Bakery" } },
    });
    assert.equal(noopResult.isMeaningful, false, "Identical content must be no-op");

    // Empty updates
    const emptyResult = isMeaningfulStudioMutation(existing, {});
    assert.equal(emptyResult.isMeaningful, false, "Empty payload must not count");

    // Non-content updates (e.g. preview expires or publish flags)
    const metaResult = isMeaningfulStudioMutation(existing, { is_published: true });
    assert.equal(metaResult.isMeaningful, false, "Publish / metadata flags must not count as studio mutations");

    // Real content mutation (Hero headline edit)
    const textMutation = isMeaningfulStudioMutation(existing, {
      json_data: { hero: { title: "Welcome to Artisanal Sweet Crust", subtitle: "Best Bakery" } },
    });
    assert.equal(textMutation.isMeaningful, true, "Text edit must be detected as meaningful");
  });

  // Test 4: Turn 1 — Hero text change
  await runTest("Turn 1 (Hero text change) succeeds: changesUsed=1, remaining=3", async () => {
    const res = await consumeStudioQuota(freeUserId, "hash_turn_1");
    assert.equal(res.success, true);
    assert.equal(res.blocked, false);
    assert.equal(res.quota.changesUsed, 1);
    assert.equal(res.quota.remainingChanges, 3);
    assert.equal(res.quota.isBlocked, false);
  });

  // Test 5: Duplicate retry does not double count
  await runTest("Duplicate retry with same mutation hash does NOT consume extra quota", async () => {
    const res = await consumeStudioQuota(freeUserId, "hash_turn_1");
    assert.equal(res.success, true);
    assert.equal(res.blocked, false);
    assert.equal(res.quota.changesUsed, 1, "Count must remain 1 after duplicate retry");
    assert.equal(res.quota.remainingChanges, 3);
  });

  // Test 6: Turn 2 — Hero image change
  await runTest("Turn 2 (Hero image change) succeeds: changesUsed=2, remaining=2", async () => {
    const res = await consumeStudioQuota(freeUserId, "hash_turn_2");
    assert.equal(res.success, true);
    assert.equal(res.quota.changesUsed, 2);
    assert.equal(res.quota.remainingChanges, 2);
  });

  // Test 7: Turn 3 — Card / content modification
  await runTest("Turn 3 (Card modification) succeeds: changesUsed=3, remaining=1", async () => {
    const res = await consumeStudioQuota(freeUserId, "hash_turn_3");
    assert.equal(res.success, true);
    assert.equal(res.quota.changesUsed, 3);
    assert.equal(res.quota.remainingChanges, 1);
  });

  // Test 8: Turn 4 — Section design / layout change
  await runTest("Turn 4 (Section layout change) succeeds: changesUsed=4, remaining=0", async () => {
    const res = await consumeStudioQuota(freeUserId, "hash_turn_4");
    assert.equal(res.success, true);
    assert.equal(res.quota.changesUsed, 4);
    assert.equal(res.quota.remainingChanges, 0);
    assert.equal(res.quota.isBlocked, true, "Must be blocked after 4th change");
  });

  // Test 9: Turn 5 — Must be BLOCKED with exact required messaging
  await runTest("Turn 5 is strictly BLOCKED with Free Plan limit messages and CTA", async () => {
    const res = await consumeStudioQuota(freeUserId, "hash_turn_5");
    assert.equal(res.success, false, "5th mutation must fail");
    assert.equal(res.blocked, true);
    assert.equal(res.quota.changesUsed, 4, "Changes used must remain capped at 4");
    assert.equal(res.quota.remainingChanges, 0);

    // Verify exact required messages
    assert.equal(res.message, "You've reached your Free Plan Studio change limit.");
    assert.equal(res.subMessage, "Upgrade to Pro to continue editing your website.");
    assert.equal(res.cta, "Upgrade to Pro — ₹500/month");
  });

  // Test 10: Subsequent reads / checks do not alter blocked state
  await runTest("Subsequent quota reads preserve blocked status and 0 remaining changes", async () => {
    const quota = await getStudioQuota(freeUserId);
    assert.equal(quota.changesUsed, 4);
    assert.equal(quota.remainingChanges, 0);
    assert.equal(quota.isBlocked, true);
  });

  // Test 11: Pro User Entitlement & Safety Cap
  await runTest("Pro user initialization: 'Unlimited Studio Changes' in UI, 60 safety limit", async () => {
    // Set user as active_paid Pro
    await dbUpsertUserSubscription(proUserId, "paid_pro", "active_paid", 500);
    await elevateQuotaToPro(proUserId);

    const quota = await getStudioQuota(proUserId);
    assert.equal(quota.planId, "paid_pro");
    assert.equal(quota.isPro, true);
    assert.equal(quota.limit, 60, "Pro limit must be 60");
    assert.equal(quota.changesUsed, 0);
    assert.equal(quota.remainingChanges, 60);
    assert.equal(quota.isBlocked, false);
  });

  // Test 12: Pro user can perform changes beyond 4 without restriction
  await runTest("Pro user can exceed 4 changes without restriction", async () => {
    for (let i = 1; i <= 10; i++) {
      const res = await consumeStudioQuota(proUserId, `hash_pro_${i}`);
      assert.equal(res.success, true, `Pro mutation ${i} must succeed`);
      assert.equal(res.blocked, false);
    }
    const quota = await getStudioQuota(proUserId);
    assert.equal(quota.changesUsed, 10);
    assert.equal(quota.remainingChanges, 50);
    assert.equal(quota.isBlocked, false);
  });

  // Test 13: Pro user 60-change safety cap boundary
  await runTest("Pro user 60th mutation succeeds, 61st is blocked with safety cap message", async () => {
    // Fast-forward to 60
    for (let i = 11; i <= 60; i++) {
      const res = await consumeStudioQuota(proUserId, `hash_pro_${i}`);
      assert.equal(res.success, true);
    }

    const quota60 = await getStudioQuota(proUserId);
    assert.equal(quota60.changesUsed, 60);
    assert.equal(quota60.remainingChanges, 0);
    assert.equal(quota60.isBlocked, true);

    // 61st mutation
    const blockedRes = await consumeStudioQuota(proUserId, "hash_pro_61");
    assert.equal(blockedRes.success, false);
    assert.equal(blockedRes.blocked, true);
    assert.equal(blockedRes.message, "You've reached your current Studio change limit.");
  });

  // Test 14: Upgrading unblocks user immediately and grants fresh quota
  await runTest("Upgrading blocked Free user elevates to Pro and unblocks mutations", async () => {
    // User was blocked at 4
    const beforeUpgrade = await getStudioQuota(freeUserId);
    assert.equal(beforeUpgrade.isBlocked, true);

    // Simulate successful payment upgrade
    await dbUpsertUserSubscription(freeUserId, "paid_pro", "active_paid", 500);
    await elevateQuotaToPro(freeUserId);

    const afterUpgrade = await getStudioQuota(freeUserId);
    assert.equal(afterUpgrade.planId, "paid_pro");
    assert.equal(afterUpgrade.isPro, true);
    assert.equal(afterUpgrade.limit, 60);
    assert.equal(afterUpgrade.changesUsed, 0);
    assert.equal(afterUpgrade.remainingChanges, 60);
    assert.equal(afterUpgrade.isBlocked, false);

    // Now mutation succeeds
    const unblockedRes = await consumeStudioQuota(freeUserId, "hash_after_upgrade_1");
    assert.equal(unblockedRes.success, true);
    assert.equal(unblockedRes.blocked, false);
  });

  console.log("\n================================================================================");
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log("================================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("FATAL TEST ERROR:", err);
  process.exit(1);
});
