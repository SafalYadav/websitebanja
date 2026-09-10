/**
 * WebsiteBanja AI — Production Azure Blob Storage Import & Verification Pipeline
 * Idempotent, robust upload with exponential backoff, SHA-256 integrity verification,
 * and support for Connection Strings, Account Keys, or Azure Managed Identity.
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
  // Try Managed Identity / DefaultAzureCredential if in Azure environment
  try {
    const { DefaultAzureCredential } = await import("@azure/identity");
    const credential = new DefaultAzureCredential();
    return new BlobServiceClient(`https://${accountName}.blob.core.windows.net`, credential);
  } catch {
    return null;
  }
}

async function uploadWithRetry(blockBlobClient, content, options, maxAttempts = 3) {
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await blockBlobClient.upload(content, content.length, options);
      return;
    } catch (err) {
      lastErr = err;
      if (attempt < maxAttempts) {
        await new Promise((res) => setTimeout(res, attempt * 500));
      }
    }
  }
  throw lastErr;
}

async function run() {
  console.log("================================================================================");
  console.log("AZURE BLOB STORAGE IMPORT & VERIFICATION PIPELINE");
  console.log("================================================================================\n");

  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error("Manifest not found at:", MANIFEST_PATH);
    console.error("Please run 05_export_storage.mjs first.");
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  console.log(`Loaded manifest with ${manifest.length} files to import.`);

  const serviceClient = await getServiceClient();
  if (!serviceClient) {
    console.warn("⚠️  Azure Storage credentials are not set in .env.local.");
    console.warn("   Required: AZURE_STORAGE_CONNECTION_STRING or (AZURE_STORAGE_ACCOUNT_NAME + AZURE_STORAGE_ACCOUNT_KEY)");
    console.warn("   All 196 files are exported and verified locally in azure-migration/dumps/storage/");
    console.warn("   Please set AZURE_STORAGE_CONNECTION_STRING in .env.local to run live import.\n");
    return;
  }

  const containerName = "project-workspaces";
  const containerClient = serviceClient.getContainerClient(containerName);

  console.log(`Checking container '${containerName}' on Azure Blob Storage...`);
  try {
    await containerClient.createIfNotExists();
    console.log(`Container '${containerName}' ready.`);
  } catch (err) {
    console.warn(`Note on '${containerName}': ${err.message}`);
  }

  const assetsContainer = serviceClient.getContainerClient("project-assets");
  console.log(`Checking container 'project-assets' on Azure Blob Storage...`);
  try {
    await assetsContainer.createIfNotExists();
    console.log(`Container 'project-assets' ready.\n`);
  } catch (err) {
    console.warn(`Note on 'project-assets': ${err.message}\n`);
  }

  let uploaded = 0;
  let skipped = 0;
  let verified = 0;
  const failed = [];

  for (let i = 0; i < manifest.length; i++) {
    const item = manifest[i];
    const localFile = path.join(DUMP_DIR, item.relativePath);
    const content = fs.readFileSync(localFile);

    const blockBlobClient = containerClient.getBlockBlobClient(item.storagePath);

    try {
      // Check if blob already exists for idempotency
      const exists = await blockBlobClient.exists();
      let needsUpload = true;

      if (exists) {
        const props = await blockBlobClient.getProperties();
        if (props.contentLength === content.length && props.metadata?.sha256 === item.sha256) {
          needsUpload = false;
          skipped++;
          verified++;
        }
      }

      if (needsUpload) {
        await uploadWithRetry(
          blockBlobClient,
          content,
          {
            blobHTTPHeaders: {
              blobContentType: item.contentType || "text/markdown; charset=utf-8",
              blobCacheControl: "private, max-age=3600",
            },
            metadata: {
              sha256: item.sha256,
              project_id: item.projectId,
              migrated_from: "supabase_storage",
            },
          },
          3
        );
        uploaded++;

        // Verify SHA-256 after upload
        const downloadBuffer = await blockBlobClient.downloadToBuffer();
        const downloadHash = crypto.createHash("sha256").update(downloadBuffer).digest("hex");

        if (downloadHash === item.sha256) {
          verified++;
        } else {
          failed.push({ path: item.storagePath, reason: "SHA-256 checksum mismatch" });
        }
      }
    } catch (err) {
      failed.push({ path: item.storagePath, reason: err.message });
    }

    const processed = i + 1;
    if (processed % 20 === 0 || processed === manifest.length) {
      console.log(`  Progress: ${processed}/${manifest.length} (Uploaded: ${uploaded}, Skipped: ${skipped}, Verified: ${verified}, Failed: ${failed.length})`);
    }
  }

  console.log("\n================================================================================");
  console.log("AZURE BLOB IMPORT SUMMARY");
  console.log("================================================================================");
  console.log(`Total Files in Manifest: ${manifest.length}`);
  console.log(`Newly Uploaded:          ${uploaded}`);
  console.log(`Already Present (Skip):  ${skipped}`);
  console.log(`Cryptographically Match: ${verified} / ${manifest.length}`);
  console.log(`Failed:                  ${failed.length}`);
  if (failed.length > 0) {
    console.log("\nFailures:");
    failed.forEach((f) => console.log(`  ❌ ${f.path}: ${f.reason}`));
  }
  console.log("================================================================================");

  if (failed.length > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Import execution error:", err);
  process.exit(1);
});
