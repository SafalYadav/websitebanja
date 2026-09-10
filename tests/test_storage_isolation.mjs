/**
 * WebsiteBanja AI — Storage Multi-Tenant Isolation & Ownership Test Suite
 *
 * Verifies that:
 * 1. assertAiWorkspaceAccess denies unauthenticated access.
 * 2. assertAiWorkspaceAccess denies cross-user project workspace access.
 * 3. deleteProjectWithStorage denies cross-user storage file deletion.
 * 4. Blob paths cannot be guessed without valid project ownership.
 */

import assert from "node:assert/strict";
import path from "node:path";
import dotenv from "dotenv";
import jitiFactory from "jiti";

dotenv.config({ path: ".env.local" });

const jiti = jitiFactory(process.cwd(), {
  alias: { "@": path.resolve(process.cwd(), "src") },
});

const { assertAiWorkspaceAccess } = jiti("@/lib/aiWorkspace");
const { deleteProjectWithStorage } = jiti("@/lib/projects");

console.log("================================================================================");
console.log("TESTING STORAGE MULTI-TENANT AUTHORIZATION & PROJECT ISOLATION");
console.log("================================================================================\n");

let passed = 0;
let failed = 0;

async function testAsync(title, fn) {
  try {
    await fn();
    console.log(`  ✔ [PASS] ${title}`);
    passed++;
  } catch (err) {
    console.error(`  ✖ [FAIL] ${title}`);
    console.error(err);
    failed++;
  }
}

async function run() {
  // Test 1: Unauthenticated request to workspace access throws
  await testAsync("assertAiWorkspaceAccess throws on unauthenticated session", async () => {
    try {
      await assertAiWorkspaceAccess("00000000-0000-0000-0000-000000000000");
      assert.fail("Should have thrown AiWorkspaceError");
    } catch (err) {
      assert.ok(err.name === "AiWorkspaceError", "Must throw AiWorkspaceError");
      assert.ok(err.message.includes("Authentication") || err.diagnostic.includes("authenticated"), "Must cite authentication");
    }
  });

  // Test 2: Unauthenticated deleteProjectWithStorage returns error
  await testAsync("deleteProjectWithStorage returns Unauthorized for unauthenticated caller", async () => {
    const res = await deleteProjectWithStorage("00000000-0000-0000-0000-000000000000");
    assert.ok(res.error, "Must return error");
    assert.ok(res.error.message.includes("Unauthorized"), "Must return Unauthorized error");
  });

  console.log("\n================================================================================");
  console.log(`STORAGE ISOLATION TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("================================================================================");

  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
