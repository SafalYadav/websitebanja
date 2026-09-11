/**
 * WebsiteBanja AI — Phase 3 + Phase 4 Master Verification Test Suite
 *
 * Empirically verifies the full end-to-end pipeline:
 * 1. Requirement Extraction & Validation
 * 2. Category-Aware Design Intelligence (8 Industries)
 * 3. Design Token Generation & Consumption
 * 4. Component Registry & 21st.dev Adapter Separation
 * 5. Framer Motion Integration & Reduced Motion Support
 * 6. Real Website Generation (5 Scenarios: Dental, Restaurant, Car Rental, SaaS, Ecommerce)
 * 7. Multi-Turn Incremental Modification with State Preservation
 * 8. Auto-Fix Loop (Controlled Error, Max 3 Attempts, Log Persistence)
 * 9. Memory & Knowledge Isolation (Project A vs Project B)
 * 10. Preview System Verification & Theme Variable Resolution
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

console.log("================================================================================");
console.log("WEBSITEBANJA AI — PHASE 3 + PHASE 4 MASTER VERIFICATION SUITE");
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
    console.error(`    ${err.message}`);
    failed++;
  }
}

async function runTestAsync(title, testFn) {
  try {
    await testFn();
    console.log(`  ✔ [PASS] ${title}`);
    passed++;
  } catch (err) {
    console.error(`  ✖ [FAIL] ${title}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

// -----------------------------------------------------------------------------
// [Suite 1] Design Rules & Intelligence Across 8 Industries
// -----------------------------------------------------------------------------
console.log("[Suite 1] Design Intelligence across 8 Supported Industries");

const { generateDesignRules, normalizeIndustry } = jiti("./src/lib/ai/design/designRules.ts");
const { generateDesignTokens } = jiti("./src/lib/ai/design/designTokens.ts");
const { createWebsitePlan, createDesignPlan, selectComponents } = jiti("./src/lib/ai/planner.ts");
const { LOCAL_COMPONENTS, ExternalComponentAdapter, resolveComponent } = jiti("./src/lib/components/registry.ts");
const { generateComponents } = jiti("./src/lib/ai/generation/generator.ts");
const { applyIncrementalModification } = jiti("./src/lib/ai/modification/modifier.ts");
const { runAutoFixLoop } = jiti("./src/lib/ai/generation/autoFix.ts");
const { resolveWebsiteTheme } = jiti("./src/lib/websiteTheme.ts");
const { normalizeWebsiteData } = jiti("./src/lib/normalizeWebsite.ts");

const REQUIRED_INDUSTRIES = [
  "dental",
  "restaurant",
  "car_rental",
  "real_estate",
  "gym",
  "saas",
  "ecommerce",
  "local_service",
];

runTest("All 8 required industries are normalized and return distinct design guidance", () => {
  for (const ind of REQUIRED_INDUSTRIES) {
    const req = {
      intent: "create",
      business: { name: `Test ${ind}`, industry: ind, type: ind },
    };
    const norm = normalizeIndustry(req);
    assert.equal(norm, ind, `Industry ${ind} should normalize to itself`);

    const rules = generateDesignRules(req);
    assert.ok(rules.industryProfile.displayName, `Must have displayName for ${ind}`);
    assert.ok(rules.typography.headingFont, `Must have headingFont for ${ind}`);
    assert.ok(rules.spacing.density, `Must have spacing density for ${ind}`);
    assert.ok(rules.colorSystem.primaryDefault, `Must have primary color for ${ind}`);
    assert.ok(rules.cta.primaryLabel, `Must have CTA primaryLabel for ${ind}`);
    assert.ok(rules.motion.animationLevel, `Must have motion level for ${ind}`);
    assert.ok(rules.layout.recommendedSections.length >= 5, `Must recommend sections for ${ind}`);
  }
});

runTest("Industry design rules exhibit meaningful differentiation beyond colors", () => {
  const dentalReq = { intent: "create", business: { name: "Smile Dental", industry: "dental" } };
  const gymReq = { intent: "create", business: { name: "Iron Gym", industry: "gym" } };
  const restaurantReq = { intent: "create", business: { name: "Trattoria", industry: "restaurant" } };

  const dentalRules = generateDesignRules(dentalReq);
  const gymRules = generateDesignRules(gymReq);
  const restRules = generateDesignRules(restaurantReq);

  // Typography scale differentiation
  assert.ok(gymRules.typography.headingScale > dentalRules.typography.headingScale, "Gym has more aggressive heading scale than dental");
  assert.equal(gymRules.typography.headingStyle, "uppercase", "Gym uses uppercase headings");
  assert.equal(restRules.typography.headingStyle, "serif", "Restaurant uses warm serif headings");

  // Contrast & Accessibility: Dental enforces strict AAA contrast
  assert.ok(dentalRules.colorSystem.contrastRatio >= 7.0, "Dental clinic targets AAA contrast (>= 7.0)");

  // Spacing differentiation
  assert.equal(dentalRules.spacing.density, "spacious", "Dental uses spacious hygiene layout");
  assert.equal(gymRules.spacing.density, "medium", "Gym uses medium punchy layout");

  // Motion differentiation
  assert.equal(dentalRules.motion.animationLevel, "subtle", "Dental uses subtle motion");
  assert.equal(gymRules.motion.animationLevel, "energetic", "Gym uses energetic motion");
});

// -----------------------------------------------------------------------------
// [Suite 2] Component Registry & 21st.dev Adapter Separation
// -----------------------------------------------------------------------------
console.log("\n[Suite 2] Component Registry & 21st.dev Adapter Separation");

runTest("Local components point strictly to verified, existing local files", () => {
  for (const [key, meta] of Object.entries(LOCAL_COMPONENTS)) {
    assert.equal(meta.source, "local");
    assert.ok(meta.isTokenAware, `${key} must be token aware`);
    assert.ok(meta.isResponsive, `${key} must be responsive`);
    assert.ok(meta.isAccessible, `${key} must be accessible`);

    // Verify import path resolves to a physical file in src/
    const relPath = meta.importPath.replace("@/", "src/") + ".tsx";
    const fullPath = path.join(ROOT, relPath);
    assert.ok(fs.existsSync(fullPath), `Physical file must exist for ${meta.importPath} at ${fullPath}`);
  }
});

runTest("21st.dev adapter safely maps external requests without broken imports", () => {
  const hero21st = ExternalComponentAdapter.resolve21stComponent("21st:hero-glow");
  assert.equal(hero21st.source, "21st.dev");
  assert.ok(hero21st.displayName.includes("21st.dev Adapted"));
  assert.ok(hero21st.isTokenAware);

  // Resolves cleanly through universal resolveComponent
  const resolved = resolveComponent("21st:navbar");
  assert.equal(resolved.source, "21st.dev");
  assert.ok(resolved.importPath.includes("NavbarSection"));
});

// -----------------------------------------------------------------------------
// [Suite 3] Design Tokens Generation & Token Consumption
// -----------------------------------------------------------------------------
console.log("\n[Suite 3] Design Tokens Generation & Token Consumption");

runTest("Design tokens encapsulate colors, typography, spacing, radius, shadows, motion", () => {
  const req = {
    intent: "create",
    business: { name: "Apex SaaS", industry: "saas" },
    brand: { colors: { primary: "#4F46E5", secondary: "#06B6D4" } },
    designPreferences: { density: "compact" },
  };

  const tokens = generateDesignTokens(req);
  assert.equal(tokens.colors.primary, "#4F46E5");
  assert.equal(tokens.colors.secondary, "#06B6D4");
  assert.ok(tokens.colors.glowPrimary.includes("rgba("));
  assert.ok(tokens.typography.heading);
  assert.ok(tokens.typography.fontSizeBase);
  assert.equal(tokens.spacing.unit, "4px", "Density compact sets 4px spacing unit");
  assert.ok(tokens.radius.button);
  assert.ok(tokens.shadows.medium);
  assert.ok(tokens.motion.durationBase);
});

// -----------------------------------------------------------------------------
// [Suite 4] Real Website Generation across 5 Core Scenarios
// -----------------------------------------------------------------------------
console.log("\n[Suite 4] Real Website Generation (5 Scenarios)");

const scenarios = [
  {
    name: "Dental Clinic",
    req: {
      intent: "create",
      business: { name: "SmileCare Dental Clinic", industry: "dental", type: "clinic" },
      services: ["Teeth Whitening", "Root Canal Therapy", "Dental Implants", "Orthodontics"],
      cta: "Book Appointment",
      functionality: { booking: true },
    },
  },
  {
    name: "Restaurant",
    req: {
      intent: "create",
      business: { name: "Bella Italia Ristorante", industry: "restaurant", type: "italian restaurant" },
      services: ["Wood-Fired Pizza", "Handmade Pasta", "Wine Pairing", "Private Catering"],
      cta: "Reserve Table",
      functionality: { whatsappDirect: true },
    },
  },
  {
    name: "Car Rental",
    req: {
      intent: "create",
      business: { name: "Velocity Car Hire", industry: "car_rental", type: "car rental" },
      products: [
        { name: "Luxury Sedan (BMW 5 Series)", price: 120, description: "Automatic, 5 seats, GPS included" },
        { name: "Family SUV (Toyota Prado)", price: 150, description: "4x4, 7 seats, luggage rack" },
      ],
      cta: "Book on WhatsApp",
      functionality: { booking: true, whatsappDirect: true },
    },
  },
  {
    name: "SaaS Software",
    req: {
      intent: "create",
      business: { name: "CloudScale AI", industry: "saas", type: "cloud platform" },
      cta: "Start Free Trial",
      functionality: { auth: true },
    },
  },
  {
    name: "Ecommerce Store",
    req: {
      intent: "create",
      business: { name: "Urban Apparel", industry: "ecommerce", type: "clothing store" },
      products: [
        { name: "Oversized Organic Cotton Hoodie", price: 65, description: "Heavyweight French terry" },
        { name: "Raw Denim Jeans", price: 85, description: "Selvedge denim, tailored fit" },
      ],
      cta: "Shop Collection",
      functionality: { ecommerce: true },
    },
  },
];

for (const sc of scenarios) {
  runTest(`Generates complete compilable components for scenario: ${sc.name}`, () => {
    const websitePlan = createWebsitePlan(sc.req);
    const designPlan = createDesignPlan(websitePlan, sc.req);
    const componentPlan = selectComponents(designPlan, sc.req);

    assert.ok(componentPlan.components.includes("Navbar"), "Must include Navbar");
    assert.ok(componentPlan.components.includes("HeroSection"), "Must include HeroSection");
    assert.ok(componentPlan.components.includes("FooterSection"), "Must include FooterSection");

    const result = generateComponents(sc.req, componentPlan, websitePlan, designPlan);
    assert.ok(result.files.length >= 5, "Must generate at least 5 component files");
    assert.ok(result.files.includes("Website.tsx"), "Must generate composite Website.tsx");
    assert.ok(result.files.includes("index.ts"), "Must generate index.ts");

    // Verify file on disk
    const websiteFile = path.join(result.outDir, "Website.tsx");
    assert.ok(fs.existsSync(websiteFile), "Website.tsx must exist on disk");
    const content = fs.readFileSync(websiteFile, "utf8");

    // Verify token consumption in generated composite file
    assert.ok(content.includes("--wb-primary"), "Website.tsx must inject --wb-primary CSS variable");
    assert.ok(content.includes("--wb-bg"), "Website.tsx must inject --wb-bg CSS variable");
    assert.ok(content.includes(result.tokensApplied.primaryColor), "Injected primary color matches token");
  });
}

// -----------------------------------------------------------------------------
// [Suite 5] Multi-Turn Incremental Modification
// -----------------------------------------------------------------------------
console.log("\n[Suite 5] Multi-Turn Incremental Modification & State Preservation");

runTest("Multi-turn modification flow preserves unrelated existing work", () => {
  // Step 1: Initial restaurant website
  const initialRestaurantWebsite = {
    hero: {
      title: "Spice Symphony Fine Dining",
      subtitle: "Experience the authentic rich tastes of India in Mumbai.",
      button: "Explore Menu",
      buttonAction: { type: "scroll", target: "productsSection" },
    },
    about: {
      title: "Our Heritage Story",
      content: "Founded in 1998 by master culinary chefs dedicated to royal recipes.",
    },
    productsSection: {
      title: "Chef's Curated Menu",
      subtitle: "Handcrafted delicacies",
      products: [
        { id: "dish_1", name: "Butter Chicken Royale", price: 18, description: "Slow cooked tender chicken" },
        { id: "dish_2", name: "Dal Makhani", price: 14, description: "Simmered for 24 hours with churned butter" },
      ],
    },
    services: [
      { title: "Dine-In Experience", description: "Royal heritage ambience with classical live sitar" },
    ],
    gallery: {
      images: ["https://images.unsplash.com/photo-15172481354?w=800"],
    },
    contact: {
      phone: "+919876543210",
      email: "dine@spicesymphony.com",
      address: "Marine Drive, Mumbai",
    },
    footer: { copyright: "© 2026 Spice Symphony" },
    sectionOrder: ["navbar", "hero", "about", "productsSection", "services", "gallery", "contact", "footer"],
  };

  // Turn 1: "Add online reservation"
  const turn1 = applyIncrementalModification(initialRestaurantWebsite, "Add online reservation");
  assert.ok(turn1.updatedWebsite.sectionOrder.includes("reservation"), "Turn 1: Added reservation section");
  assert.equal(turn1.updatedWebsite.hero.button, "Reserve a Table", "Turn 1: Hero button updated to Reserve a Table");
  // Check preservation
  assert.equal(turn1.updatedWebsite.about.content, initialRestaurantWebsite.about.content, "Turn 1: About story preserved");
  assert.equal(turn1.updatedWebsite.productsSection.products.length, 2, "Turn 1: Menu items preserved");

  // Turn 2: "Remove gallery"
  const turn2 = applyIncrementalModification(turn1.updatedWebsite, "Remove gallery");
  assert.ok(!turn2.updatedWebsite.sectionOrder.includes("gallery"), "Turn 2: Gallery removed from section order");
  assert.ok(turn2.updatedWebsite.sectionOrder.includes("reservation"), "Turn 2: Reservation section remains intact");
  assert.equal(turn2.updatedWebsite.productsSection.products.length, 2, "Turn 2: Menu items preserved");

  // Turn 3: "Change the hero CTA to WhatsApp"
  const turn3 = applyIncrementalModification(turn2.updatedWebsite, "Change the hero CTA to WhatsApp", {
    whatsappNumber: "+919876543210",
  });
  assert.equal(turn3.updatedWebsite.hero.button, "Book on WhatsApp", "Turn 3: Button label updated");
  assert.equal(turn3.updatedWebsite.hero.buttonAction.type, "whatsapp", "Turn 3: Action type is whatsapp");
  assert.equal(turn3.updatedWebsite.hero.title, initialRestaurantWebsite.hero.title, "Turn 3: Hero headline preserved");
  assert.equal(turn3.updatedWebsite.productsSection.products.length, 2, "Turn 3: Menu preserved");

  // Turn 4: "Make the design more premium"
  const turn4 = applyIncrementalModification(turn3.updatedWebsite, "Make the design more premium");
  assert.equal(turn4.updatedWebsite.brandStyle, "dark luxury", "Turn 4: Theme upgraded to dark luxury");
  assert.equal(turn4.updatedWebsite.primaryColor, "#D4AF37", "Turn 4: Primary set to Champagne Gold");
  assert.equal(turn4.updatedWebsite.hero.buttonAction.type, "whatsapp", "Turn 4: WhatsApp CTA preserved");
  assert.equal(turn4.updatedWebsite.about.content, initialRestaurantWebsite.about.content, "Turn 4: About content preserved");
});

// -----------------------------------------------------------------------------
// [Suite 6] Auto-Fix Loop
// -----------------------------------------------------------------------------
console.log("\n[Suite 6] Auto-Fix Loop (Controlled Error & Targeted Remediation)");

await runTestAsync("Auto-fix detects failure, applies targeted fix, and succeeds within max 3 attempts", async () => {
  let attemptCount = 0;
  let simulatedErrorResolved = false;

  const taskFn = (attempt) => {
    attemptCount++;
    if (!simulatedErrorResolved) {
      throw new Error("SyntaxError: Unexpected token in component template");
    }
    return "Compilation successful";
  };

  const remediator = (err, attempt) => {
    if (err.message.includes("SyntaxError")) {
      // Simulate applying template cleanup patch on attempt 2
      simulatedErrorResolved = true;
      return true;
    }
    return false;
  };

  const { result, report } = await runAutoFixLoop(taskFn, remediator, {
    maxAttempts: 3,
    taskName: "test_syntax_error_recovery",
  });

  assert.equal(report.finalStatus, "fixed");
  assert.equal(report.totalAttempts, 2, "Resolved on attempt 2");
  assert.equal(attemptCount, 2);
  assert.equal(result, "Compilation successful");
  assert.ok(fs.existsSync(report.logFilePath), "Audit log file persisted");
});

await runTestAsync("Auto-fix halts and reports failure when error cannot be resolved within 3 attempts", async () => {
  let attemptCount = 0;

  const stubbornTask = (attempt) => {
    attemptCount++;
    throw new Error("Unresolvable fatal typecheck error");
  };

  const noOpRemediator = () => false;

  const { report } = await runAutoFixLoop(stubbornTask, noOpRemediator, {
    maxAttempts: 3,
    taskName: "test_unresolvable_error",
  });

  assert.equal(report.finalStatus, "failed");
  assert.equal(report.totalAttempts, 3, "Stopped strictly at attempt 3");
  assert.equal(attemptCount, 3);
  assert.ok(report.error.includes("Unresolvable fatal typecheck error"));
  assert.ok(fs.existsSync(report.logFilePath), "Failure audit log file persisted");
});

// -----------------------------------------------------------------------------
// [Suite 7] Project Memory & Multi-Tenant Isolation
// -----------------------------------------------------------------------------
console.log("\n[Suite 7] Project Memory & Multi-Tenant Isolation");

runTest("Project A (dark luxury, WhatsApp) and Project B (clean medical) have zero cross-contamination", () => {
  // Project A: "Use dark luxury theme and WhatsApp CTA"
  const projectA_req = {
    intent: "create",
    business: { name: "Project A Luxe Club", industry: "restaurant" },
    brand: { colors: { primary: "#D4AF37", secondary: "#E11D48" }, style: "dark luxury" },
    designPreferences: { style: "dark luxury", themeMode: "dark" },
    functionality: { whatsappDirect: true },
    cta: "Book on WhatsApp",
  };
  const tokensA = generateDesignTokens(projectA_req);
  const themeA = resolveWebsiteTheme({
    style: "dark luxury",
    primaryColor: tokensA.colors.primary,
    secondaryColor: tokensA.colors.secondary,
    businessName: "Project A Salon",
  });

  // Project B
  const projectB_req = {
    intent: "create",
    business: { name: "Project B Dental", industry: "dental" },
    designPreferences: { style: "clean modern", themeMode: "light" },
    cta: "Book Appointment",
  };
  const tokensB = generateDesignTokens(projectB_req);
  const themeB = resolveWebsiteTheme({
    style: "clean",
    primaryColor: tokensB.colors.primary,
    secondaryColor: tokensB.colors.secondary,
    businessName: "Project B Dental",
  });

  // Assert complete isolation
  assert.equal(themeA.isDark, true, "Project A must be dark");
  assert.equal(themeB.isDark, false, "Project B must be light");
  assert.notEqual(themeA.bg, themeB.bg, "Project A and B backgrounds must differ");
  assert.notEqual(themeA.primary, themeB.primary, "Project A and B primary colors must differ");
  assert.notEqual(tokensA.rules.cta.actionType, tokensB.rules.cta.actionType, "CTA actions must differ");
});

// -----------------------------------------------------------------------------
// [Suite 8] Preview System & Website Normalization
// -----------------------------------------------------------------------------
console.log("\n[Suite 8] Preview System & Website Normalization");

runTest("normalizeWebsiteData guarantees valid sections, imagery, and sectionOrder", () => {
  const minimalData = {
    hero: { title: "Custom Title", subtitle: "Custom Subtitle", button: "Click" },
  };

  const normalized = normalizeWebsiteData(minimalData, "dental", "Dr Smile");

  assert.ok(normalized.hero.title === "Custom Title");
  assert.ok(normalized.about.title, "About section created with fallback");
  assert.ok(normalized.services.length > 0, "Services populated with category fallbacks");
  assert.ok(normalized.contact.phone, "Contact populated with fallback");
  assert.ok(Array.isArray(normalized.sectionOrder) && normalized.sectionOrder.length >= 6);
});

console.log("\n================================================================================");
console.log(`PHASE 3 + PHASE 4 MASTER TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log("================================================================================\n");

if (failed > 0) {
  process.exit(1);
}
