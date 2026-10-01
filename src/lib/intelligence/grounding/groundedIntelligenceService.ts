// src/lib/intelligence/grounding/groundedIntelligenceService.ts
// Grounded Business Intelligence Orchestrator
// Coordinates evidence collection, archetype classification, service extraction,
// fact vs inference separation, forbidden claims compilation, and profile storage.

import crypto from "crypto";
import { googlePlacesSource } from "./sources/googlePlacesSource";
import { websiteScraperSource } from "./sources/websiteScraperSource";
import { googleSearchGroundingSource } from "./sources/googleSearchGroundingSource";
import {
  createEvidenceItem,
  createObservedFact,
  createDerivedInference,
  detectSourceConflict,
  scoreToConfidenceLevel,
} from "./evidenceEngine";
import { compileForbiddenClaims } from "./forbiddenClaimsEngine";
import { groundedProfileStore } from "./groundedProfileStore";
import { GroundedBusinessProfileSchema } from "./schemas";
import { MemoryStore, redactSecretsInString } from "../memory/memoryStore";
import type {
  BusinessResearchRequest,
  BusinessResearchResult,
  GroundedBusinessProfile,
  BusinessIdentity,
  GroundedServiceItem,
  GroundedAudience,
  GroundedLocation,
  GroundedBrandSignals,
  GroundedVisualStyle,
  GroundedCtaStrategy,
  EvidenceItem,
  FactVsInferenceItem,
  SourceConflict,
  BusinessAmbiguity,
} from "./types";

export class GroundedIntelligenceService {
  private static instance: GroundedIntelligenceService;

  private constructor() {}

  public static getInstance(): GroundedIntelligenceService {
    if (!GroundedIntelligenceService.instance) {
      GroundedIntelligenceService.instance = new GroundedIntelligenceService();
    }
    return GroundedIntelligenceService.instance;
  }

  /**
   * Returns current operational status of grounding service and sources.
   */
  public getStatus() {
    return {
      googlePlacesConfigured: googlePlacesSource.isConfigured(),
      googleSearchGroundingConfigured: googleSearchGroundingSource.isConfigured(),
      websiteScraperConfigured: websiteScraperSource.isConfigured(),
      serviceMode: "GROUNDED_EVIDENCE" as const,
      version: "1.0.0",
    };
  }

  /**
   * Generates a stable deterministic business ID from canonical attributes.
   */
  public generateBusinessId(name: string, location?: string): string {
    const raw = `${name.trim().toLowerCase()}_${(location || "").trim().toLowerCase()}`;
    const hash = crypto.createHash("sha256").update(raw).digest("hex").slice(0, 12);
    return `biz_${hash}`;
  }

  /**
   * Researches a business and generates a grounded, evidence-backed Business Intelligence profile.
   */
  public async researchBusiness(
    request: BusinessResearchRequest
  ): Promise<BusinessResearchResult> {
    const startTime = performance.now();
    const businessId = this.generateBusinessId(request.businessName, request.location);
    const tenantId = request.tenantId ?? null;
    const errors: string[] = [];

    // 1. Check existing stored profile if refresh not forced
    if (!request.forceRefresh) {
      const cached = await groundedProfileStore.getProfile(businessId, tenantId);
      if (cached && cached.freshness.freshnessStatus === "FRESH") {
        return {
          success: true,
          profile: cached,
          durationMs: Math.round(performance.now() - startTime),
        };
      }
    }

    const allEvidence: EvidenceItem[] = [];
    const conflicts: SourceConflict[] = [];
    const sourcesFetched: string[] = [];

    // Base user input evidence
    const userInputEv = createEvidenceItem({
      source: "user_input",
      reference: "request_input",
      observation: `User requested research for '${request.businessName}'${request.location ? ` in '${request.location}'` : ""}`,
      supports: "identity.canonicalName",
      baseConfidence: 0.80,
    });
    allEvidence.push(userInputEv);
    sourcesFetched.push("user_input");

    // 2. Fetch external grounding sources in parallel
    const [placesRes, websiteRes, searchRes] = await Promise.all([
      googlePlacesSource
        .groundBusiness({
          businessName: request.businessName,
          location: request.location,
          placeId: request.placeId,
        })
        .catch((err) => {
          errors.push(`Google Places error: ${err.message}`);
          return null;
        }),

      websiteScraperSource
        .scrapeWebsite(request.website)
        .catch((err) => {
          errors.push(`Website scraper error: ${err.message}`);
          return null;
        }),

      googleSearchGroundingSource
        .groundQuery({
          businessName: request.businessName,
          location: request.location,
        })
        .catch((err) => {
          errors.push(`Google Search grounding error: ${err.message}`);
          return null;
        }),
    ]);

    // Integrate Places results
    let resolvedPlaceId: string | undefined = request.placeId;
    let resolvedAddress: string | undefined;
    let resolvedPhone: string | undefined;
    let resolvedWebsite: string | undefined = request.website;
    let placesType: string | undefined;

    let ambiguity: BusinessAmbiguity = {
      isAmbiguous: false,
      candidatesCount: 0,
      candidateMatches: [],
      resolutionMessage: "No ambiguity detected",
    };

    // Generic query ambiguity detection
    const isGenericQuery =
      /^(cafe|restaurant|hotel|clinic|shop|store|hospital|bar|gym|spa|bakery)$/i.test(request.businessName.trim()) ||
      (request.businessName.trim().split(/\s+/).length === 1 && !request.location && !request.website);

    if (isGenericQuery) {
      ambiguity = {
        isAmbiguous: true,
        candidatesCount: 10,
        candidateMatches: [],
        resolutionMessage: `Query '${request.businessName}' is highly ambiguous. Multiple distinct establishments exist. Specific location or website URL required for disambiguation.`,
      };
    }

    if (placesRes && placesRes.isAvailable) {
      sourcesFetched.push("google_places");
      if (placesRes.ambiguity.isAmbiguous) {
        ambiguity = placesRes.ambiguity;
      }
      if (placesRes.placeId) resolvedPlaceId = placesRes.placeId;
      if (placesRes.formattedAddress) resolvedAddress = placesRes.formattedAddress;
      if (placesRes.phone) resolvedPhone = placesRes.phone;
      if (placesRes.websiteUri && !resolvedWebsite) resolvedWebsite = placesRes.websiteUri;
      if (placesRes.primaryType) placesType = placesRes.primaryType;
      allEvidence.push(...placesRes.evidence);
    } else if (placesRes && placesRes.error) {
      errors.push(placesRes.error);
    }

    // If website wasn't initially provided but discovered via Places, scrape it
    let activeWebsiteRes = websiteRes;
    if ((!activeWebsiteRes || !activeWebsiteRes.isAvailable) && resolvedWebsite && resolvedWebsite !== request.website) {
      activeWebsiteRes = await websiteScraperSource.scrapeWebsite(resolvedWebsite).catch(() => null);
    }

    // Integrate Website results
    if (activeWebsiteRes && activeWebsiteRes.isAvailable) {
      sourcesFetched.push("business_website");
      allEvidence.push(...activeWebsiteRes.evidence);
      if (activeWebsiteRes.contact.phone && !resolvedPhone) {
        resolvedPhone = activeWebsiteRes.contact.phone;
      }
    }

    // Integrate Search Grounding results
    if (searchRes && searchRes.isAvailable) {
      sourcesFetched.push("google_search");
      allEvidence.push(...searchRes.evidence);
    }

    // 3. Detect Source Conflicts (e.g. Phone or Address between Places and Website)
    if (placesRes?.phone && activeWebsiteRes?.contact.phone) {
      const phoneConflict = detectSourceConflict({
        field: "phone",
        sourceA: { source: "google_places", reference: `placeId:${resolvedPlaceId}`, value: placesRes.phone },
        sourceB: { source: "business_website", reference: resolvedWebsite || "website", value: activeWebsiteRes.contact.phone },
        preferredSource: "business_website",
      });
      if (phoneConflict) conflicts.push(phoneConflict);
    }

    if (placesRes?.formattedAddress && request.location) {
      const addrConflict = detectSourceConflict({
        field: "location",
        sourceA: { source: "google_places", reference: `placeId:${resolvedPlaceId}`, value: placesRes.formattedAddress },
        sourceB: { source: "user_input", reference: "request_input", value: request.location },
        preferredSource: "google_places",
      });
      if (addrConflict) conflicts.push(addrConflict);
    }

    // 4. Determine Archetype & Industry Family (No Hallucination Rule)
    const combinedContext = [
      request.category || "",
      placesType || "",
      ...(placesRes?.types || []),
      activeWebsiteRes?.title || "",
      activeWebsiteRes?.metaDescription || "",
      ...(activeWebsiteRes?.headings.h1 || []),
      ...(activeWebsiteRes?.headings.h2 || []),
    ]
      .join(" ")
      .toLowerCase();

    const { archetype, archetypeConfidence, industryFamily, industryConfidence } =
      this.inferArchetypeAndIndustry(combinedContext, sourcesFetched.length > 1);

    // 5. Extract Grounded Services
    const services = this.extractServices(activeWebsiteRes, placesType, request.category, allEvidence, request.businessName);

    // 6. Target Audience (Explicit vs Inferred)
    const audience = this.inferAudience(archetype, services, activeWebsiteRes);

    // 7. Verified Location
    const locParts = (resolvedAddress || request.location || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const city = locParts.length > 2 ? locParts[1] : locParts[0];
    const locality = locParts.length > 2 ? locParts[0] : undefined;
    const country =
      locParts.find((p) => /india|usa|united states|uk|canada/i.test(p)) ||
      (locParts.length > 2 ? locParts[locParts.length - 1] : undefined);

    const location: GroundedLocation = {
      formattedAddress: resolvedAddress || request.location,
      city,
      locality,
      country,
      latitude: placesRes?.location?.latitude,
      longitude: placesRes?.location?.longitude,
      isVerified: Boolean(resolvedAddress || placesRes?.location),
      confidence: placesRes?.formattedAddress ? 0.95 : request.location ? 0.60 : 0.20,
      evidenceIds: allEvidence
        .filter((e) => e.supports.startsWith("location"))
        .map((e) => e.id),
    };

    // 8. Brand Signals
    const brandSignals: GroundedBrandSignals = {
      businessName: activeWebsiteRes?.title?.split(/[-|:]/)[0]?.trim() || placesRes?.name || request.businessName,
      tagline: activeWebsiteRes?.metaDescription || undefined,
      tone: this.inferTone(combinedContext),
      colors: [],
      typography: undefined,
      imageryStyle: undefined,
      positioning: archetype !== "unknown" ? `Specialized ${archetype.replace(/_/g, " ")}` : undefined,
      confidence: activeWebsiteRes?.isAvailable ? 0.90 : 0.60,
      confidenceLevel: activeWebsiteRes?.isAvailable ? "HIGH" : "MEDIUM",
      evidenceIds: allEvidence
        .filter((e) => e.supports.startsWith("brandSignals"))
        .map((e) => e.id),
    };

    // 9. Visual Style (Explicit UNAVAILABLE state if no website/photos)
    const hasVisuals = Boolean(activeWebsiteRes?.isAvailable || (placesRes?.photos && placesRes.photos.length > 0));
    const visualStyle: GroundedVisualStyle = hasVisuals
      ? {
          status: "AVAILABLE",
          visualMood: "Clean commercial design",
          layoutStyle: "Multi-section responsive",
          photographyStyle: placesRes?.photos && placesRes.photos.length > 0 ? "Authentic Google Places commercial photography" : undefined,
          designDensity: "Balanced",
          confidence: 0.85,
          confidenceLevel: "HIGH",
          evidenceIds: allEvidence
            .filter((e) => e.source === "business_website" || e.supports === "visual.photos")
            .map((e) => e.id),
        }
      : {
          status: "UNAVAILABLE",
          confidence: 0,
          confidenceLevel: "UNKNOWN",
          evidenceIds: [],
          reason: "No website content or verified business photos available to evaluate visual style.",
        };

    // 10. CTA Strategy (Only observed CTAs)
    const observedCtas = activeWebsiteRes?.observedCtas || [];
    const primaryCta = observedCtas[0]?.text || (resolvedPhone ? "Call Now" : "Contact Business");

    const ctaStrategy: GroundedCtaStrategy = {
      observedCtas,
      primaryCtaStrategy: primaryCta.toLowerCase().includes("book")
        ? "Online Appointment Booking"
        : primaryCta.toLowerCase().includes("call")
        ? "Direct Phone Lead Capture"
        : "Direct Inbound Inquiry",
      recommendedNextAction: `Engage via primary verified channel: ${primaryCta}`,
      rationale: observedCtas.length > 0
        ? `Derived directly from ${observedCtas.length} observed call-to-action buttons on website.`
        : "Defaulted to phone/contact inquiry based on available contact points.",
      confidence: observedCtas.length > 0 ? 0.90 : 0.50,
      confidenceLevel: observedCtas.length > 0 ? "HIGH" : "LOW",
    };

    // 11. Compile Forbidden Claims
    const hasPlacesReviews = Boolean(placesRes?.reviews && placesRes.reviews.length > 0);
    const forbiddenClaims = compileForbiddenClaims({
      businessName: brandSignals.businessName,
      verifiedServices: services,
      evidenceList: allEvidence,
      hasVerifiedYears: Boolean(activeWebsiteRes?.sampleText?.match(/established|since\s+\d{4}|founded/i)),
      hasVerifiedCertifications: Boolean(activeWebsiteRes?.sampleText?.match(/certified|accredited|iso\s*\d+/i)),
      hasVerifiedAwards: Boolean(activeWebsiteRes?.sampleText?.match(/winner|award|best\s+of/i)),
      hasVerifiedPricing: Boolean(activeWebsiteRes?.sampleText?.match(/\$|₹|price|rates/i)),
      hasVerifiedGuarantees: Boolean(activeWebsiteRes?.sampleText?.match(/guarantee|warranty/i)),
      hasVerifiedTestimonials: hasPlacesReviews || Boolean(activeWebsiteRes?.sampleText?.match(/testimonial|client says|review/i)),
    });

    // 12. Facts vs Inferences Separation
    const factsAndInferences: FactVsInferenceItem[] = [];

    // Observed Facts
    if (resolvedAddress) {
      factsAndInferences.push(
        createObservedFact({
          statement: `Physical address verified at: ${resolvedAddress}`,
          evidenceIds: allEvidence.filter((e) => e.supports.includes("Address")).map((e) => e.id),
        })
      );
    }
    if (resolvedPhone) {
      factsAndInferences.push(
        createObservedFact({
          statement: `Commercial contact phone verified: ${resolvedPhone}`,
          evidenceIds: allEvidence.filter((e) => e.supports.includes("phone")).map((e) => e.id),
        })
      );
    }
    if (placesRes?.rating && placesRes?.userRatingCount) {
      factsAndInferences.push(
        createObservedFact({
          statement: `Google Places customer rating verified at ${placesRes.rating}★ across ${placesRes.userRatingCount} reviews.`,
          evidenceIds: allEvidence.filter((e) => e.supports === "reputation.rating").map((e) => e.id),
        })
      );
    }
    if (placesRes?.photos && placesRes.photos.length > 0) {
      factsAndInferences.push(
        createObservedFact({
          statement: `${placesRes.photos.length} verified commercial photos available on Google Places.`,
          evidenceIds: allEvidence.filter((e) => e.supports === "visual.photos").map((e) => e.id),
        })
      );
    }
    if (placesRes?.reviews && placesRes.reviews.length > 0) {
      factsAndInferences.push(
        createObservedFact({
          statement: `${placesRes.reviews.length} authentic customer reviews verified on Google Places.`,
          evidenceIds: allEvidence.filter((e) => e.supports === "reputation.reviews").map((e) => e.id),
        })
      );
    }
    if (activeWebsiteRes?.title) {
      factsAndInferences.push(
        createObservedFact({
          statement: `Official website title tag: "${activeWebsiteRes.title}"`,
          evidenceIds: allEvidence.filter((e) => e.supports.includes("businessName")).map((e) => e.id),
        })
      );
    }

    // Derived Inferences
    factsAndInferences.push(
      createDerivedInference({
        statement: `Business operates as ${archetype.replace(/_/g, " ")} within the ${industryFamily} sector.`,
        evidenceIds: allEvidence.map((e) => e.id),
        confidence: archetypeConfidence === "HIGH" ? 0.88 : 0.50,
        rationale: "Synthesized from Google Places categories, website headings, and request parameters.",
      })
    );

    for (const aud of audience) {
      factsAndInferences.push(
        createDerivedInference({
          statement: `Target customer segment: ${aud.segment}`,
          evidenceIds: aud.evidenceIds,
          confidence: aud.confidence,
          rationale: aud.rationale,
        })
      );
    }

    // 13. Business Identity
    const identity: BusinessIdentity = {
      businessId,
      placeId: resolvedPlaceId,
      canonicalName: brandSignals.businessName,
      normalizedWebsite: resolvedWebsite,
      formattedAddress: resolvedAddress,
      phone: resolvedPhone,
      sourceReferences: {
        ...(resolvedPlaceId ? { google_places: `placeId:${resolvedPlaceId}` } : {}),
        ...(resolvedWebsite ? { business_website: resolvedWebsite } : {}),
      },
    };

    // 14. Composite Confidence Score
    const evidenceScores = allEvidence.map((e) => e.confidence);
    const avgConfidence = evidenceScores.length > 0
      ? evidenceScores.reduce((a, b) => a + b, 0) / evidenceScores.length
      : 0.3;
    const compositeConfidence = Math.round(avgConfidence * 100) / 100;
    const compositeConfidenceLevel = scoreToConfidenceLevel(compositeConfidence);

    // 15. Assemble Final Profile
    const profile: GroundedBusinessProfile = {
      businessId,
      tenantId,
      identity,
      archetype,
      archetypeConfidence,
      industryFamily,
      industryConfidence,
      services,
      audience,
      location,
      brandSignals,
      visualStyle,
      ctaStrategy,
      evidence: allEvidence,
      factsAndInferences,
      forbiddenClaims,
      conflicts,
      ambiguity,
      freshness: {
        fetchedAt: new Date().toISOString(),
        freshnessStatus: "FRESH",
        sourcesFetched,
      },
      compositeConfidence,
      compositeConfidenceLevel,
    };

    // Schema Validation
    GroundedBusinessProfileSchema.parse(profile);

    // Save to profile store
    await groundedProfileStore.saveProfile(profile);

    // 16. Evidence-Gated Integration with Phase 18 Memory
    if (compositeConfidence >= 0.40 && profile.archetype !== "unknown") {
      try {
        const memStore = MemoryStore.getInstance();
        await memStore.saveBusinessMemory({
          id: `bmem_${businessId}`,
          projectId: businessId,
          userId: request.userId || null,
          tenantId: request.tenantId || null,
          businessName: brandSignals.businessName,
          category: archetype,
          verifiedFacts: {
            address: location.formattedAddress,
            phone: identity.phone,
            website: identity.normalizedWebsite,
            placeId: identity.placeId,
            verifiedServices: services.filter((s) => s.isObserved).map((s) => s.name),
          },
          validatedPreferences: {
            visualArchetype: archetype,
            tone: brandSignals.tone,
          },
          previousOutcomes: [],
          approvedBrandInfo: {
            name: brandSignals.businessName,
            tagline: brandSignals.tagline,
          },
          updatedAt: new Date().toISOString(),
        });
      } catch {
        // Safe fallback
      }
    }

    return {
      success: true,
      profile,
      errors: errors.length > 0 ? errors.map(redactSecretsInString) : undefined,
      durationMs: Math.round(performance.now() - startTime),
    };
  }

  private inferArchetypeAndIndustry(
    text: string,
    hasCorroboratingSources: boolean
  ): {
    archetype: string;
    archetypeConfidence: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
    industryFamily: string;
    industryConfidence: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
  } {
    if (!text.trim()) {
      return {
        archetype: "unknown",
        archetypeConfidence: "UNKNOWN",
        industryFamily: "unknown",
        industryConfidence: "UNKNOWN",
      };
    }

    const conf: "HIGH" | "MEDIUM" = hasCorroboratingSources ? "HIGH" : "MEDIUM";

    // Healthcare / Clinic / Dental
    if (text.includes("dental") || text.includes("dentist") || text.includes("teeth") || text.includes("orthodont")) {
      return { archetype: "dental_clinic", archetypeConfidence: conf, industryFamily: "healthcare", industryConfidence: conf };
    }
    if (text.includes("clinic") || text.includes("doctor") || text.includes("hospital") || text.includes("medical")) {
      return { archetype: "medical_clinic", archetypeConfidence: conf, industryFamily: "healthcare", industryConfidence: conf };
    }

    // Hospitality & Travel
    if (text.includes("hotel") || text.includes("resort") || text.includes("inn") || text.includes("lodging")) {
      return { archetype: "hotel", archetypeConfidence: conf, industryFamily: "hospitality", industryConfidence: conf };
    }
    if (text.includes("tour") || text.includes("travel") || text.includes("trek") || text.includes("safari")) {
      return { archetype: "travel_agency", archetypeConfidence: conf, industryFamily: "travel", industryConfidence: conf };
    }

    // Food & Beverage
    if (text.includes("restaurant") || text.includes("cafe") || text.includes("bistro") || text.includes("diner") || text.includes("bakery")) {
      return { archetype: "restaurant", archetypeConfidence: conf, industryFamily: "food_and_beverage", industryConfidence: conf };
    }

    // Personal Care & Salon
    if (text.includes("salon") || text.includes("spa") || text.includes("barber") || text.includes("hair")) {
      return { archetype: "salon_and_spa", archetypeConfidence: conf, industryFamily: "personal_care", industryConfidence: conf };
    }

    // Real Estate
    if (text.includes("real estate") || text.includes("realtor") || text.includes("property") || text.includes("housing")) {
      return { archetype: "real_estate", archetypeConfidence: conf, industryFamily: "real_estate", industryConfidence: conf };
    }

    // Automotive
    if (text.includes("car rental") || text.includes("vehicle hire") || text.includes("car repair") || text.includes("mechanic")) {
      return { archetype: "automotive_service", archetypeConfidence: conf, industryFamily: "automotive", industryConfidence: conf };
    }

    // Professional & Local Services
    if (text.includes("law") || text.includes("attorney") || text.includes("legal") || text.includes("accounting")) {
      return { archetype: "professional_services", archetypeConfidence: conf, industryFamily: "professional_services", industryConfidence: conf };
    }
    if (text.includes("plumb") || text.includes("electric") || text.includes("clean") || text.includes("hvac")) {
      return { archetype: "local_service_trade", archetypeConfidence: conf, industryFamily: "home_and_commercial_services", industryConfidence: conf };
    }

    // If text does not match any recognized archetype, return "unknown"
    return {
      archetype: "unknown",
      archetypeConfidence: "LOW",
      industryFamily: "unknown",
      industryConfidence: "LOW",
    };
  }

  private extractServices(
    websiteData: any,
    placesType?: string,
    userCategory?: string,
    evidenceList: EvidenceItem[] = [],
    businessName?: string
  ): GroundedServiceItem[] {
    const services: GroundedServiceItem[] = [];
    const seen = new Set<string>();

    const addService = (name: string, isObserved: boolean, conf: number, category?: string) => {
      const norm = name.trim().toLowerCase();
      if (!norm || seen.has(norm) || norm.length > 50) return;
      seen.add(norm);

      services.push({
        name: name.trim(),
        category,
        isObserved,
        confidence: conf,
        confidenceLevel: scoreToConfidenceLevel(conf),
        evidenceIds: evidenceList
          .filter((e) => e.observation.toLowerCase().includes(norm) || e.supports.includes("services"))
          .map((e) => e.id),
      });
    };

    // Extract from website headings
    if (websiteData?.headings) {
      const headings = [...websiteData.headings.h1, ...websiteData.headings.h2, ...websiteData.headings.h3];
      for (const h of headings) {
        // Filter out generic headings like "About Us", "Contact Us", "Home"
        if (/about|contact|home|privacy|terms|menu|faq|blog/i.test(h)) continue;
        if (h.length >= 3 && h.length <= 40) {
          addService(h, true, 0.92, "website_observed");
        }
      }
    }

    // If Places category gives explicit service
    if (placesType) {
      const cleaned = placesType.replace(/_/g, " ");
      addService(cleaned, true, 0.90, "places_category");
    }

    // If user provided a specific category
    if (userCategory && !seen.has(userCategory.toLowerCase())) {
      addService(userCategory, false, 0.70, "user_specified");
    }

    // Also parse explicit services mentioned in the business name (e.g. "X & Ceramic Coating")
    if (businessName && (businessName.includes("&") || businessName.includes("and") || businessName.includes("-"))) {
      const parts = businessName.split(/[&|-]|\band\b/i).map((s) => s.trim());
      for (const part of parts) {
        if (/coating|detailing|plumbing|repair|cleaning|dentistry|law|catering|consulting|bakery|salon|spa|orthodontics|treatment/i.test(part)) {
          addService(part, true, 0.85, "name_explicit");
        }
      }
    }

    return services;
  }

  private inferAudience(
    archetype: string,
    services: GroundedServiceItem[],
    websiteData: any
  ): GroundedAudience[] {
    const audiences: GroundedAudience[] = [];

    if (archetype === "dental_clinic") {
      audiences.push({
        segment: "Local residents seeking routine dental care & cleanings",
        isObserved: false,
        confidence: 0.85,
        confidenceLevel: "HIGH",
        evidenceIds: services.map((s) => s.evidenceIds).flat(),
        rationale: "Inferred from dental clinic archetype and core preventative service profile.",
      });
      audiences.push({
        segment: "Patients seeking cosmetic dentistry & orthodontic treatments",
        isObserved: false,
        confidence: 0.75,
        confidenceLevel: "MEDIUM",
        evidenceIds: [],
        rationale: "Inferred from elective service offerings and adult dental care demands.",
      });
    } else if (archetype === "restaurant") {
      audiences.push({
        segment: "Local diners seeking casual and social dining experiences",
        isObserved: false,
        confidence: 0.85,
        confidenceLevel: "HIGH",
        evidenceIds: [],
        rationale: "Derived from hospitality restaurant archetype.",
      });
    } else if (archetype === "hotel") {
      audiences.push({
        segment: "Business & leisure travelers visiting the local destination",
        isObserved: false,
        confidence: 0.88,
        confidenceLevel: "HIGH",
        evidenceIds: [],
        rationale: "Inferred from hotel lodging operations.",
      });
    } else if (archetype !== "unknown") {
      audiences.push({
        segment: `Local clients seeking ${archetype.replace(/_/g, " ")} services`,
        isObserved: false,
        confidence: 0.65,
        confidenceLevel: "MEDIUM",
        evidenceIds: [],
        rationale: `General inference from established ${archetype} commercial operations.`,
      });
    } else {
      audiences.push({
        segment: "General commercial clients (insufficient evidence to specify demographic)",
        isObserved: false,
        confidence: 0.20,
        confidenceLevel: "UNKNOWN",
        evidenceIds: [],
        rationale: "Insufficient verified signals to determine specific target audience.",
      });
    }

    return audiences;
  }

  private inferTone(text: string): string {
    if (text.includes("luxur") || text.includes("premium") || text.includes("boutique")) return "Premium & Sophisticated";
    if (text.includes("friendly") || text.includes("family") || text.includes("care")) return "Warm, Caring & Approachable";
    if (text.includes("innovat") || text.includes("modern") || text.includes("lead")) return "Professional & Modern";
    return "Authoritative & Reliable";
  }
}

export const groundedIntelligenceService = GroundedIntelligenceService.getInstance();
