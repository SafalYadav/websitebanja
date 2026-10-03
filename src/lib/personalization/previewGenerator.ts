// src/lib/personalization/previewGenerator.ts
/**
 * WebsiteBanja Personalized Preview Generation Engine
 * Phase: Phase 10 (Automated Personalized Preview Generation)
 *
 * Integrates:
 *   Phase 8 Qualified Lead + Phase 9 Audit & Research +
 *   Phase 6 Premium Design Engine + Phase 6.1 Semantic Image Deduplication +
 *   Hero Contrast Protection + Quality Validation -> Local Preview URL & Phase 11 Handoff
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { leadRepository } from "@/lib/discovery/leadRepository";
import { auditRepository } from "@/lib/audit/auditRepository";
import { createSyntheticMissingWebsiteAudit, synthesizePhase10DesignInputs } from "@/lib/audit/auditEngine";
import { normalizeIndustry, generateDesignRules } from "@/lib/ai/design/designRules";
import {
  generateDesignStrategy,
  deriveVisualArchetype,
  deriveSectionSequence,
} from "@/lib/ai/designStrategy";
import { compileDesignBrief } from "@/lib/ai/design/designBrief";
import { validateWebsiteQuality } from "@/lib/ai/design/qualityValidator";
import { resolveSemanticImage, canonicalizeImageUrl } from "@/lib/images/semanticImageSourcing";
import { validateAndProtectHeroContrast } from "./heroContrastValidator";
import { emitAgentEvent } from "@/lib/telemetry/agentTelemetry";
import { groundedProfileStore } from "@/lib/intelligence/grounding/groundedProfileStore";
import { groundedAssetSelector } from "@/lib/intelligence/grounding/groundedAssetSelector";
import { applyGroundedAssetsToWebsite } from "@/lib/intelligence/grounding/groundedWebsiteGenerator";
import { GroundedIntelligenceService } from "@/lib/intelligence/grounding/groundedIntelligenceService";
import { businessSemanticReasoner } from "@/lib/intelligence/semantic/businessSemanticReasoner";
import { containsSemanticPhrase } from "@/lib/intelligence/semantic/businessSemanticReasoner";
import type { BusinessSemanticProfile } from "@/lib/intelligence/semantic/businessSemanticReasoner";
import { StrategyManager } from "@/lib/intelligence/learning/strategyManager";
import type { GroundedBusinessProfile } from "@/lib/intelligence/grounding/types";
import type { WebsiteRequirement } from "@/lib/ai/requirementModel";
import type { WebsiteData, FAQ, Service, Feature } from "@/types/website";
import type { BusinessLead } from "@/lib/discovery/types";
import type { LeadAuditReport } from "@/lib/audit/types";
import type {
  PersonalizedPreviewRequest,
  PersonalizedPreviewResponse,
  ImageManifestEntry,
  StoredPreviewRecord,
  OutreachContext,
} from "./types";

const PREVIEW_DIR = path.join(process.cwd(), "scratch", "previews");
const MANIFEST_PATH = path.join(PREVIEW_DIR, "manifest.json");

function ensurePreviewStorage() {
  if (!fs.existsSync(PREVIEW_DIR)) {
    fs.mkdirSync(PREVIEW_DIR, { recursive: true });
  }
  if (!fs.existsSync(MANIFEST_PATH)) {
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify([], null, 2), "utf-8");
  }
}

function readStoredManifest(): StoredPreviewRecord[] {
  try {
    ensurePreviewStorage();
    const content = fs.readFileSync(MANIFEST_PATH, "utf-8");
    return JSON.parse(content);
  } catch {
    return [];
  }
}

function writeStoredManifest(manifest: StoredPreviewRecord[]) {
  ensurePreviewStorage();
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf-8");
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

/**
 * Derives rich, personalized service offerings based on industry and business context
 */
export function derivePersonalizedServices(
  lead: BusinessLead,
  industry: string,
  contentPriorities: string[],
  semanticProfile?: BusinessSemanticProfile
): Array<{ title: string; description: string; price?: string }> {
  const norm = `${industry} ${lead.industry || ""} ${lead.category || ""} ${lead.businessName || ""}`.toLowerCase();
  const name = lead.businessName;

  if (semanticProfile && semanticProfile.confidence >= 0.7 && semanticProfile.recommendedServices.length > 0) {
    return semanticProfile.recommendedServices;
  }

  if (norm.includes("hotel") || norm.includes("hospitality") || norm.includes("resort")) {
    return [
      {
        title: "Oceanfront Cliffside Villas",
        description: `Bespoke residential suites at ${name} with private heated infinity pools, panoramic terraces, and dedicated butler care.`,
        price: "From ₹24,000 / night",
      },
      {
        title: "Holistic Wellness Sanctuary",
        description: "Botanical spa therapies, thermal hammam rituals, and custom restorative treatments overlooking the sea.",
        price: "Curated packages",
      },
      {
        title: "Artisanal Degustation Dining",
        description: "Multi-course seasonal gastronomy paired with rare vintage biodynamic cellar selections.",
        price: "Private booking",
      },
      {
        title: "Private Coastal Charters",
        description: "Curated sunset voyages aboard handcrafted yachts with onboard sommelier and private chef.",
        price: "Bespoke itineraries",
      },
    ];
  }

  if (norm.includes("restaurant") || norm.includes("cafe") || norm.includes("dining")) {
    return [
      {
        title: "Signature Royal Thali & Degustation",
        description: `An immersive culinary journey through authentic heritage recipes, slow-cooked in copper vessels with freshly ground spices.`,
        price: "₹1,250 per guest",
      },
      {
        title: "Private Dining Suites",
        description: `Sound-isolated banquet salons at ${name} for family celebrations and executive dining with dedicated server service.`,
        price: "Advance reservation",
      },
      {
        title: "Artisanal Charcoal Hearth",
        description: "Live-fired clay oven delicacies and slow-smoked specialties prepared fresh to order.",
        price: "A la carte menu",
      },
      {
        title: "Heritage Dessert Atelier",
        description: "Handcrafted festive confections and seasonal sweets made with pure organic dairy and saffron.",
        price: "Selection box",
      },
    ];
  }

  if (
    containsSemanticPhrase(norm, "saas") ||
    containsSemanticPhrase(norm, "software") ||
    containsSemanticPhrase(norm, "technology") ||
    containsSemanticPhrase(norm, "tech") ||
    containsSemanticPhrase(norm, "ai")
  ) {
    return [
      {
        title: "Autonomous Workflow Orchestration",
        description: `Enterprise-scale event routing and distributed workflow execution engineered with sub-millisecond precision.`,
        price: "Custom enterprise",
      },
      {
        title: "Real-Time Telemetry & Observability",
        description: "High-cardinality metrics processing, automated root-cause detection, and SLA performance dashboards.",
        price: "Standard & Pro",
      },
      {
        title: "Zero-Trust Security & Compliance",
        description: "End-to-end data encryption, automated SOC2 policy verification, and granular role-based access controls.",
        price: "Built-in standard",
      },
      {
        title: "Bespoke Model Fine-Tuning",
        description: `Proprietary domain adaptation and custom agent pipelines built specifically for high-velocity teams.`,
        price: "Dedicated cluster",
      },
    ];
  }

  if (norm.includes("dental") || norm.includes("clinic") || norm.includes("medical") || norm.includes("doctor")) {
    return [
      {
        title: "Digital Smile Aesthetics",
        description: `3D intraoral optical scanning and personalized cosmetic restorations crafted with biomimetic ceramic precision.`,
        price: "Consultation required",
      },
      {
        title: "Painless Guided Implantology",
        description: "Computer-guided single and multi-tooth implant restorations with accelerated healing protocols.",
        price: "Transparent estimates",
      },
      {
        title: "Comprehensive Preventive Wellness",
        description: "Ultrasonic hygiene therapy, digital tooth decay detection, and customized preventative oral health plans.",
        price: "Standard appointment",
      },
      {
        title: "Emergency Dental Relief",
        description: "Same-day priority appointments for acute toothache, trauma, and urgent restorative repairs.",
        price: "Priority booking",
      },
    ];
  }

  if (norm.includes("creative") || norm.includes("agency") || norm.includes("brand")) {
    return [
      {
        title: "Brand Strategy & Visual Identity",
        description: `Comprehensive brand positioning, typographic systems, and bespoke identity design that commands market distinction.`,
        price: "Retainer & Project",
      },
      {
        title: "Digital Product Architecture",
        description: "Full-cycle digital interface design, interactive design systems, and conversion-engineered web platforms.",
        price: "Sprint-based",
      },
      {
        title: "Editorial Content Direction",
        description: "Cinematic visual narratives, high-impact commercial photography, and brand storytelling.",
        price: "Curated shoot",
      },
      {
        title: "Experiential Spatial Design",
        description: "Environmental graphics, physical retail concepts, and immersive brand pop-up installations.",
        price: "Custom commission",
      },
    ];
  }

  // Two-Wheeler Mobility (Bikes, Scooters, Motorcycles) - Disambiguated from Four-Wheeler Rentals
  if (
    norm.includes("bike") ||
    norm.includes("motorcycle") ||
    norm.includes("scooter") ||
    norm.includes("two wheeler") ||
    norm.includes("two-wheeler") ||
    norm.includes("activa") ||
    norm.includes("bullet") ||
    norm.includes("cruiser")
  ) {
    return [
      {
        title: "Self-Drive Motorcycle & Bike Fleet",
        description: `Thoroughly inspected cruisers, commuter bikes, and touring motorcycles at ${name} for city commute and outstation exploration.`,
        price: "From ₹500 / day",
      },
      {
        title: "Automatic Scooters & City Runabouts",
        description: "Fuel-efficient gearless scooters ideal for effortless navigation through local streets, markets, and tourist spots.",
        price: "From ₹350 / day",
      },
      {
        title: "Complimentary DOT Helmets & Riding Gear",
        description: "Sanitized safety helmets for rider and pillion, secure smartphone mount, and emergency roadside tool kit included with every rental.",
        price: "Included with rental",
      },
      {
        title: "Flexible Daily & Weekly Tour Packages",
        description: "Affordable self-drive packages with unlimited freedom, digital paperwork, and instant security deposit settlement.",
        price: "Flexible rates",
      },
    ];
  }

  if (norm.includes("car") || norm.includes("rental") || norm.includes("vehicle") || norm.includes("drive") || norm.includes("auto")) {
    return [
      {
        title: "Self-Drive Sedan & Hatchback Fleet",
        description: `Immaculately maintained modern fleet at ${name} for seamless city transit, corporate appointments, and weekend leisure.`,
        price: "From ₹1,800 / day",
      },
      {
        title: "All-Terrain Luxury SUVs",
        description: "High-clearance premium SUVs equipped with GPS navigation, cruise control, and safety features for outstation road trips.",
        price: "From ₹3,500 / day",
      },
      {
        title: "Express Airport & Doorstep Delivery",
        description: "Zero-wait express handover directly at the arrivals terminal or delivered directly to your doorstep with digital verification.",
        price: "Complimentary pickup",
      },
      {
        title: "Unlimited Mileage Getaway Packages",
        description: "Fixed-rate multi-day rentals with 24/7 roadside assistance, zero kilometer caps, and comprehensive insurance coverage.",
        price: "Custom duration quotes",
      },
    ];
  }

  if (norm.includes("gym") || norm.includes("fitness") || norm.includes("crossfit") || norm.includes("workout")) {
    return [
      {
        title: "Elite Strength & Conditioning Zone",
        description: `Olympic lifting platforms, calibrated resistance machines, and dedicated free weight areas at ${name}.`,
        price: "Monthly & Annual plans",
      },
      {
        title: "High-Intensity Functional Training",
        description: "Coach-led interval sessions, metabolic conditioning, and mobility programming tailored for all performance levels.",
        price: "Class passes available",
      },
      {
        title: "1-on-1 Performance Coaching",
        description: "Biomechanical assessments, progressive overload tracking, and personalized movement correction with certified trainers.",
        price: "Dedicated coach tier",
      },
      {
        title: "Body Composition & Nutrition Architecture",
        description: "DEXA analysis, precision macronutrient planning, and ongoing lifestyle audits to accelerate tangible health outcomes.",
        price: "Included in membership",
      },
    ];
  }

  if (
    containsSemanticPhrase(norm, "spa") ||
    containsSemanticPhrase(norm, "massage") ||
    containsSemanticPhrase(norm, "wellness") ||
    containsSemanticPhrase(norm, "aromatherapy")
  ) {
    return [
      {
        title: "Traditional Thai Massage",
        description: `A restorative wellness session at ${name} focused on assisted stretching, rhythmic pressure, and relaxation.`,
        price: "Contact for current pricing",
      },
      {
        title: "Relaxation Massage",
        description: "A calming full-body wellness experience designed to ease everyday tension and encourage deep relaxation.",
        price: "Contact for current pricing",
      },
      {
        title: "Aromatherapy Wellness Ritual",
        description: "A gentle massage experience using aromatic oils in a private and peaceful treatment setting.",
        price: "Contact for current pricing",
      },
      {
        title: "Personalised Wellness Session",
        description: "Discuss your preferences and current availability directly with the spa before choosing a treatment.",
        price: "Advance booking recommended",
      },
    ];
  }

  if (norm.includes("salon") || norm.includes("beauty") || norm.includes("hair")) {
    return [
      {
        title: "Bespoke Hair Architecture & Styling",
        description: `Precision haircutting, personalized color formulations, and restorative keratin therapies by master stylists at ${name}.`,
        price: "From ₹1,200",
      },
      {
        title: "Couture Bridal & Celebration Artistry",
        description: "HD airbrush makeup, artisanal hair styling, and luxury pre-event radiance packages for milestone occasions.",
        price: "Advance consultation",
      },
      {
        title: "Botanical Skin & Scalp Therapies",
        description: "Hydra-infusion facials, organic scalp detox rituals, and deep restorative nourishment with dermatologist-grade serums.",
        price: "Curated treatment packages",
      },
      {
        title: "Executive Grooming & Wellness",
        description: "Precision beard design, therapeutic reflexology pedicures, and rejuvenating express spa therapies.",
        price: "A la carte menu",
      },
    ];
  }

  // Universal Category-Grounded Services fallback (NO plumbing default)
  const categoryLabel = lead.category || industry || "Specialized";
  return [
    {
      title: `${categoryLabel} Consultation & Assessment`,
      description: `Comprehensive consultation tailored to your specific requirements by verified professionals at ${name}.`,
      price: "Inquire for details",
    },
    {
      title: `Core ${categoryLabel} Offerings`,
      description: `End-to-end delivery of premier ${categoryLabel.toLowerCase()} solutions adhering to the highest quality benchmarks.`,
      price: "Transparent pricing",
    },
    {
      title: "Customized Service Engagements",
      description: `Flexible, client-tailored engagements designed around your timeline, budget, and exact specifications.`,
      price: "Flexible terms",
    },
    {
      title: "Dedicated Client Support & Follow-Through",
      description: `Ongoing communication, prompt assistance, and meticulous follow-through on every engagement at ${name}.`,
      price: "Included with service",
    },
  ];
}

/**
 * Derives personalized features and trust guarantees
 */
function derivePersonalizedFeatures(
  lead: BusinessLead,
  _audit: LeadAuditReport
): Array<{ title: string; description: string }> {
  return [
    { title: "Discuss Your Requirements", description: "Contact the business to discuss the services you need and current availability." },
    { title: "Confirm Pricing", description: "Ask for current rates, inclusions, and applicable terms before booking." },
    ...(lead.address ? [{ title: "Find Us", description: lead.address }] : []),
    ...(lead.rating ? [{ title: "Customer Rating", description: `${lead.rating}/5${lead.reviewCount ? ` across ${lead.reviewCount} reviews` : ""}.` }] : []),
  ];
}

/**
 * Executes full Phase 10 personalized preview website generation
 */
export async function generatePersonalizedPreview(
  request: PersonalizedPreviewRequest
): Promise<PersonalizedPreviewResponse> {
  const requestId = `req_p10_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
  const startTime = Date.now();

  emitAgentEvent({
    event: "preview.generation.started",
    agent: "n8n_automation",
    requestId,
    metadata: { leadId: request.leadId },
  });

  // 1. Resolve Lead
  let lead: BusinessLead | null = null;
  if (request.overrideLead) {
    lead = request.overrideLead as BusinessLead;
  } else if (request.leadId) {
    lead = await leadRepository.findLeadById(request.leadId, request.userId);
  }

  if (!lead) {
    emitAgentEvent({
      event: "preview.generation.failed",
      agent: "n8n_automation",
      requestId,
      status: "error",
      metadata: { error: `Lead '${request.leadId}' not found` },
    });

    return {
      success: false,
      status: "failed",
      leadId: request.leadId,
      auditId: request.auditId || "unknown",
      business: { name: "Unknown", industry: "unknown", category: "unknown", location: "unknown" },
      handoffPhase: "phase11_personalized_outreach",
      error: {
        code: "LEAD_NOT_FOUND",
        message: `Lead with ID '${request.leadId}' was not found in lead storage.`,
      },
    };
  }

  // 2. Resolve Audit & Research
  let audit: LeadAuditReport | null = null;
  if (request.overrideAudit) {
    audit = request.overrideAudit as LeadAuditReport;
  } else {
    if (request.auditId) {
      audit = await auditRepository.findAuditById(request.auditId, request.userId);
    }
    if (!audit && request.leadId) {
      audit = await auditRepository.findAuditByLeadId(request.leadId, request.userId);
    }
  }

  if (!audit) {
    // Generate synthetic audit on the fly so preview generation proceeds reliably
    const synth = createSyntheticMissingWebsiteAudit(lead);
    const normIndForAudit = lead.industry || lead.category || "general";
    const phase10Inputs = synthesizePhase10DesignInputs(lead, normIndForAudit, [
      ...(synth.ux?.issues || []),
      ...(synth.conversion?.issues || []),
    ]);

    audit = {
      auditId: `audit_auto_${Date.now()}`,
      leadId: lead.leadId,
      auditedAt: new Date().toISOString(),
      business: {
        businessName: lead.businessName,
        category: lead.category,
        industry: lead.industry || lead.category,
        location: lead.address || (lead.city ? `${lead.city}${lead.state ? `, ${lead.state}` : ""}` : "Verified Commercial Premises"),
        phone: lead.phone,
        email: lead.email,
        website: lead.website,
      },
      research: {
        businessName: lead.businessName,
        industry: lead.industry || lead.category,
        category: lead.category,
        location: lead.address || (lead.city ? `${lead.city}${lead.state ? `, ${lead.state}` : ""}` : "Verified Commercial Premises"),
        summary: `${lead.businessName} is an active commercial establishment${lead.city ? ` operating in ${lead.city}` : ""}.`,
        publicContact: { phone: lead.phone, email: lead.email, address: lead.address },
        socialPresence: [],
        reputationSummary: lead.rating ? `${lead.rating}/5.0 (${lead.reviewCount || 0} reviews)` : "Active business",
      },
      website: {
        status: (lead.websiteStatus as any) || "missing",
        url: lead.website || "",
        pagesAudited: 0,
        auditedUrls: [],
      },
      opportunity: {
        score: 90,
        reasons: ["Legacy digital footprint lacks modern mobile UX and conversion funnels."],
      },
      technical: synth.technical,
      mobile: synth.mobile,
      ux: synth.ux,
      seo: synth.seo,
      conversion: synth.conversion,
      performance: synth.performance,
      accessibility: synth.accessibility,
      recommendations: ["Deploy modern hosted WebsiteBanja website."],
      phase10DesignInputs: phase10Inputs,
      handoffPhase: "phase10_automated_preview_generation",
    };
  }

  const auditReport: LeadAuditReport = audit!;

  emitAgentEvent({
    event: "preview.context.loaded",
    agent: "n8n_automation",
    requestId,
    metadata: {
      leadId: lead.leadId,
      auditId: auditReport.auditId,
      businessName: lead.businessName,
    },
  });

  const businessName = lead.businessName;
  const industry = lead.industry || lead.category || "general";
  const location = lead.address || (lead.city ? `${lead.city}${lead.state ? `, ${lead.state}` : ""}` : "Verified Commercial Premises");
  const designInputs = auditReport.phase10DesignInputs;

  // 2.1 Grounded Profile Early Resolution (Ensures Google Places photos and reviews flow to generation)
  let groundedProfile: GroundedBusinessProfile | undefined = request.groundedProfile;
  if (!groundedProfile) {
    groundedProfile = await groundedProfileStore.getProfileByLeadId(lead.leadId, request.userId);
  }
  if (!groundedProfile && lead.businessName) {
    const candidateId = `biz_${crypto.createHash("sha256").update(`${lead.businessName.trim().toLowerCase()}_${(lead.city || "").trim().toLowerCase()}`).digest("hex").slice(0, 12)}`;
    groundedProfile = await groundedProfileStore.getProfile(candidateId, request.userId);
  }
  // If still missing but Google Places is available or lead has discovery info, perform research
  const resolvedPlaceId = (lead as any).placeId || (lead.source === "google_places" ? lead.sourceId : undefined);
  if (!groundedProfile && (resolvedPlaceId || lead.businessName)) {
    try {
      const researchRes = await GroundedIntelligenceService.getInstance().researchBusiness({
        businessName: lead.businessName,
        location: lead.address || lead.city,
        category: lead.category || lead.industry,
        website: lead.website,
        placeId: resolvedPlaceId,
        userId: request.userId,
        tenantId: request.userId,
      });
      if (researchRes.success && researchRes.profile) {
        groundedProfile = researchRes.profile;
      }
    } catch {
      // Safe fallback if network/auth fails
    }
  }

  // 2.2 Semantic Business Reasoning (Root-Cause Fix: Universal semantic understanding of business domain)
  const semanticAnalysis = request.semanticProfile || businessSemanticReasoner.analyzeBusiness({
    businessName: businessName,
    category: lead.category || industry,
    location: location,
    rating: lead.rating,
    reviewCount: lead.reviewCount,
    phone: lead.phone,
  });

  // 2.3 Query Active Strategy from Learning Loop (Phase 27)
  const activeStrategy = await StrategyManager.getInstance().getActiveStrategy("generation").catch(() => null);

  // 3. Formulate WebsiteRequirement with semantic CTA and Brand Style
  let primaryCta = request.executiveBrief?.primaryCta.label || semanticAnalysis.primaryCta?.label || "Inquire Today";
  const GENERIC_CTA_BLACKLIST = new Set([
    "submit", "send", "click here", "click", "learn more", "read more", "search", "ok", "cancel", "reset", "close", "menu"
  ]);
  if (groundedProfile?.ctaStrategy?.observedCtas && groundedProfile.ctaStrategy.observedCtas.length > 0) {
    const validObservedCta = groundedProfile.ctaStrategy.observedCtas.find((cta) => {
      const clean = cta.text.toLowerCase().trim();
      return !GENERIC_CTA_BLACKLIST.has(clean) && clean.length >= 3 && clean.length <= 32;
    });
    if (validObservedCta) {
      primaryCta = validObservedCta.text;
    }
  }

  // Active strategy directives can also guide primary CTA
  if (activeStrategy && activeStrategy.directives) {
    const ctaDirective = activeStrategy.directives.find((d) => d.startsWith("primary_cta:"));
    if (ctaDirective) {
      primaryCta = ctaDirective.split(":")[1].trim();
    }
  }

  // Brand style derived from visual direction & semantic analysis
  let brandStyle = "modern";
  if (semanticAnalysis.domain.includes("transportation") || semanticAnalysis.domain.includes("mobility")) {
    brandStyle = "bold_brutalist";
  } else if (semanticAnalysis.domain.includes("hospitality")) {
    brandStyle = "editorial_luxury";
  } else if (semanticAnalysis.domain.includes("personal_care")) {
    brandStyle = "warm_artisanal";
  } else if (semanticAnalysis.domain.includes("healthcare") || semanticAnalysis.domain.includes("clinical")) {
    brandStyle = "clean_clinical";
  } else if (semanticAnalysis.domain.includes("fitness")) {
    brandStyle = "high_trust_service";
  }
  if (request.executiveBrief?.designDirection) {
    brandStyle = request.executiveBrief.designDirection;
  }

  if (activeStrategy && activeStrategy.directives) {
    // Active strategy directives can influence brand style if specified
    const styleDirective = activeStrategy.directives.find((d) => d.startsWith("brand_style:"));
    if (styleDirective) {
      brandStyle = styleDirective.split(":")[1].trim();
    }
  }

  const requirement: WebsiteRequirement = {
    intent: `Personalized preview website for ${businessName}`,
    business: {
      name: businessName,
      type: industry,
      industry,
    },
    location,
    services: ((lead as any).services && Array.isArray((lead as any).services) && (lead as any).services.length > 0)
      ? (lead as any).services
      : derivePersonalizedServices(lead, industry, designInputs.contentPriorities, semanticAnalysis).map((s) => s.title),
    brand: {
      style: brandStyle,
    },
    cta: primaryCta,
    content: {
      heroTitle: lead.category
        ? `${businessName} — Premier ${lead.category}${lead.city ? ` in ${lead.city}` : ""}`
        : `${businessName}${lead.city ? ` — ${lead.city}` : ""}`,
      heroSubtitle: lead.description || `${businessName} offers distinct high-quality experiences, crafted with uncompromising standards for discerning clients.`,
    },
  };

  // 4. Phase 6 Design Engine: Normalization & Strategy
  const normalizedInd = normalizeIndustry(requirement);
  const designRules = generateDesignRules(requirement);

  const heroSubtitleText = requirement.content?.heroSubtitle || `${businessName} offers distinct high-quality experiences.`;
  const brandStyleText = requirement.brand?.style || "modern";

  const strategyInput = {
    category: semanticAnalysis.subdomain || normalizedInd,
    businessName,
    description: heroSubtitleText,
    style: brandStyleText,
  };
  const computedStrategy = generateDesignStrategy(strategyInput);
  const archetype = deriveVisualArchetype(strategyInput);
  const designBrief = compileDesignBrief(computedStrategy, designRules, requirement);

  emitAgentEvent({
    event: "preview.design.created",
    agent: "n8n_automation",
    requestId,
    metadata: { archetype, visualDirection: designInputs.visualDirection },
  });

  // 5. Dynamic Section Selection based on Audit Inputs + Industry Archetype
  const sectionSequence = request.executiveBrief?.sectionOrder?.length
    ? [...request.executiveBrief.sectionOrder]
    : designInputs.requiredSections && designInputs.requiredSections.length >= 4
    ? [...designInputs.requiredSections]
    : deriveSectionSequence(archetype, {
        category: normalizedInd,
        description: heroSubtitleText,
      });

  // Ensure hero and contact exist
  if (!sectionSequence.includes("hero")) sectionSequence.unshift("hero");
  if (!sectionSequence.includes("contact")) sectionSequence.push("contact");
  if (!sectionSequence.includes("footer")) sectionSequence.push("footer");

  // 6. 3-Level Semantic Image Sourcing & Deduplication
  const usedInPage = new Set<string>();
  const imageManifest: ImageManifestEntry[] = [];

  // Cross-preview avoidance: read recent image URLs from stored previews
  const storedManifest = readStoredManifest();
  const recentAvoidUrls: string[] = storedManifest
    .slice(-10)
    .flatMap((p) => p.imageManifest ? p.imageManifest.map((m) => m.url) : []);

  // Helper for tracking manifest
  const resolveAndTrackImage = (role: any, itemIndex?: number, itemTitle?: string) => {
    const meta = resolveSemanticImage({
      category: semanticAnalysis.subdomain || normalizedInd,
      businessName,
      archetype: semanticAnalysis.domain,
      role,
      itemIndex,
      itemTitle,
      usedInPage,
      avoidImages: recentAvoidUrls,
      preferredSubjects: semanticAnalysis.primaryObjects,
      forbiddenSubjects: semanticAnalysis.forbiddenObjects,
    });

    // Enforce Level 1 deduplication by tracking both raw and canonicalized URLs
    usedInPage.add(meta.imageUrl);
    usedInPage.add(canonicalizeImageUrl(meta.imageUrl));

    imageManifest.push({
      role,
      url: meta.imageUrl,
      source: meta.source,
      author: meta.author,
      intent: meta.semanticIntent,
      license: meta.license,
    });

    return meta;
  };

  const heroImageMeta = resolveAndTrackImage("hero");
  const aboutImageMeta = resolveAndTrackImage("about");

  const rawServices = derivePersonalizedServices(lead, normalizedInd, designInputs.contentPriorities, semanticAnalysis);
  const servicesData: Service[] = rawServices.map((s, idx) => {
    const meta = resolveAndTrackImage("services", idx, s.title);
    return {
      title: s.title,
      description: s.description,
      price: s.price,
      image: meta.imageUrl,
    };
  });

  const rawFeatures = derivePersonalizedFeatures(lead, auditReport);
  const featuresData: Feature[] = rawFeatures.map((f, idx) => {
    const meta = resolveAndTrackImage("features", idx, f.title);
    return {
      title: f.title,
      description: f.description,
      image: meta.imageUrl,
    };
  });

  const faqItems: FAQ[] = [
    {
      question: `What makes ${businessName} the preferred choice in ${lead.city || "the region"}?`,
      answer: `${businessName} offers ${lead.category?.replaceAll("_", " ") || "local services"}${lead.city ? ` in ${lead.city}` : ""}. Contact the business to discuss availability and your requirements.`,
    },
    {
      question: `How do I book an appointment or inquire about services?`,
      answer: `You can reach out directly via our contact form, direct telephone line (${lead.phone || "provided below"}), or instant WhatsApp concierge.`,
    },
    {
      question: `Where is ${businessName} located?`,
      answer: `We are conveniently situated at ${lead.address || (lead.city ? `${lead.city}${lead.state ? `, ${lead.state}` : ""}` : "our central commercial premises")}.`,
    },
  ];

  emitAgentEvent({
    event: "preview.images.resolved",
    agent: "n8n_automation",
    requestId,
    metadata: { imagesCount: imageManifest.length },
  });

  // 7. Hero Assembly & Contrast Protection Validation (Semantically Grounded)
  const baseHero = {
    title: lead.category
      ? `${businessName} — Premier ${lead.category}${lead.city ? ` in ${lead.city}` : ""}`
      : `${businessName}${lead.city ? ` — ${lead.city}` : ""}`,
    subtitle: lead.description || semanticAnalysis.factualTagline || (lead.category ? `Professional ${lead.category} services in ${lead.city || "the local area"} with transparent terms and verified standards.` : `Dedicated local services in ${lead.city || "the area"} with authentic quality.`),
    button: primaryCta,
    eyebrow: `${lead.category || designRules.industryProfile.displayName} • ${lead.city || "Verified Establishment"}`,
    image: heroImageMeta.imageUrl,
    imageIntent: {
      subject: heroImageMeta.semanticIntent,
      visualStyle: semanticAnalysis.preferredImageryThemes.join(", "),
      aspectRatio: "16:9",
      composition: "business-relevant hero focal scene",
      crop: "responsive center crop",
      purpose: semanticAnalysis.customerIntent,
      fallbackType: "tonal_composition" as const,
    },
    buttonAction: {
      type: "scroll" as const,
      target: "contact",
      label: primaryCta,
    },
    layoutVariant: computedStrategy.heroType as any,
    backgroundStyle: computedStrategy.backgroundStrategy,
    spatial3d: computedStrategy.spatial3d,
    badges: [
      ...(lead.rating ? [`${lead.rating}★ Rating`] : []),
      "Verified Local Presence",
      "Direct Communication",
    ],
    trustBadges: [
      "Verified Local Craft",
      "Direct Priority Scheduling",
      ...(lead.rating ? [`Google: ${lead.rating}★ Rating`] : []),
    ],
  };

  const { protectedHero, report: contrastReport } = validateAndProtectHeroContrast(
    baseHero,
    normalizedInd,
    archetype,
    designBrief.colorSystem.background
  );

  // 8. Assemble Full WebsiteData
  let taglineCategory = semanticAnalysis.domain.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  if (taglineCategory === "Generic Service") {
    taglineCategory = "Dedicated Professional Service";
  }

  let websiteData: WebsiteData = {
    businessName,
    brand: {
      name: businessName,
      industry: normalizedInd,
      tagline: `${businessName} — ${taglineCategory}${lead.city ? ` in ${lead.city}` : ""}`,
      description: lead.description || `${businessName} offers distinct high-quality experiences.`,
    },
    navbar: {
      logo: {
        type: "text",
        text: businessName,
      },
      links: [
        { id: "nav_services", label: "Offerings", action: { type: "scroll", target: "services" } },
        { id: "nav_features", label: "Highlights", action: { type: "scroll", target: "features" } },
        { id: "nav_about", label: "Story", action: { type: "scroll", target: "about" } },
        { id: "nav_contact", label: "Contact", action: { type: "scroll", target: "contact" } },
      ],
    },
    hero: protectedHero,
    about: {
      title: `The Story of ${businessName}`,
      content: lead.description || `${businessName} offers ${lead.category?.replaceAll("_", " ") || "local services"}${lead.city ? ` in ${lead.city}` : ""}. Contact the business for details and availability.`,
      image: aboutImageMeta.imageUrl,
    },
    services: servicesData,
    features: featuresData,
    reviews: (groundedProfile?.placesReviews && groundedProfile.placesReviews.length > 0)
      ? [] // Will be populated in applyGroundedAssetsToWebsite
      : [], // Anti-fabrication rule: NEVER inject synthetic fake testimonials if 0 real reviews exist
    faq: faqItems,
    contact: {
      phone: lead.phone || undefined,
      email: lead.email || undefined,
      address: lead.address || (lead.city ? `${lead.city}${lead.state ? `, ${lead.state}` : ""}` : "Commercial Premises"),
      whatsapp: lead.phone || undefined,
    },
    footer: {
      copyright: `© ${new Date().getFullYear()} ${businessName}. All rights reserved. Generated via WebsiteBanja Autonomous Preview Pipeline.`,
    },
    designStrategy: {
      visualArchetype: archetype,
      heroType: computedStrategy.heroType,
      colorMood: computedStrategy.colorMood,
      typographyStyle: computedStrategy.typographyStyle,
      cardTreatment: computedStrategy.cardTreatment,
      backgroundStrategy: computedStrategy.backgroundStrategy,
      spatial3d: computedStrategy.spatial3d,
      heroBackground: computedStrategy.heroBackground,
      sectionSequence,
      cardFamilyStrategy: computedStrategy.cardFamilyStrategy,
      featuresLayoutStrategy: computedStrategy.featuresLayoutStrategy,
      colorSystem: {
        bg: designBrief.colorSystem.background,
        surface: designBrief.colorSystem.surface,
        surfaceAlt: designBrief.colorSystem.surfaceElevated,
        text: designBrief.colorSystem.foreground,
        muted: designBrief.colorSystem.muted,
        primary: designBrief.colorSystem.primary,
        secondary: designBrief.colorSystem.secondary,
        accent: designBrief.colorSystem.accent,
        border: designBrief.colorSystem.border,
        shadow: designBrief.colorSystem.shadow,
      },
    },
    sectionOrder: sectionSequence,
    pages: [
      {
        id: "home",
        slug: "",
        title: "Home",
        isHome: true,
        sectionOrder: sectionSequence,
      },
    ],
  };

  // 8.1 Grounded Business Intelligence & Asset Integration (Phase 20A)
  if (groundedProfile) {
    const assetSelection = groundedAssetSelector.selectAssets(groundedProfile, {
      category: normalizedInd,
      photos: request.placesPhotos,
      reviews: request.placesReviews,
    });

    websiteData = applyGroundedAssetsToWebsite(websiteData, assetSelection, groundedProfile);

    // Update imageManifest with real business photos
    if (assetSelection.summary.businessPhotosCount > 0) {
      for (const asset of assetSelection.assets) {
        if (asset.type === "BUSINESS_PHOTO" && asset.contentUrl) {
          imageManifest.push({
            role: asset.targetSection,
            url: asset.contentUrl,
            source: "google_places",
            author: asset.attribution?.displayName || "Google Places Contributor",
            intent: `Verified business photograph for ${asset.targetSection}`,
            license: "Google Places API Commercial Attribution",
          });
        }
      }
    }

    emitAgentEvent({
      event: "preview.grounded_assets.applied",
      agent: "n8n_automation",
      requestId,
      metadata: {
        businessPhotosCount: assetSelection.summary.businessPhotosCount,
        reviewsCount: assetSelection.summary.reviewsCount,
        factsCount: assetSelection.summary.factsCount,
        fallbacksCount: assetSelection.summary.fallbacksCount,
      },
    });
  }

  // 9. Quality Validation (Phase 6 + Phase 10 Enhancements)
  emitAgentEvent({
    event: "preview.quality.started",
    agent: "n8n_automation",
    requestId,
  });

  const qualityReport = validateWebsiteQuality(
    websiteData as unknown as Record<string, unknown>,
    businessName
  );

  const phase10QualityIssues: string[] = [];
  if (!contrastReport.isReadable) {
    phase10QualityIssues.push(`Hero contrast insufficient: ${contrastReport.details}`);
  }

  // Verify zero in-page duplicate images
  const canonicalImages = imageManifest.map((m) => canonicalizeImageUrl(m.url));
  const uniqueImages = new Set(canonicalImages);
  if (uniqueImages.size !== canonicalImages.length) {
    phase10QualityIssues.push(`Detected duplicate images within the generated preview`);
  }

  const overallPassed = qualityReport.passed && phase10QualityIssues.length === 0;

  if (overallPassed) {
    emitAgentEvent({
      event: "preview.quality.passed",
      agent: "n8n_automation",
      requestId,
      metadata: { qualityScore: qualityReport.score },
    });
  } else {
    emitAgentEvent({
      event: "preview.quality.failed",
      agent: "n8n_automation",
      requestId,
      status: "error",
      metadata: { issues: phase10QualityIssues },
    });
  }

  // 10. Persist Preview to Local Storage
  const baseSlug = slugify(businessName) || "preview";
  const uniqueHash = crypto.randomBytes(4).toString("hex");
  const previewId = `prev_${baseSlug}_${uniqueHash}`;
  const previewSlug = `${baseSlug}-${uniqueHash}`;

  ensurePreviewStorage();
  const previewFilePath = path.join(PREVIEW_DIR, `${previewId}.json`);
  fs.writeFileSync(previewFilePath, JSON.stringify(websiteData, null, 2), "utf-8");

  const slugFilePath = path.join(PREVIEW_DIR, `${previewSlug}.json`);
  fs.writeFileSync(slugFilePath, JSON.stringify(websiteData, null, 2), "utf-8");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const previewUrl = `${baseUrl}/preview/${previewId}`;

  const storedRecord: StoredPreviewRecord = {
    previewId,
    slug: previewSlug,
    leadId: lead.leadId,
    auditId: auditReport.auditId,
    businessId: lead.sourceId,
    businessName,
    industry: normalizedInd,
    generatedAt: new Date().toISOString(),
    previewUrl,
    qualityScore: qualityReport.score,
    designArchetype: archetype,
    imageManifest,
    generationStatus: overallPassed ? "generated" : "quality_failed",
    userId: request.userId,
  };

  const updatedManifest = [...storedManifest.filter((p) => p.previewId !== previewId), storedRecord];
  writeStoredManifest(updatedManifest);

  // 11. Formulate Outreach Context for Phase 11
  const allAuditIssues: Array<{ category?: string; evidence?: string; message?: string }> = [
    ...(auditReport.technical?.issues || []),
    ...(auditReport.mobile?.issues || []),
    ...(auditReport.ux?.issues || []),
    ...(auditReport.seo?.issues || []),
    ...(auditReport.conversion?.issues || []),
    ...(auditReport.accessibility?.issues || []),
    ...((auditReport as any).issues || []),
  ];

  const mainWebsiteProblems = allAuditIssues.length > 0
    ? allAuditIssues.slice(0, 5).map((i) => `[${(i.category || "AUDIT").toUpperCase()}] ${i.evidence || i.message || "Identified performance or conversion obstacle"}`)
    : (auditReport.opportunity?.reasons || auditReport.recommendations || ["Legacy digital footprint lacks modern mobile UX and conversion funnels."]).slice(0, 5);

  const opportunityScore = auditReport.opportunity?.score ?? (auditReport as any).scores?.websiteOpportunityScore ?? 90;

  const outreachContext: OutreachContext = {
    mainWebsiteProblems,
    newWebsiteImprovements: [
      `Engineered a high-contrast ${archetype} digital showcase resolving previous ${auditReport.website.status} web limitations.`,
      `Integrated direct 1-click WhatsApp concierge and phone booking (${lead.phone || "direct channel"}).`,
      lead.rating ? `Listed rating: ${lead.rating}/5${lead.reviewCount ? ` across ${lead.reviewCount} reviews` : ""}.` : "No customer rating was supplied.",
      `Implemented bespoke section architecture with 100% unique, license-verified photography.`,
    ],
    personalizationPoints: [
      `Business: ${businessName}`,
      `Location: ${location}`,
      `Reputation: ${lead.rating ? `${lead.rating}★ (${lead.reviewCount} customer reviews)` : "Verified local establishment"}`,
      `Opportunity Score: ${opportunityScore}/100`,
    ],
  };

  emitAgentEvent({
    event: "preview.generation.completed",
    agent: "n8n_automation",
    requestId,
    metadata: {
      previewId,
      previewUrl,
      durationMs: Date.now() - startTime,
    },
  });

  emitAgentEvent({
    event: "preview.handoff.created",
    agent: "n8n_automation",
    requestId,
    metadata: {
      handoffPhase: "phase11_personalized_outreach",
      previewUrl,
    },
  });

  return {
    success: overallPassed,
    status: overallPassed ? "generated" : "quality_failed",
    preview: {
      id: previewId,
      slug: previewSlug,
      url: previewUrl,
      qualityScore: qualityReport.score,
      designArchetype: archetype,
      sectionCount: sectionSequence.length,
      imageManifest,
      contrastReport,
    },
    business: {
      name: businessName,
      industry: normalizedInd,
      category: designRules.industryProfile.displayName,
      location,
      phone: lead.phone,
      email: lead.email,
    },
    outreachContext,
    handoffPhase: "phase11_personalized_outreach",
    auditId: auditReport.auditId,
    leadId: lead.leadId,
    error: overallPassed
      ? undefined
      : {
          code: "QUALITY_VALIDATION_FAILED",
          message: "The generated preview did not satisfy all Phase 10 quality checks.",
          details: phase10QualityIssues,
        },
  };
}
