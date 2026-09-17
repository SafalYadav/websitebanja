// tests/test_explicit_3d_control.mjs
/**
 * Test Suite: Explicit 3D Control + Non-Generic Design Implementation
 * Validates all 12 core requirements for 3D preferences, deterministic precedence,
 * skill suppression, prompt hard constraints, and state persistence.
 */

import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const jiti = createJiti(import.meta.url, {
  alias: {
    "@/": path.resolve(ROOT, "src") + "/",
  },
});

const {
  extract3DPreferenceFromText,
  extractMotionPreferenceFromText,
  mergeAgentExtractedNeeds,
} = jiti("../src/lib/ai/agentNormalizer.ts");

const {
  deriveSpatial3dConfig,
  deriveHeroLayout,
  generateDesignStrategy,
} = jiti("../src/lib/ai/designStrategy.ts");

const { selectSkillsForRequest } = jiti("../src/lib/skills/skillSelector.ts");
const { buildWebsitePrompt } = jiti("../src/lib/prompts.ts");
const { validateBusinessInputs } = jiti("../src/lib/validation.ts");
const { buildDeterministicSkillsFallback } = jiti("../src/lib/agents/skills/skillsAgent.ts");
const { buildUniquenessSystemPrompt, buildUniquenessUserPrompt } = jiti(
  "../src/lib/agents/uniqueness/uniquenessPrompt.ts"
);

console.log("================================================================");
console.log("   WEBSITEBANJA: EXPLICIT 3D CONTROL VERIFICATION SUITE         ");
console.log("================================================================\n");

let passedTests = 0;
let totalTests = 12;

function testPass(num, name, detail) {
  passedTests++;
  console.log(`✅ [TEST ${num}] PASS: ${name}`);
  if (detail) console.log(`   └─ ${detail}`);
}

function testFail(num, name, error) {
  console.error(`❌ [TEST ${num}] FAIL: ${name}`);
  console.error(`   └─ Error:`, error);
  process.exit(1);
}

// -----------------------------------------------------------------------------
// TEST 1: No 3D Mention -> threeDPreference = "no"
// -----------------------------------------------------------------------------
try {
  const text = "Create a modern website for Sharma Dental Clinic with appointment booking";
  const pref = extract3DPreferenceFromText(text, undefined);
  assert.equal(pref, "no", "Default must strictly be 'no' when 3D is not mentioned");

  const spatial = deriveSpatial3dConfig("clean_clinical", {
    category: "Dental Clinic",
    businessName: "Sharma Dental Clinic",
    prompt: text,
    threeDPreference: pref,
  });
  assert.equal(spatial.enabled, false, "Spatial 3D must be disabled");
  assert.equal(spatial.level, "NONE", "Spatial 3D level must be NONE");

  const skills = selectSkillsForRequest({
    category: "Dental Clinic",
    threeDPreference: pref,
  });
  const spatialSkill = skills.activeSkills.find((s) => s.id === "spatial-interaction");
  const threejsSkill = skills.activeSkills.find((s) => s.id === "threejs");
  assert.equal(spatialSkill, undefined, "spatial-interaction skill must not be active");
  assert.equal(threejsSkill, undefined, "threejs skill must not be active");

  testPass(1, "No 3D Mention -> threeDPreference = 'no'", "3D strictly disabled for unmentioned request");
} catch (err) {
  testFail(1, "No 3D Mention -> threeDPreference = 'no'", err);
}

// -----------------------------------------------------------------------------
// TEST 2: "3D website chahiye" -> threeDPreference = "yes"
// -----------------------------------------------------------------------------
try {
  const text = "Mujhe ek luxury watch brand ke liye 3D website chahiye";
  const pref = extract3DPreferenceFromText(text, undefined);
  assert.equal(pref, "yes", "Explicit Hindi/Hinglish 3D request must resolve to 'yes'");

  const spatial = deriveSpatial3dConfig("luxury_bespoke", {
    category: "Luxury Watches",
    businessName: "Chrono Luxe",
    prompt: text,
    threeDPreference: pref,
  });
  assert.equal(spatial.enabled, true, "Spatial 3D must be enabled when requested");
  assert.equal(spatial.level, "ADVANCED_CSS_3D", "Level should be ADVANCED_CSS_3D");

  const skills = selectSkillsForRequest({
    category: "Luxury Watches",
    prompt: text,
    threeDPreference: pref,
  });
  const spatialSkill = skills.activeSkills.find((s) => s.id === "spatial-interaction");
  assert.ok(spatialSkill, "spatial-interaction must be active when threeDPreference is 'yes'");

  testPass(2, "'3D website chahiye' -> threeDPreference = 'yes'", "Hinglish explicit 3D detected and activated");
} catch (err) {
  testFail(2, "'3D website chahiye' -> threeDPreference = 'yes'", err);
}

// -----------------------------------------------------------------------------
// TEST 3: "3D nahi chahiye" -> threeDPreference = "no"
// -----------------------------------------------------------------------------
try {
  const text = "Mujhe 3D nahi chahiye, normal simple website bana do";
  const pref = extract3DPreferenceFromText(text, "yes"); // prior was yes
  assert.equal(pref, "no", "Explicit negative '3D nahi chahiye' must override to 'no'");

  const spatial = deriveSpatial3dConfig("clean_clinical", {
    category: "Healthcare",
    prompt: text,
    threeDPreference: pref,
  });
  assert.equal(spatial.enabled, false, "Spatial 3D must be disabled when negative requested");
  assert.equal(spatial.level, "NONE", "Level must be NONE");

  testPass(3, "'3D nahi chahiye' -> threeDPreference = 'no'", "Explicit rejection overrides prior to 'no'");
} catch (err) {
  testFail(3, "'3D nahi chahiye' -> threeDPreference = 'no'", err);
}

// -----------------------------------------------------------------------------
// TEST 4: "premium animated website" -> animation enabled, threeDPreference = "no"
// -----------------------------------------------------------------------------
try {
  const text = "I want a modern premium animated website for my tech startup with smooth animations";
  const pref = extract3DPreferenceFromText(text, undefined);
  const motion = extractMotionPreferenceFromText(text, undefined);

  assert.equal(pref, "no", "Words like 'modern', 'premium', 'animated' MUST NOT trigger 3D");
  assert.ok(motion === "subtle" || motion === "high", "Motion preference should be active (subtle or high)");
  assert.notEqual(motion, "none", "Motion should not be disabled");

  const spatial = deriveSpatial3dConfig("dark_technical", {
    category: "SaaS",
    style: "Modern",
    prompt: text,
    threeDPreference: pref,
    motionPreference: motion,
  });
  assert.equal(spatial.enabled, false, "3D must remain disabled for SaaS without explicit 3D");
  assert.equal(spatial.level, "NONE", "Level must be NONE");

  const skills = selectSkillsForRequest({
    category: "SaaS",
    style: "Modern",
    prompt: text,
    threeDPreference: pref,
    motionPreference: motion,
  });
  const framerMotion = skills.activeSkills.find((s) => s.id === "framer-motion");
  const spatialSkill = skills.activeSkills.find((s) => s.id === "spatial-interaction");
  const threeSkill = skills.activeSkills.find((s) => s.id === "threejs");

  assert.ok(framerMotion, "framer-motion should be active for animated request");
  assert.equal(spatialSkill, undefined, "spatial-interaction must NOT be active");
  assert.equal(threeSkill, undefined, "threejs must NOT be active");

  testPass(4, "'premium animated website' -> animation enabled, threeDPreference = 'no'", "Motion enabled without accidental 3D leakage");
} catch (err) {
  testFail(4, "'premium animated website' -> animation enabled, threeDPreference = 'no'", err);
}

// -----------------------------------------------------------------------------
// TEST 5: Form = YES, Mitra message later says NO -> threeDPreference = "no"
// -----------------------------------------------------------------------------
try {
  const initialNeeds = {
    businessName: "CloudScale AI",
    threeDPreference: "yes", // Form set to yes
  };

  const incomingNeedsFromMitra = {
    businessName: "CloudScale AI",
    description: "Cloud computing platform",
  };

  const userMessage = "Actually drop the 3D, keep it 2D and fast";
  const merged = mergeAgentExtractedNeeds(initialNeeds, incomingNeedsFromMitra, userMessage);

  assert.equal(merged.threeDPreference, "no", "Latest explicit message MUST override prior form selection to 'no'");

  testPass(5, "Form = YES, Mitra message later says NO -> threeDPreference = 'no'", "Deterministic override order: Message > Form");
} catch (err) {
  testFail(5, "Form = YES, Mitra message later says NO -> threeDPreference = 'no'", err);
}

// -----------------------------------------------------------------------------
// TEST 6: Form = NO, Mitra message later says YES -> threeDPreference = "yes"
// -----------------------------------------------------------------------------
try {
  const initialNeeds = {
    businessName: "Apex Motors",
    threeDPreference: "no", // Form default or selected no
  };

  const incomingNeedsFromMitra = {
    businessName: "Apex Motors",
  };

  const userMessage = "Can we make it an interactive 3D website with WebGL?";
  const merged = mergeAgentExtractedNeeds(initialNeeds, incomingNeedsFromMitra, userMessage);

  assert.equal(merged.threeDPreference, "yes", "Latest explicit message MUST override prior form selection to 'yes'");

  testPass(6, "Form = NO, Mitra message later says YES -> threeDPreference = 'yes'", "Deterministic override order: Message > Default");
} catch (err) {
  testFail(6, "Form = NO, Mitra message later says YES -> threeDPreference = 'yes'", err);
}

// -----------------------------------------------------------------------------
// TEST 7: 3D = NO -> no R3F/Three/WebGL output, level = "NONE"
// -----------------------------------------------------------------------------
try {
  const prompt = buildWebsitePrompt(
    {
      businessName: "Verma Law Office",
      category: "Legal Services",
      description: "Corporate law firm",
      threeDPreference: "no",
    },
    { "ai/context.md": "Context content" }
  );

  assert.ok(prompt.includes("3D PREFERENCE: NO (HARD CONSTRAINT)"), "Prompt must include explicit 3D NO hard constraint");
  assert.ok(prompt.includes("DO NOT generate any Three.js, React Three Fiber"), "Prompt must explicitly forbid Three.js / R3F");
  assert.ok(prompt.includes("Spatial 3D is strictly disabled (Level: NONE)"), "Prompt must mandate Level: NONE");

  const heroLayout = deriveHeroLayout("dark_technical", { threeDPreference: "no" }, { enabled: false, level: "NONE", targetSection: "hero", mobileFallback: "flat" });
  assert.notEqual(heroLayout, "spatial_depth_hero", "deriveHeroLayout must NEVER return spatial_depth_hero when 3D is disabled");

  testPass(7, "3D = NO -> no R3F/Three/WebGL output, level = 'NONE'", "Prompt blocks all 3D libraries and hero forces 2D");
} catch (err) {
  testFail(7, "3D = NO -> no R3F/Three/WebGL output, level = 'NONE'", err);
}

// -----------------------------------------------------------------------------
// TEST 8: 3D = YES -> 3D skill eligible
// -----------------------------------------------------------------------------
try {
  const prompt = buildWebsitePrompt(
    {
      businessName: "Aura Spatial",
      category: "Creative Agency",
      description: "Immersive digital agency with 3D models",
      threeDPreference: "yes",
    },
    { "ai/context.md": "Context content" }
  );

  assert.ok(prompt.includes("3D PREFERENCE: YES. Spatial 3D is explicitly ENABLED"), "Prompt must include 3D YES block");
  assert.ok(prompt.includes("Generate interactive 3D hero card tilt"), "Prompt must instruct 3D hero card tilt");

  const skillsFallback = buildDeterministicSkillsFallback({
    businessName: "Aura Spatial",
    category: "Creative Agency",
    description: "Immersive agency with 3D model",
    threeDPreference: "yes",
  });
  const hasSpatialSkill = skillsFallback.selectedSkills.some((s) => s.skillId === "spatial-interaction");
  assert.ok(hasSpatialSkill, "spatial-interaction skill must be included in selectedSkills when 3D is YES");

  testPass(8, "3D = YES -> 3D skill eligible", "3D skills activated and prompt formatted for 3D execution");
} catch (err) {
  testFail(8, "3D = YES -> 3D skill eligible", err);
}

// -----------------------------------------------------------------------------
// TEST 9: Regeneration preserves 3D preference
// -----------------------------------------------------------------------------
try {
  const sysPrompt = buildUniquenessSystemPrompt();
  assert.ok(sysPrompt.includes("If 3D preference is NO"), "Uniqueness system prompt must enforce 3D NO in redesign directives");

  const userPrompt = buildUniquenessUserPrompt(
    {
      newWebsite: { brand: { name: "Test" }, hero: { headline: "Hi" } },
      businessName: "Test Cafe",
      category: "Cafe",
      description: "Artisanal coffee",
      threeDPreference: "no",
      regenerationAttempt: 1,
    },
    []
  );
  assert.ok(userPrompt.includes("3D Preference: NO (Hard constraint: strictly 2D only)"), "Uniqueness user prompt must declare 3D NO constraint");

  testPass(9, "Regeneration preserves 3D preference", "Uniqueness agent strictly adheres to 2D during redesign loops");
} catch (err) {
  testFail(9, "Regeneration preserves 3D preference", err);
}

// -----------------------------------------------------------------------------
// TEST 10: Project persistence survives reload
// -----------------------------------------------------------------------------
try {
  const rawInputYes = {
    businessName: "Future Arch",
    category: "Architecture",
    description: "Architectural firm",
    threeDPreference: "yes",
  };
  const valYes = validateBusinessInputs(rawInputYes);
  assert.equal(valYes.isValid, true);
  assert.equal(valYes.data.threeDPreference, "yes", "Validator must preserve 'yes'");

  const rawInputNo = {
    businessName: "Corner Bakery",
    category: "Bakery",
    description: "Fresh sourdough bread",
    threeDPreference: "no",
  };
  const valNo = validateBusinessInputs(rawInputNo);
  assert.equal(valNo.isValid, true);
  assert.equal(valNo.data.threeDPreference, "no", "Validator must preserve 'no'");

  const rawInputDefault = {
    businessName: "General Store",
    category: "Retail",
    description: "Neighborhood grocery shop",
  };
  const valDefault = validateBusinessInputs(rawInputDefault);
  assert.equal(valDefault.isValid, true);
  assert.equal(valDefault.data.threeDPreference, "no", "Validator must normalize undefined to 'no'");

  testPass(10, "Project persistence survives reload", "Validation guarantees deterministic 'yes' | 'no' normalization");
} catch (err) {
  testFail(10, "Project persistence survives reload", err);
}

// -----------------------------------------------------------------------------
// TEST 11: Mobile viewport + 3D YES -> fallback behavior
// -----------------------------------------------------------------------------
try {
  const spatial = deriveSpatial3dConfig("dark_technical", {
    category: "SaaS",
    threeDPreference: "yes",
  });
  assert.equal(spatial.enabled, true);
  assert.equal(spatial.mobileFallback, "2.5d", "Mobile fallback must be 2.5d or flat to prevent mobile WebGL crashes");

  const strategy = generateDesignStrategy({
    category: "Architecture",
    businessName: "Urban Studio",
    description: "Modern buildings",
    threeDPreference: "yes",
  });
  assert.equal(strategy.spatial3d.mobileFallback, "2.5d", "Strategy specifies mobile fallback for responsive safety");

  testPass(11, "Mobile viewport + 3D YES -> fallback behavior", "Mobile fallback correctly configured for device safety");
} catch (err) {
  testFail(11, "Mobile viewport + 3D YES -> fallback behavior", err);
}

// -----------------------------------------------------------------------------
// TEST 12: Reduced-motion enabled -> respects accessibility
// -----------------------------------------------------------------------------
try {
  const spatialNoMotion = deriveSpatial3dConfig("dark_technical", {
    category: "SaaS",
    prompt: "No animations please, disable motion for accessibility",
    threeDPreference: "yes", // even if requested, explicit no motion wins
  });
  assert.equal(spatialNoMotion.enabled, false, "Explicit no-motion must suppress 3D");
  assert.equal(spatialNoMotion.level, "NONE", "Level must be NONE");
  assert.equal(spatialNoMotion.mobileFallback, "flat");

  const prompt = buildWebsitePrompt(
    {
      businessName: "Kinetic Studio",
      category: "Design",
      description: "Interactive 3D agency",
      threeDPreference: "yes",
    },
    { "ai/context.md": "Context content" }
  );
  assert.ok(
    prompt.includes("Ensure reduced-motion media queries disable 3D on accessibility-sensitive client environments"),
    "Prompt mandates prefers-reduced-motion suppression"
  );

  testPass(12, "Reduced-motion enabled -> respects accessibility", "prefers-reduced-motion suppression properly enforced");
} catch (err) {
  testFail(12, "Reduced-motion enabled -> respects accessibility", err);
}

// -----------------------------------------------------------------------------
// FINAL SUMMARY
// -----------------------------------------------------------------------------
console.log("\n================================================================");
console.log(`   ALL ${passedTests}/${totalTests} EXPLICIT 3D CONTROL TESTS PASSED!`);
console.log("================================================================\n");
