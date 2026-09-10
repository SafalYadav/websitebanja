/**
 * WebsiteBanja AI — Storage Abstraction & Migration Verification Test Suite
 *
 * Verifies:
 * 1. Storage Dump & Manifest Integrity (196 files, 14 projects)
 * 2. Cryptographic Checksum Parity (SHA-256 matches on 100% of files)
 * 3. Dynamic Provider Routing (Supabase fallback vs Azure Blob)
 * 4. Storage Client Abstraction Interface (upload, download, remove, getPublicUrl)
 * 5. Health Check reporting
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import dotenv from "dotenv";
import jitiFactory from "jiti";

dotenv.config({ path: ".env.local" });

const jiti = jitiFactory(process.cwd(), {
  alias: { "@": path.resolve(process.cwd(), "src") },
});

const { getStorageConfig } = jiti("@/lib/storage/config");
const { getStorageClient, checkStorageHealth } = jiti("@/lib/storage");

console.log("================================================================================");
console.log("TESTING STORAGE ABSTRACTION & MIGRATION PARITY");
console.log("================================================================================\n");

let passed = 0;
let failed = 0;

function test(title, testFn) {
  try {
    testFn();
    console.log(`  ✔ [PASS] ${title}`);
    passed++;
  } catch (err) {
    console.error(`  ✖ [FAIL] ${title}`);
    console.error(err);
    failed++;
  }
}

async function testAsync(title, testFn) {
  try {
    await testFn();
    console.log(`  ✔ [PASS] ${title}`);
    passed++;
  } catch (err) {
    console.error(`  ✖ [FAIL] ${title}`);
    console.error(err);
    failed++;
  }
}

async function run() {
  const DUMP_DIR = path.resolve(process.cwd(), "azure-migration/dumps/storage");
  const MANIFEST_PATH = path.join(DUMP_DIR, "manifest.json");

  // Suite 1: Manifest & Local Dump Parity
  console.log("[Suite 1] Supabase Storage Dump & Manifest Verification");
  test("Manifest file exists and contains exactly 196 files across 14 projects", () => {
    assert.ok(fs.existsSync(MANIFEST_PATH), "Manifest must exist");
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
    assert.equal(manifest.length, 196, "Must contain exactly 196 files");

    const projectSet = new Set(manifest.map((m) => m.projectId));
    assert.equal(projectSet.size, 14, "Must cover all 14 projects with workspaces");
  });

  test("Every dumped file exists on disk and matches SHA-256 cryptographic hash", () => {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
    for (const item of manifest) {
      const filePath = path.join(DUMP_DIR, item.relativePath);
      assert.ok(fs.existsSync(filePath), `File missing: ${item.relativePath}`);
      const content = fs.readFileSync(filePath);
      const hash = crypto.createHash("sha256").update(content).digest("hex");
      assert.equal(hash, item.sha256, `Hash mismatch on ${item.relativePath}`);
      assert.equal(content.length, item.sizeBytes, `Size mismatch on ${item.relativePath}`);
    }
  });

  // Suite 2: Storage Configuration & Dual-Provider Routing
  console.log("\n[Suite 2] Storage Configuration & Dual-Provider Abstraction");
  test("getStorageConfig defaults safely to 'supabase' for zero-risk rollback", () => {
    delete process.env.STORAGE_PROVIDER;
    const config = getStorageConfig();
    assert.equal(config.provider, "supabase");
  });

  test("getStorageConfig respects STORAGE_PROVIDER=azure override", () => {
    process.env.STORAGE_PROVIDER = "azure";
    const config = getStorageConfig();
    assert.equal(config.provider, "azure");
    delete process.env.STORAGE_PROVIDER;
  });

  await testAsync("checkStorageHealth reports healthy for active provider", async () => {
    process.env.STORAGE_PROVIDER = "supabase";
    const health = await checkStorageHealth();
    assert.equal(health.provider, "supabase");
    assert.equal(health.status, "healthy");
    delete process.env.STORAGE_PROVIDER;
  });

  // Suite 3: Client Interface Compliance
  console.log("\n[Suite 3] Storage Client Interface Compliance");
  test("getStorageClient returns compliant IStorageClient with all 4 methods", () => {
    const client = getStorageClient("project-workspaces");
    assert.equal(typeof client.upload, "function");
    assert.equal(typeof client.download, "function");
    assert.equal(typeof client.remove, "function");
    assert.equal(typeof client.getPublicUrl, "function");
  });

  // Suite 4: Live Storage Read Parity (Supabase mode)
  console.log("\n[Suite 4] Storage Read Parity via Abstraction");
  await testAsync("Download and read workspace file via getStorageClient", async () => {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
    const sample = manifest[0];
    const client = getStorageClient("project-workspaces");
    const res = await client.download(sample.storagePath);
    assert.ok(res.data, "Must return data");
    const text = await res.data.text();
    assert.ok(text.length > 0, "Content must not be empty");
    const localContent = fs.readFileSync(path.join(DUMP_DIR, sample.relativePath), "utf8");
    assert.equal(text, localContent, "Downloaded content must match local disk export");
  });

  // Suite 5: Security & Isolation Verification
  console.log("\n[Suite 5] Security, Authorization & Project Isolation");
  test("Managed Identity configuration is accurately recognized by getStorageConfig", () => {
    process.env.AZURE_STORAGE_USE_MANAGED_IDENTITY = "true";
    process.env.AZURE_STORAGE_ACCOUNT_NAME = "websitebanjastorage";
    const config = getStorageConfig();
    assert.equal(config.useManagedIdentity, true);
    assert.equal(config.isAzureConfigured, true);
    assert.equal(config.azureAccountName, "websitebanjastorage");
    delete process.env.AZURE_STORAGE_USE_MANAGED_IDENTITY;
    delete process.env.AZURE_STORAGE_ACCOUNT_NAME;
  });

  test("getPublicUrl generates strict HTTPS endpoint without leaking credentials or query keys", () => {
    process.env.STORAGE_PROVIDER = "azure";
    const client = getStorageClient("project-workspaces");
    const { data } = client.getPublicUrl("test-project/test.md");
    assert.ok(data.publicUrl.startsWith("https://websitebanjastorage.blob.core.windows.net/project-workspaces/"));
    assert.ok(!data.publicUrl.includes("sig="), "Public URL must not include SAS signature");
    assert.ok(!data.publicUrl.includes("key="), "Public URL must not include account key");
    delete process.env.STORAGE_PROVIDER;
  });

  // Suite 6: Live Azure Storage Roundtrip (executed if configured)
  console.log("\n[Suite 6] Live Azure Blob Storage Roundtrip (Conditional)");
  const currentConfig = getStorageConfig();
  if (currentConfig.isAzureConfigured) {
    await testAsync("Live Azure upload, download, and delete lifecycle", async () => {
      process.env.STORAGE_PROVIDER = "azure";
      const client = getStorageClient("project-workspaces");
      const testPath = `.test-fixtures/lifecycle-probe-${Date.now()}.txt`;
      const testData = `azure-storage-probe-${Date.now()}`;

      // Upload
      const upRes = await client.upload(testPath, testData, { contentType: "text/plain" });
      assert.ok(!upRes.error, `Upload failed: ${upRes.error?.message}`);

      // Download
      const dlRes = await client.download(testPath);
      assert.ok(dlRes.data, "Must return data");
      const readText = await dlRes.data.text();
      assert.equal(readText, testData, "Downloaded content must match uploaded probe");

      // Delete
      const rmRes = await client.remove([testPath]);
      assert.ok(!rmRes.error, `Delete failed: ${rmRes.error?.message}`);

      delete process.env.STORAGE_PROVIDER;
    });
  } else {
    console.log("  ℹ [SKIPPED] Live Azure upload/download lifecycle (Requires AZURE_STORAGE_CONNECTION_STRING in .env.local)");
  }

  console.log("\n================================================================================");
  console.log(`STORAGE TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("================================================================================");

  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
