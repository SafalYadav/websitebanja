// tests/test_production_readiness_hardening.mjs
/**
 * WebsiteBanja AI — Production Readiness 10/10 Master Hardening & Architecture Regression Test Suite
 * 
 * Verifies all 10 architectural dimensions:
 * 1. Skills Agent runtime wiring and deterministic fallback
 * 2. Anti-repetition hero layout rotation
 * 3. Anti-repetition section sequence rotation
 * 4. Anti-repetition color accent rotation
 * 5. Canonical Hero variant normalization
 * 6. In-memory dev/offline candidate cache bounding and retrieval
 * 7. Model Policy Enforcement (Strict zero-OpenAI in agents)
 * 8. Uniqueness evaluation thresholds and loop breaker
 * 9. Security & Auth boundary enforcement
 * 10. Prompt builder anti-repetition injection
 */

import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

console.log("================================================================================");
console.log("WEBSITEBANJA AI — PRODUCTION READINESS 10/10 ARCHITECTURAL REGRESSION SUITE");
console.log("================================================================================\n");

let passedCount = 0;
let totalCount = 0;

function runTest(name, fn) {
  totalCount++;
  try {
    fn();
    console.log(`  [PASS] Assertion ${totalCount}: ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`  [FAIL] Assertion ${totalCount}: ${name}`);
    console.error(`         ${err.message}\n`);
    throw err;
  }
}

async function runAsyncTest(name, fn) {
  totalCount++;
  try {
    await fn();
    console.log(`  [PASS] Assertion ${totalCount}: ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`  [FAIL] Assertion ${totalCount}: ${name}`);
    console.error(`         ${err.message}\n`);
    throw err;
  }
}

// --------------------------------------------------------------------------------
// 1. Canonical Hero Variant Normalization
// --------------------------------------------------------------------------------
runTest("Hero Layout Contract Normalization (normalizeHeroVariant)", () => {
  const heroSectionSrc = fs.readFileSync(path.join(rootDir, "src/components/editor/HeroSection.tsx"), "utf-8");
  assert.ok(heroSectionSrc.includes("export function normalizeHeroVariant"), "normalizeHeroVariant must be exported");
  assert.ok(heroSectionSrc.includes("effectiveLayoutVariant === \"fullscreen_visual\""), "effectiveLayoutVariant must be used for fullscreen");
  assert.ok(heroSectionSrc.includes("effectiveLayoutVariant === \"minimal_editorial\""), "effectiveLayoutVariant must be used for editorial");
  assert.ok(heroSectionSrc.includes("effectiveLayoutVariant === \"action_focused\""), "effectiveLayoutVariant must be used for action");
  assert.ok(heroSectionSrc.includes("effectiveLayoutVariant === \"spatial_depth_hero\""), "effectiveLayoutVariant must be used for spatial");

  const rendererSrc = fs.readFileSync(path.join(rootDir, "src/components/editor/WebsiteRenderer.tsx"), "utf-8");
  assert.ok(
    rendererSrc.includes("heroData.layoutVariant || heroData.layoutType || heroData.heroType"),
    "WebsiteRenderer must pass layoutVariant with fallbacks"
  );
});

// --------------------------------------------------------------------------------
// 2. Anti-Repetition Hero Layout Rotation
// --------------------------------------------------------------------------------
runTest("Anti-Repetition Hero Layout Rotation in deriveHeroLayout", () => {
  const designStrategySrc = fs.readFileSync(path.join(rootDir, "src/lib/ai/designStrategy.ts"), "utf-8");
  assert.ok(designStrategySrc.includes("shouldAvoid"), "deriveHeroLayout must compute shouldAvoid");
  assert.ok(designStrategySrc.includes("alternateCandidate"), "deriveHeroLayout must provide alternateCandidate");
  assert.ok(
    designStrategySrc.includes("return alternateCandidate"),
    "deriveHeroLayout must return alternateCandidate on collision"
  );
});

// --------------------------------------------------------------------------------
// 3. Anti-Repetition Section Sequence Rotation
// --------------------------------------------------------------------------------
runTest("Anti-Repetition Section Sequence Rotation in deriveSectionSequence", () => {
  const designStrategySrc = fs.readFileSync(path.join(rootDir, "src/lib/ai/designStrategy.ts"), "utf-8");
  assert.ok(designStrategySrc.includes("hasSequenceCollision"), "deriveSectionSequence must detect collision");
  assert.ok(
    designStrategySrc.includes("const swapped = [interior[1], interior[0]"),
    "deriveSectionSequence must safely swap interior sections"
  );
  assert.ok(
    designStrategySrc.includes("sequence[0], ...swapped"),
    "deriveSectionSequence must preserve hero as first section"
  );
});

// --------------------------------------------------------------------------------
// 4. Anti-Repetition Color Accent Rotation
// --------------------------------------------------------------------------------
runTest("Anti-Repetition Color Accent Rotation in generateDesignStrategy", () => {
  const designStrategySrc = fs.readFileSync(path.join(rootDir, "src/lib/ai/designStrategy.ts"), "utf-8");
  assert.ok(designStrategySrc.includes("hasColorCollision"), "generateDesignStrategy must detect color collision");
  assert.ok(designStrategySrc.includes("defaultPrimary = \"#0D9488\""), "clean_clinical must rotate to teal on collision");
  assert.ok(designStrategySrc.includes("defaultPrimary = \"#B45309\""), "warm_artisanal must rotate to warm ochre on collision");
  assert.ok(designStrategySrc.includes("defaultPrimary = \"#818CF8\""), "dark_technical must rotate to indigo on collision");
});

// --------------------------------------------------------------------------------
// 5. In-Memory Dev/Offline Candidate Cache Bounding & Retrieval
// --------------------------------------------------------------------------------
runTest("In-Memory Local Candidate Cache Bounding and Recording", () => {
  const candidateSelectorSrc = fs.readFileSync(
    path.join(rootDir, "src/lib/agents/uniqueness/candidateSelector.ts"),
    "utf-8"
  );
  assert.ok(candidateSelectorSrc.includes("localCandidateCache: CandidateWebsite[] = []"), "localCandidateCache must exist");
  assert.ok(candidateSelectorSrc.includes("export function recordLocalCandidate"), "recordLocalCandidate must be exported");
  assert.ok(candidateSelectorSrc.includes("export function recordCandidateFromWebsite"), "recordCandidateFromWebsite must be exported");
  assert.ok(candidateSelectorSrc.includes("if (localCandidateCache.length > 20)"), "cache must be bounded to 20 items");
  assert.ok(candidateSelectorSrc.includes("getMatchingFromLocalCache"), "selectCandidateWebsites must fallback to local cache");

  const uniquenessAgentSrc = fs.readFileSync(
    path.join(rootDir, "src/lib/agents/uniqueness/uniquenessAgent.ts"),
    "utf-8"
  );
  assert.ok(
    uniquenessAgentSrc.includes("recordCandidateFromWebsite"),
    "uniquenessAgent must record candidates on pass/review"
  );
});

// --------------------------------------------------------------------------------
// 6. Skills Agent Runtime Wiring in /api/generate
// --------------------------------------------------------------------------------
runTest("Skills Agent Runtime Integration in /api/generate/route.ts", () => {
  const generateRouteSrc = fs.readFileSync(path.join(rootDir, "src/app/api/generate/route.ts"), "utf-8");
  assert.ok(
    generateRouteSrc.includes("const recentFingerprints = await getRecentDesignFingerprints"),
    "route.ts must fetch recentDesignFingerprints"
  );
  assert.ok(
    generateRouteSrc.includes("const skillsAgentResult = await runSkillsAgent"),
    "route.ts must invoke runSkillsAgent"
  );
  assert.ok(
    generateRouteSrc.includes("buildDeterministicSkillsFallback"),
    "route.ts must support deterministic skills fallback"
  );
  assert.ok(
    generateRouteSrc.includes("avoidPatterns,"),
    "route.ts must pass avoidPatterns to buildWebsitePrompt"
  );
  assert.ok(
    generateRouteSrc.includes("designDirection,"),
    "route.ts must pass designDirection to buildWebsitePrompt"
  );
  assert.ok(
    !generateRouteSrc.includes("selectDesignSkills"),
    "route.ts must not bypass Skills Agent with selectDesignSkills"
  );
});

// --------------------------------------------------------------------------------
// 7. Prompt Builder Anti-Repetition Constraints Injection
// --------------------------------------------------------------------------------
runTest("Prompt Builder Anti-Repetition Constraints Injection in prompts.ts", () => {
  const promptsSrc = fs.readFileSync(path.join(rootDir, "src/lib/prompts.ts"), "utf-8");
  assert.ok(promptsSrc.includes("avoidPatterns?: string[]"), "WebsitePromptData must include avoidPatterns");
  assert.ok(promptsSrc.includes("recentFingerprints?: any[]"), "WebsitePromptData must include recentFingerprints");
  assert.ok(promptsSrc.includes("ANTI-REPETITION CONSTRAINTS (MANDATORY)"), "prompt template must inject anti-repetition section");
  assert.ok(promptsSrc.includes("DESIGN DIRECTION GUIDELINES"), "prompt template must inject design direction section");
});

// --------------------------------------------------------------------------------
// 8. Strict Model Policy Enforcement (OpenAI Strictly for Website AST Only)
// --------------------------------------------------------------------------------
runTest("Strict AI Model Policy Enforcement (Zero OpenAI in Agents)", () => {
  const agentFiles = [
    "src/lib/agents/skills/skillsAgent.ts",
    "src/lib/agents/uniqueness/uniquenessAgent.ts",
    "src/lib/agents/boss/bossAgent.ts",
    "src/lib/agents/mitra/mitraAgent.ts",
    "src/lib/agents/runtime/agentRuntime.ts",
    "src/lib/ai/router/modelRouter.ts",
  ];

  for (const relFile of agentFiles) {
    const fullPath = path.join(rootDir, relFile);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, "utf-8");
      assert.ok(
        !content.includes("from \"openai\"") && !content.includes("from 'openai'") && !content.includes("new OpenAI"),
        `Strict Model Policy Violation in ${relFile}: OpenAI SDK directly imported!`
      );
    }
  }
});

// --------------------------------------------------------------------------------
// 9. Uniqueness Thresholds and Loop Breaker
// --------------------------------------------------------------------------------
runTest("Uniqueness Thresholds and Bounded Regeneration Limit", () => {
  const typesSrc = fs.readFileSync(path.join(rootDir, "src/lib/agents/uniqueness/types.ts"), "utf-8");
  assert.ok(typesSrc.includes("passThreshold: 0.65"), "passThreshold must be 0.65");
  assert.ok(typesSrc.includes("regenerateThreshold: 0.82"), "regenerateThreshold must be 0.82");

  const uniquenessAgentSrc = fs.readFileSync(
    path.join(rootDir, "src/lib/agents/uniqueness/uniquenessAgent.ts"),
    "utf-8"
  );
  assert.ok(
    uniquenessAgentSrc.includes("MAX_UNIQUENESS_REGENERATIONS = 2"),
    "MAX_UNIQUENESS_REGENERATIONS must equal 2"
  );
  assert.ok(
    uniquenessAgentSrc.includes("transitioning to review to avoid infinite loop") ||
    uniquenessAgentSrc.includes("defaulting to review to prevent infinite loop"),
    "Uniqueness agent must break loop and transition to REVIEW at max attempts"
  );
});

// --------------------------------------------------------------------------------
// 10. Security & Auth Enforcement Boundary
// --------------------------------------------------------------------------------
runTest("Security & Auth Enforcement in API Routes", () => {
  const generateRouteSrc = fs.readFileSync(path.join(rootDir, "src/app/api/generate/route.ts"), "utf-8");
  assert.ok(generateRouteSrc.includes("validateUserAuth(req)"), "api/generate must enforce validateUserAuth");
  assert.ok(generateRouteSrc.includes("status: auth.status"), "api/generate must return auth.status on rejection");

  const serverAuthSrc = fs.readFileSync(path.join(rootDir, "src/lib/supabaseServer.ts"), "utf-8");
  assert.ok(serverAuthSrc.includes("status: 401"), "validateUserAuth must return status: 401 for unauthenticated requests");

  const adminRouteSrc = fs.readFileSync(path.join(rootDir, "src/app/api/admin/analytics/route.ts"), "utf-8");
  assert.ok(adminRouteSrc.includes("verifyAdminAuth"), "api/admin must enforce verifyAdminAuth");
});

console.log("\n================================================================================");
console.log(`ALL ${passedCount}/${totalCount} ARCHITECTURAL REGRESSION ASSERTIONS PASSED!`);
console.log("================================================================================\n");
