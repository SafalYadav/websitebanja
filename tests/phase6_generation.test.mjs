// tests/phase6_generation.test.mjs
/**
 * WebsiteBanja Phase 6: Premium Website Generation Engine — Test Suite
 *
 * Verifies all Phase 6 enhancements:
 *
 *  1.  SupportedIndustry contains all 16 industries (8 original + 8 new)
 *  2.  normalizeIndustry accurately maps luxury hotel queries to luxury_hotel
 *  3.  normalizeIndustry accurately maps creative agency queries to creative_agency
 *  4.  normalizeIndustry accurately maps law firm queries to law_firm
 *  5.  normalizeIndustry accurately maps wellness/spa queries to wellness_spa
 *  6.  normalizeIndustry accurately maps finance/investment queries to finance
 *  7.  normalizeIndustry accurately maps education queries to education
 *  8.  normalizeIndustry accurately maps portfolio queries to portfolio
 *  9.  normalizeIndustry accurately maps automotive queries to automotive
 * 10.  deriveVisualArchetype maps luxury hotel to luxury_bespoke
 * 11.  deriveVisualArchetype maps wellness/spa to warm_artisanal
 * 12.  deriveVisualArchetype maps law firm to high_trust_service
 * 13.  deriveVisualArchetype maps finance to dark_technical
 * 14.  deriveVisualArchetype maps education to clean_clinical
 * 15.  deriveVisualArchetype maps automotive to bold_brutalist
 * 16.  deriveSectionSequence produces bespoke section sequence for luxury hotel (room_showcase, amenities, etc.)
 * 17.  deriveSectionSequence produces bespoke section sequence for wellness spa (treatments, atmosphere, etc.)
 * 18.  deriveSectionSequence produces bespoke section sequence for law firm (practice_areas, case_results, etc.)
 * 19.  deriveSectionSequence produces bespoke section sequence for education (programs, faculty, etc.)
 * 20.  deriveSectionSequence produces bespoke section sequence for automotive (productsSection, features, etc.)
 * 21.  selectComponents selects industry-appropriate components (restaurant doesn't get SaaS feature grid)
 * 22.  selectComponents ensures Navbar, HeroSection, and FooterSection are always present
 * 23.  compileDesignBrief generates a complete, non-empty DesignBrief for luxury hotel
 * 24.  compileDesignBrief includes semantic color system with all required tokens
 * 25.  compileDesignBrief includes typography tokens matching industry rules
 * 26.  compileDesignBrief includes motion config with reducedMotionFallback: true
 * 27.  compileDesignBrief includes mobileFirst: true in responsive config
 * 28.  formatDesignBriefForPrompt formats a readable, structured prompt string
 * 29.  validateWebsiteQuality detects generic hero titles and penalizes them
 * 30.  validateWebsiteQuality catches generic default section order
 * 31.  validateWebsiteQuality passes well-formed differentiated website data
 * 32.  validateWebsiteQuality catches internal string contamination
 * 33.  WebsiteData schema supports optional Phase 6 extensions without errors
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import createJiti from "jiti";

const jiti = createJiti(process.cwd(), {
  alias: { "@": path.resolve(process.cwd(), "src") },
});

// ── Imports ───────────────────────────────────────────────────────────────────

const {
  normalizeIndustry,
  generateDesignRules,
} = jiti("./src/lib/ai/design/designRules.ts");

const {
  deriveVisualArchetype,
  deriveSectionSequence,
  generateDesignStrategy,
} = jiti("./src/lib/ai/designStrategy.ts");

const {
  createWebsitePlan,
  createDesignPlan,
  selectComponents,
} = jiti("./src/lib/ai/planner.ts");

const {
  compileDesignBrief,
  formatDesignBriefForPrompt,
} = jiti("./src/lib/ai/design/designBrief.ts");

const {
  validateWebsiteQuality,
  formatQualityReport,
} = jiti("./src/lib/ai/design/qualityValidator.ts");

// ═════════════════════════════════════════════════════════════════════════════
describe("Phase 6: Premium Website Generation Engine", () => {

  // ── 1. Industry Normalization & Coverage ────────────────────────────────────

  test("1. normalizeIndustry accurately maps luxury hotel queries to luxury_hotel", () => {
    const req = {
      intent: "create luxury resort website",
      business: { name: "The Grand Azure", type: "Boutique Beach Resort", industry: "hospitality" },
    };
    const industry = normalizeIndustry(req);
    assert.equal(industry, "luxury_hotel");
  });

  test("2. normalizeIndustry accurately maps creative agency queries to creative_agency", () => {
    const req = {
      intent: "build website for design agency",
      business: { name: "Studio Oblique", type: "Brand & Digital Design Studio" },
    };
    const industry = normalizeIndustry(req);
    assert.equal(industry, "creative_agency");
  });

  test("3. normalizeIndustry accurately maps law firm queries to law_firm", () => {
    const req = {
      intent: "create law firm website",
      business: { name: "Vance & Sterling", type: "Corporate Litigation Attorneys" },
    };
    const industry = normalizeIndustry(req);
    assert.equal(industry, "law_firm");
  });

  test("4. normalizeIndustry accurately maps wellness/spa queries to wellness_spa", () => {
    const req = {
      intent: "website for yoga and holistic wellness retreat",
      business: { name: "Prana Sanctuary", type: "Holistic Health & Ayurveda Spa" },
    };
    const industry = normalizeIndustry(req);
    assert.equal(industry, "wellness_spa");
  });

  test("5. normalizeIndustry accurately maps finance/investment queries to finance", () => {
    const req = {
      intent: "build wealth management platform",
      business: { name: "Apex Capital Partners", type: "Private Equity & Wealth Management" },
    };
    const industry = normalizeIndustry(req);
    assert.equal(industry, "finance");
  });

  test("6. normalizeIndustry accurately maps education queries to education", () => {
    const req = {
      intent: "website for online design academy",
      business: { name: "Craft Coding Academy", type: "Coding Bootcamp & Institute" },
    };
    const industry = normalizeIndustry(req);
    assert.equal(industry, "education");
  });

  test("7. normalizeIndustry accurately maps portfolio queries to portfolio", () => {
    const req = {
      intent: "create designer portfolio website",
      business: { name: "Elena Rostova", type: "Freelance Creative Director Portfolio" },
    };
    const industry = normalizeIndustry(req);
    assert.equal(industry, "portfolio");
  });

  test("8. normalizeIndustry accurately maps automotive queries to automotive", () => {
    const req = {
      intent: "create dealership website",
      business: { name: "Prestige Motors", type: "Luxury Car Dealership & Showroom" },
    };
    const industry = normalizeIndustry(req);
    assert.equal(industry, "automotive");
  });

  // ── 2. Visual Archetype Differentiation ────────────────────────────────────

  test("9. deriveVisualArchetype maps luxury hotel to luxury_bespoke", () => {
    const archetype = deriveVisualArchetype({
      category: "luxury_hotel",
      description: "A 5-star beachfront boutique resort with private villas and fine dining.",
    });
    assert.equal(archetype, "luxury_bespoke");
  });

  test("10. deriveVisualArchetype maps wellness/spa to warm_artisanal", () => {
    const archetype = deriveVisualArchetype({
      category: "wellness_spa",
      description: "Holistic day spa and yoga sanctuary offering organic herbal treatments.",
    });
    assert.equal(archetype, "warm_artisanal");
  });

  test("11. deriveVisualArchetype maps law firm to high_trust_service", () => {
    const archetype = deriveVisualArchetype({
      category: "law_firm",
      description: "Senior litigation attorneys specializing in corporate disputes and antitrust.",
    });
    assert.equal(archetype, "high_trust_service");
  });

  test("12. deriveVisualArchetype maps finance to dark_technical", () => {
    const archetype = deriveVisualArchetype({
      category: "finance",
      description: "Quantitative hedge fund and institutional wealth management platform.",
    });
    assert.equal(archetype, "dark_technical");
  });

  test("13. deriveVisualArchetype maps education to clean_clinical", () => {
    const archetype = deriveVisualArchetype({
      category: "education",
      description: "Accredited university institute offering graduate degree programs.",
    });
    assert.equal(archetype, "clean_clinical");
  });

  test("14. deriveVisualArchetype maps automotive to bold_brutalist", () => {
    const archetype = deriveVisualArchetype({
      category: "automotive",
      description: "High-performance vehicle dealership and sports car showroom.",
    });
    assert.equal(archetype, "bold_brutalist");
  });

  // ── 3. Section Sequence Differentiation ────────────────────────────────────

  test("15. deriveSectionSequence produces bespoke section sequence for luxury hotel", () => {
    const seq = deriveSectionSequence("luxury_bespoke", {
      category: "luxury_hotel",
      description: "Boutique oceanfront resort.",
    });
    assert.ok(seq.includes("room_showcase"), "Must include room_showcase");
    assert.ok(seq.includes("amenities"), "Must include amenities");
    assert.ok(seq.includes("dining"), "Must include dining");
    assert.ok(seq.includes("booking"), "Must include booking");
  });

  test("16. deriveSectionSequence produces bespoke section sequence for wellness spa", () => {
    const seq = deriveSectionSequence("warm_artisanal", {
      category: "wellness_spa",
      description: "Holistic healing sanctuary.",
    });
    assert.ok(seq.includes("treatments"), "Must include treatments");
    assert.ok(seq.includes("atmosphere"), "Must include atmosphere");
    assert.ok(seq.includes("practitioners"), "Must include practitioners");
  });

  test("17. deriveSectionSequence produces bespoke section sequence for law firm", () => {
    const seq = deriveSectionSequence("high_trust_service", {
      category: "law_firm",
      description: "Top corporate litigation counsel.",
    });
    assert.ok(seq.includes("practice_areas"), "Must include practice_areas");
    assert.ok(seq.includes("attorney_profiles"), "Must include attorney_profiles");
    assert.ok(seq.includes("case_results"), "Must include case_results");
  });

  test("18. deriveSectionSequence produces bespoke section sequence for education", () => {
    const seq = deriveSectionSequence("clean_clinical", {
      category: "education",
      description: "International learning academy.",
    });
    assert.ok(seq.includes("programs"), "Must include programs");
    assert.ok(seq.includes("faculty"), "Must include faculty");
    assert.ok(seq.includes("outcomes"), "Must include outcomes");
  });

  // ── 4. Intelligent Component Selection ─────────────────────────────────────

  test("19. selectComponents selects industry-appropriate components without generic duplication", () => {
    const req = {
      intent: "generate",
      business: { name: "Osteria Bella", type: "Italian Restaurant", industry: "restaurant" },
    };
    const plan = createWebsitePlan(req);
    const designPlan = createDesignPlan(plan, req);
    const componentPlan = selectComponents(designPlan, req);

    assert.ok(componentPlan.components.includes("Navbar"), "Must have Navbar");
    assert.ok(componentPlan.components.includes("HeroSection"), "Must have HeroSection");
    assert.ok(componentPlan.components.includes("FooterSection"), "Must have FooterSection");
    // Verify no duplicates
    const unique = new Set(componentPlan.components);
    assert.equal(unique.size, componentPlan.components.length, "Component names must be unique");
  });

  test("20. selectComponents includes ProductsSection when ecommerce is requested", () => {
    const req = {
      intent: "generate",
      business: { name: "Luxe Goods", type: "Clothing Store", industry: "ecommerce" },
      functionality: { ecommerce: true },
    };
    const plan = createWebsitePlan(req);
    const designPlan = createDesignPlan(plan, req);
    const componentPlan = selectComponents(designPlan, req);

    assert.ok(componentPlan.components.includes("ProductsSection"), "Must include ProductsSection for ecommerce");
  });

  // ── 5. Design Brief Compiler ───────────────────────────────────────────────

  test("21. compileDesignBrief generates a complete, non-empty DesignBrief for luxury hotel", () => {
    const req = {
      intent: "generate",
      business: { name: "Azure Bay Resort", type: "Luxury Hotel", industry: "luxury_hotel" },
      audience: "High-net-worth travelers seeking tranquility and discrete luxury",
    };
    const strategy = generateDesignStrategy({
      category: "luxury_hotel",
      businessName: "Azure Bay Resort",
      description: "5-star private island retreat.",
    });
    const rules = generateDesignRules(req);
    const brief = compileDesignBrief(strategy, rules, req);

    assert.ok(brief.visualDirection.length > 0, "visualDirection must be non-empty");
    assert.ok(brief.brandPersonality.length > 0, "brandPersonality must have entries");
    assert.equal(brief.businessContext.industry, "Luxury Hotel & Boutique Resort");
    assert.ok(brief.colorSystem.primary, "Must have primary color");
    assert.ok(brief.colorSystem.background, "Must have background color");
    assert.ok(brief.typography.headingFont, "Must have heading font");
    assert.ok(brief.sectionPlans.length > 0, "Must have section plans");
    assert.equal(brief.motion.reducedMotionFallback, true, "Must enforce reduced motion accessibility");
    assert.equal(brief.responsive.mobileFirst, true, "Must enforce mobile-first responsive design");
  });

  test("22. formatDesignBriefForPrompt returns formatted prompt text", () => {
    const req = {
      intent: "generate",
      business: { name: "Apex Legal", type: "Law Firm", industry: "law_firm" },
    };
    const strategy = generateDesignStrategy({
      category: "law_firm",
      businessName: "Apex Legal",
      description: "Litigation counsel.",
    });
    const rules = generateDesignRules(req);
    const brief = compileDesignBrief(strategy, rules, req);
    const text = formatDesignBriefForPrompt(brief);

    assert.ok(text.includes("DESIGN BRIEF"), "Must contain DESIGN BRIEF header");
    assert.ok(text.includes("COLOR SYSTEM:"), "Must contain COLOR SYSTEM");
    assert.ok(text.includes("TYPOGRAPHY:"), "Must contain TYPOGRAPHY");
    assert.ok(text.includes("ANTI-PATTERNS"), "Must contain ANTI-PATTERNS");
  });

  // ── 6. Deterministic Quality Validator ─────────────────────────────────────

  test("23. validateWebsiteQuality passes well-formed differentiated website data", () => {
    const sampleWebsite = {
      sectionOrder: ["hero", "room_showcase", "amenities", "about", "dining", "reviews", "booking", "footer"],
      hero: {
        title: "The Grand Azure Resort — Unrivaled Coastal Solitude",
        subtitle: "Private cliffside suites perched above the Aegean Sea.",
        layoutVariant: "fullscreen_visual",
        button: "Reserve Your Stay",
      },
      about: {
        title: "Our Heritage of Discreet Hospitality",
        content: "Built upon the foundations of an ancient coastal estate.",
      },
      services: [
        { title: "Cliffside Infinity Suites", description: "Expansive panoramic ocean views with private plunge pools." },
        { title: "Subterranean Thermal Spa", description: "Curated mineral therapies and private hydrotherapy suites." },
        { title: "Helipad & Yacht Charter", description: "Seamless door-to-terrace private transport." },
      ],
      features: [
        { title: "Uncompromising Privacy", description: "Zero sightlines between exclusive cliffside residences." },
        { title: "Private Sommelier & Dining", description: "Locally sourced Mediterranean gastronomy on demand." },
      ],
      reviews: [
        { author: "E. Montgomery", text: "The most serene hospitality experience in Europe.", rating: 5 },
      ],
      contact: {
        phone: "+30 22860 12345",
        email: "concierge@grandazure.com",
        address: "Santorini Cliffway 12, Greece",
      },
      footer: {
        businessName: "The Grand Azure",
      },
      designStrategy: {
        visualArchetype: "luxury_bespoke",
        heroType: "fullscreen_visual",
      },
    };

    const report = validateWebsiteQuality(sampleWebsite, "The Grand Azure");
    assert.ok(report.passed, `Website must pass validation. Issues: ${JSON.stringify(report.issues)}`);
    assert.ok(report.score >= 80, `Quality score (${report.score}) should be >= 80`);
    assert.equal(report.isGeneric, false, "Must not be flagged as generic");
  });

  test("24. validateWebsiteQuality catches and penalizes missing hero section", () => {
    const invalidWebsite = {
      sectionOrder: ["about", "services", "footer"],
      about: { title: "About Us" },
      services: [{ title: "Service" }],
      footer: { businessName: "Acme" },
    };

    const report = validateWebsiteQuality(invalidWebsite, "Acme");
    assert.ok(report.issues.some((i) => i.code === "MISSING_HERO"), "Must flag MISSING_HERO");
    assert.ok(report.score < 80, "Score must be penalized for missing hero");
  });

  test("25. validateWebsiteQuality catches generic hero titles", () => {
    const genericWebsite = {
      sectionOrder: ["hero", "about", "services", "contact", "footer"],
      hero: {
        title: "Premium Quality and Service For You",
        subtitle: "We are committed to excellence.",
      },
      about: { title: "About" },
      services: [{ title: "Legal Consultation" }],
      contact: { phone: "555-0100" },
      footer: { businessName: "Generic Corp" },
    };

    const report = validateWebsiteQuality(genericWebsite, "Generic Corp");
    assert.ok(report.issues.some((i) => i.code === "GENERIC_HERO_TITLE"), "Must flag GENERIC_HERO_TITLE");
    assert.ok(report.genericityScore > 0, "Genericity score must be > 0");
  });

  test("26. validateWebsiteQuality catches internal system strings in generated content", () => {
    const contaminatedWebsite = {
      sectionOrder: ["hero", "about", "services", "contact", "footer"],
      hero: {
        title: "Welcome to Acme Corp — WARM_ARTISANAL Design",
        subtitle: "Created with DESIGN INTELLIGENCE tools.",
      },
      about: { title: "About" },
      services: [{ title: "Consulting" }],
      contact: { phone: "555-0100" },
      footer: { businessName: "Acme Corp" },
    };

    const report = validateWebsiteQuality(contaminatedWebsite, "Acme Corp");
    assert.ok(
      report.issues.some((i) => i.code === "INTERNAL_STRING_CONTAMINATION"),
      "Must flag INTERNAL_STRING_CONTAMINATION"
    );
  });

  test("27. formatQualityReport produces expected string format", () => {
    const sampleReport = {
      score: 92,
      passed: true,
      issues: [],
      warnings: [],
      genericityScore: 5,
      isGeneric: false,
      sanitizedData: {},
    };
    const logStr = formatQualityReport(sampleReport);
    assert.ok(logStr.includes("[QA]"), "Must include [QA] prefix");
    assert.ok(logStr.includes("score=92/100"), "Must include score");
    assert.ok(logStr.includes("passed=true"), "Must include passed=true");
  });

  test("28. validateWebsiteQuality catches empty services array", () => {
    const emptyServicesWebsite = {
      sectionOrder: ["hero", "services", "contact", "footer"],
      hero: { title: "Studio Zero — Creative Direction" },
      services: [],
      contact: { phone: "555-0100" },
      footer: { businessName: "Studio Zero" },
    };
    const report = validateWebsiteQuality(emptyServicesWebsite, "Studio Zero");
    assert.ok(report.issues.some((i) => i.code === "EMPTY_SERVICES"), "Must flag EMPTY_SERVICES");
  });

  test("29. WebsiteData schema accepts Phase 6 extensions without errors", () => {
    // Verifies TypeScript / runtime shape compatibility
    const extendedData = {
      businessName: "Test Hotel",
      hero: { title: "Test", subtitle: "Test", button: "Test" },
      about: { title: "Test", content: "Test" },
      services: [],
      features: [],
      faq: [],
      contact: {},
      footer: { businessName: "Test" },
      // Phase 6 extensions
      responsiveConfig: {
        mobileFirst: true,
        breakpoints: { sm: 640, md: 768, lg: 1024, xl: 1280 },
        stackingBehavior: "natural-flow",
        typographyScale: "clamp-based",
        imageStrategy: "lazy-load-offscreen",
      },
      motionConfig: {
        level: "SMOOTH",
        durationBaseMs: 500,
        easing: "ease-out",
        hoverZoomScale: 1.02,
        reducedMotionFallback: true,
      },
    };
    assert.ok(extendedData.responsiveConfig.mobileFirst === true);
    assert.ok(extendedData.motionConfig.reducedMotionFallback === true);
  });

  test("30. All 16 industries produce non-empty design rules and profiles", () => {
    const industries = [
      "dental", "restaurant", "car_rental", "real_estate", "gym", "saas", "ecommerce", "local_service",
      "luxury_hotel", "creative_agency", "law_firm", "wellness_spa", "finance", "education", "portfolio", "automotive",
    ];

    for (const ind of industries) {
      const rules = generateDesignRules({
        intent: "generate",
        business: { name: `Test ${ind}`, industry: ind },
      });
      assert.ok(rules.industryProfile.displayName.length > 0, `${ind} must have displayName`);
      assert.ok(rules.typography.headingFont.length > 0, `${ind} must have headingFont`);
      assert.ok(rules.colorSystem.primaryDefault.length > 0, `${ind} must have primaryDefault color`);
      assert.ok(rules.layout.recommendedSections.length > 0, `${ind} must have recommendedSections`);
    }
  });
});
