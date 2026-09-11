// tests/phase2_generation_categories.mjs
import assert from "node:assert/strict";

// Dynamic import of TypeScript modules compiled via Next.js or direct import from lib
async function runMultiCategoryVerification() {
  console.log("=================================================");
  console.log("PHASE 2: MULTI-CATEGORY GENERATION VERIFICATION");
  console.log("=================================================\n");

  const { extractBusinessDetailsFast } = await import("../src/lib/promptExtractor.ts");
  const { detectBackendRequirement } = await import("../src/lib/backendDetection.ts");
  const { getCategoryImages } = await import("../src/lib/categoryImages.ts");
  const { buildWebsitePrompt } = await import("../src/lib/prompts.ts");
  const { buildPlanningPrompt } = await import("../src/lib/planningPrompts.ts");

  const testCases = [
    {
      name: "1. Restaurant",
      prompt: "I want a website for Spice Symphony, an authentic Indian fine dining restaurant in Mumbai with table booking and online ordering.",
      expectedCategory: "Restaurant",
      expectedBackend: "managed_orders",
      expectedImageCategory: "restaurant",
    },
    {
      name: "2. Dental Clinic",
      prompt: "Create a website for Apex Dental Care, a modern dental clinic in Delhi offering cosmetic dentistry and root canals.",
      expectedCategory: "Clinic",
      expectedBackend: "managed_booking",
      expectedImageCategory: "clinic",
    },
    {
      name: "3. Car Rental / Transport",
      prompt: "I run ZoomWheels Car Rental in Bangalore providing airport transfers, self-drive SUV rentals, and luxury cab fleets.",
      expectedCategory: "Transport",
      expectedBackend: "managed_booking",
      expectedImageCategory: "transport",
    },
    {
      name: "4. Salon & Spa",
      prompt: "Website for Glow & Glamour Salon and luxury wellness spa in Pune offering bridal makeovers and organic facials.",
      expectedCategory: "Salon",
      expectedBackend: "managed_booking",
      expectedImageCategory: "salon",
    },
    {
      name: "5. E-commerce / Retail",
      prompt: "Launch an online shop for Urban Threads, a premium clothing and fashion retail store with nationwide express delivery.",
      expectedCategory: "E-commerce",
      expectedBackend: "managed_orders",
      expectedImageCategory: "e-commerce",
    },
    {
      name: "6. Portfolio / Freelancer",
      prompt: "Portfolio website for Rohan Sharma, a senior UI/UX designer and full-stack developer based in Hyderabad.",
      expectedCategory: "Portfolio",
      expectedBackend: "static",
      expectedImageCategory: "portfolio",
    },
    {
      name: "7. Local Service / Plumber",
      prompt: "Need a website for RapidFix Plumbing, professional emergency plumbers and home repair services in Gurgaon.",
      expectedCategory: "Local Service",
      expectedBackend: "managed_booking",
      expectedImageCategory: "local service",
    },
  ];

  let passedCount = 0;

  for (const tc of testCases) {
    console.log(`Testing [${tc.name}]...`);
    console.log(`  Prompt: "${tc.prompt}"`);

    // 1. Extract details
    const extracted = extractBusinessDetailsFast(tc.prompt);
    console.log(`  Extracted Category: ${extracted.category}`);
    console.log(`  Extracted Business Name: ${extracted.businessName}`);
    console.log(`  Extracted Services count: ${extracted.services.length}`);
    console.log(`  Theme Colors: Primary=${extracted.primaryColor}, Secondary=${extracted.secondaryColor}`);

    assert.equal(
      extracted.category,
      tc.expectedCategory,
      `Expected category '${tc.expectedCategory}' but got '${extracted.category}'`
    );
    assert.ok(extracted.businessName && extracted.businessName.length > 2, "Business name must not be empty");
    assert.ok(Array.isArray(extracted.services) && extracted.services.length >= 3, "Must have at least 3 services");
    assert.ok(extracted.primaryColor.startsWith("#"), "Primary color must be hex");
    assert.ok(extracted.secondaryColor.startsWith("#"), "Secondary color must be hex");

    // 2. Detect Backend Requirement
    const backendAnalysis = detectBackendRequirement(extracted.category);
    console.log(`  Backend Requirement Type: ${backendAnalysis.requirementType} (RequiresBackend=${backendAnalysis.requiresBackend})`);
    assert.equal(
      backendAnalysis.requirementType,
      tc.expectedBackend,
      `Expected backend requirement '${tc.expectedBackend}' but got '${backendAnalysis.requirementType}'`
    );

    // 3. Category Images
    const images = getCategoryImages(extracted.category, extracted.businessName, extracted.description);
    assert.ok(images.hero && images.hero.startsWith("https://images.unsplash.com/"), "Hero image must be Unsplash URL");
    assert.ok(images.about && images.about.startsWith("https://images.unsplash.com/"), "About image must be Unsplash URL");
    assert.ok(Array.isArray(images.services) && images.services.length >= 2, "Must have services images");
    assert.ok(Array.isArray(images.features) && images.features.length >= 2, "Must have features images");
    console.log(`  Curated Images: Hero=${images.hero.slice(0, 45)}..., Services=${images.services.length} items`);

    // 4. Prompt Generation
    const mockWorkspace = {
      "ai/memory.md": "# Memory\nProject details.",
      "ai/context.md": "# Context\nActive context.",
      "ai/decisions.md": "# Decisions\nADR-001.",
      "ai/changelog.md": "# Changelog\nInitial.",
      "ai/prompts.md": "# Prompts\nGeneration.",
      "ai/roadmap.md": "# Roadmap\nPhase 1.",
      "planning/prd.md": "# PRD\nSpecs.",
      "planning/trd.md": "# TRD\nSpecs.",
      "planning/app-flow.md": "# App Flow\nFlows.",
      "planning/ui-ux.md": "# UI/UX\nDesign.",
      "planning/backend-schema.md": "# Backend\nSchema.",
      "planning/implementation-plan.md": "# Plan\nSteps.",
      "tasks/active.md": "# Active\nTasks.",
      "tasks/completed.md": "# Completed\nDone.",
      "tasks/bugs.md": "# Bugs\nNone.",
    };

    const websitePrompt = buildWebsitePrompt(
      {
        businessName: extracted.businessName,
        category: extracted.category,
        description: extracted.description,
        targetAudience: extracted.targetAudience,
        style: extracted.style,
        primaryColor: extracted.primaryColor,
        secondaryColor: extracted.secondaryColor,
        phone: extracted.phone,
        email: extracted.email,
        website: "",
        instagram: "",
        facebook: "",
        address: extracted.location,
      },
      mockWorkspace
    );

    assert.ok(websitePrompt.includes(extracted.businessName), "Prompt must include business name");
    assert.ok(websitePrompt.includes(extracted.category), "Prompt must include category");
    assert.ok(websitePrompt.includes("sectionOrder"), "Prompt must include sectionOrder JSON format");

    const planningPrompt = buildPlanningPrompt({
      businessName: extracted.businessName,
      category: extracted.category,
      description: extracted.description,
      targetAudience: extracted.targetAudience,
      style: extracted.style,
      primaryColor: extracted.primaryColor,
      secondaryColor: extracted.secondaryColor,
    });

    assert.ok(planningPrompt.includes(extracted.businessName), "Planning prompt must include business name");
    assert.ok(planningPrompt.includes("planning/prd.md"), "Planning prompt must require PRD");

    console.log(`  ✅ [${tc.name}] Passed all checks!\n`);
    passedCount++;
  }

  console.log(`=================================================`);
  console.log(`MULTI-CATEGORY VERIFICATION RESULTS: ${passedCount}/${testCases.length} PASSED (100%)`);
  console.log(`=================================================`);
}

runMultiCategoryVerification().catch((err) => {
  console.error("FATAL ERROR in multi-category test:", err);
  process.exit(1);
});
