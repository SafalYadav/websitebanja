/**
 * WebsiteBanja AI — Supabase Storage Export Utility
 * Exports all active workspace files from bucket 'project-workspaces' to local disk
 * and generates a cryptographic SHA-256 manifest.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

const BUCKET = "project-workspaces";
const DUMP_DIR = path.resolve(process.cwd(), "azure-migration/dumps/storage");

const AI_WORKSPACE_FILES = [
  "planning/prd.md",
  "planning/trd.md",
  "planning/app-flow.md",
  "planning/implementation-plan.md",
  "planning/ui-ux.md",
  "planning/backend-schema.md",
  "tasks/active.md",
  "tasks/completed.md",
  "tasks/bugs.md",
  "ai/memory.md",
  "ai/context.md",
  "ai/roadmap.md",
  "ai/decisions.md",
  "ai/changelog.md",
  "ai/prompts.md",
];

async function run() {
  console.log("================================================================================");
  console.log("SUPABASE STORAGE EXPORT PIPELINE: BUCKET 'project-workspaces'");
  console.log("================================================================================\n");

  fs.mkdirSync(DUMP_DIR, { recursive: true });

  // 1. List top-level folders (project IDs)
  const { data: topEntries, error: listError } = await supabase.storage
    .from(BUCKET)
    .list("", { limit: 100 });

  if (listError) {
    console.error("Failed to list bucket:", listError);
    process.exit(1);
  }

  const projectFolders = (topEntries || [])
    .filter((e) => e.name && e.name.length === 36) // UUID length
    .map((e) => e.name);

  console.log(`Found ${projectFolders.length} project folders in bucket '${BUCKET}'.\n`);

  const manifest = [];
  let totalExported = 0;
  let totalBytes = 0;

  for (const projectId of projectFolders) {
    let projectFileCount = 0;

    for (const relativeFile of AI_WORKSPACE_FILES) {
      const storagePath = `${projectId}/.websitebanja/${relativeFile}`;
      const { data, error } = await supabase.storage.from(BUCKET).download(storagePath);

      if (error || !data) {
        // Not all projects necessarily have all 15 files
        continue;
      }

      const buffer = Buffer.from(await data.arrayBuffer());
      const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");

      const localTarget = path.join(DUMP_DIR, projectId, ".websitebanja", relativeFile);
      fs.mkdirSync(path.dirname(localTarget), { recursive: true });
      fs.writeFileSync(localTarget, buffer);

      manifest.push({
        projectId,
        storagePath,
        relativePath: path.relative(DUMP_DIR, localTarget),
        sizeBytes: buffer.length,
        sha256,
        contentType: "text/markdown; charset=utf-8",
      });

      totalExported++;
      totalBytes += buffer.length;
      projectFileCount++;
    }

    console.log(`  ✔ Exported ${projectFileCount} files for project ${projectId}`);
  }

  const manifestPath = path.join(DUMP_DIR, "manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

  console.log("\n================================================================================");
  console.log(`EXPORT COMPLETE: ${totalExported} files exported (${(totalBytes / 1024).toFixed(2)} KB)`);
  console.log(`Manifest written to: ${path.relative(process.cwd(), manifestPath)}`);
  console.log("================================================================================");
}

run().catch((err) => {
  console.error("Export failed:", err);
  process.exit(1);
});
