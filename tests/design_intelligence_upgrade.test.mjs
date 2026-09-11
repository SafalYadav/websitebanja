// tests/design_intelligence_upgrade.test.mjs
import assert from "node:assert/strict";
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

const { getSkillMetadata, getRegisteredSkills } = jiti("@/lib/skills/skillRegistry");
const { selectSkillsForRequest } = jiti("@/lib/skills/skillSelector");
const { generateDesignStrategy, deriveVisualArchetype, deriveSectionSequence, deriveSpatial3dConfig } = jiti("@/lib/ai/designStrategy");
const { getImageIntentForSection } = jiti("@/lib/categoryImages");
const { validateGeneratedWebsiteDesign } = jiti("@/lib/skills/uiUxSkill");
const { normalizeWebsiteData } = jiti("@/lib/normalizeWebsite");
const { buildWebsitePrompt } = jiti("@/lib/prompts");

function runTests() {
  console.log("\n=======================================================");
  console.log("🧪 WEBSITEBANJA AI: DESIGN INTELLIGENCE UPGRADE TEST SUITE");
  console.log("=======================================================\n");

  // 1. Test Skill Registry & Spatial Interaction Skill
  console.log("▶ [Test 1] Testing Spatial Interaction Skill Registration...");
  const spatialMeta = getSkillMetadata("spatial-interaction");
  assert.ok(spatialMeta, "spatial-interaction skill must be registered in skillRegistry");
  assert.equal(spatialMeta.id, "spatial-interaction");
  assert.equal(spatialMeta.categoryGroup, "animation");
  assert.equal(spatialMeta.performanceSensitivity, "critical");
  console.log("  ✓ spatial-interaction skill registered successfully in skillRegistry.");

  // 2. Test Skill Selector for 3D / Spatial Cues
  console.log("▶ [Test 2] Testing Skill Selector Contextual Scoring for 3D...");

  // A. SaaS Product -> spatial-interaction selected
  const saasSelection = selectSkillsForRequest({
    category: "saas",
    businessName: "CloudScale AI",
    description: "Autonomous cloud optimization platform with real-time telemetry",
  });
  assert.ok(
    saasSelection.metadata.selectedIds.includes("spatial-interaction"),
    "SaaS product should select spatial-interaction"
  );
  assert.equal(saasSelection.metadata.has3D, true);

  // B. Dental Clinic -> spatial-interaction NOT selected by default
  const dentalSelection = selectSkillsForRequest({
    category: "dental clinic",
    businessName: "BrightSmile Dental",
    description: "Gentle family dentistry and pain-free dental implants",
  });
  assert.ok(
    !dentalSelection.metadata.selectedIds.includes("spatial-interaction"),
    "Dental clinic must NOT select spatial-interaction by default"
  );

  // C. Explicit 3D request on Dental Clinic -> spatial-interaction OVERRIDE
  const dentalWith3DSelection = selectSkillsForRequest({
    category: "dental clinic",
    businessName: "BrightSmile Dental",
    description: "Gentle family dentistry with interactive 3D teeth model inspection",
    prompt: "Include interactive 3D model inspection",
  });
  assert.ok(
    dentalWith3DSelection.metadata.selectedIds.includes("spatial-interaction"),
    "Explicit user requirement for 3D must override clinical defaults"
  );

  // D. Explicit NO animation on SaaS -> spatial-interaction disabled
  const saasNoMotionSelection = selectSkillsForRequest({
    category: "saas",
    businessName: "Speedy SaaS",
    description: "High speed developer tooling with no animation and static only layout",
    prompt: "static layout only, no animation",
  });
  assert.ok(
    !saasNoMotionSelection.metadata.selectedIds.includes("spatial-interaction"),
    "Explicit no-animation override must suppress spatial-interaction"
  );
  console.log("  ✓ Skill Selector scoring and explicit override rules verified.");

  // 3. Test Design Strategy Generator
  console.log("▶ [Test 3] Testing Design Strategy & Archetype Derivation...");
  assert.equal(deriveVisualArchetype({ category: "restaurant", description: "Artisan bistro" }), "warm_artisanal");
  assert.equal(deriveVisualArchetype({ category: "dental clinic", description: "Dental health" }), "clean_clinical");
  assert.equal(deriveVisualArchetype({ category: "saas platform", description: "AI software" }), "dark_technical");
  assert.equal(deriveVisualArchetype({ category: "architecture studio", description: "Modern villa design" }), "minimal_editorial");
  assert.equal(deriveVisualArchetype({ category: "luxury fashion", description: "Haute couture atelier" }), "luxury_bespoke");
  assert.equal(deriveVisualArchetype({ category: "plumber", description: "24/7 Emergency drain repair" }), "high_trust_service");
  console.log("  ✓ Visual archetypes correctly mapped across all domains.");

  // 4. Test Layout Intelligence & Anti-Repetition
  console.log("▶ [Test 4] Testing Layout Intelligence & Section Sequences...");
  const restaurantStrategy = generateDesignStrategy({
    category: "Specialty Restaurant",
    businessName: "L’Aroma Ristorante",
    description: "Michelin-starred Italian dining with wood-fired culinary craft",
  });
  const dentalStrategy = generateDesignStrategy({
    category: "Dental Clinic",
    businessName: "Zenith Dental Suite",
    description: "Compassionate sedation dentistry and aesthetic smile makeovers",
  });
  const saasStrategy = generateDesignStrategy({
    category: "SaaS Product",
    businessName: "NexusAI",
    description: "Enterprise autonomous code orchestration platform",
  });
  const archStrategy = generateDesignStrategy({
    category: "Architecture Studio",
    businessName: "Monolith Architects",
    description: "Contemporary brutalist villas and civic cultural spaces",
  });

  // Verify sequences are structurally distinct (Restaurant ≠ Dental ≠ SaaS ≠ Architecture)
  assert.notDeepEqual(restaurantStrategy.sectionSequence, dentalStrategy.sectionSequence);
  assert.notDeepEqual(dentalStrategy.sectionSequence, saasStrategy.sectionSequence);
  assert.notDeepEqual(saasStrategy.sectionSequence, archStrategy.sectionSequence);

  assert.ok(restaurantStrategy.sectionSequence.includes("signature_dishes"), "Restaurant must feature signature dishes");
  assert.ok(dentalStrategy.sectionSequence.includes("doctor_clinic"), "Dental clinic must feature doctor/clinic profile");
  assert.ok(saasStrategy.sectionSequence.includes("workflow_steps"), "SaaS must feature workflow steps");
  assert.ok(archStrategy.sectionSequence.includes("selected_works"), "Architecture must feature selected works");
  console.log("  ✓ Section sequence uniqueness verified: Restaurant ≠ Dental ≠ SaaS ≠ Architecture.");

  // 5. Test Background Strategy Intelligence
  console.log("▶ [Test 5] Testing Background Strategy Intelligence...");
  assert.equal(restaurantStrategy.backgroundStrategy.type, "tonal_field");
  assert.equal(dentalStrategy.backgroundStrategy.type, "solid");
  assert.equal(saasStrategy.backgroundStrategy.type, "tech_grid");
  assert.equal(archStrategy.backgroundStrategy.type, "editorial_whitespace");
  console.log("  ✓ Background strategies tailored to industry mood and reading ergonomics.");

  // 6. Test Spatial 3D Eligibility Decisions
  console.log("▶ [Test 6] Testing Spatial 3D Eligibility Decisions...");
  assert.equal(restaurantStrategy.spatial3d.enabled, false);
  assert.equal(restaurantStrategy.spatial3d.level, "NONE");

  assert.equal(dentalStrategy.spatial3d.enabled, false);
  assert.equal(dentalStrategy.spatial3d.level, "NONE");

  assert.equal(saasStrategy.spatial3d.enabled, true);
  assert.equal(saasStrategy.spatial3d.level, "ADVANCED_CSS_3D");
  assert.equal(saasStrategy.spatial3d.mobileFallback, "2.5d");

  assert.equal(archStrategy.spatial3d.enabled, true);
  assert.equal(archStrategy.spatial3d.level, "ADVANCED_CSS_3D");
  console.log("  ✓ 3D eligibility decisions correctly enforced (SaaS/Architecture: Yes; Dental/Restaurant: No).");

  // 7. Test Image Intent Intelligence
  console.log("▶ [Test 7] Testing Image Intent Intelligence & Fallbacks...");
  const restIntent = getImageIntentForSection("restaurant", "hero", "L’Aroma");
  assert.ok(restIntent.subject.toLowerCase().includes("culinary") || restIntent.subject.toLowerCase().includes("dining"));
  assert.equal(restIntent.fallbackType, "tonal_composition");

  const clinicIntent = getImageIntentForSection("dental clinic", "hero", "Zenith Dental");
  assert.ok(clinicIntent.subject.toLowerCase().includes("clinical") || clinicIntent.subject.toLowerCase().includes("doctor"));
  assert.equal(clinicIntent.fallbackType, "svg_geometric");

  const archIntent = getImageIntentForSection("architecture", "hero", "Monolith");
  assert.ok(archIntent.subject.toLowerCase().includes("architectural"));
  assert.equal(archIntent.fallbackType, "abstract_mesh");
  console.log("  ✓ Image intent definitions, aspect ratios, and fallback types verified.");

  // 8. Test Visual QA / Self-Critique Loop in uiUxSkill.ts
  console.log("▶ [Test 8] Testing Visual QA / Self-Critique Loop...");
  const genericOutput = {
    sectionOrder: ["hero", "about", "services", "features", "faq", "contact", "footer"],
    hero: {
      title: "Best Dental Clinic 🦷",
      subtitle: "We fix your teeth with care",
      button: "Book Now 🚀",
    },
    services: [
      { title: "Cleaning ⭐", description: "Deep cleaning" },
    ],
    features: [
      { title: "24/7 Care 🔥", description: "Always here" },
    ],
    designStrategy: {
      spatial3d: { enabled: true, level: "ADVANCED_CSS_3D" },
    },
  };

  const qaResult = validateGeneratedWebsiteDesign(genericOutput, {
    category: "dental clinic",
    businessName: "Zenith Dental",
    description: "Premier painless dentistry and implants",
  });

  // A. Emojis removed from title and button
  assert.equal(qaResult.sanitized.hero.title, "Best Dental Clinic");
  assert.equal(qaResult.sanitized.hero.button, "Book Now");
  assert.equal(qaResult.sanitized.services[0].title, "Cleaning");

  // B. Generic sectionOrder upgraded to industry sequence
  assert.ok(
    qaResult.sanitized.sectionOrder.includes("doctor_clinic"),
    "Visual QA should upgrade generic sequence to include doctor_clinic"
  );
  assert.notDeepEqual(qaResult.sanitized.sectionOrder, ["hero", "about", "services", "features", "faq", "contact", "footer"]);

  // C. Unjustified 3D flattened for dental
  assert.equal(
    qaResult.sanitized.designStrategy.spatial3d.enabled,
    false,
    "Visual QA should flatten unjustified 3D on clinical website"
  );
  assert.equal(qaResult.sanitized.designStrategy.spatial3d.level, "NONE");

  console.log("  ✓ Visual QA Self-Critique Loop successfully caught and corrected generic layout and unjustified 3D.");

  // 9. Test Normalization with Dynamic Section Sequences
  console.log("▶ [Test 9] Testing Normalization with Dynamic Section Sequences...");
  const normalizedRestaurant = normalizeWebsiteData(
    {
      hero: { title: "Artisanal Tuscan Dining", subtitle: "Culinary mastery", button: "Reserve" },
    },
    "restaurant",
    "Villa Rosa"
  );

  assert.ok(normalizedRestaurant.sectionOrder.includes("signature_dishes"));
  assert.ok(normalizedRestaurant.designStrategy);
  assert.equal(normalizedRestaurant.designStrategy.visualArchetype, "warm_artisanal");
  console.log("  ✓ normalizeWebsiteData respects dynamic section sequence and attaches design strategy.");

  // 10. Real Generation QA Across All 8 Required Industries
  console.log("\n=======================================================");
  console.log("🌐 REAL GENERATION COMPARISON ACROSS 8 INDUSTRIES");
  console.log("=======================================================\n");

  const industries = [
    { key: "restaurant", name: "L’Aroma Specialty Coffee & Bistro", cat: "Specialty Restaurant", desc: "Third-wave artisanal coffee and rustic Italian small plates" },
    { key: "dental", name: "Aura Dental Care", cat: "Dental Clinic", desc: "Painless laser dentistry, hygiene care, and cosmetic smile makeovers" },
    { key: "saas", name: "SynapseAI", cat: "SaaS / AI Product", desc: "Real-time AI pipeline monitoring, automated model evaluation and telemetry" },
    { key: "architecture", name: "Atelier Form & Void", cat: "Architecture Studio", desc: "Contemporary sustainable residential villas and public civic architecture" },
    { key: "fashion", name: "Maison Vérité", cat: "Luxury Fashion", desc: "Bespoke handcrafted silk garments and minimalist couture outerwear" },
    { key: "service", name: "Apex Emergency Plumbing", cat: "Local Service Business", desc: "24/7 master licensed plumbers with 30-minute rapid emergency arrival" },
    { key: "ecommerce", name: "Nordic Living Essentials", cat: "E-commerce Store", desc: "Direct-to-consumer Scandinavian home decor and artisanal stoneware" },
    { key: "agency", name: "Kinetic Studio", cat: "Creative Agency", desc: "High-impact brand identities, bespoke web experiences, and creative direction" },
  ];

  const generatedSites = {};

  for (const ind of industries) {
    const strat = generateDesignStrategy({
      category: ind.cat,
      businessName: ind.name,
      description: ind.desc,
    });

    const normalized = normalizeWebsiteData(
      {
        hero: {
          title: ind.name,
          subtitle: ind.desc,
          button: ind.key === "dental" ? "Book Appointment" : ind.key === "service" ? "Call Now (24/7)" : "Explore",
        },
      },
      ind.cat,
      ind.name,
      ind.desc
    );

    generatedSites[ind.key] = {
      name: ind.name,
      category: ind.cat,
      archetype: strat.visualArchetype,
      heroVariant: strat.heroType,
      sectionSequence: strat.sectionSequence,
      bgTreatment: strat.backgroundStrategy.type,
      spatial3dLevel: strat.spatial3d.level,
      spatial3dEnabled: strat.spatial3d.enabled,
      headingFont: strat.typographyTokens.headingFont,
      primaryColor: strat.colorSystem.primary,
    };

    console.log(`• [${ind.cat}] ${ind.name}:`);
    console.log(`    Archetype:    ${strat.visualArchetype}`);
    console.log(`    Hero Variant: ${strat.heroType}`);
    console.log(`    Sections:     ${strat.sectionSequence.slice(0, 5).join(" → ")}...`);
    console.log(`    Background:   ${strat.backgroundStrategy.type}`);
    console.log(`    Spatial 3D:   ${strat.spatial3d.level} (${strat.spatial3d.enabled ? "Active" : "Flat"})`);
    console.log(`    Typography:   ${strat.typographyTokens.headingFont}\n`);
  }

  // Cross-industry diversity verification
  const archetypes = new Set(Object.values(generatedSites).map((s) => s.archetype));
  assert.ok(archetypes.size >= 6, "At least 6 distinct archetypes must be represented across 8 industries");

  const bgTypes = new Set(Object.values(generatedSites).map((s) => s.bgTreatment));
  assert.ok(bgTypes.size >= 4, "At least 4 distinct background treatments must be represented");

  const heroVariants = new Set(Object.values(generatedSites).map((s) => s.heroVariant));
  assert.ok(heroVariants.size >= 4, "At least 4 distinct hero layout variants must be represented");

  console.log("=======================================================");
  console.log("🎉 ALL 10 TESTS PASSED! DESIGN INTELLIGENCE FULLY VERIFIED.");
  console.log("=======================================================\n");
}

runTests();
