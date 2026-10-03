// tests/verify_permanent_generation_quality.mjs
/**
 * Rigorous Verification Suite for WebsiteBanja Universal Generation Quality Architecture
 * Verifies:
 * 1. Immutable Place ID Business Identity & Tenant Isolation
 * 2. 5-Tier Safe Asset Fallback Hierarchy & Google Photo Scoring Engine
 * 3. Complete Eradication of Generic Boilerplate & Fabricated Contact Data
 * 4. Duplicate Contact/Booking Section Prevention (Planner & Renderer)
 * 5. Full Pipeline Generation across 5 Diverse Business Archetypes
 */

import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import createJiti from "jiti";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jiti = createJiti(__dirname, {
  alias: { "@": path.resolve(__dirname, "../src") },
  interopDefault: true,
});

const { GroundedIntelligenceService } = jiti("@/lib/intelligence/grounding/groundedIntelligenceService.ts");
const { GroundedAssetSelector, scoreGooglePlacesPhoto } = jiti("@/lib/intelligence/grounding/groundedAssetSelector.ts");
const { businessSectionPlanner } = jiti("@/lib/intelligence/planning/businessSectionPlanner.ts");
const { canonicalGenerationOrchestrator } = jiti("@/lib/intelligence/orchestration/canonicalGenerationOrchestrator.ts");
const { ValidationOrchestrator } = jiti("@/lib/intelligence/validation/validationOrchestrator.ts");
const { validateSemantics } = jiti("@/lib/intelligence/validation/semanticValidator.ts");
const { placeContactAtEnd, resolveSectionTarget, sectionAnchorHref } = jiti("@/lib/intelligence/planning/sectionOrder.ts");

async function runSuite() {
  console.log("================================================================================");
  console.log("RUNNING: PERMANENT UNIVERSAL GENERATION QUALITY ARCHITECTURE VERIFICATION");
  console.log("================================================================================\n");

  const grounding = GroundedIntelligenceService.getInstance();
  const assetSelector = GroundedAssetSelector.getInstance();
  const validator = ValidationOrchestrator.getInstance();

  // -------------------------------------------------------------------------
  // [TEST 1] PLACE ID IDENTITY & TENANT ISOLATION
  // -------------------------------------------------------------------------
  console.log("[TEST 1] Testing Immutable Place ID & Tenant Invariant...");
  const placeId = "ChIJ3_0Q6c-1bTkR_1w7V8wO6d0";
  const tenantId = "tenant_cust_441";
  const bizIdWithPlace = grounding.generateBusinessId({
    placeId,
    name: "Jaipur Two-Wheeler Rentals",
    location: "Jaipur, Rajasthan",
    tenantId,
  });
  assert.strictEqual(bizIdWithPlace, `biz_${tenantId}_${placeId}`, "Must anchor businessId on placeId and tenantId");

  const bizIdWithoutPlace = grounding.generateBusinessId({
    name: "Jaipur Two-Wheeler Rentals",
    location: "Jaipur, Rajasthan",
    tenantId,
  });
  assert.ok(bizIdWithoutPlace.startsWith(`biz_${tenantId}_`), "Must include tenantId prefix even without placeId");
  assert.notStrictEqual(bizIdWithoutPlace, bizIdWithPlace, "Fallback hash must not equal placeId anchor");
  console.log("  ✔ Business ID anchors immutably on verified Place ID and tenant prefix.");

  // -------------------------------------------------------------------------
  // [TEST 2] PHOTO SCORING & 5-TIER SAFE ASSET HIERARCHY
  // -------------------------------------------------------------------------
  console.log("\n[TEST 2] Testing 5-Tier Safe Asset Fallback & Photo Scoring Engine...");

  // Test photo scoring
  const highResLandscape = {
    name: "places/test/photos/highres",
    widthPx: 1600,
    heightPx: 1000,
    authorAttributions: [{ displayName: "Owner" }],
  };
  const lowResPortrait = {
    name: "places/test/photos/lowres",
    widthPx: 400,
    heightPx: 600,
  };
  const scoreHigh = scoreGooglePlacesPhoto(highResLandscape);
  const scoreLow = scoreGooglePlacesPhoto(lowResPortrait);
  assert.ok(scoreHigh.score > scoreLow.score, "High-res landscape photo must score higher than low-res portrait");
  assert.strictEqual(scoreHigh.isHeroSuitable, true, "1600x1000 landscape must be hero suitable");
  assert.strictEqual(scoreLow.isHeroSuitable, false, "400x600 portrait must NOT be hero suitable");
  console.log(`  ✔ Photo scoring verified: HighRes score=${scoreHigh.score}, LowRes score=${scoreLow.score}`);

  // Base profile mock
  const baseProfile = {
    businessId: "biz_test_rental",
    tenantId: null,
    identity: {
      businessId: "biz_test_rental",
      placeId: "ChIJ123",
      canonicalName: "Royal Jaipur Bike Rental",
      sourceReferences: {},
    },
    archetype: "bike_rental",
    archetypeConfidence: "HIGH",
    industryFamily: "mobility",
    industryConfidence: "HIGH",
    services: [
      { name: "500cc Cruiser Rental", description: "Bespoke tour bikes", isObserved: true, confidence: 0.9 },
      { name: "Gearless City Scooter", description: "Automatic runabouts", isObserved: true, confidence: 0.9 },
      { name: "Helmets & Safety Kit", description: "DOT helmets included", isObserved: true, confidence: 0.9 },
    ],
    audience: [],
    location: {
      formattedAddress: "Station Road, Jaipur, Rajasthan",
      city: "Jaipur",
      country: "India",
      isVerified: true,
      confidence: 0.95,
      evidenceIds: [],
    },
    brandSignals: { businessName: "Royal Jaipur Bike Rental", confidence: 0.9, confidenceLevel: "HIGH", evidenceIds: [] },
    visualStyle: { status: "AVAILABLE", confidence: 0.85, confidenceLevel: "HIGH", evidenceIds: [] },
    ctaStrategy: {
      observedCtas: [{ text: "Book a Bike", evidenceId: "ev1" }],
      primaryCtaStrategy: "Online Appointment Booking",
      recommendedNextAction: "Book",
      rationale: "Observed",
      confidence: 0.9,
      confidenceLevel: "HIGH",
    },
    evidence: [],
    factsAndInferences: [
      { id: "f1", type: "OBSERVED_FACT", statement: "4.8★ across 220 reviews", evidenceIds: [], confidence: 0.95 },
    ],
    forbiddenClaims: [],
    conflicts: [],
    ambiguity: { isAmbiguous: false, candidatesCount: 0, candidateMatches: [], resolutionMessage: "None" },
    freshness: { fetchedAt: new Date().toISOString(), freshnessStatus: "FRESH", sourcesFetched: ["google_places"] },
    compositeConfidence: 0.95,
    compositeConfidenceLevel: "HIGH",
  };

  // Tier 1: When Google Places Photos exist
  const tier1Profile = {
    ...baseProfile,
    placesPhotos: [highResLandscape],
  };
  const tier1Res = assetSelector.selectAssets(tier1Profile);
  assert.strictEqual(tier1Res.heroAsset?.type, "BUSINESS_PHOTO", "Tier 1 must select BUSINESS_PHOTO");
  assert.strictEqual(tier1Res.heroAsset?.isFallback, false, "Tier 1 must not be fallback");
  assert.ok(tier1Res.heroAsset?.contentUrl?.includes("places-photo"), "Tier 1 must proxy Google Places photo");
  console.log("  ✔ Tier 1 (Verified Google Places Photo) verified.");

  // Tier 2: When Google has 0 photos, but official website has crawl photos
  const tier2Profile = {
    ...baseProfile,
    placesPhotos: [],
    websitePhotos: [
      { url: "https://royaljaipurbikes.com/images/hero-fleet.jpg", sourceUrl: "https://royaljaipurbikes.com" },
    ],
  };
  const tier2Res = assetSelector.selectAssets(tier2Profile);
  assert.strictEqual(tier2Res.heroAsset?.type, "WEBSITE_CRAWL_IMAGE", "Tier 2 must select WEBSITE_CRAWL_IMAGE");
  assert.strictEqual(tier2Res.heroAsset?.isFallback, false, "Tier 2 crawl image must not be fallback");
  assert.strictEqual(tier2Res.heroAsset?.contentUrl, "https://royaljaipurbikes.com/images/hero-fleet.jpg");
  console.log("  ✔ Tier 2 (Official Website Crawl Photo) verified.");

  // Tier 3: When Google & Website have 0 photos, but client assets exist
  const tier3Profile = {
    ...baseProfile,
    placesPhotos: [],
    websitePhotos: [],
    clientAssets: [
      { url: "https://storage.websitebanja.com/client-uploads/storefront.jpg", label: "Storefront" },
    ],
  };
  const tier3Res = assetSelector.selectAssets(tier3Profile);
  assert.strictEqual(tier3Res.heroAsset?.type, "CLIENT_ASSET", "Tier 3 must select CLIENT_ASSET");
  assert.strictEqual(tier3Res.heroAsset?.isFallback, false, "Tier 3 must not be fallback");
  assert.strictEqual(tier3Res.heroAsset?.contentUrl, "https://storage.websitebanja.com/client-uploads/storefront.jpg");
  console.log("  ✔ Tier 3 (Client-Provided Asset) verified.");

  // Tier 4: Category-Gated Stock (Ensures NO developer/laptop images for bike rental)
  const tier4Profile = {
    ...baseProfile,
    placesPhotos: [],
    websitePhotos: [],
    clientAssets: [],
  };
  const tier4Res = assetSelector.selectAssets(tier4Profile, { category: "bike_rental" });
  assert.ok(
    tier4Res.heroAsset?.type === "STOCK_FALLBACK_IMAGE" || tier4Res.heroAsset?.type === "TYPOGRAPHIC_LAYOUT",
    "Tier 4/5 must handle stock fallback safely"
  );
  if (tier4Res.heroAsset?.contentUrl) {
    assert.ok(
      !tier4Res.heroAsset.contentUrl.includes("photo-1531482615713") &&
      !tier4Res.heroAsset.contentUrl.includes("photo-1517694712"),
      "Tier 4 must NEVER return developer/laptop images for bike rental"
    );
  }
  console.log("  ✔ Tier 4 (Category-Gated Stock with Anti-Developer Protection) verified.");

  // Tier 5: Typographic Layout when stock generator returns dev images
  const tier5Res = assetSelector.selectAssets(tier4Profile, {
    category: "bike_rental",
    fallbackImageGenerator: () => "https://images.unsplash.com/photo-1531482615713-2afd69097998", // simulated dev image
  });
  assert.strictEqual(tier5Res.heroAsset?.type, "TYPOGRAPHIC_LAYOUT", "Tier 5 must trigger when stock image is irrelevant");
  assert.strictEqual(tier5Res.heroAsset?.contentUrl, undefined, "Tier 5 must have undefined contentUrl");
  console.log("  ✔ Tier 5 (Neutral High-Design Typographic Layout) verified.");

  // -------------------------------------------------------------------------
  // [TEST 3] DUPLICATE CONTACT & SECTION PURPOSE DEDUPLICATION
  // -------------------------------------------------------------------------
  console.log("\n[TEST 3] Testing Duplicate Contact & Section Purpose Deduplication...");
  assert.deepEqual(
    placeContactAtEnd(["hero", "services", "contact", "faq", "about", "footer"]),
    ["hero", "services", "faq", "about", "contact", "footer"],
    "Contact must be the last content section before footer"
  );
  assert.equal(sectionAnchorHref("services", ["hero", "services", "booking", "footer"]), "#wb-section-services");
  assert.equal(resolveSectionTarget("contact", ["hero", "services", "booking", "footer"]), "booking",
    "A Contact navbar action must resolve to the generated booking/contact alias");
  assert.equal(sectionAnchorHref("contact", ["hero", "services", "booking", "footer"]), "#wb-section-booking");
  const rawSectionsWithDuplicates = ["hero", "services", "booking", "features", "contact", "inquiry", "footer"];
  const purposeMap = {
    hero: "HERO",
    services: "OFFERINGS",
    booking: "CONTACT",
    features: "VALUE_PROP",
    contact: "CONTACT",
    inquiry: "CONTACT",
    footer: "NAVIGATION",
  };
  const deduped = businessSectionPlanner.deduplicatePurposes(rawSectionsWithDuplicates, purposeMap);
  const contactOccurrences = deduped.filter((s) => ["booking", "contact", "inquiry"].includes(s));
  assert.strictEqual(contactOccurrences.length, 1, "Must contain exactly 1 contact-purpose section");
  assert.deepStrictEqual(deduped, ["hero", "services", "features", "booking", "footer"]);
  console.log(`  ✔ Deduped section sequence: [${deduped.join(" -> ")}] (0 duplicate contact sections).`);

  // -------------------------------------------------------------------------
  // [TEST 4] ANTI-BOILERPLATE VALIDATION & QUALITY GATE
  // -------------------------------------------------------------------------
  console.log("\n[TEST 4] Testing Validation Quality Gate (Boilerplate, Leaks, Relevance)...");

  // Synthetic dirty website data
  const dirtyWebsite = {
    businessName: "Jaipur Bike Rental",
    sectionOrder: ["hero", "services", "booking", "contact", "footer"], // duplicate contact!
    hero: {
      title: "Jaipur Bike Rental — Dedicated Excellence in Vadodara", // boilerplate + leaked city!
      eyebrow: "Local Home & Professional Services • Verified Local Preview", // boilerplate!
      image: "https://images.unsplash.com/photo-1531482615713-2afd69097998", // developer image!
      button: "Book a Bike",
    },
    contact: {
      phone: "+91 98250 11223", // dummy phone!
      email: "hello@websitebanja.local", // dummy email!
      address: "Station Road, Jaipur, Gujarat", // wrong state!
    },
    features: [
      { title: "Autonomous Architecture Engine", description: "Sub-Second Rendering" }, // internal slogans!
    ],
  };

  const validationRes = validateSemantics({
    projectId: "proj_test_quality",
    runId: "run_test_quality",
    tenantId: "tenant_test",
    websiteData: dirtyWebsite,
    businessLocation: "Jaipur, Rajasthan",
    groundedProfile: {
      location: { city: "Jaipur" },
      archetype: "bike_rental",
    },
  });

  assert.strictEqual(validationRes.passed, false, "Dirty website MUST fail validation");
  const ruleCodes = validationRes.failures.map((f) => f.ruleCode);
  console.log("  Caught validation failures:", ruleCodes);
  assert.ok(ruleCodes.includes("SEM_FORBIDDEN_BOILERPLATE_TEXT"), "Must catch 'Dedicated Excellence' or 'Verified Local Preview'");
  assert.ok(ruleCodes.includes("SEM_LEAKED_INTERNAL_SLOGANS"), "Must catch 'Autonomous Architecture Engine'");
  assert.ok(ruleCodes.includes("SEM_FABRICATED_CONTACT_DATA"), "Must catch '+91 98250 11223'");
  assert.ok(ruleCodes.includes("SEM_CITY_LEAK_CONTRADICTION"), "Must catch 'Vadodara' leak on Jaipur business");
  assert.ok(ruleCodes.includes("SEM_DUPLICATE_CONTACT_SECTIONS"), "Must catch duplicate contact/booking sections");
  assert.ok(ruleCodes.includes("SEM_IRRELEVANT_DEVELOPER_IMAGE"), "Must catch developer image on bike rental");
  console.log(`  ✔ All ${ruleCodes.length} quality gate rules fired on dirty data.`);

  // -------------------------------------------------------------------------
  // [TEST 5] FULL GENERATION PIPELINE ACROSS 5 DIVERSE BUSINESSES
  // -------------------------------------------------------------------------
  console.log("\n[TEST 5] Testing End-to-End Canonical Generation across 5 Benchmark Businesses...");

  const benchmarks = [
    { name: "Jaipur Two-Wheeler Rentals", category: "bike_rental", city: "Jaipur", placeId: "ChIJ_jaipur_bike" },
    { name: "Dr. Sharma Dental Aesthetics", category: "dental_clinic", city: "Udaipur", placeId: "ChIJ_udaipur_dental" },
    { name: "Heritage Haveli Suites", category: "boutique_hotel", city: "Jodhpur", placeId: "ChIJ_jodhpur_hotel" },
    { name: "Roast & Grind Artisanal Cafe", category: "cafe", city: "Pune", placeId: "ChIJ_pune_cafe" },
    { name: "S. Bhandari & Associates CA Firm", category: "accounting_firm", city: "Jaipur", placeId: "ChIJ_jaipur_ca" },
  ];

  for (let i = 0; i < benchmarks.length; i++) {
    const b = benchmarks[i];
    // Explicit deterministic API fixture, not live Google verification or cached success.
    const originalFetch = globalThis.fetch;
    const originalKey = process.env.GOOGLE_PLACES_API_KEY;
    process.env.GOOGLE_PLACES_API_KEY = "test-only-key";
    globalThis.fetch = async (url) => {
      assert.equal(String(url), `https://places.googleapis.com/v1/places/${b.placeId}`);
      return Response.json({ id: b.placeId, displayName: { text: b.name },
        formattedAddress: `${b.city}, India`,
        addressComponents: [{ longText: b.city, types: ["locality"] }, { longText: "India", types: ["country"] }],
        photos: [], reviews: [] });
    };
    console.log(`  -> Generating [${i + 1}/5]: ${b.name} (${b.category}) in ${b.city}...`);
    let genRes;
    try {
      genRes = await canonicalGenerationOrchestrator.generateWebsite({
      businessName: b.name,
      category: b.category,
      location: `${b.city}, India`,
      placeId: b.placeId,
      source: "api",
      tenantId: `fixture_${process.pid}_${Date.now()}`,
      });
    } finally {
      globalThis.fetch = originalFetch;
      if (originalKey === undefined) delete process.env.GOOGLE_PLACES_API_KEY;
      else process.env.GOOGLE_PLACES_API_KEY = originalKey;
    }

    assert.strictEqual(genRes.success, true, `Generation must succeed for ${b.name}`);
    assert.ok(genRes.status === "READY" || genRes.status === "REPAIRED", `Status must be READY or REPAIRED, got ${genRes.status}`);

    const data = genRes.websiteData;
    const jsonStr = JSON.stringify(data).toLowerCase();

    // Invariant 1: Zero forbidden boilerplate
    assert.ok(!jsonStr.includes("dedicated excellence in"), "Must NOT contain 'Dedicated Excellence in'");
    assert.ok(!jsonStr.includes("verified local preview"), "Must NOT contain 'Verified Local Preview'");
    assert.ok(!jsonStr.includes("autonomous architecture engine"), "Must NOT contain 'Autonomous Architecture Engine'");
    assert.ok(!jsonStr.includes("sub-second rendering"), "Must NOT contain 'Sub-Second Rendering'");

    // Invariant 2: Zero dummy phone numbers
    assert.ok(!jsonStr.includes("98250 11223"), "Must NOT contain '+91 98250 11223'");
    assert.ok(!jsonStr.includes("9876543210"), "Must NOT contain '+91 9876543210'");

    // Invariant 3: Zero Vadodara leaks
    if (b.city !== "Vadodara") {
      assert.ok(!jsonStr.includes("vadodara"), `Must NOT contain 'Vadodara' for business in ${b.city}`);
    }

    // Invariant 4: Exactly 1 contact section
    const contactSections = (data.sectionOrder || []).filter((s) =>
      ["contact", "booking", "reservation", "inquiry", "appointment"].includes(s.toLowerCase().trim())
    );
    assert.strictEqual(contactSections.length, 1, `Must have exactly 1 contact section in ${b.name}`);

    // Invariant 5: Clean hero title
    assert.ok(data.hero?.title && data.hero.title.includes(b.name), "Hero title must include business name");
    assert.ok(data.hero?.title && !data.hero.title.includes("Dedicated Excellence"), "Hero title must be grounded");

    // Invariant 6: Correct placeId identity propagated
    assert.strictEqual(genRes.businessContext.placeId, b.placeId, "Must propagate exact placeId in businessContext");
    const finalOrder = data.sectionOrder || [];
    assert.equal(finalOrder.at(-1), "footer", "Footer must be last");
    assert.equal(finalOrder.at(-2), "contact", "Contact must be immediately before footer");

    console.log(`     ✔ Clean AST verified: 0 boilerplate, 0 dummy data, 1 contact section, valid placeId.`);
  }

  console.log("\n================================================================================");
  console.log("✅ Deterministic generation checks passed. Live Google, database, storage, and browser verification are separate.");
  console.log("================================================================================");
}

runSuite().catch((err) => {
  console.error("❌ Verification Suite Failed:", err);
  process.exit(1);
});
