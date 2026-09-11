/**
 * Official UI/UX Pro Max Design Intelligence Verification Test Suite
 *
 * Verifies that the upstream UI/UX Pro Max design intelligence system
 * is fully integrated into WebsiteBanja AI:
 * - BM25 search & ranking (styles, colors, typography, landing, ux, motion, stacks)
 * - Decision rules & condition signals
 * - Industry & product reasoning
 * - Design dials (variance, motion, density)
 * - Anti-patterns filtering
 * - Determinism
 * - Planner & DesignTokens integration
 * - Master + Page overrides
 * - Full component generator consumption
 */

import assert from "node:assert/strict";
import path from "node:path";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import jitiFactory from "jiti";
const jiti = jitiFactory(process.cwd(), {
  alias: { "@": path.resolve(process.cwd(), "src") },
});

const {
  BM25,
  searchEngine,
  generateUiUxDesignSystem,
  createProjectDesignSystem,
  generatePageOverride,
  resolveVariance,
  resolveMotion,
  resolveDensity,
} = jiti("@/lib/ai/uiux-pro-max");

const { createWebsitePlan, createDesignPlan, selectComponents } = jiti("@/lib/ai/planner");
const { generateComponents } = jiti("@/lib/ai/generation/generator");

console.log("================================================================================");
console.log("TESTING OFFICIAL UI/UX PRO MAX DESIGN INTELLIGENCE");
console.log("================================================================================\n");

let passed = 0;
let failed = 0;

function test(title, testFn) {
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

// -----------------------------------------------------------------------------
// Suite 1: BM25 Search Engine Core & Multi-Domain Ranking
// -----------------------------------------------------------------------------
console.log("[Suite 1] BM25 Search Engine Core & Ranking");

test("BM25 algorithm computes valid scores with Robertson-Spärck Jones IDF", () => {
  const bm25 = new BM25(1.5, 0.75);
  const docs = [
    "Clean minimal dental clinic healthcare appointment",
    "Modern high velocity AI SaaS platform dashboard",
    "Luxury gourmet Italian restaurant dining experience",
  ];
  bm25.fit(docs);

  const dentalScores = bm25.score("dental clinic");
  assert.equal(dentalScores[0].index, 0, "Dental query should rank document 0 highest");
  assert.ok(dentalScores[0].score > dentalScores[1].score, "Doc 0 score must exceed Doc 1");

  const saasScores = bm25.score("ai saas dashboard");
  assert.equal(saasScores[0].index, 1, "SaaS query should rank document 1 highest");
});

test("BM25 Style search returns top style candidates", () => {
  const styles = searchEngine.searchStyles("minimalism clean", 3);
  assert.ok(styles.results.length > 0, "Should return style results");
  const names = styles.results.map((s) => s["Style Category"].toLowerCase()).join(" ");
  assert.ok(names.includes("minimalism") || names.includes("swiss"), "Should hit minimalist/swiss styles");
});

test("BM25 Color search returns verified semantic palettes", () => {
  const colors = searchEngine.searchColors("dental healthcare", 3);
  assert.ok(colors.results.length > 0, "Should return color palettes");
  const p = colors.results[0];
  assert.ok(p.Primary && p.Background, "Palette must have Primary and Background");
});

test("BM25 Typography search returns font pairings with metadata", () => {
  const typo = searchEngine.searchTypography("tech modern clean", 3);
  assert.ok(typo.results.length > 0, "Should return typography results");
  const top = typo.results[0];
  assert.ok(top["Heading Font"] && top["Body Font"], "Must include Heading and Body fonts");
  assert.ok(top["Google Fonts URL"], "Must include Google Fonts URL");
});

test("BM25 Landing pattern search returns structured section orders", () => {
  const landing = searchEngine.searchLanding("Hero + Features + CTA", 2);
  assert.ok(landing.results.length > 0, "Should return landing patterns");
  assert.ok(landing.results[0]["Section Order"], "Must include Section Order");
});

test("BM25 Stack guidelines return Next.js and Tailwind best practices", () => {
  const nextStack = searchEngine.searchStack("app router server components", "nextjs", 3);
  assert.ok(nextStack.results.length > 0, "Should return Next.js stack guidelines");
  assert.ok(nextStack.results[0].Guideline, "Must include guideline text");
  assert.ok(nextStack.results[0].Do, "Must include Do instruction");
});

// -----------------------------------------------------------------------------
// Suite 2: Design Dials (Variance, Motion, Density)
// -----------------------------------------------------------------------------
console.log("\n[Suite 2] Design Dials (Variance, Motion, Density)");

test("Variance dial correctly maps low (1-3), mid (4-7), and high (8-10) tiers", () => {
  const low = resolveVariance(2);
  assert.equal(low.label, "Centered / Minimal");
  assert.ok(low.styleKeywords.includes("Minimalism"));

  const mid = resolveVariance(5);
  assert.equal(mid.label, "Balanced / Modern");

  const high = resolveVariance(9);
  assert.equal(high.label, "Bold / Asymmetric");
  assert.ok(high.styleKeywords.includes("Brutalism"));
});

test("Motion dial maps subtle, standard, and complex tiers with easing", () => {
  const subtle = resolveMotion(2);
  assert.equal(subtle.label, "Subtle");
  assert.equal(subtle.level, "subtle");
  assert.equal(subtle.durationBase, "200ms");

  const energetic = resolveMotion(8);
  assert.equal(energetic.label, "Complex");
  assert.equal(energetic.level, "energetic");
  assert.equal(energetic.durationBase, "450ms");
});

test("Density dial overrides spacing scale from spacious (1-3) to dense (8-10)", () => {
  const spacious = resolveDensity(2);
  assert.equal(spacious.label, "Spacious");
  assert.equal(spacious.spacing.md, "24px");

  const dense = resolveDensity(9);
  assert.equal(dense.label, "Dense / Dashboard");
  assert.equal(dense.spacing.md, "8px");
});

// -----------------------------------------------------------------------------
// Suite 3: Industry & Context Reasoning
// -----------------------------------------------------------------------------
console.log("\n[Suite 3] Industry & Context Reasoning");

test("Dental/Healthcare produces high-trust, calming recommendations with restrained dials", () => {
  const req = {
    intent: "create",
    business: { name: "Bright Smile Dental", industry: "dental", type: "dental clinic" },
    services: ["Cosmetic Dentistry", "Teeth Whitening", "Orthodontics"],
  };

  const ds = generateUiUxDesignSystem(req);
  assert.equal(ds.dials.variance, 2, "Dental variance must be subtle/centered (2)");
  assert.equal(ds.dials.motion, 2, "Dental motion must be subtle (2)");
  assert.equal(ds.dials.density, 2, "Dental density must be spacious (2)");
  assert.ok(
    ds.style.name.toLowerCase().includes("minimalism") || ds.style.name.toLowerCase().includes("swiss"),
    `Expected clean style for dental, got ${ds.style.name}`
  );
  assert.ok(ds.antiPatterns.length > 0, "Should include domain anti-patterns");
  assert.ok(ds.uxGuidelines.length > 0, "Should include domain UX guidelines");
});

test("Futuristic AI SaaS produces modern tech recommendation with bold dials", () => {
  const req = {
    intent: "create",
    business: { name: "HyperCognition AI", industry: "saas", type: "autonomous AI agents" },
    brand: { style: "bold modern" },
  };

  const ds = generateUiUxDesignSystem(req);
  assert.ok(ds.dials.variance >= 8, `SaaS variance should be high (>=8), got ${ds.dials.variance}`);
  assert.ok(ds.dials.motion >= 7, `SaaS motion should be standard/high (>=7), got ${ds.dials.motion}`);
  assert.ok(ds.pattern.sections.length >= 3, "Should include landing sections");
  assert.ok(ds.colors.primary, "Primary color must be populated");
});

test("E-commerce requirement produces conversion-focused pattern and higher density", () => {
  const req = {
    intent: "create",
    business: { name: "Urban Apparel", industry: "ecommerce", type: "clothing store" },
    functionality: { ecommerce: true },
  };

  const ds = generateUiUxDesignSystem(req);
  assert.ok(ds.dials.density >= 7, `E-commerce density should be dense (>=7), got ${ds.dials.density}`);
  assert.ok(
    ds.pattern.conversion.toLowerCase().includes("conversion") ||
    ds.pattern.conversion.toLowerCase().includes("action") ||
    ds.pattern.ctaPlacement.length > 0,
    "Expected conversion-oriented pattern details"
  );
});

test("Anti-patterns filter out contradictions based on active color mode", () => {
  const reqDark = {
    intent: "create",
    business: { name: "Midnight Analytics", industry: "saas", type: "developer telemetry" },
    designPreferences: { themeMode: "dark" },
  };

  const dsDark = generateUiUxDesignSystem(reqDark, { preferredMode: "dark" });
  for (const ap of dsDark.antiPatterns) {
    assert.ok(
      !ap.toLowerCase().includes("avoid dark mode") && !ap.toLowerCase().includes("don't use dark mode"),
      `Dark mode design system should not tell user to avoid dark mode: "${ap}"`
    );
  }
});

test("Design system is strictly deterministic for identical inputs", () => {
  const req = {
    intent: "create",
    business: { name: "Nova Health Clinic", industry: "dental", type: "dental clinic" },
    specialInstructions: ["modern clean layout"],
  };

  const ds1 = generateUiUxDesignSystem(req);
  const ds2 = generateUiUxDesignSystem(req);

  assert.equal(ds1.style.id, ds2.style.id, "Style ID must match");
  assert.equal(ds1.colors.primary, ds2.colors.primary, "Primary color must match");
  assert.equal(ds1.colors.background, ds2.colors.background, "Background color must match");
  assert.equal(ds1.pattern.name, ds2.pattern.name, "Pattern name must match");
  assert.equal(ds1.dials.variance, ds2.dials.variance, "Variance dial must match");
  assert.equal(ds1.dials.motion, ds2.dials.motion, "Motion dial must match");
});

// -----------------------------------------------------------------------------
// Suite 4: Master + Page Overrides Architecture
// -----------------------------------------------------------------------------
console.log("\n[Suite 4] Master + Page Overrides Architecture");

test("createProjectDesignSystem generates master package with page-specific overrides", () => {
  const req = {
    intent: "create",
    business: { name: "CloudScale SaaS", industry: "saas", type: "cloud infra" },
  };

  const pkg = createProjectDesignSystem(req, ["home", "pricing", "contact", "about"]);
  assert.ok(pkg.master, "Master design system must be present");
  assert.ok(pkg.pages.pricing, "Pricing page override must be present");
  assert.ok(pkg.pages.contact, "Contact page override must be present");

  assert.equal(pkg.pages.pricing.densityOverride, 7, "Pricing should have tight density for comparison");
  assert.equal(pkg.pages.contact.densityOverride, 3, "Contact should have spacious density for forms");
});

// -----------------------------------------------------------------------------
// Suite 5: Planner & Generator Integration
// -----------------------------------------------------------------------------
console.log("\n[Suite 5] Planner & Generator Integration");

test("createWebsitePlan executes UI/UX Pro Max and populates uiUxDesignSystem and designTokens", () => {
  const req = {
    intent: "create",
    business: { name: "Apex Cardiology", industry: "dental", type: "medical clinic" },
  };

  const plan = createWebsitePlan(req);
  assert.ok(plan.uiUxDesignSystem, "WebsitePlan must contain uiUxDesignSystem");
  assert.ok(plan.designTokens.uiUxDesignSystem, "DesignTokens must contain uiUxDesignSystem");
  assert.ok(plan.designTokens.colors.primary, "Primary color must be set");
  assert.ok(plan.designTokens.colors.card, "Card surface token must be set from UI/UX Pro Max");
  assert.ok(plan.designTokens.colors.ring, "Ring token must be set from UI/UX Pro Max");
});

test("createDesignPlan bridges motion level and theme mode from UI/UX Pro Max", () => {
  const req = {
    intent: "create",
    business: { name: "Vortex Labs", industry: "saas", type: "AI startup" },
  };

  const plan = createWebsitePlan(req);
  const designPlan = createDesignPlan(plan, req);

  assert.ok(designPlan.uiUxDesignSystem, "DesignPlan must contain uiUxDesignSystem");
  assert.ok(designPlan.motionLevel, "Motion level must be populated");
  assert.ok(designPlan.themeMode, "Theme mode must be populated");
});

test("selectComponents detects high variance/modern style to suggest 21st.dev components", () => {
  const req = {
    intent: "create",
    business: { name: "Nexus Quantum AI", industry: "saas", type: "quantum computing platform" },
    brand: { style: "modern futuristic" },
  };

  const plan = createWebsitePlan(req);
  const designPlan = createDesignPlan(plan, req);
  const compPlan = selectComponents(designPlan, req);

  assert.ok(compPlan.components.length > 0, "Should generate components");
  const has21st = compPlan.components.some((c) => c.startsWith("21st:"));
  assert.ok(has21st, "High variance AI SaaS should naturally recommend 21st components");
});

test("generateComponents applies UI/UX Pro Max tokens into Website.tsx CSS variables", () => {
  const req = {
    intent: "create",
    business: { name: "Veritas Legal", industry: "local_service", type: "corporate law firm" },
  };

  const plan = createWebsitePlan(req);
  const designPlan = createDesignPlan(plan, req);
  const compPlan = selectComponents(designPlan, req);
  const result = generateComponents(req, compPlan, plan, designPlan);

  assert.ok(result.files.includes("Website.tsx"), "Website.tsx must be generated");
  assert.ok(result.tokensApplied.primaryColor, "Tokens applied must list primary color");
  assert.ok(result.tokensApplied.headingFont, "Tokens applied must list heading font");
});

console.log("\n================================================================================");
console.log(`UI/UX PRO MAX VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log("================================================================================\n");

if (failed > 0) {
  process.exit(1);
}
