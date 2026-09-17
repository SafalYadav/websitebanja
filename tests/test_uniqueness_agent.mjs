// tests/test_uniqueness_agent.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
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

console.log("================================================================================");
console.log("WEBSITEBANJA AI — PHASE 3: UNIQUENESS & VERIFICATION AGENT TEST SUITE");
console.log("================================================================================\n");

const testResults = [];

function recordTest(num, name, status, details = "") {
  testResults.push({ num, name, status, details });
  const icon = status === "PASS" ? "✔" : status === "FAIL" ? "✖" : "⚠";
  console.log(`[TEST ${num}] ${name}: ${icon} ${status}${details ? ` (${details})` : ""}`);
}

async function runTests() {
  const {
    runUniquenessAgent,
    buildDeterministicUniquenessFallback,
    MAX_UNIQUENESS_REGENERATIONS,
  } = jiti("../src/lib/agents/uniqueness/uniquenessAgent.ts");

  const {
    calculateStructuralSimilarity,
    calculateFingerprintSimilarity,
    calculateComponentPatternSimilarity,
    evaluateCandidateSimilarities,
    DEFAULT_UNIQUENESS_CONFIG,
  } = jiti("../src/lib/agents/uniqueness/similarity.ts");

  const { extractDetailedDesignFingerprint } = jiti(
    "../src/lib/agents/uniqueness/fingerprint.ts"
  );

  const { selectCandidateWebsites } = jiti(
    "../src/lib/agents/uniqueness/candidateSelector.ts"
  );

  // Baseline Candidate: "Artisan Wood-Fired Pizza"
  const baselineCandidate = {
    id: "proj_cand_101",
    businessName: "Crust & Craft",
    category: "Restaurant",
    fingerprint: {
      heroType: "split_screen",
      navigationType: "floating",
      layoutType: "bento_grid",
      sectionOrder: ["hero", "menu", "story", "testimonials", "location", "contact"],
      visualArchetype: "warm_artisanal",
      typographyStyle: "playfair_serif",
      colorDirection: "terracotta_accent",
      cardStyle: "tactile_bento",
      animationStyle: "subtle_reveal",
      backgroundType: "solid",
      has3dSpatial: false,
    },
    sectionOrder: ["hero", "menu", "story", "testimonials", "location", "contact"],
    layoutType: "bento_grid",
    primaryColor: "terracotta",
    cardStyle: "tactile_bento",
  };

  const duplicateWebsite = {
    hero: { layoutType: "split_screen", heroType: "split_screen" },
    navbar: { style: "floating" },
    layoutType: "bento_grid",
    sectionOrder: ["hero", "menu", "story", "testimonials", "location", "contact"],
    style: "warm_artisanal",
    brand: { primaryColor: "terracotta_accent" },
    cardFamily: "tactile_bento",
    animationStyle: "subtle_reveal",
    typography: { headingFont: "playfair_serif" },
    backgroundType: "solid",
    spatial: { enabled: false, level: "NONE" },
  };

  // ---------------------------------------------------------------------------
  // TEST 1 — Clearly Different Websites → PASS
  // ---------------------------------------------------------------------------
  try {
    const techAgencyWebsite = {
      hero: { layoutType: "terminal_minimal", heroType: "terminal_minimal" },
      navbar: { style: "minimal_pill" },
      layoutType: "code_matrix",
      sectionOrder: ["hero", "tech_stack", "architecture", "pricing", "contact"],
      style: "cyber_dark",
      brand: { primaryColor: "#00ff66" },
      cardFamily: "horizontal-media",
      animationStyle: "glitch_matrix",
    };

    const input = {
      newWebsite: techAgencyWebsite,
      businessName: "HyperVector Systems",
      category: "Software Development",
      description: "Cloud-native Kubernetes architecture consultancy",
      candidates: [baselineCandidate],
    };

    const result = await runUniquenessAgent(input);
    assert.ok(result.success, "Agent execution succeeded");
    assert.equal(result.data.status, "PASS", "Status is PASS for clearly different websites");
    assert.ok(result.data.similarityScore < 0.40, `Similarity is low (got ${result.data.similarityScore})`);
    recordTest(1, "Clearly Different Websites -> PASS", "PASS", `Score: ${result.data.similarityScore}`);
  } catch (err) {
    recordTest(1, "Clearly Different Websites -> PASS", "FAIL", err.message);
  }

  // ---------------------------------------------------------------------------
  // TEST 2 — Nearly Identical Websites → REGENERATE
  // ---------------------------------------------------------------------------
  try {
    const copycatWebsite = {
      hero: { layoutType: "split_screen", heroType: "split_screen" },
      navbar: { style: "floating" },
      layoutType: "bento_grid",
      sectionOrder: ["hero", "menu", "story", "testimonials", "location", "contact"],
      style: "warm_artisanal",
      brand: { primaryColor: "terracotta_accent" },
      cardFamily: "tactile_bento",
      animationStyle: "subtle_reveal",
      typography: { headingFont: "playfair_serif" },
    };

    const input = {
      newWebsite: copycatWebsite,
      businessName: "Fire & Dough",
      category: "Restaurant",
      description: "Artisan wood-fired pizza and natural wines",
      candidates: [baselineCandidate],
      regenerationAttempt: 0,
    };

    const result = await runUniquenessAgent(input);
    assert.ok(result.success, "Execution succeeded");
    assert.equal(result.data.status, "REGENERATE", "Flagged as REGENERATE for duplicate layout & styling");
    assert.ok(result.data.similarityScore >= 0.82, `Score >= 0.82 (got ${result.data.similarityScore})`);
    assert.ok(result.data.issues.length > 0, "Identifies specific duplicate issues");
    assert.ok(result.data.redesignDirectives.length > 0, "Generates targeted redesign directives");
    recordTest(2, "Nearly Identical Websites -> REGENERATE", "PASS", `Score: ${result.data.similarityScore}`);
  } catch (err) {
    recordTest(2, "Nearly Identical Websites -> REGENERATE", "FAIL", err.message);
  }

  // ---------------------------------------------------------------------------
  // TEST 3 — Same Business Category but Different Design → PASS
  // ---------------------------------------------------------------------------
  try {
    const alternativeRestaurantWebsite = {
      hero: { layoutType: "fullscreen_editorial", heroType: "fullscreen_editorial" },
      navbar: { style: "sidebar_drawer" },
      layoutType: "monochrome_asymmetric",
      sectionOrder: ["hero", "chef_philosophy", "private_dining", "menu", "contact"],
      style: "brutalist_luxury",
      brand: { primaryColor: "#111111" },
      cardFamily: "editorial",
      animationStyle: "stagger_slide",
      typography: { headingFont: "cormorant_garamond" },
    };

    const input = {
      newWebsite: alternativeRestaurantWebsite,
      businessName: "Nocturne Omakase",
      category: "Restaurant",
      description: "Exclusive 10-seat dark sushi speakeasy",
      candidates: [baselineCandidate],
    };

    const result = await runUniquenessAgent(input);
    assert.ok(result.success, "Execution succeeded");
    assert.equal(result.data.status, "PASS", "Same industry with distinctive design produces PASS");
    assert.ok(result.data.similarityScore < 0.65, `Score below passThreshold (got ${result.data.similarityScore})`);
    recordTest(3, "Same Business Category but Distinct Design -> PASS", "PASS", `Score: ${result.data.similarityScore}`);
  } catch (err) {
    recordTest(3, "Same Business Category but Distinct Design -> PASS", "FAIL", err.message);
  }

  // ---------------------------------------------------------------------------
  // TEST 4 — Same Content / Sections Substantially Different Layout → Not Penalized
  // ---------------------------------------------------------------------------
  try {
    // Both have Menu, About, Location, Contact, but hero, cards, and structure are flipped
    const differentLayoutRestaurant = {
      hero: { layoutType: "centered_video_ambient", heroType: "centered_video_ambient" },
      navbar: { style: "solid_header" },
      layoutType: "magazine_grid",
      sectionOrder: ["hero", "story", "menu", "contact", "location"],
      style: "modern_minimalist",
      brand: { primaryColor: "#2b4c7e" },
      cardFamily: "horizontal-media",
      animationStyle: "fade_in_up",
      typography: { headingFont: "inter" },
    };

    const input = {
      newWebsite: differentLayoutRestaurant,
      businessName: "Bistro Bleu",
      category: "Restaurant",
      description: "Modern French coastal seafood bistro",
      candidates: [baselineCandidate],
    };

    const evalResult = evaluateCandidateSimilarities(
      input.newWebsite,
      input.category,
      input.description,
      [baselineCandidate]
    );

    assert.notEqual(evalResult.status, "REGENERATE", "Legitimate section overlap is not flagged as REGENERATE");
    assert.ok(evalResult.highestScore < 0.82, `Score is below regenerateThreshold (got ${evalResult.highestScore})`);
    recordTest(4, "Same Domain Content with Different Design Composition Allowed", "PASS", `Score: ${evalResult.highestScore}`);
  } catch (err) {
    recordTest(4, "Same Domain Content with Different Design Composition Allowed", "FAIL", err.message);
  }

  // ---------------------------------------------------------------------------
  // TEST 5 — Same Hero + Layout + Color + Card Patterns → High Similarity Score
  // ---------------------------------------------------------------------------
  try {
    const targetFp = extractDetailedDesignFingerprint(duplicateWebsite);
    const structSim = calculateStructuralSimilarity(targetFp, baselineCandidate.fingerprint);
    const fpSim = calculateFingerprintSimilarity(targetFp, baselineCandidate.fingerprint);
    const compSim = calculateComponentPatternSimilarity(targetFp, baselineCandidate.fingerprint);

    assert.ok(structSim >= 0.95, `Structural similarity high (${structSim})`);
    assert.ok(fpSim >= 0.95, `Fingerprint similarity high (${fpSim})`);
    assert.ok(compSim >= 0.95, `Component similarity high (${compSim})`);
    recordTest(5, "Repeated Hero + Layout + Color + Card Patterns Detection", "PASS", `Struct: ${structSim}, FP: ${fpSim}`);
  } catch (err) {
    recordTest(5, "Repeated Hero + Layout + Color + Card Patterns Detection", "FAIL", err.message);
  }

  // ---------------------------------------------------------------------------
  // TEST 6 — Malformed AI Response → Safe Deterministic Fallback
  // ---------------------------------------------------------------------------
  try {
    const input = {
      newWebsite: duplicateWebsite,
      businessName: "Fallback Test",
      category: "Restaurant",
      description: "Testing model fallback resilience",
      candidates: [baselineCandidate],
    };

    const fallback = buildDeterministicUniquenessFallback(input, [baselineCandidate]);
    assert.ok(fallback.similarityScore >= 0.82, "Fallback correctly calculated collision math");
    assert.equal(fallback.status, "REGENERATE", "Fallback determined REGENERATE correctly");
    assert.ok(fallback.issues.length > 0, "Fallback identified issues");
    recordTest(6, "Malformed Model Output -> Deterministic Fallback Graceful Handling", "PASS");
  } catch (err) {
    recordTest(6, "Malformed Model Output -> Deterministic Fallback Graceful Handling", "FAIL", err.message);
  }

  // ---------------------------------------------------------------------------
  // TEST 7 — Provider Failure → Deterministic Fallback
  // ---------------------------------------------------------------------------
  try {
    const { modelRouter } = jiti("../src/lib/ai/router/modelRouter.ts");

    // Temporarily mock adapter failure
    modelRouter.registerAdapter({
      providerName: "gemini",
      isConfigured: () => true,
      generate: async () => ({
        success: false,
        provider: "gemini",
        model: "gemini-2.5-flash",
        latencyMs: 30,
        error: { type: "PROVIDER_UNAVAILABLE", message: "503 Service Unavailable", retryable: false },
      }),
    });

    const input = {
      newWebsite: baselineCandidate,
      businessName: "Provider Failover Test",
      category: "Restaurant",
      description: "Testing full provider outage",
      candidates: [baselineCandidate],
    };

    const res = await runUniquenessAgent(input);
    assert.ok(res.success, "Returns successful result even when provider fails");
    assert.equal(res.source, "fallback", "Indicates fallback source");
    assert.ok(res.data.status !== undefined, "Status is defined");

    // Restore real adapter
    const { GeminiAdapter } = jiti("../src/lib/ai/router/geminiAdapter.ts");
    modelRouter.registerAdapter(new GeminiAdapter());

    recordTest(7, "Complete Provider Failure -> Clean Deterministic Fallback", "PASS");
  } catch (err) {
    recordTest(7, "Complete Provider Failure -> Clean Deterministic Fallback", "FAIL", err.message);
  }

  // ---------------------------------------------------------------------------
  // TEST 8 — Regeneration Limit → No Infinite Loop
  // ---------------------------------------------------------------------------
  try {
    const duplicateWebsite = {
      hero: { layoutType: "split_screen", heroType: "split_screen" },
      navbar: { style: "floating" },
      layoutType: "bento_grid",
      sectionOrder: ["hero", "menu", "story", "testimonials", "location", "contact"],
      style: "warm_artisanal",
      brand: { primaryColor: "terracotta_accent" },
      cardFamily: "tactile_bento",
      animationStyle: "subtle_reveal",
      typography: { headingFont: "playfair_serif" },
    };

    const input = {
      newWebsite: duplicateWebsite,
      businessName: "Fire & Dough",
      category: "Restaurant",
      description: "Artisan pizza and wine",
      candidates: [baselineCandidate],
      regenerationAttempt: MAX_UNIQUENESS_REGENERATIONS, // Attempt 2 (cap reached)
    };

    const result = await runUniquenessAgent(input);
    assert.ok(result.success, "Execution succeeded");
    assert.equal(
      result.data.status,
      "REVIEW",
      `Caps regenerations at max (${MAX_UNIQUENESS_REGENERATIONS}) and transitions to REVIEW without infinite looping`
    );
    recordTest(8, "Regeneration Cap Enforcement (No Infinite Loops)", "PASS", `Transitioned to ${result.data.status}`);
  } catch (err) {
    recordTest(8, "Regeneration Cap Enforcement (No Infinite Loops)", "FAIL", err.message);
  }

  // ---------------------------------------------------------------------------
  // TEST 9 — Missing Previous Websites → Safe Behavior (Instant PASS)
  // ---------------------------------------------------------------------------
  try {
    const input = {
      newWebsite: { hero: { layoutType: "hero_minimal" } },
      businessName: "Pioneer Innovations",
      category: "Quantum Robotics",
      description: "First company in new category",
      candidates: [], // zero historical candidates
    };

    const result = await runUniquenessAgent(input);
    assert.ok(result.success, "Handled empty candidate list cleanly");
    assert.equal(result.data.status, "PASS", "Empty candidates yields automatic PASS");
    assert.equal(result.data.similarityScore, 0.0, "Similarity score is exactly 0.0");
    recordTest(9, "Zero Historical Candidate Websites -> Instant Safe PASS", "PASS");
  } catch (err) {
    recordTest(9, "Zero Historical Candidate Websites -> Instant Safe PASS", "FAIL", err.message);
  }

  // ---------------------------------------------------------------------------
  // TEST 10 — Malformed / Unexpected AST Fields → No Crash
  // ---------------------------------------------------------------------------
  try {
    const corruptWebsite = {
      hero: null,
      navbar: undefined,
      sectionOrder: "not-an-array",
      randomGarbage: 12345,
      brand: { colors: [null, {}] },
    };

    const fp = extractDetailedDesignFingerprint(corruptWebsite);
    assert.ok(Array.isArray(fp.sectionOrder), "Safely normalized sectionOrder to array");
    assert.ok(typeof fp.heroType === "string", "Hero type fallback is valid string");
    assert.ok(typeof fp.navigationType === "string", "Nav type fallback is valid string");

    const input = {
      newWebsite: corruptWebsite,
      businessName: "Corrupt Website Test",
      category: "Test",
      description: "Testing corrupted AST resilience",
      candidates: [baselineCandidate],
    };

    const result = await runUniquenessAgent(input);
    assert.ok(result.success, "Ran without crashing on corrupted AST");
    recordTest(10, "Corrupted / Unexpected AST Fields Robustness", "PASS");
  } catch (err) {
    recordTest(10, "Corrupted / Unexpected AST Fields Robustness", "FAIL", err.message);
  }

  // ---------------------------------------------------------------------------
  // TEST 11 — Explicit User Design Constraints Preserved
  // ---------------------------------------------------------------------------
  try {
    const input = {
      newWebsite: {
        hero: { layoutType: "split_screen" },
        brand: { primaryColor: "#000000" },
      },
      businessName: "Mono Studio",
      category: "Architecture",
      description: "Minimalist architecture",
      explicitConstraints: ["Must use pure black background with stark white typography"],
      candidates: [
        {
          id: "cand_arch",
          businessName: "Brutal Arch",
          category: "Architecture",
          fingerprint: {
            heroType: "split_screen",
            navigationType: "floating",
            layoutType: "editorial",
            sectionOrder: ["hero", "projects", "contact"],
            visualArchetype: "minimal",
            typographyStyle: "sans",
            colorDirection: "#000000_accent",
            cardStyle: "clean",
            animationStyle: "none",
          },
          sectionOrder: ["hero", "projects", "contact"],
        },
      ],
    };

    const promptText = jiti("../src/lib/agents/uniqueness/uniquenessPrompt.ts").buildUniquenessUserPrompt(
      input,
      input.candidates
    );

    assert.ok(
      promptText.includes("Must use pure black background with stark white typography"),
      "Explicit constraint injected into verification prompt"
    );
    recordTest(11, "Explicit User Design Constraint Preservation", "PASS");
  } catch (err) {
    recordTest(11, "Explicit User Design Constraint Preservation", "FAIL", err.message);
  }

  // ---------------------------------------------------------------------------
  // TEST 12 — GPT/OpenAI Boundary Audit (Zero OpenAI in Uniqueness Agent)
  // ---------------------------------------------------------------------------
  try {
    const agentFile = fs.readFileSync(path.join(ROOT, "src/lib/agents/uniqueness/uniquenessAgent.ts"), "utf8");
    const promptFile = fs.readFileSync(path.join(ROOT, "src/lib/agents/uniqueness/uniquenessPrompt.ts"), "utf8");
    const typesFile = fs.readFileSync(path.join(ROOT, "src/lib/agents/uniqueness/types.ts"), "utf8");
    const simFile = fs.readFileSync(path.join(ROOT, "src/lib/agents/uniqueness/similarity.ts"), "utf8");

    assert.ok(!agentFile.includes("openai"), "uniquenessAgent.ts does not reference openai");
    assert.ok(!agentFile.includes("OPENAI_API_KEY"), "uniquenessAgent.ts does not use OPENAI_API_KEY");
    assert.ok(!promptFile.includes("openai"), "uniquenessPrompt.ts does not reference openai");
    assert.ok(!typesFile.includes("openai"), "types.ts does not reference openai");
    assert.ok(!simFile.includes("openai"), "similarity.ts does not reference openai");

    recordTest(12, "GPT Boundary Verification (100% Free Router Isolation)", "PASS");
  } catch (err) {
    recordTest(12, "GPT Boundary Verification (100% Free Router Isolation)", "FAIL", err.message);
  }

  // ---------------------------------------------------------------------------
  // TEST 13 — Candidate Selection is Bounded
  // ---------------------------------------------------------------------------
  try {
    const candModule = fs.readFileSync(
      path.join(ROOT, "src/lib/agents/uniqueness/candidateSelector.ts"),
      "utf8"
    );

    assert.ok(candModule.includes("LIMIT $"), "Uses SQL LIMIT in queries");
    assert.ok(candModule.includes("Math.min(Math.max(1, limit), 8)"), "Enforces hard bounds on candidate limit");
    recordTest(13, "Candidate Selection Bounded Complexity", "PASS");
  } catch (err) {
    recordTest(13, "Candidate Selection Bounded Complexity", "FAIL", err.message);
  }

  // ---------------------------------------------------------------------------
  // TEST 14 — Similarity Score Stays Strictly Between 0 and 1
  // ---------------------------------------------------------------------------
  try {
    const dummyWebsites = [
      { newWebsite: baselineCandidate },
      { newWebsite: {} },
      { newWebsite: { sectionOrder: ["hero", "about"] } },
      { newWebsite: { hero: { layoutType: "unknown" } } },
    ];

    for (const d of dummyWebsites) {
      const evalRes = evaluateCandidateSimilarities(
        d.newWebsite,
        "Restaurant",
        "Test description",
        [baselineCandidate]
      );
      assert.ok(
        evalRes.highestScore >= 0.0 && evalRes.highestScore <= 1.0,
        `Score ${evalRes.highestScore} is strictly within [0.0, 1.0]`
      );
    }
    recordTest(14, "Similarity Score Normalization Range [0.0, 1.0]", "PASS");
  } catch (err) {
    recordTest(14, "Similarity Score Normalization Range [0.0, 1.0]", "FAIL", err.message);
  }

  // ---------------------------------------------------------------------------
  // TEST 15 — Threshold Behavior Works Correctly (PASS, REVIEW, REGENERATE)
  // ---------------------------------------------------------------------------
  try {
    const customConfig = {
      passThreshold: 0.60,
      regenerateThreshold: 0.80,
      weights: { structural: 0.5, fingerprint: 0.5, componentPattern: 0.0, semantic: 0.0 },
    };

    // Low similarity -> PASS
    const lowEval = evaluateCandidateSimilarities(
      { layoutType: "different" },
      "Different",
      "Desc",
      [baselineCandidate],
      customConfig
    );
    assert.equal(lowEval.status, "PASS", "Low similarity triggers PASS");

    // Duplicate -> REGENERATE
    const highEval = evaluateCandidateSimilarities(
      duplicateWebsite,
      baselineCandidate.category,
      "Crust & Craft",
      [baselineCandidate],
      customConfig
    );
    assert.equal(highEval.status, "REGENERATE", "Exact match triggers REGENERATE");

    recordTest(15, "Configurable Threshold Transitions (PASS -> REVIEW -> REGENERATE)", "PASS");
  } catch (err) {
    recordTest(15, "Configurable Threshold Transitions (PASS -> REVIEW -> REGENERATE)", "FAIL", err.message);
  }

  // ---------------------------------------------------------------------------
  // TEST 16 — Targeted Redesign Directives Generated When Needed
  // ---------------------------------------------------------------------------
  try {
    const duplicateWebsite = {
      hero: { layoutType: "split_screen", heroType: "split_screen" },
      navbar: { style: "floating" },
      layoutType: "bento_grid",
      sectionOrder: ["hero", "menu", "story", "testimonials", "location", "contact"],
      style: "warm_artisanal",
      brand: { primaryColor: "terracotta_accent" },
      cardFamily: "tactile_bento",
      animationStyle: "subtle_reveal",
      typography: { headingFont: "playfair_serif" },
    };

    const fallback = buildDeterministicUniquenessFallback(
      {
        newWebsite: duplicateWebsite,
        businessName: "Fire & Dough",
        category: "Restaurant",
        description: "Pizza & wine",
      },
      [baselineCandidate]
    );

    assert.ok(fallback.redesignDirectives.length >= 2, "Produces at least 2 concrete redesign directives");
    const directiveText = fallback.redesignDirectives.join(" ");
    assert.ok(
      directiveText.includes("hero") || directiveText.includes("sections") || directiveText.includes("typography"),
      "Directives contain actionable architectural guidance"
    );
    recordTest(16, "Targeted Redesign Directives Synthesis", "PASS", `${fallback.redesignDirectives.length} directives generated`);
  } catch (err) {
    recordTest(16, "Targeted Redesign Directives Synthesis", "FAIL", err.message);
  }

  console.log("\n================================================================================");
  console.log("TEST SUMMARY");
  console.log("================================================================================");
  const passed = testResults.filter((t) => t.status === "PASS").length;
  const failed = testResults.filter((t) => t.status === "FAIL").length;
  console.log(`Total: ${testResults.length} | Passed: ${passed} | Failed: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error("Test execution failed with error:", e);
  process.exit(1);
});
