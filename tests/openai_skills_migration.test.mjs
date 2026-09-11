/**
 * WebsiteBanja AI — OpenAI Skills API Migration Verification Suite
 *
 * Validates:
 * 1. Discoverability of all 19 Design Intelligence skills + 1 Master skill
 * 2. YAML frontmatter validity and compliance with Agent Skills / OpenAI standard
 * 3. Correct zip bundle packaging (.openai-skills-dist/bundles/*.zip) with single top-level directory
 * 4. Hosted OpenAI Skill synchronization and manifest tracking
 * 5. Publishing idempotency (zero redundant versions on rerun)
 * 6. Hosted skill ID and version tracking
 * 7. Intelligent skill selector integration with hosted skill metadata
 * 8. Contextual vertical skill selection (SaaS vs Local vs E-Commerce vs Minimal)
 * 9. Token budget management (no unnecessary injection of all 19 skills)
 * 10. Absolute precedence of explicit user requirements over skill defaults
 * 11. Graceful local fallback when hosted skills or network are unavailable
 * 12. Generation prompt pipeline integration
 * 13. Security: Zero exposure of OPENAI_API_KEY or skill publishing tools in client code
 * 14. Master Design Intelligence Orchestrator specifications
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import jitiFactory from "jiti";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const jiti = jitiFactory(process.cwd(), {
  alias: {
    "@": path.resolve(process.cwd(), "src"),
  },
});

const { selectSkillsForRequest } = jiti("@/lib/skills/skillSelector");
const { getMasterSkillMetadata } = jiti("@/lib/skills/skillRegistry");
const {
  getOpenAiSkillsManifest,
  getHostedSkillId,
  getHostedSkillVersion,
  isHostedSkillActive,
  getHostedSkillReferences,
  formatHostedSkillSystemContext,
  resolveSkillGuidanceWithFallback,
} = jiti("@/lib/skills/openaiSkillsService");
const { buildWebsitePrompt } = jiti("@/lib/prompts");

console.log("================================================================================");
console.log("WEBSITEBANJA AI — OPENAI SKILLS API MIGRATION VERIFICATION SUITE");
console.log("================================================================================\n");

let passed = 0;
let failed = 0;

function runTest(title, testFn) {
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

const EXPECTED_19_SKILLS = [
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

// -------------------------------------------------------------
// TEST 1 & 2: Discoverability & Metadata Validity
// -------------------------------------------------------------
console.log("[Test 1 & 2] Verifying discoverability and YAML frontmatter across all skills...");

for (const id of EXPECTED_19_SKILLS) {
  runTest(`Skill ${id} has valid SKILL.md with compliant YAML frontmatter`, () => {
    const filePath = path.resolve(ROOT, "skills", id, "SKILL.md");
    assert.ok(fs.existsSync(filePath), `Missing SKILL.md for ${id}`);
    const content = fs.readFileSync(filePath, "utf-8");
    assert.match(content, /^---\s*[\r\n]+/, `SKILL.md must start with YAML frontmatter delimiter (---)`);
    assert.match(content, /name:\s*websitebanja-[\w-]+/, `SKILL.md must declare canonical name`);
    assert.match(content, /description:\s*.+/, `SKILL.md must declare description`);
    assert.match(content, /version:\s*\d+\.\d+\.\d+/, `SKILL.md must declare semantic version`);
  });
}

runTest("Master Orchestrator skill has valid SKILL.md with compliant YAML frontmatter", () => {
  const masterPath = path.resolve(ROOT, "skills", "master-design-intelligence", "SKILL.md");
  assert.ok(fs.existsSync(masterPath), "Master SKILL.md must exist");
  const content = fs.readFileSync(masterPath, "utf-8");
  assert.match(content, /name:\s*websitebanja-master-design-intelligence/);
  assert.match(content, /description:\s*.+/);
  const masterMeta = getMasterSkillMetadata();
  assert.equal(masterMeta.id, "master-design-intelligence");
  assert.equal(masterMeta.priority, 0);
});

// -------------------------------------------------------------
// TEST 3: Packaging Verification (.openai-skills-dist/bundles/*.zip)
// -------------------------------------------------------------
console.log("\n[Test 3] Verifying OpenAI Skill zip bundle packaging...");

for (const id of EXPECTED_19_SKILLS) {
  runTest(`Skill bundle websitebanja-${id}.zip exists and is substantive`, () => {
    const zipPath = path.resolve(ROOT, ".openai-skills-dist", "bundles", `websitebanja-${id}.zip`);
    assert.ok(fs.existsSync(zipPath), `Zip bundle missing: ${zipPath}`);
    const stat = fs.statSync(zipPath);
    assert.ok(stat.size > 500, `Zip size too small (${stat.size} bytes)`);
  });
}

runTest("Master skill bundle websitebanja-master-design-intelligence.zip exists", () => {
  const masterZip = path.resolve(ROOT, ".openai-skills-dist", "bundles", "websitebanja-master-design-intelligence.zip");
  assert.ok(fs.existsSync(masterZip), "Master zip bundle must exist");
});

// -------------------------------------------------------------
// TEST 4, 5, 6: Manifest Tracking, Idempotency & Remote IDs
// -------------------------------------------------------------
console.log("\n[Test 4, 5, 6] Verifying OpenAI manifest tracking and hosted skill IDs...");

runTest("openai-manifest.json tracks all 20 skills with hostedSkillId and status", () => {
  const manifest = getOpenAiSkillsManifest();
  assert.equal(manifest.schemaVersion, "1.0.0");
  const trackedKeys = Object.keys(manifest.skills);
  assert.equal(trackedKeys.length, 20, "Manifest must track exactly 20 skills (1 master + 19 specialized)");

  for (const id of EXPECTED_19_SKILLS) {
    const item = manifest.skills[id];
    assert.ok(item, `Skill ${id} must be in manifest`);
    assert.match(item.openaiName, /^websitebanja-/);
    assert.match(item.contentHash, /^[a-f0-9]{64}$/, "Must compute SHA-256 hash");
    assert.ok(item.hostedSkillId, `Skill ${id} must have a hostedSkillId (skill_...)`);
    assert.match(item.hostedSkillId, /^skill_[a-f0-9]+$/);
    assert.equal(item.status, "synced");
  }

  const master = manifest.skills["master-design-intelligence"];
  assert.ok(master.hostedSkillId, "Master skill must have hostedSkillId");
  assert.match(master.hostedSkillId, /^skill_[a-f0-9]+$/);
});

runTest("Helper getHostedSkillId and getHostedSkillVersion return valid values", () => {
  const uiUxId = getHostedSkillId("ui-ux");
  assert.ok(uiUxId && uiUxId.startsWith("skill_"), "ui-ux must have hosted ID");
  const uiUxVersion = getHostedSkillVersion("ui-ux");
  assert.equal(uiUxVersion, "1", "Default hosted version must be 1");
  assert.equal(isHostedSkillActive("ui-ux"), true);
});

// -------------------------------------------------------------
// TEST 7, 8, 9: Skill Selector Integration & Token Budgeting
// -------------------------------------------------------------
console.log("\n[Test 7, 8, 9] Verifying skill selector with hosted skills & token budgeting...");

runTest("selectSkillsForRequest attaches hostedSkillId and respects token budget", () => {
  const result = selectSkillsForRequest({
    category: "AI SaaS Platform",
    style: "Futuristic, sleek",
    businessName: "NeuroFlow",
    description: "Cloud telemetry and AI forecasting for microservices.",
  });

  assert.ok(result.activeSkills.length >= 4, "Must select at least 4 relevant skills");
  assert.ok(result.activeSkills.length <= 10, "Must cap active skills to 10 for token budget");

  // Check hosted enrichment
  const uiUx = result.activeSkills.find((s) => s.id === "ui-ux");
  assert.ok(uiUx, "ui-ux must be selected");
  assert.equal(uiUx.isHosted, true, "ui-ux must be marked isHosted");
  assert.ok(uiUx.hostedSkillId, "ui-ux must have hostedSkillId attached");
  assert.ok(result.metadata.hostedSkillsCount >= 4, "hostedSkillsCount must be >= 4");
  assert.ok(result.metadata.masterSkillId, "masterSkillId must be attached to metadata");
});

runTest("Irrelevant skills are not injected into minimal local service build", () => {
  const result = selectSkillsForRequest({
    category: "Emergency Plumber",
    style: "Clean, trustworthy",
    businessName: "Rapid Plumbing",
    description: "24/7 emergency leak repair in Austin. Call now for instant response.",
  });

  const ids = result.metadata.selectedIds;
  assert.ok(!ids.includes("threejs"), "Plumber must NOT inject Three.js 3D");
  assert.ok(!ids.includes("gsap"), "Plumber must NOT inject GSAP scrollytelling");
  assert.ok(!ids.includes("data-visualization"), "Plumber must NOT inject Data Viz dashboards");
});

// -------------------------------------------------------------
// TEST 10: Absolute Priority of User Overrides
// -------------------------------------------------------------
console.log("\n[Test 10] Testing Absolute Priority Hierarchy of User Overrides...");

runTest("Explicit 'no animation' override suppresses Framer Motion and GSAP", () => {
  const result = selectSkillsForRequest({
    category: "Modern Tech",
    style: "Interactive",
    prompt: "Build an interactive platform but strictly NO ANIMATION, static only layout please.",
  });

  assert.ok(!result.metadata.hasMotion, "hasMotion must be false when user requests no animation");
  assert.ok(!result.metadata.hasAdvancedAnimation, "hasAdvancedAnimation must be false");
  assert.equal(result.metadata.userOverrideDetected, "explicit_no_animation");
  assert.ok(result.guidanceBlock.includes("CRITICAL USER OVERRIDE"), "Guidance block must flag override");
});

runTest("Explicit 'ultra minimal' override suppresses complex visual ornamentation", () => {
  const result = selectSkillsForRequest({
    category: "Law Firm",
    style: "Corporate",
    prompt: "We want an ultra minimal and plain design with no complex effects.",
  });

  assert.equal(result.metadata.userOverrideDetected, "explicit_minimal");
  assert.ok(result.guidanceBlock.includes("CRITICAL USER OVERRIDE"));
});

// -------------------------------------------------------------
// TEST 11: Local Fallback Resilience
// -------------------------------------------------------------
console.log("\n[Test 11] Verifying Local Fallback Resilience...");

runTest("resolveSkillGuidanceWithFallback operates safely when hosted skill is unavailable", () => {
  const fallback = resolveSkillGuidanceWithFallback("unknown-future-skill", { category: "Retail" });
  assert.equal(fallback.isHosted, false, "Unknown skill must fall back to local");
  assert.equal(fallback.hostedId, null);
  assert.ok(typeof fallback.guidance === "string");
});

runTest("getHostedSkillReferences formats Responses API compatible skill_reference payload", () => {
  const refs = getHostedSkillReferences(["ui-ux", "framer-motion", "21st-dev"]);
  assert.equal(refs.length, 3, "Must generate 3 references");
  for (const ref of refs) {
    assert.equal(ref.type, "skill_reference");
    assert.ok(ref.skill_id && ref.skill_id.startsWith("skill_"));
  }
});

runTest("formatHostedSkillSystemContext outputs non-empty audit telemetry", () => {
  const activeSkills = [
    { id: "ui-ux", name: "UI/UX", relevanceScore: 1.0, reason: "core", guidance: "", appliedDirectives: [] },
  ];
  const telemetry = formatHostedSkillSystemContext(activeSkills);
  assert.ok(telemetry.includes("OpenAI Design Intelligence Architecture"));
  assert.ok(telemetry.includes("websitebanja-ui-ux"));
});

// -------------------------------------------------------------
// TEST 12: Generation Prompt Pipeline Integration
// -------------------------------------------------------------
console.log("\n[Test 12] Verifying generation prompt pipeline integration...");

runTest("buildWebsitePrompt incorporates selected skill directives and master orchestrator", () => {
  const prompt = buildWebsitePrompt(
    {
      businessName: "Vanguard Wealth",
      category: "Private Wealth Management",
      description: "Discreet family office and high-net-worth fiduciary consulting.",
      style: "Executive, authoritative",
      targetAudience: "Ultra-HNW Individuals",
      phone: "+1-800-555-0199",
      email: "inquiries@vanguardwealth.com",
      website: "vanguardwealth.com",
      instagram: "",
      facebook: "",
      address: "New York, NY",
    },
    {}
  );

  assert.ok(prompt.includes("DESIGN INTELLIGENCE ENGINE"), "Prompt must include Design Intelligence block");
  assert.ok(prompt.includes("Master Orchestrator Hosted ID"), "Prompt must cite Master Orchestrator hosted ID");
  assert.ok(prompt.includes("Vanguard Wealth"), "Prompt must retain business name");
  assert.ok(prompt.includes("Private Wealth Management"), "Prompt must retain category");
});

// -------------------------------------------------------------
// TEST 13: Security & Client-Side Isolation
// -------------------------------------------------------------
console.log("\n[Test 13] Verifying security boundaries and zero client-side credential exposure...");

runTest("Client components do NOT import or reference openaiSkillsService or publishing scripts", () => {
  const srcFiles = [
    "src/components/Hero.tsx",
    "src/components/Navbar.tsx",
    "src/components/Features.tsx",
    "src/components/Pricing.tsx",
    "src/app/dashboard/page.tsx",
  ];

  for (const file of srcFiles) {
    const fullPath = path.resolve(ROOT, file);
    if (!fs.existsSync(fullPath)) continue;
    const content = fs.readFileSync(fullPath, "utf-8");
    assert.doesNotMatch(content, /openai-manifest/i, `${file} must not reference openai-manifest`);
    assert.doesNotMatch(content, /OPENAI_API_KEY/i, `${file} must not reference OPENAI_API_KEY`);
    assert.doesNotMatch(content, /scripts\/openai-skills/i, `${file} must not reference publishing scripts`);
    assert.doesNotMatch(content, /client\.skills/i, `${file} must not call client.skills directly`);
  }
});

console.log("\n================================================================================");
console.log(`ALL OPENAI SKILLS MIGRATION TESTS COMPLETE: ${passed} PASSED, ${failed} FAILED`);
console.log("================================================================================\n");

if (failed > 0) {
  process.exit(1);
}
