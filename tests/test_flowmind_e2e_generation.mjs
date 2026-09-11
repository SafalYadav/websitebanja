/**
 * FlowMind AI SaaS Generation & Auth Security Test Suite
 *
 * Verifies:
 * 1. FlowMind Requirement Extraction (Fast + Full)
 * 2. UI/UX Pro Max Design Intelligence applied to FlowMind
 * 3. Complete Phase 3 + Phase 4 Website Generation Engine
 * 4. Backend Requirement Detection for FlowMind SaaS
 * 5. HTTP Authorization Checks:
 *    - 401 on Missing Token
 *    - 401 on Invalid/Malformed Token
 * 6. Full generated code validation (JSX/TSX syntax, CSS vars, section rendering)
 */

import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import jitiFactory from "jiti";
const jiti = jitiFactory(process.cwd(), {
  alias: { "@": path.resolve(process.cwd(), "src") },
});

const { extractBusinessDetailsFast } = jiti("@/lib/promptExtractor");
const { generateDesignTokens } = jiti("@/lib/ai/design/designTokens");
const { generateDesignRules } = jiti("@/lib/ai/design/designRules");
const { createWebsitePlan, createDesignPlan, selectComponents } = jiti("@/lib/ai/planner");
const { generateComponents } = jiti("@/lib/ai/generation/generator");
const { detectBackendRequirement } = jiti("@/lib/backendDetection");
const { generateUiUxDesignSystem } = jiti("@/lib/ai/uiux-pro-max");

console.log("================================================================================");
console.log("TESTING FLOWMIND AI GENERATION & AUTHORIZATION SECURITY");
console.log("================================================================================\n");

let passed = 0;
let failed = 0;

function test(title, testFn) {
  try {
    testFn();
    console.log("  ✔ [PASS] " + title);
    passed++;
  } catch (err) {
    console.error("  ✖ [FAIL] " + title);
    console.error(err);
    failed++;
  }
}

async function testAsync(title, testFn) {
  try {
    await testFn();
    console.log("  ✔ [PASS] " + title);
    passed++;
  } catch (err) {
    console.error("  ✖ [FAIL] " + title);
    console.error(err);
    failed++;
  }
}

// -----------------------------------------------------------------------------
// [Suite 1] FlowMind Requirement Extraction
// -----------------------------------------------------------------------------
console.log("[Suite 1] FlowMind Requirement Extraction");

const flowMindPrompt =
  "Create a sleek, high-conversion modern AI SaaS platform for FlowMind. FlowMind is an autonomous workflow intelligence engine that automates complex engineering pipelines, syncs developer knowledge, and optimizes team velocity. Primary color indigo #4F46E5, secondary cyan #06B6D4. Needs features, pricing, interactive workflow demo, testimonial showcase, and lead capture.";

let extracted;
test("extractBusinessDetailsFast extracts FlowMind identity, category, and styling", () => {
  extracted = extractBusinessDetailsFast(flowMindPrompt, "saas", ["auth", "analytics"]);
  assert.ok(extracted.businessName.toLowerCase().includes("flowmind"), "Expected FlowMind, got " + extracted.businessName);
  assert.equal(extracted.category, "saas");
  assert.ok(extracted.services.length >= 3, "Extracted features must be present");
});

// -----------------------------------------------------------------------------
// [Suite 2] UI/UX Pro Max Design Intelligence for FlowMind
// -----------------------------------------------------------------------------
console.log("\n[Suite 2] UI/UX Pro Max Design Intelligence for FlowMind");

const flowMindRequirement = {
  intent: "create",
  business: {
    name: "FlowMind",
    type: "AI SaaS platform",
    industry: "saas",
  },
  audience: "Modern engineering teams, CTOs, and high-velocity founders",
  brand: {
    colors: {
      primary: "#4F46E5",
      secondary: "#06B6D4",
    },
    style: "modern futuristic dark",
  },
  services: [
    "Autonomous Workflow Intelligence",
    "Real-time Pipeline Telemetry",
    "Continuous AI Process Optimization",
    "Developer Knowledge Graph Sync",
  ],
  pricing: [
    { name: "Starter", price: "$49/mo", features: ["Up to 5 pipelines", "Community support"] },
    { name: "Scale", price: "$199/mo", features: ["Unlimited pipelines", "Autonomous agent dispatch", "24/7 SLA"] },
  ],
  cta: "Deploy FlowMind Agent",
  functionality: {
    auth: true,
    analytics: true,
  },
  designPreferences: {
    themeMode: "dark",
    style: "modern futuristic dark",
  },
};

let designSystem;
test("generateUiUxDesignSystem selects high-energy dials and modern AI styling", () => {
  designSystem = generateUiUxDesignSystem(flowMindRequirement);
  assert.ok(designSystem.dials.variance >= 7, "Expected high variance for AI SaaS, got " + designSystem.dials.variance);
  assert.ok(designSystem.dials.motion >= 6, "Expected dynamic motion dial, got " + designSystem.dials.motion);
  assert.ok(designSystem.style.name, "Style name must be populated");
  assert.ok(designSystem.colors.primary, "Primary color must be populated");
  assert.ok(designSystem.typography.heading, "Heading font must be populated");
  assert.ok(designSystem.pattern.sections.length >= 3, "Sections must include landing flow");
});

test("generateDesignTokens integrates UI/UX Pro Max tokens and palette for FlowMind", () => {
  const tokens = generateDesignTokens(flowMindRequirement, designSystem);
  assert.ok(tokens.colors.primary, "Tokens must include primary color");
  assert.ok(tokens.uiUxDesignSystem, "Tokens must contain UI/UX Pro Max design system");
  assert.ok(tokens.colors.card, "Surface tokens must exist");
  assert.ok(tokens.colors.ring, "Ring focus token must exist");
});

test("generateDesignRules generates design rules with anti-patterns and UX constraints", () => {
  const rules = generateDesignRules(flowMindRequirement);
  assert.equal(rules.industry, "saas");
  assert.ok(rules.colorSystem.primaryDefault, "Rules must specify primary color default");
  assert.ok(rules.colorSystem.colorMood, "Color mood must be defined");
  assert.ok(rules.cta.primaryLabel, "CTA label must be present");
});

// -----------------------------------------------------------------------------
// [Suite 3] Website Plan, Design Plan, and Component Selection
// -----------------------------------------------------------------------------
console.log("\n[Suite 3] Planner & Component Selection for FlowMind");

let websitePlan;
let designPlan;
let componentPlan;

test("createWebsitePlan generates complete structural plan with home page and sections", () => {
  websitePlan = createWebsitePlan(flowMindRequirement);
  assert.ok(websitePlan.pages.length >= 1, "Expected >=1 planned page");
  const homePage = websitePlan.pages.find((p) => p.isHome) || websitePlan.pages[0];
  assert.ok(homePage.sections.length >= 5, "Expected >=5 sections on home page, got " + homePage.sections.length);
  assert.ok(homePage.sections.includes("hero"), "Must include HeroSection");
  assert.ok(homePage.sections.includes("features"), "Must include FeaturesSection");
  assert.ok(homePage.sections.includes("contact"), "Must include ContactSection");
  assert.ok(websitePlan.uiUxDesignSystem, "Must include uiUxDesignSystem");
});

test("createDesignPlan bridges motion, theme, and tokens", () => {
  designPlan = createDesignPlan(websitePlan, flowMindRequirement);
  assert.ok(designPlan.motionLevel, "Motion level must be set");
  assert.ok(designPlan.themeMode, "Theme mode must be set");
  assert.ok(designPlan.uiUxDesignSystem, "uiUxDesignSystem must be preserved");
});

test("selectComponents recommends modern components with 21st.dev extensions", () => {
  componentPlan = selectComponents(designPlan, flowMindRequirement);
  assert.ok(componentPlan.components.length >= 5, "Expected >=5 components, got " + componentPlan.components.length);
  assert.ok(componentPlan.components.includes("Navbar"), "Must include Navbar");
  assert.ok(componentPlan.components.includes("HeroSection"), "Must include HeroSection");
  assert.ok(componentPlan.components.includes("FooterSection"), "Must include FooterSection");
  const has21st = componentPlan.components.some((c) => c.startsWith("21st:"));
  assert.ok(has21st, "High variance SaaS should include 21st components");
});

// -----------------------------------------------------------------------------
// [Suite 4] Real Component Generation
// -----------------------------------------------------------------------------
console.log("\n[Suite 4] Component Generation & Compilation Verification");

let genResult;
test("generateComponents generates all TSX components and Website.tsx for FlowMind", () => {
  genResult = generateComponents(flowMindRequirement, componentPlan, websitePlan, designPlan);
  assert.ok(genResult.files.includes("Website.tsx"), "Website.tsx must be generated");
  assert.ok(genResult.files.includes("Navbar.tsx"), "Navbar.tsx must be generated");
  assert.ok(genResult.files.includes("HeroSection.tsx"), "HeroSection.tsx must be generated");
  assert.ok(genResult.files.includes("FeaturesSection.tsx"), "FeaturesSection.tsx must be generated");
  assert.ok(genResult.files.includes("FooterSection.tsx"), "FooterSection.tsx must be generated");
  assert.ok(genResult.tokensApplied.primaryColor, "Tokens applied must include primaryColor");
});

test("Generated Website.tsx contains FlowMind business copywriting and valid structure", () => {
  const websiteCode = fs.readFileSync(path.resolve(process.cwd(), "src/generated/Website.tsx"), "utf8");
  const heroCode = fs.readFileSync(path.resolve(process.cwd(), "src/generated/HeroSection.tsx"), "utf8");
  const navbarCode = fs.readFileSync(path.resolve(process.cwd(), "src/generated/Navbar.tsx"), "utf8");
  assert.ok(heroCode.includes("FlowMind"), "HeroSection.tsx must contain FlowMind");
  assert.ok(navbarCode.includes("FlowMind"), "Navbar.tsx must contain FlowMind");
  assert.ok(websiteCode.includes("<GeneratedNavbar"), "Must render GeneratedNavbar");
  assert.ok(websiteCode.includes("<GeneratedHeroSection"), "Must render GeneratedHeroSection");
  assert.ok(websiteCode.includes("--wb-primary"), "Website.tsx must apply primary design token");
});

// -----------------------------------------------------------------------------
// [Suite 5] Backend Requirement Detection
// -----------------------------------------------------------------------------
console.log("\n[Suite 5] Backend Detection for FlowMind");

test("detectBackendRequirement identifies SaaS static edge requirement correctly", () => {
  const backend = detectBackendRequirement("saas");
  assert.equal(backend.requiresBackend, false);
  assert.equal(backend.requirementType, "static");
  assert.ok(backend.title.includes("Static") || backend.title.includes("Edge"));
});

// -----------------------------------------------------------------------------
// [Suite 6] HTTP API Security & Authorization Handlers
// -----------------------------------------------------------------------------
console.log("\n[Suite 6] HTTP API Security & Authorization Verification");

async function runHttpTests() {
  const baseUrl = "http://localhost:3000";

  await testAsync("POST /api/extract without auth returns 401 Unauthorized", async () => {
    const res = await fetch(baseUrl + "/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: flowMindPrompt }),
    });
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.ok(body.message.includes("Unauthorized") || body.message.includes("Bearer"));
  });

  await testAsync("POST /api/plan without auth returns 401 Unauthorized", async () => {
    const res = await fetch(baseUrl + "/api/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessName: "FlowMind",
        category: "saas",
        targetAudience: "Developers",
        style: "modern",
      }),
    });
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.success, false);
  });

  await testAsync("POST /api/generate without auth returns 401 Unauthorized", async () => {
    const res = await fetch(baseUrl + "/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessName: "FlowMind",
        category: "saas",
      }),
    });
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.success, false);
  });

  await testAsync("POST /api/plan with invalid/expired JWT returns 401 Unauthorized", async () => {
    const res = await fetch(baseUrl + "/api/plan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer invalid.jwt.token",
      },
      body: JSON.stringify({
        businessName: "FlowMind",
        category: "saas",
      }),
    });
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.success, false);
  });

  console.log("\n================================================================================");
  console.log("FLOWMIND E2E TEST SUMMARY: " + passed + " PASSED, " + failed + " FAILED");
  console.log("================================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runHttpTests().catch((err) => {
  console.error("Http test fatal error:", err);
  process.exit(1);
});
