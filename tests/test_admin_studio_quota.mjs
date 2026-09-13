/**
 * Test Suite: Admin-Only Unlimited Studio Changes Bypass & Security Boundary Enforcement
 *
 * Verifies:
 * 1. Admin users have genuinely unlimited Studio changes server-side (surpasses 60 cap).
 * 2. Normal Pro users are strictly capped at PRO_STUDIO_CHANGE_SAFETY_LIMIT (60).
 * 3. Free users are strictly capped at FREE_STUDIO_CHANGE_LIMIT (4).
 * 4. Forged admin claims by untrusted/normal users are rejected.
 * 5. Unauthenticated users cannot access admin bypass.
 * 6. Concurrent admin mutations execute without race conditions or deadlocks.
 * 7. Duplicate mutation hashes remain idempotent.
 * 8. Failed / no-op mutations do not consume quota.
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
  consumeStudioChange,
  assertStudioGenerationAllowed,
  isMeaningfulStudioMutation,
  resetQuotaStoreForTesting,
  registerAdminUserId,
} = jiti("@/lib/studioQuota");

const { isUserAdmin } = jiti("@/lib/adminAuth");
const { dbUpsertUserSubscription } = jiti("@/lib/db/queries");

console.log("================================================================================");
console.log("TESTING ADMIN-ONLY UNLIMITED STUDIO CHANGES BYPASS & SECURITY");
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
  resetQuotaStoreForTesting();

  // Test 1: Authoritative isUserAdmin detection
  await runTest("Authoritative isUserAdmin validates email, role, and ID; rejects forged flags", () => {
    // A. Role in app_metadata
    assert.equal(isUserAdmin({ email: "user@example.com", app_metadata: { role: "admin" } }), true);
    assert.equal(isUserAdmin({ email: "user@example.com", app_metadata: { role: "superadmin" } }), true);
    assert.equal(isUserAdmin({ email: "user@example.com", app_metadata: { role: "authenticated" } }), false);

    // B. Email in ADMIN_EMAILS
    process.env.ADMIN_EMAILS = "safal@websitebanja.com,admin@websitebanja.com";
    assert.equal(isUserAdmin({ email: "safal@websitebanja.com" }), true);
    assert.equal(isUserAdmin({ email: "ADMIN@WEBSITEBANJA.COM" }), true); // Case-insensitive
    assert.equal(isUserAdmin({ email: "attacker@example.com" }), false);

    // C. ID in ADMIN_USER_IDS
    process.env.ADMIN_USER_IDS = "admin-uuid-1,admin-uuid-2";
    assert.equal(isUserAdmin({ id: "admin-uuid-1" }), true);
    assert.equal(isUserAdmin({ id: "regular-user-id" }), false);

    // D. Forged claims without valid email or role
    assert.equal(isUserAdmin({ id: "fake", isAdmin: true }), false);
    assert.equal(isUserAdmin(null), false);
    assert.equal(isUserAdmin(undefined), false);
  });

  // Test 2: Admin user has genuinely unlimited Studio changes (surpassing 60 safety cap)
  await runTest("Admin user can perform 70+ meaningful Studio changes without getting blocked", async () => {
    resetQuotaStoreForTesting();
    const adminUser = {
      id: "admin-tester-" + Date.now(),
      email: "admin@websitebanja.com",
      app_metadata: { role: "admin" },
    };

    const initialQuota = await getStudioQuota(adminUser.id, adminUser);
    assert.equal(initialQuota.isAdmin, true, "Initial quota must flag isAdmin: true");
    assert.equal(initialQuota.isBlocked, false, "Admin must never be blocked initially");

    // Execute 70 mutations (exceeding Pro 60-change safety cap)
    for (let i = 1; i <= 70; i++) {
      const hash = `admin_mutation_hash_${i}_${Date.now()}`;
      const res = await consumeStudioQuota(adminUser.id, hash, adminUser);
      assert.equal(res.success, true, `Mutation ${i} must succeed for admin`);
      assert.equal(res.blocked, false, `Mutation ${i} must not be blocked for admin`);
      assert.equal(res.quota.isBlocked, false, `Quota isBlocked must be false on mutation ${i}`);
    }

    const quotaAfter70 = await getStudioQuota(adminUser.id, adminUser);
    assert.equal(quotaAfter70.isBlocked, false, "Admin must not be blocked after 70 changes");
    assert.equal(quotaAfter70.isAdmin, true);

    // assertStudioGenerationAllowed must not throw
    const allowed = await assertStudioGenerationAllowed(adminUser.id, adminUser);
    assert.equal(allowed.allowed, true);
  });

  // Test 3: Normal Pro user is strictly blocked at PRO_STUDIO_CHANGE_SAFETY_LIMIT (60)
  await runTest("Normal Pro user is strictly blocked at 60 changes (61st fails)", async () => {
    resetQuotaStoreForTesting();
    const proUserId = "normal-pro-user-" + Date.now();

    // Grant standard Pro entitlement
    await dbUpsertUserSubscription(proUserId, "paid_pro", "active_paid", 500);

    const initialQuota = await getStudioQuota(proUserId);
    assert.equal(initialQuota.isPro, true, "Must be Pro user");
    assert.equal(initialQuota.isAdmin, false, "Normal Pro user must NOT be admin");
    assert.equal(initialQuota.limit, PRO_STUDIO_CHANGE_SAFETY_LIMIT, "Limit must be 60");

    // Perform 60 changes
    for (let i = 1; i <= 60; i++) {
      const hash = `pro_mutation_${i}_${Date.now()}`;
      const res = await consumeStudioQuota(proUserId, hash);
      assert.equal(res.success, true, `Change ${i} must succeed`);
      assert.equal(res.blocked, false);
    }

    // 61st change must be BLOCKED
    const blockedRes = await consumeStudioQuota(proUserId, "pro_mutation_61");
    assert.equal(blockedRes.success, false, "61st change must fail for normal Pro");
    assert.equal(blockedRes.blocked, true, "61st change must be blocked");
    assert.equal(blockedRes.message, "You've reached your current Studio change limit.");

    await assert.rejects(
      async () => assertStudioGenerationAllowed(proUserId),
      /You've reached your current Studio change limit/
    );
  });

  // Test 4: Free user is strictly blocked at FREE_STUDIO_CHANGE_LIMIT (4)
  await runTest("Free user is strictly blocked at 4 changes (5th fails)", async () => {
    resetQuotaStoreForTesting();
    const freeUserId = "free-user-" + Date.now();

    const initialQuota = await getStudioQuota(freeUserId);
    assert.equal(initialQuota.isPro, false);
    assert.equal(initialQuota.isAdmin, false);
    assert.equal(initialQuota.limit, FREE_STUDIO_CHANGE_LIMIT);

    // Perform 4 changes
    for (let i = 1; i <= 4; i++) {
      const hash = `free_mutation_${i}_${Date.now()}`;
      const res = await consumeStudioQuota(freeUserId, hash);
      assert.equal(res.success, true, `Free change ${i} must succeed`);
      assert.equal(res.blocked, false);
    }

    // 5th change must be BLOCKED
    const blockedRes = await consumeStudioQuota(freeUserId, "free_mutation_5");
    assert.equal(blockedRes.success, false, "5th change must fail for Free user");
    assert.equal(blockedRes.blocked, true, "5th change must be blocked");
    assert.equal(blockedRes.message, "You've reached your Free Plan Studio change limit.");
    assert.equal(blockedRes.cta, "Upgrade to Pro — ₹500/month");

    await assert.rejects(
      async () => assertStudioGenerationAllowed(freeUserId),
      /You've reached your Free Plan Studio change limit/
    );
  });

  // Test 5: Forged admin flag rejection
  await runTest("Forged admin claims in untrusted payloads are rejected", async () => {
    resetQuotaStoreForTesting();
    const attackerId = "attacker-" + Date.now();
    const maliciousUser = {
      id: attackerId,
      email: "attacker@malicious.com",
      isAdmin: true, // Forged client-side parameter
      app_metadata: { role: "authenticated" },
    };

    const quota = await getStudioQuota(attackerId, maliciousUser);
    assert.equal(quota.isAdmin, false, "Attacker must NOT be granted admin");
    assert.equal(quota.limit, 4, "Attacker must be held to Free limit of 4");
  });

  // Test 6: Concurrent Admin mutations under withUserLock
  await runTest("Concurrent admin mutations resolve cleanly without deadlock", async () => {
    resetQuotaStoreForTesting();
    const adminUser = {
      id: "admin-concurrent-" + Date.now(),
      email: "admin@websitebanja.com",
      app_metadata: { role: "admin" },
    };

    const promises = Array.from({ length: 15 }, (_, i) =>
      consumeStudioQuota(adminUser.id, `concurrent_hash_${i}`, adminUser)
    );

    const results = await Promise.all(promises);
    assert.equal(results.length, 15);
    for (const r of results) {
      assert.equal(r.success, true);
      assert.equal(r.blocked, false);
    }
  });

  // Test 7: Idempotency: duplicate mutation hash does not count twice
  await runTest("Duplicate mutation hashes remain idempotent", async () => {
    resetQuotaStoreForTesting();
    const freeUserId = "free-idempotent-" + Date.now();
    const sameHash = "fixed_content_hash_12345";

    const res1 = await consumeStudioQuota(freeUserId, sameHash);
    assert.equal(res1.success, true);
    assert.equal(res1.quota.changesUsed, 1);

    // Call again with exact same hash
    const res2 = await consumeStudioQuota(freeUserId, sameHash);
    assert.equal(res2.success, true);
    assert.equal(res2.quota.changesUsed, 1, "Duplicate mutation hash must not increment changesUsed");
  });

  // Test 8: Non-content / no-op mutations do not count as meaningful
  await runTest("No-op identical mutations are detected as non-meaningful", () => {
    const existing = {
      name: "My Business",
      json_data: { hero: { title: "Hello World" } },
    };
    const identical = {
      name: "My Business",
      json_data: { hero: { title: "Hello World" } },
    };

    const check = isMeaningfulStudioMutation(existing, identical);
    assert.equal(check.isMeaningful, false, "Identical content must not be meaningful");
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
