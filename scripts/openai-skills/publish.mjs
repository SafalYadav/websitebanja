import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { packageAllSkills } from "./package.mjs";

const ROOT_DIR = process.cwd();
const MANIFEST_FILE = path.resolve(ROOT_DIR, "skills", "openai-manifest.json");

// Helper to load .env.local if not already in process.env
function loadEnv() {
  if (process.env.OPENAI_API_KEY) return;
  const envLocal = path.resolve(ROOT_DIR, ".env.local");
  if (fs.existsSync(envLocal)) {
    const lines = fs.readFileSync(envLocal, "utf-8").split("\n");
    for (const line of lines) {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        process.env[match[1].trim()] = match[2].trim();
      }
    }
  }
}

export async function publishSkills(options = {}) {
  loadEnv();

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === "missing-openai-key") {
    throw new Error(
      "OPENAI_API_KEY is not configured in environment or .env.local. Skill publishing requires a valid API key."
    );
  }

  // Ensure packages are up to date
  const manifest = packageAllSkills();
  const client = new OpenAI({ apiKey });

  console.log("\n================================================================================");
  console.log("SYNCHRONIZING WEBSITEBANJA SKILLS WITH OPENAI HOSTED SKILLS API");
  console.log("================================================================================\n");

  // Fetch all existing skills on OpenAI account
  console.log("Fetching existing hosted skills from OpenAI...");
  const existingRemoteSkills = new Map();
  try {
    let hasMore = true;
    let after = undefined;
    while (hasMore) {
      const page = await client.skills.list({ limit: 100, ...(after ? { after } : {}) });
      if (page.data) {
        for (const skill of page.data) {
          existingRemoteSkills.set(skill.name, skill);
        }
      }
      hasMore = page.has_more;
      if (hasMore && page.data && page.data.length > 0) {
        after = page.data[page.data.length - 1].id;
      } else {
        hasMore = false;
      }
    }
    console.log(`Found ${existingRemoteSkills.size} existing skill(s) on OpenAI organization.\n`);
  } catch (err) {
    console.error("Failed to list existing skills from OpenAI:", err.message);
    throw err;
  }

  const results = [];

  for (const [key, item] of Object.entries(manifest.skills)) {
    const zipFullPath = path.resolve(ROOT_DIR, item.zipPath);
    if (!fs.existsSync(zipFullPath)) {
      throw new Error(`Zip package missing for ${key}: ${zipFullPath}`);
    }

    const existingRemote = existingRemoteSkills.get(item.openaiName);

    if (existingRemote) {
      item.hostedSkillId = existingRemote.id;

      // Check if hash matches previous sync and not forced
      if (item.status === "synced" && item.hostedVersion && !options.force) {
        console.log(`  ⚡ [IDEMPOTENT] ${item.openaiName} is unchanged (${existingRemote.id}, v${existingRemote.default_version})`);
        item.hostedVersion = existingRemote.default_version;
        results.push({
          key,
          name: item.openaiName,
          id: existingRemote.id,
          version: existingRemote.default_version,
          action: "idempotent_skip",
        });
        continue;
      }

      // Hash has changed or forced -> Create new version on existing skill
      console.log(`  ↻ [UPDATE VERSION] Uploading new version for ${item.openaiName} (${existingRemote.id})...`);
      const fileStream = fs.createReadStream(zipFullPath);
      const newVersion = await client.skills.versions.create(existingRemote.id, {
        files: fileStream,
        default: true,
      });

      item.hostedVersion = newVersion.version;
      item.status = "synced";
      item.lastSyncedAt = new Date().toISOString();

      console.log(`    ✔ Version v${newVersion.version} created and set as default.`);
      results.push({
        key,
        name: item.openaiName,
        id: existingRemote.id,
        version: newVersion.version,
        action: "version_incremented",
      });
    } else {
      // New Skill -> Create on OpenAI
      console.log(`  ✦ [NEW SKILL] Publishing ${item.openaiName} to OpenAI...`);
      const fileStream = fs.createReadStream(zipFullPath);
      const newSkill = await client.skills.create({
        files: fileStream,
      });

      item.hostedSkillId = newSkill.id;
      item.hostedVersion = newSkill.default_version || "1";
      item.status = "synced";
      item.lastSyncedAt = new Date().toISOString();

      console.log(`    ✔ Skill created: ID ${newSkill.id} (default v${item.hostedVersion})`);
      results.push({
        key,
        name: item.openaiName,
        id: newSkill.id,
        version: item.hostedVersion,
        action: "created",
      });
    }
  }

  manifest.updatedAt = new Date().toISOString();
  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2), "utf-8");

  console.log("\n================================================================================");
  console.log("SYNCHRONIZATION COMPLETE — OPENAI HOSTED DESIGN INTELLIGENCE REGISTRY");
  console.log("================================================================================\n");

  console.table(
    results.map((r) => ({
      Skill: r.name,
      "Hosted ID": r.id,
      Version: `v${r.version}`,
      Action: r.action,
    }))
  );

  return { manifest, results };
}

// Run when invoked from CLI directly
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  publishSkills()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("\nFatal error during skill publishing:", err);
      process.exit(1);
    });
}
