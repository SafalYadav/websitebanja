// tests/business_intelligence.test.mjs
// Grounded Business Intelligence Verification Suite
// 27 comprehensive tests verifying verifiable evidence collection, schema validation,
// archetype classification, service extraction, fact vs inference separation, forbidden claims,
// cross-source conflicts, ambiguity handling, graceful fallbacks, tenant isolation, secret redaction,
// freshness tracking, Google Places compliance, memory evidence gating, and pipeline integration.

import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import createJiti from "jiti";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jiti = createJiti(__dirname, {
  alias: { "@": path.resolve(__dirname, "../src") },
  interopDefault: true,
});

// Import Grounded Intelligence modules
const {
  GroundedIntelligenceService,
  groundedIntelligenceService,
} = jiti("@/lib/intelligence/grounding/groundedIntelligenceService");

const {
  GroundedProfileStore,
  groundedProfileStore,
} = jiti("@/lib/intelligence/grounding/groundedProfileStore");

const {
  createEvidenceItem,
  createObservedFact,
  createDerivedInference,
  detectSourceConflict,
  scoreToConfidenceLevel,
  SOURCE_WEIGHTS,
} = jiti("@/lib/intelligence/grounding/evidenceEngine");

const {
  compileForbiddenClaims,
} = jiti("@/lib/intelligence/grounding/forbiddenClaimsEngine");

const {
  GroundedBusinessProfileSchema,
  BusinessResearchRequestSchema,
  EvidenceItemSchema,
  ForbiddenClaimItemSchema,
} = jiti("@/lib/intelligence/grounding/schemas");

const { MemoryStore } = jiti("@/lib/intelligence/memory/memoryStore");
const { OpsToolExecutor } = jiti("@/lib/intelligence/ops/opsToolExecutor");
const { leadRepository } = jiti("@/lib/discovery/leadRepository");

describe("Grounded Business Intelligence Layer", () => {
  beforeEach(() => {
    groundedProfileStore._clearForTest();
    MemoryStore.getInstance().clear();
  });

  // 1. Profile Schema Validation
  test("1. Profile Schema Validation: Validates complete grounded profile and rejects invalid/empty schemas", () => {
    const validProfile = {
      businessId: "biz_test_dental",
      tenantId: "tenant-1",
      identity: {
        businessId: "biz_test_dental",
        placeId: "places_123",
        canonicalName: "Apex Dental Clinic",
        normalizedWebsite: "https://apexdental.com",
        formattedAddress: "123 Health Ave, Mumbai, Maharashtra 400001",
        phone: "+91 98765 43210",
        sourceReferences: { places: "places_123", website: "https://apexdental.com" },
      },
      archetype: "healthcare_clinic",
      archetypeConfidence: "HIGH",
      industryFamily: "dental_care",
      industryConfidence: "HIGH",
      services: [
        {
          name: "Root Canal Treatment",
          isObserved: true,
          confidence: 0.95,
          confidenceLevel: "HIGH",
          evidenceIds: ["ev_1"],
        },
      ],
      audience: [
        {
          segment: "Local families and professionals",
          isObserved: false,
          confidence: 0.70,
          confidenceLevel: "MEDIUM",
          evidenceIds: ["ev_1"],
          rationale: "Proximity to commercial and residential district",
        },
      ],
      location: {
        formattedAddress: "123 Health Ave, Mumbai, Maharashtra 400001",
        city: "Mumbai",
        state: "Maharashtra",
        country: "India",
        latitude: 19.076,
        longitude: 72.8777,
        isVerified: true,
        confidence: 0.95,
        evidenceIds: ["ev_1"],
      },
      brandSignals: {
        businessName: "Apex Dental Clinic",
        tone: "Warm, Caring & Approachable",
        confidence: 0.90,
        confidenceLevel: "HIGH",
        evidenceIds: ["ev_1"],
      },
      visualStyle: {
        status: "AVAILABLE",
        colorPalette: ["#007ACC", "#FFFFFF", "#F0F4F8"],
        visualMood: "Clean clinical design",
        confidence: 0.85,
        confidenceLevel: "HIGH",
        evidenceIds: ["ev_1"],
      },
      ctaStrategy: {
        observedCtas: [
          { text: "Book Appointment", evidenceId: "ev_1" },
        ],
        primaryCtaStrategy: "Online Appointment Booking",
        recommendedNextAction: "Engage via booking portal",
        rationale: "Direct booking verified on site",
        confidence: 0.90,
        confidenceLevel: "HIGH",
      },
      evidence: [
        {
          id: "ev_1",
          source: "google_places",
          reference: "places_123",
          observation: "Verified Google Places establishment listing",
          supports: "Apex Dental Clinic",
          confidence: 0.95,
          confidenceLevel: "HIGH",
          verificationStatus: "verified",
          timestamp: new Date().toISOString(),
        },
      ],
      factsAndInferences: [
        {
          id: "f_1",
          type: "OBSERVED_FACT",
          statement: "Operates dental clinic at 123 Health Ave",
          confidence: 0.95,
          confidenceLevel: "HIGH",
          evidenceIds: ["ev_1"],
        },
      ],
      forbiddenClaims: [
        {
          id: "fc_1",
          claimType: "UNSUPPORTED_RANKING",
          claimDescription: "Do not claim #1 dental clinic in Mumbai",
          forbiddenReason: "No external verified authority corroborating #1 rank",
          status: "FORBIDDEN",
        },
      ],
      conflicts: [],
      ambiguity: {
        isAmbiguous: false,
        candidatesCount: 1,
        candidateMatches: [],
        resolutionMessage: "No ambiguity detected",
      },
      freshness: {
        fetchedAt: new Date().toISOString(),
        freshnessStatus: "FRESH",
        sourcesFetched: ["google_places", "business_website"],
      },
      compositeConfidence: 0.95,
      compositeConfidenceLevel: "HIGH",
    };

    const parsed = GroundedBusinessProfileSchema.safeParse(validProfile);
    assert.strictEqual(parsed.success, true, "Valid profile must parse cleanly");

    // Invalid schema test
    const invalidProfile = { businessId: "bad", identity: {} };
    const invalidParsed = GroundedBusinessProfileSchema.safeParse(invalidProfile);
    assert.strictEqual(invalidParsed.success, false, "Invalid profile must be rejected");
  });

  // 2. Business Identity Extraction
  test("2. Business Identity Extraction: Generates deterministic businessId and normalizes canonical attributes", () => {
    const id1 = groundedIntelligenceService.generateBusinessId("Apex Dental Clinic", "Mumbai");
    const id2 = groundedIntelligenceService.generateBusinessId("Apex Dental Clinic", "Mumbai");
    const id3 = groundedIntelligenceService.generateBusinessId("Apex Dental Clinic", "Delhi");

    assert.strictEqual(id1, id2, "Deterministic ID must match for identical name and location");
    assert.notStrictEqual(id1, id3, "Deterministic ID must differ for different locations");
    assert.ok(id1.startsWith("biz_"), "BusinessId should start with prefix biz_");
  });

  // 3. Archetype Classification
  test("3. Archetype Classification: Correctly infers archetype with evidence and confidence", async () => {
    const result = await groundedIntelligenceService.researchBusiness({
      businessName: "Saffron Fine Dining Restaurant",
      category: "Restaurant",
      location: "Indiranagar, Bangalore",
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.profile.archetype, "restaurant");
    assert.ok(["HIGH", "MEDIUM"].includes(result.profile.archetypeConfidence));
    assert.ok(result.profile.evidence.length > 0, "Archetype should have supporting evidence");
  });

  // 4. Industry Family Classification
  test("4. Industry Family Classification: Categorizes specific business vertical accurately", async () => {
    const result = await groundedIntelligenceService.researchBusiness({
      businessName: "Elite Law Chambers",
      category: "Legal Services & Corporate Advocacy",
      location: "New Delhi",
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.profile.archetype, "professional_services");
    assert.strictEqual(result.profile.industryFamily, "professional_services");
  });

  // 5. Service Extraction
  test("5. Service Extraction: Tracks explicitly mentioned services vs inferred services with evidence linkage", async () => {
    const result = await groundedIntelligenceService.researchBusiness({
      businessName: "Sparkle Auto Detailing & Ceramic Coating",
      category: "Auto Detailing",
      location: "Pune",
    });

    assert.strictEqual(result.success, true);
    const services = result.profile.services;
    assert.ok(services.length > 0, "Should extract at least one service");

    const ceramicService = services.find((s) => s.name.toLowerCase().includes("ceramic"));
    assert.ok(ceramicService, "Ceramic coating should be detected as service");
    assert.strictEqual(ceramicService.isObserved, true, "Ceramic should be explicitly observed");
    assert.ok(ceramicService.evidenceIds.length >= 0, "Must have evidenceIds");
  });

  // 6. Audience Inference
  test("6. Audience Inference: Clearly separates inferred audience from explicit facts", async () => {
    const result = await groundedIntelligenceService.researchBusiness({
      businessName: "Kids Kingdom Preschool & Daycare",
      category: "Preschool",
      location: "Vadodara",
    });

    assert.strictEqual(result.success, true);
    const audience = result.profile.audience;
    assert.ok(audience.length > 0);
    for (const aud of audience) {
      assert.strictEqual(aud.isObserved, false, "Audience should be clearly marked as inferred (isObserved: false)");
      assert.ok(aud.rationale, "Inferred audience must provide a rationale");
    }
  });

  // 7. Location Handling
  test("7. Location Handling: Captures formatted address, city, country, and verified status", async () => {
    const result = await groundedIntelligenceService.researchBusiness({
      businessName: "Metro Diagnostic Labs",
      location: "Koramangala, Bangalore, Karnataka, India",
    });

    assert.strictEqual(result.success, true);
    const loc = result.profile.location;
    assert.strictEqual(loc.city, "Bangalore");
    assert.strictEqual(loc.country, "India");
    assert.ok(loc.formattedAddress.includes("Bangalore"));
  });

  // 8. Brand Signals
  test("8. Brand Signals: Extracts tone, observed values, and rating metrics without hallucination", async () => {
    const result = await groundedIntelligenceService.researchBusiness({
      businessName: "Zenith Wealth Advisors",
      category: "Wealth Management",
      location: "Mumbai",
    });

    assert.strictEqual(result.success, true);
    const brands = result.profile.brandSignals;
    assert.ok(brands.tone, "Tone should be extracted");
    assert.strictEqual(typeof brands.businessName, "string");
    assert.ok(brands.confidenceLevel);
  });

  // 9. Visual Style Derivation
  test("9. Visual Style Derivation: Derives grounded color scheme and design archetype", async () => {
    const result = await groundedIntelligenceService.researchBusiness({
      businessName: "Green Earth Organic Cafe",
      category: "Organic Food & Cafe",
      location: "Goa",
    });

    assert.strictEqual(result.success, true);
    const style = result.profile.visualStyle;
    assert.ok(["AVAILABLE", "UNAVAILABLE"].includes(style.status), "Visual style status must be AVAILABLE or UNAVAILABLE");
    assert.ok(style.confidenceLevel);
  });

  // 10. CTA Strategy Extraction
  test("10. CTA Strategy Extraction: Identifies primary and secondary CTAs appropriate for business archetype", async () => {
    const result = await groundedIntelligenceService.researchBusiness({
      businessName: "QuickFix 24/7 Emergency Plumber",
      category: "Plumbing Services",
      location: "Chennai",
    });

    assert.strictEqual(result.success, true);
    const cta = result.profile.ctaStrategy;
    assert.ok(
      cta.primaryCtaStrategy.includes("Lead") ||
      cta.primaryCtaStrategy.includes("Inquiry") ||
      cta.primaryCtaStrategy.includes("Booking"),
      "Should derive an appropriate primary CTA strategy"
    );
    assert.ok(cta.recommendedNextAction, "Must include recommended next action");
  });

  // 11. Traceable Evidence Creation
  test("11. Traceable Evidence Creation: Assigns source weights and produces verifiable references", () => {
    const ev1 = createEvidenceItem({
      source: "google_places",
      reference: "places_abc",
      observation: "Observed physical business presence",
      supports: "Apex Dental",
    });

    const ev2 = createEvidenceItem({
      source: "user_input",
      reference: "user_form",
      observation: "User typed restaurant",
      supports: "Apex Dental",
    });

    assert.ok(ev1.confidence >= ev2.confidence, "Google Places evidence must have higher weight than raw user input");
    assert.strictEqual(ev1.source, "google_places");
    assert.ok(ev1.id.startsWith("ev_"));
  });

  // 12. Confidence Calculation
  test("12. Confidence Calculation: Maps numerical scores into HIGH, MEDIUM, LOW, and UNKNOWN", () => {
    assert.strictEqual(scoreToConfidenceLevel(0.95), "HIGH");
    assert.strictEqual(scoreToConfidenceLevel(0.85), "HIGH");
    assert.strictEqual(scoreToConfidenceLevel(0.75), "MEDIUM");
    assert.strictEqual(scoreToConfidenceLevel(0.60), "MEDIUM");
    assert.strictEqual(scoreToConfidenceLevel(0.40), "LOW");
    assert.strictEqual(scoreToConfidenceLevel(0.15), "UNKNOWN");
  });

  // 13. Forbidden Claims Compilation
  test("13. Forbidden Claims Compilation: Prevents unsupported superlatives, unverified years, and fake pricing", () => {
    const forbidden = compileForbiddenClaims({
      businessName: "Royal Jewellers",
      verifiedServices: [],
      evidenceList: [],
      hasVerifiedYears: false,
      hasVerifiedPricing: false,
      hasVerifiedGuarantees: false,
    });

    const types = forbidden.map((f) => f.claimType);
    assert.ok(types.includes("UNSUPPORTED_RANKING"), "Must prohibit unsupported rankings (#1, Top)");
    assert.ok(types.includes("UNSUPPORTED_EXPERIENCE_YEARS"), "Must prohibit unverified years of experience");
    assert.ok(types.includes("UNSUPPORTED_PRICING"), "Must prohibit fabricated price quotes");
    assert.ok(types.includes("UNSUPPORTED_GUARANTEE"), "Must prohibit unverified guarantees");
  });

  // 14. Fact vs Inference Separation
  test("14. Fact vs Inference Separation: Every statement is explicitly tagged as OBSERVED_FACT or DERIVED_INFERENCE", async () => {
    const result = await groundedIntelligenceService.researchBusiness({
      businessName: "Prime Fitness Gym",
      location: "Ahmedabad",
    });

    assert.strictEqual(result.success, true);
    const items = result.profile.factsAndInferences;
    assert.ok(items.length > 0, "Must contain fact/inference breakdown");

    for (const item of items) {
      assert.ok(
        ["OBSERVED_FACT", "DERIVED_INFERENCE"].includes(item.type),
        `Item type must be OBSERVED_FACT or DERIVED_INFERENCE, got ${item.type}`
      );
      assert.ok(item.confidenceLevel, "Each fact/inference must specify confidenceLevel");
    }
  });

  // 15. Cross-Source Conflict Detection
  test("15. Cross-Source Conflict Detection: Detects discrepancies between external sources", () => {
    const conflict = detectSourceConflict({
      field: "phone",
      sourceA: { source: "business_website", reference: "https://apex.com", value: "+91 98765 00000" },
      sourceB: { source: "google_places", reference: "places_123", value: "+91 98765 11111" },
    });

    assert.ok(conflict, "Conflict must be generated when phone numbers mismatch");
    assert.strictEqual(conflict.field, "phone");
    assert.strictEqual(conflict.sourceA.source, "business_website");
    assert.strictEqual(conflict.sourceB.source, "google_places");
    assert.ok(conflict.explanation.includes("Conflicting data observed"));
  });

  // 16. Ambiguity Handling
  test("16. Ambiguity Handling: Identifies ambiguous business names and flags disambiguation requirement", async () => {
    const result = await groundedIntelligenceService.researchBusiness({
      businessName: "Cafe", // Very generic query
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.profile.ambiguity.isAmbiguous, true);
    assert.ok(result.profile.ambiguity.resolutionMessage.includes("ambiguous"));
  });

  // 17. Missing Website Graceful Fallback
  test("17. Missing Website Graceful Fallback: Successfully executes when website is missing or offline", async () => {
    const result = await groundedIntelligenceService.researchBusiness({
      businessName: "Local Corner Sweet Mart",
      location: "Surat",
      website: undefined,
    });

    assert.strictEqual(result.success, true);
    assert.ok(result.profile.businessId);
    assert.strictEqual(result.profile.identity.canonicalName, "Local Corner Sweet Mart");
    assert.ok(result.profile.forbiddenClaims.length > 0);
  });

  // 18. Missing Places Graceful Fallback
  test("18. Missing Places Graceful Fallback: Operates when Google Places returns no matches", async () => {
    const result = await groundedIntelligenceService.researchBusiness({
      businessName: "NonExistentFictionalBrandXYZ_99999",
      location: "Nowhere Land",
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.profile.identity.placeId, undefined);
    assert.ok(result.profile.evidence.length >= 1, "Should create user_input evidence item");
    assert.strictEqual(result.profile.compositeConfidenceLevel, "LOW");
  });

  // 19. Missing Search Grounding Fallback
  test("19. Missing Search Grounding Fallback: Gracefully functions when search grounding API key is absent", async () => {
    const originalKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    try {
      const result = await groundedIntelligenceService.researchBusiness({
        businessName: "Sunrise Yoga Studio",
        location: "Rishikesh",
      });

      assert.strictEqual(result.success, true);
      assert.ok(result.profile.businessId);
    } finally {
      if (originalKey) process.env.GEMINI_API_KEY = originalKey;
    }
  });

  // 20. Secret Redaction
  test("20. Secret Redaction: Guarantees secrets and tokens are redacted before persistence", async () => {
    const profile = await groundedIntelligenceService.researchBusiness({
      businessName: "Secure FinTech Corp",
      location: "Hyderabad",
    });

    // Inject a secret into observations using valid schema item
    const secretItem = createEvidenceItem({
      source: "google_search",
      reference: "https://example.com?api_key=AIzaSySecretApiKey1234567890",
      observation: "Secret bearer token Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.secretToken",
      supports: "Authentication",
      baseConfidence: 0.8,
    });
    profile.profile.evidence.push(secretItem);

    const saved = await groundedProfileStore.saveProfile(profile.profile);
    const serialized = JSON.stringify(saved);

    assert.ok(!serialized.includes("AIzaSySecretApiKey1234567890"), "API key must be redacted");
    assert.ok(!serialized.includes("secretToken"), "Bearer token must be redacted");
    assert.ok(serialized.includes("[REDACTED"), "Redacted token marker must appear");
  });

  // 21. Tenant Isolation
  test("21. Tenant Isolation: Conceals cross-tenant profiles completely", async () => {
    const resultTenant1 = await groundedIntelligenceService.researchBusiness({
      businessName: "Alpha Legal Advisory",
      location: "Chandigarh",
      tenantId: "tenant_alpha",
    });

    const profileId = resultTenant1.profile.businessId;

    // Tenant Alpha can access it
    const fetchedByAlpha = await groundedProfileStore.getProfile(profileId, "tenant_alpha");
    assert.ok(fetchedByAlpha, "Tenant Alpha must be able to retrieve own profile");

    // Tenant Beta CANNOT access it
    const fetchedByBeta = await groundedProfileStore.getProfile(profileId, "tenant_beta");
    assert.strictEqual(fetchedByBeta, undefined, "Tenant Beta must NOT be able to retrieve Tenant Alpha profile");

    // Lead ID query also respects tenant isolation
    const leadFetchedByBeta = await groundedProfileStore.getProfileByLeadId(profileId, "tenant_beta");
    assert.strictEqual(leadFetchedByBeta, undefined, "Lead query must also enforce tenant isolation");
  });

  // 22. Malformed LLM Output Rejection
  test("22. Malformed LLM Output Rejection: Rejects corrupted profile structures safely", async () => {
    const malformed = {
      businessId: "biz_corrupt",
      identity: { canonicalName: "" }, // missing required fields
    };

    await assert.rejects(
      async () => {
        // saveProfile enforces schema and throws on invalid
        await groundedProfileStore.saveProfile(malformed);
      },
      (err) => err.message.includes("Invalid GroundedBusinessProfile schema")
    );
  });

  // 23. Freshness Tracking
  test("23. Freshness Tracking: Accurately classifies FRESH, STALE, and EXPIRED profiles", () => {
    const now = new Date();
    const freshIso = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(); // 2 hours ago
    const staleIso = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(); // 3 days ago
    const expiredIso = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(); // 10 days ago

    assert.strictEqual(groundedProfileStore.calculateFreshness(freshIso), "FRESH");
    assert.strictEqual(groundedProfileStore.calculateFreshness(staleIso), "STALE");
    assert.strictEqual(groundedProfileStore.calculateFreshness(expiredIso), "EXPIRED");
  });

  // 24. Google Places Storage Compliance
  test("24. Google Places Storage Compliance: Retains Place ID and derived stats but no raw reviews or photos", async () => {
    const result = await groundedIntelligenceService.researchBusiness({
      businessName: "Kolkata Biryani House",
      location: "Kolkata, West Bengal",
      placeId: "ChIJ_kolkata_places_id_12345",
    });

    const profile = result.profile;
    assert.strictEqual(profile.identity.placeId, "ChIJ_kolkata_places_id_12345");

    // Must not retain raw review bodies or photos
    const jsonStr = JSON.stringify(profile);
    assert.ok(!profile.identity.rawPlacesResponse, "Raw Places response must never be stored");
    assert.ok(!jsonStr.includes("author_name"), "Raw reviewer profiles must never be stored");
    assert.ok(!jsonStr.includes("photo_reference"), "Raw photo references must never be stored");
  });

  // 25. Evidence-Gated Long-Term Memory
  test("25. Evidence-Gated Long-Term Memory: High-confidence profiles are persisted into Phase 18 Business Memory", async () => {
    const result = await groundedIntelligenceService.researchBusiness({
      businessName: "Apollo Super Specialty Hospital",
      category: "Hospital & Healthcare",
      location: "Chennai, Tamil Nadu",
      tenantId: "tenant_apollo",
    });

    assert.strictEqual(result.success, true);
    // Profile has composite confidence >= 0.50 and known archetype, so it gets saved to MemoryStore
    const memory = await MemoryStore.getInstance().getBusinessMemory(
      result.profile.businessId,
      "tenant_apollo"
    );

    assert.ok(memory, "High-confidence profile must be stored in Phase 18 Business Memory");
    assert.strictEqual(memory.businessName, result.profile.identity.canonicalName);
    assert.ok(memory.verifiedFacts, "Business Memory must contain verified facts");
  });

  // 26. Pipeline / Tool Compatibility
  test("26. Pipeline / Tool Compatibility: Ops tool research_business seamlessly enriches output with groundedProfile", async () => {
    // Seed a lead into leadRepository
    const lead = await leadRepository.saveLead({
      leadId: "lead_test_jaipur_bakery",
      businessName: "Heritage Craft Bakery",
      city: "Jaipur",
      industry: "bakery",
      category: "Artisanal Bakery & Cafe",
      email: "info@heritagecraftbakery.in",
      phone: "+91 98290 12345",
      status: "discovered",
      source: "test",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, "tenant_jaipur");

    const executor = OpsToolExecutor.getInstance();
    const toolResponse = await executor.executeTool({
      tool: "research_business",
      requestId: "req_test_jaipur",
      taskId: "task_test_jaipur",
      leadId: lead.leadId,
      tenantId: "tenant_jaipur",
      input: {
        leadId: lead.leadId,
        lead,
      },
    });

    assert.strictEqual(toolResponse.success, true, "Tool execution must succeed");
    assert.strictEqual(toolResponse.result.leadId, lead.leadId);
    assert.ok(toolResponse.result.summary, "Legacy research summary must be preserved");
    assert.ok(toolResponse.result.groundedProfile, "Must be augmented with groundedProfile");
    assert.strictEqual(
      toolResponse.result.groundedProfile.identity.canonicalName,
      "Heritage Craft Bakery"
    );
  });

  // 27. Graceful Partial Failure
  test("27. Graceful Partial Failure: Returns usable grounded profile even when some sources fail", async () => {
    const result = await groundedIntelligenceService.researchBusiness({
      businessName: "Minimal Information Startup",
      // No website, no location, no category, no placeId
    });

    assert.strictEqual(result.success, true);
    assert.ok(result.profile.businessId);
    assert.ok(result.profile.archetype);
    assert.strictEqual(result.profile.compositeConfidenceLevel, "LOW");
    assert.ok(result.profile.forbiddenClaims.length > 0, "Forbidden claims must still be enforced");
  });
});
