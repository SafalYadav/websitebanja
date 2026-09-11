import fs from "fs";
import path from "path";
import crypto from "crypto";
import { execSync } from "child_process";

const ROOT_DIR = process.cwd();
const SKILLS_DIR = path.resolve(ROOT_DIR, "skills");
const DIST_DIR = path.resolve(ROOT_DIR, ".openai-skills-dist");
const STAGING_DIR = path.resolve(DIST_DIR, "staging");
const BUNDLES_DIR = path.resolve(DIST_DIR, "bundles");
const MANIFEST_FILE = path.resolve(SKILLS_DIR, "openai-manifest.json");

const ALL_SKILL_KEYS = [
  "master-design-intelligence",
  "ui-ux",
  "framer-motion",
  "21st-dev",
  "design-systems",
  "cro",
  "typography",
  "responsive-design",
  "accessibility",
  "ux-psychology",
  "interaction-design",
  "creative-art-direction",
  "seo",
  "performance",
  "industry-intelligence",
  "gsap",
  "threejs",
  "data-visualization",
  "saas-ux",
  "ecommerce-ux",
];

function parseFrontmatter(content) {
  const match = content.match(/^---\s*[\r\n]+([\s\S]*?)[\r\n]+---/);
  if (!match) return null;
  const yaml = match[1];
  const data = {};
  for (const line of yaml.split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      let val = line.slice(colonIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      data[key] = val;
    }
  }
  return data;
}

export function packageAllSkills() {
  console.log("================================================================================");
  console.log("PACKAGING WEBSITEBANJA DESIGN INTELLIGENCE SKILLS FOR OPENAI SKILLS API");
  console.log("================================================================================\n");

  fs.mkdirSync(STAGING_DIR, { recursive: true });
  fs.mkdirSync(BUNDLES_DIR, { recursive: true });

  let existingManifest = { schemaVersion: "1.0.0", updatedAt: null, skills: {} };
  if (fs.existsSync(MANIFEST_FILE)) {
    try {
      existingManifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, "utf-8"));
    } catch {
      // ignore parse failure, start clean
    }
  }

  const manifest = {
    schemaVersion: "1.0.0",
    updatedAt: new Date().toISOString(),
    skills: existingManifest.skills || {},
  };

  let totalPackaged = 0;

  for (const key of ALL_SKILL_KEYS) {
    const skillFolder = path.resolve(SKILLS_DIR, key);
    const skillFile = path.resolve(skillFolder, "SKILL.md");

    if (!fs.existsSync(skillFile)) {
      throw new Error(`Skill file missing: ${skillFile}`);
    }

    const content = fs.readFileSync(skillFile, "utf-8");
    const frontmatter = parseFrontmatter(content);
    if (!frontmatter || !frontmatter.name || !frontmatter.description) {
      throw new Error(`Invalid or missing YAML frontmatter in: ${skillFile}`);
    }

    const openaiName = frontmatter.name;
    const contentHash = crypto.createHash("sha256").update(content, "utf-8").digest("hex");

    // OpenAI requirement: single top-level directory inside the zip archive
    const singleTopDir = path.resolve(STAGING_DIR, openaiName);
    fs.rmSync(singleTopDir, { recursive: true, force: true });
    fs.mkdirSync(singleTopDir, { recursive: true });

    // Write SKILL.md into top-level dir
    fs.writeFileSync(path.resolve(singleTopDir, "SKILL.md"), content, "utf-8");

    // Copy any scripts or references if present in the skill directory
    const entries = fs.readdirSync(skillFolder, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === "SKILL.md" || entry.name === "skill.md") continue;
      const srcPath = path.resolve(skillFolder, entry.name);
      const destPath = path.resolve(singleTopDir, entry.name);
      if (entry.isDirectory()) {
        fs.cpSync(srcPath, destPath, { recursive: true });
      } else if (entry.isFile()) {
        fs.copyFileSync(srcPath, destPath);
      }
    }

    const zipPath = path.resolve(BUNDLES_DIR, `${openaiName}.zip`);
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

    // Create zip archive with top-level directory
    execSync(`cd "${STAGING_DIR}" && zip -r "${zipPath}" "${openaiName}"`, { stdio: "ignore" });

    const zipStat = fs.statSync(zipPath);

    const prevEntry = manifest.skills[key] || {};
    const hasChanged = prevEntry.contentHash !== contentHash;

    manifest.skills[key] = {
      id: key,
      openaiName,
      description: frontmatter.description,
      localVersion: frontmatter.version || "1.0.0",
      contentHash,
      zipPath: path.relative(ROOT_DIR, zipPath),
      zipSizeBytes: zipStat.size,
      hostedSkillId: prevEntry.hostedSkillId || null,
      hostedVersion: prevEntry.hostedVersion || null,
      status: prevEntry.hostedSkillId ? (hasChanged ? "needs_sync" : "synced") : "packaged",
      lastPackagedAt: new Date().toISOString(),
      lastSyncedAt: hasChanged ? null : (prevEntry.lastSyncedAt || null),
    };

    console.log(`  ✔ Packaged [${key}] -> ${openaiName}.zip (${zipStat.size} bytes, hash: ${contentHash.slice(0, 8)}...)`);
    totalPackaged++;
  }

  // Clean staging directory
  fs.rmSync(STAGING_DIR, { recursive: true, force: true });

  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2), "utf-8");
  console.log(`\nSuccessfully packaged ${totalPackaged} skills!`);
  console.log(`Manifest updated at: ${path.relative(ROOT_DIR, MANIFEST_FILE)}\n`);

  return manifest;
}

// Run when called directly from CLI
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  packageAllSkills();
}
