/**
 * WebsiteBanja AI — Post-Migration Azure Blob Storage Integrity Verifier
 * Audits 100% of files in Azure Blob Storage against the manifest and original source.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { BlobServiceClient, StorageSharedKeyCredential } from "@azure/storage-blob";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const DUMP_DIR = path.resolve(process.cwd(), "azure-migration/dumps/storage");
const MANIFEST_PATH = path.join(DUMP_DIR, "manifest.json");

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME || "websitebanjastorage";
const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;

async function getServiceClient() {
  if (connectionString) {
    return BlobServiceClient.fromConnectionString(connectionString);
  }
  if (accountName && accountKey) {
    const credential = new StorageSharedKeyCredential(accountName, accountKey);
    return new BlobServiceClient(`https://${accountName}.blob.core.windows.net`, credential);
  }
  try {
    const { DefaultAzureCredential } = await import("@azure/identity");
    return new BlobServiceClient(`https://${accountName}.blob.core.windows.net`, new DefaultAzureCredential());
  } catch {
    return null;
  }
}

async function verify() {
  console.log("================================================================================");
  console.log("AZURE BLOB STORAGE POST-MIGRATION INTEGRITY AUDIT");
  console.log("================================================================================\n");

  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error("❌ Manifest not found at:", MANIFEST_PATH);
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  console.log(`Source Manifest Count: ${manifest.length} files`);

  const client = await getServiceClient();
  if (!client) {
    console.warn("⚠️  Azure Storage credentials are not set in .env.local.");
    console.warn("   Required: AZURE_STORAGE_CONNECTION_STRING or AZURE_STORAGE_ACCOUNT_KEY");
    console.warn("   Integrity audit status: NOT VERIFIED (awaiting credentials)");
    process.exit(2);
  }

  const containerName = "project-workspaces";
  const containerClient = client.getContainerClient(containerName);

  // 1. List all blobs in container
  console.log(`Listing all blobs in Azure container '${containerName}'...`);
  const azureBlobs = new Map();
  for await (const blob of containerClient.listBlobsFlat({ includeMetadata: true })) {
    azureBlobs.set(blob.name, blob);
  }
  console.log(`Found ${azureBlobs.size} blobs in Azure container '${containerName}'.`);

  // 2. Cross-reference manifest against Azure blobs
  let matchCount = 0;
  const missingInAzure = [];
  const hashMismatches = [];

  for (const item of manifest) {
    const blob = azureBlobs.get(item.storagePath);
    if (!blob) {
      missingInAzure.push(item.storagePath);
      continue;
    }

    // Verify SHA-256
    const blockClient = containerClient.getBlockBlobClient(item.storagePath);
    const buf = await blockClient.downloadToBuffer();
    const actualHash = crypto.createHash("sha256").update(buf).digest("hex");

    if (actualHash === item.sha256) {
      matchCount++;
    } else {
      hashMismatches.push({
        path: item.storagePath,
        expected: item.sha256,
        actual: actualHash,
      });
    }
  }

  // 3. Find any unexpected blobs in Azure
  const manifestPaths = new Set(manifest.map((m) => m.storagePath));
  const unexpectedBlobs = [];
  for (const [name] of azureBlobs) {
    if (!manifestPaths.has(name)) {
      unexpectedBlobs.push(name);
    }
  }

  console.log("\n================================================================================");
  console.log("INTEGRITY VERIFICATION AUDIT RESULTS");
  console.log("================================================================================");
  console.log(`Source (Supabase) Files:   ${manifest.length}`);
  console.log(`Azure Blobs in Container:  ${azureBlobs.size}`);
  console.log(`SHA-256 Perfect Matches:   ${matchCount} / ${manifest.length}`);
  console.log(`Missing in Azure:          ${missingInAzure.length}`);
  console.log(`Checksum Mismatches:       ${hashMismatches.length}`);
  console.log(`Unexpected Blobs in Azure: ${unexpectedBlobs.length}`);

  if (missingInAzure.length > 0) {
    console.log("\nMissing Files in Azure:");
    missingInAzure.slice(0, 10).forEach((p) => console.log(`  ❌ ${p}`));
    if (missingInAzure.length > 10) console.log(`  ... and ${missingInAzure.length - 10} more`);
  }

  if (hashMismatches.length > 0) {
    console.log("\nChecksum Mismatches:");
    hashMismatches.forEach((m) => console.log(`  ❌ ${m.path}: expected ${m.expected}, got ${m.actual}`));
  }

  if (unexpectedBlobs.length > 0) {
    console.log("\nUnexpected Blobs in Azure:");
    unexpectedBlobs.slice(0, 10).forEach((p) => console.log(`  ⚠️  ${p}`));
  }

  console.log("================================================================================");

  if (missingInAzure.length === 0 && hashMismatches.length === 0 && matchCount === manifest.length) {
    console.log("✅ VERIFICATION PASSED: 100% PARITY & ZERO CHECKSUM DRIFT");
    process.exit(0);
  } else {
    console.log("❌ VERIFICATION FAILED");
    process.exit(1);
  }
}

verify().catch((err) => {
  console.error("Verification error:", err);
  process.exit(1);
});
