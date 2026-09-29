// src/lib/audit/auditEngine.ts
/**
 * Multi-Dimensional Website Audit & Opportunity Engine
 * Phase: Phase 9 (Business Research + Website Audit Agent)
 *
 * Evaluates crawled HTML pages across Technical, Mobile, UX/UI, SEO,
 * Accessibility, and Conversion dimensions. Synthesizes findings into a
 * websiteOpportunityScore and phase10DesignInputs.
 */

import type { CrawledPage } from "./crawler";
import { parseHtml, type ParsedHtmlDocument } from "./htmlParser";
import type {
  TechnicalAuditResult,
  MobileAuditResult,
  UxAuditResult,
  SeoAuditResult,
  ConversionAuditResult,
  AccessibilityAuditResult,
  PerformanceSignals,
  Phase10DesignInputs,
  AuditIssue,
  ResearchSummary,
} from "./types";
import type { BusinessLead } from "@/lib/discovery/types";

// Common action keywords indicating conversion intent
const CTA_PATTERNS = /\b(reserve|book|order|contact|schedule|inquire|call|get quote|menu|whatsapp)\b/i;

export function evaluateTechnical(
  pages: CrawledPage[],
  parsedPages: ParsedHtmlDocument[]
): TechnicalAuditResult {
  const issues: AuditIssue[] = [];
  const home = parsedPages[0] || ({} as Partial<ParsedHtmlDocument>);
  const homePage = pages[0] || ({} as Partial<CrawledPage>);

  const isHttps = pages.every((p) => p.isHttps);
  if (!isHttps) {
    issues.push({
      category: "technical",
      severity: "high",
      evidence: "Website is not served exclusively over HTTPS.",
      recommendation: "Enforce HTTPS with automatic HTTP-to-HTTPS redirect and SSL certification.",
    });
  }

  const title = home.title || "";
  if (!title) {
    issues.push({
      category: "technical",
      severity: "high",
      evidence: "Homepage is missing an HTML <title> tag.",
      recommendation: "Add a descriptive, keyword-rich title tag under 65 characters.",
    });
  }

  const metaDesc = home.metaDescription || "";
  if (!metaDesc) {
    issues.push({
      category: "technical",
      severity: "medium",
      evidence: "Homepage is missing a <meta name=\"description\"> tag.",
      recommendation: "Add a compelling meta description between 120 and 160 characters.",
    });
  }

  const viewportPresent = Boolean(home.viewport);
  if (!viewportPresent) {
    issues.push({
      category: "technical",
      severity: "high",
      evidence: "Missing <meta name=\"viewport\"> tag, preventing proper mobile scaling.",
      recommendation: "Add <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">.",
    });
  }

  const canonicalPresent = Boolean(home.canonical);

  const h1Count = home.h1List ? home.h1List.length : 0;
  const h2Count = home.h2List ? home.h2List.length : 0;

  let totalImages = 0;
  let totalMissingAlt = 0;
  let totalScripts = 0;
  let totalStylesheets = 0;
  let totalSizeKb = 0;

  for (let i = 0; i < pages.length; i++) {
    const doc = parsedPages[i];
    const page = pages[i];
    if (doc) {
      totalImages += doc.images.length;
      totalMissingAlt += doc.images.filter((img) => !img.hasAlt).length;
      totalScripts += doc.scriptsCount;
      totalStylesheets += doc.stylesheetsCount;
    }
    if (page) {
      totalSizeKb += Math.round(page.sizeBytes / 1024);
    }
  }

  return {
    https: isHttps,
    httpStatus: homePage.httpStatus,
    title,
    titleLength: title.length,
    metaDescription: metaDesc,
    metaDescriptionLength: metaDesc.length,
    viewportPresent,
    canonicalPresent,
    h1Count,
    h2Count,
    scriptCount: totalScripts,
    stylesheetCount: totalStylesheets,
    imageCount: totalImages,
    imagesMissingAlt: totalMissingAlt,
    pageSizeKb: totalSizeKb,
    issues,
  };
}

export function evaluateMobile(
  parsedPages: ParsedHtmlDocument[]
): MobileAuditResult {
  const issues: AuditIssue[] = [];
  const home = parsedPages[0] || ({} as Partial<ParsedHtmlDocument>);

  const viewportConfigured = Boolean(
    home.viewport && home.viewport.includes("width=device-width")
  );

  if (!viewportConfigured) {
    issues.push({
      category: "mobile",
      severity: "high",
      evidence: "Mobile viewport meta tag is missing or lacks 'width=device-width'.",
      recommendation: "Configure standard responsive viewport to ensure scaling across smartphone displays.",
    });
  }

  // Check for direct click-to-call phone link
  const hasClickablePhone = parsedPages.some((p) =>
    p.links.some((l) => l.isPhone)
  );

  if (!hasClickablePhone) {
    issues.push({
      category: "mobile",
      severity: "medium",
      evidence: "No direct click-to-call 'tel:' links found for mobile visitors.",
      recommendation: "Implement prominent click-to-call buttons for mobile traffic.",
    });
  }

  const hasMobileNavigation = parsedPages.some((p) =>
    p.links.length >= 3 || p.buttons.length >= 2
  );

  return {
    status: "static_analysis",
    viewportConfigured,
    responsiveMetaPresent: Boolean(home.viewport),
    hasClickablePhone,
    hasMobileNavigation,
    issues,
  };
}

export function evaluateUx(
  parsedPages: ParsedHtmlDocument[],
  category: string
): UxAuditResult {
  const issues: AuditIssue[] = [];
  let score = 100;
  const home = parsedPages[0] || ({} as Partial<ParsedHtmlDocument>);

  // 1. Primary CTA Above the Fold
  const allButtons = (home.buttons || []).map((b) => b.text);
  const allLinkTexts = (home.links || []).map((l) => l.text);
  const combinedCtas = [...allButtons, ...allLinkTexts];

  const hasPrimaryCtaAboveFold = combinedCtas.some((text) =>
    CTA_PATTERNS.test(text)
  );

  if (!hasPrimaryCtaAboveFold) {
    score -= 25;
    issues.push({
      category: "ux",
      severity: "high",
      evidence: "Homepage contains no prominent action or reservation CTA above the fold.",
      recommendation: `Add an eye-catching primary action button appropriate for ${category} (e.g. 'Reserve a Table', 'Inquire Today').`,
    });
  }

  // 2. Navigation Structure
  const hasClearNavigation = (home.links || []).length >= 3;
  if (!hasClearNavigation) {
    score -= 15;
    issues.push({
      category: "ux",
      severity: "medium",
      evidence: "Minimal or missing top-level navigation links.",
      recommendation: "Implement a clean persistent header with links to Story, Offerings, Reviews, and Contact.",
    });
  }

  // 3. Trust signals (reviews, badges, address)
  const fullText = parsedPages.map((p) => p.rawText).join(" ").toLowerCase();
  const hasTrustSignals =
    fullText.includes("review") ||
    fullText.includes("testimonial") ||
    fullText.includes("certified") ||
    fullText.includes("since") ||
    fullText.includes("rating");

  if (!hasTrustSignals) {
    score -= 15;
    issues.push({
      category: "ux",
      severity: "medium",
      evidence: "Website lacks social proof, customer testimonials, or trust badges.",
      recommendation: "Add a verified customer testimonial section and industry accolades.",
    });
  }

  // 4. Clear Value Proposition in Hero
  const hasClearValueProposition = (home.h1List || []).length > 0;
  if (!hasClearValueProposition) {
    score -= 15;
    issues.push({
      category: "ux",
      severity: "medium",
      evidence: "No dominant headline establishing the core value proposition.",
      recommendation: "Feature a bold, brand-defining headline in the hero banner.",
    });
  }

  return {
    score: Math.max(0, score),
    hasPrimaryCtaAboveFold,
    hasClearNavigation,
    hasTrustSignals,
    hasClearValueProposition,
    issues,
  };
}

export function evaluateSeo(
  parsedPages: ParsedHtmlDocument[],
  businessName: string,
  location: string
): SeoAuditResult {
  const issues: AuditIssue[] = [];
  let score = 100;
  const home = parsedPages[0] || ({} as Partial<ParsedHtmlDocument>);

  const title = home.title || "";
  const titleOptimal = title.length >= 20 && title.length <= 65;
  if (!titleOptimal) {
    score -= 15;
    issues.push({
      category: "seo",
      severity: "medium",
      evidence: title ? `Title length (${title.length} chars) is outside optimal 20-65 range.` : "Title tag missing.",
      recommendation: `Craft a title including business name and location: '${businessName} — Artisanal Excellence in ${location}'.`,
    });
  }

  const metaDesc = home.metaDescription || "";
  const metaDescriptionOptimal = metaDesc.length >= 80 && metaDesc.length <= 165;
  if (!metaDescriptionOptimal) {
    score -= 15;
    issues.push({
      category: "seo",
      severity: "medium",
      evidence: metaDesc ? `Meta description length (${metaDesc.length} chars) is suboptimal.` : "Meta description missing.",
      recommendation: "Provide a compelling 120-155 character meta description including local keywords.",
    });
  }

  const singleH1Present = (home.h1List || []).length === 1;
  if (!singleH1Present) {
    score -= 15;
    const count = (home.h1List || []).length;
    issues.push({
      category: "seo",
      severity: count === 0 ? "high" : "medium",
      evidence: count === 0 ? "No <h1> heading found on homepage." : `Multiple <h1> tags (${count}) found.`,
      recommendation: "Ensure exactly one semantic <h1> element per page conveying the primary subject.",
    });
  }

  const hasOpenGraph = Boolean(home.ogTitle && home.ogImage);
  if (!hasOpenGraph) {
    score -= 10;
    issues.push({
      category: "seo",
      severity: "low",
      evidence: "Incomplete Open Graph tags (missing og:title or og:image).",
      recommendation: "Add complete Open Graph meta tags for attractive social sharing cards.",
    });
  }

  const hasTwitterCard = Boolean(home.twitterCard);

  const fullText = parsedPages.map((p) => p.rawText).join(" ").toLowerCase();
  const locLower = (location || "").toLowerCase().split(",")[0].trim();
  const hasLocationRelevance = locLower ? fullText.includes(locLower) : true;
  if (!hasLocationRelevance) {
    score -= 15;
    issues.push({
      category: "seo",
      severity: "medium",
      evidence: `Target city '${location}' is rarely or never mentioned in page text.`,
      recommendation: "Incorporate local geographical markers in hero copy, footer, and contact details.",
    });
  }

  return {
    score: Math.max(0, score),
    titleOptimal,
    metaDescriptionOptimal,
    singleH1Present,
    hasOpenGraph,
    hasTwitterCard,
    hasLocationRelevance,
    issues,
  };
}

export function evaluateConversion(
  parsedPages: ParsedHtmlDocument[]
): ConversionAuditResult {
  const issues: AuditIssue[] = [];
  let score = 0;

  const allLinks = parsedPages.flatMap((p) => p.links);
  const hasPhoneCta = allLinks.some((l) => l.isPhone);
  const hasEmailCta = allLinks.some((l) => l.isEmail);
  const hasWhatsAppLink = allLinks.some((l) => l.isWhatsApp);

  const hasContactForm = parsedPages.some((p) => p.formsCount > 0);
  const hasBookingLink = allLinks.some((l) => CTA_PATTERNS.test(l.text) || CTA_PATTERNS.test(l.href));

  const fullText = parsedPages.map((p) => p.rawText).join(" ").toLowerCase();
  const hasPhysicalAddress =
    fullText.includes("road") ||
    fullText.includes("street") ||
    fullText.includes("arcade") ||
    fullText.includes("complex") ||
    fullText.includes("near");

  const hasTestimonials =
    fullText.includes("testimonial") ||
    fullText.includes("what our clients say") ||
    fullText.includes("guest reviews") ||
    fullText.includes("star rating");

  if (hasPhoneCta) score += 20;
  else {
    issues.push({
      category: "conversion",
      severity: "high",
      evidence: "No click-to-call telephone CTA detected.",
      recommendation: "Place an interactive phone link in the navigation header and contact section.",
    });
  }

  if (hasWhatsAppLink) score += 20;
  else {
    issues.push({
      category: "conversion",
      severity: "medium",
      evidence: "No direct WhatsApp inquiry link present.",
      recommendation: "Incorporate a floating or embedded WhatsApp booking CTA.",
    });
  }

  if (hasContactForm) score += 15;
  else {
    issues.push({
      category: "conversion",
      severity: "medium",
      evidence: "No interactive inquiry or lead capture form found.",
      recommendation: "Add a streamlined lead capture form with instant confirmation.",
    });
  }

  if (hasBookingLink) score += 15;
  if (hasPhysicalAddress) score += 15;
  if (hasEmailCta) score += 10;
  if (hasTestimonials) score += 5;

  return {
    score: Math.min(100, score),
    hasPhoneCta,
    hasEmailCta,
    hasContactForm,
    hasBookingLink,
    hasWhatsAppLink,
    hasPhysicalAddress,
    hasTestimonials,
    issues,
  };
}

export function evaluateAccessibility(
  parsedPages: ParsedHtmlDocument[]
): AccessibilityAuditResult {
  const issues: AuditIssue[] = [];
  let score = 100;
  const home = parsedPages[0] || ({} as Partial<ParsedHtmlDocument>);

  const allImages = parsedPages.flatMap((p) => p.images);
  const missingAltCount = allImages.filter((img) => !img.hasAlt).length;

  if (missingAltCount > 0) {
    score -= Math.min(30, missingAltCount * 5);
    issues.push({
      category: "accessibility",
      severity: "medium",
      evidence: `${missingAltCount} images lack descriptive 'alt' attribute text.`,
      recommendation: "Ensure all contextual images supply meaningful alternative text for screen readers.",
    });
  }

  const hasLangAttribute = Boolean(home.lang);
  if (!hasLangAttribute) {
    score -= 15;
    issues.push({
      category: "accessibility",
      severity: "medium",
      evidence: "The <html> element is missing a 'lang' attribute.",
      recommendation: "Specify language attribute on root element (e.g. <html lang=\"en\">).",
    });
  }

  const hasHeadingHierarchy = (home.h1List || []).length > 0 && (home.h2List || []).length > 0;
  if (!hasHeadingHierarchy) {
    score -= 15;
    issues.push({
      category: "accessibility",
      severity: "low",
      evidence: "Incomplete heading hierarchy (missing H1 or H2 sections).",
      recommendation: "Structure sections using sequential H1 -> H2 -> H3 heading elements.",
    });
  }

  return {
    score: Math.max(0, score),
    missingAltCount,
    hasLangAttribute,
    hasHeadingHierarchy,
    issues,
  };
}

/**
 * Calculates websiteOpportunityScore (0-100) based on verified site deficiencies
 */
export function calculateWebsiteOpportunityScore(
  websiteStatus: "present" | "missing" | "unreachable" | "unknown",
  scores: {
    ux: number;
    seo: number;
    conversion: number;
    accessibility: number;
  },
  allIssues: AuditIssue[]
): { score: number; reasons: string[] } {
  const reasons: string[] = [];

  // Case 1: Missing website -> Maximum website opportunity
  if (websiteStatus === "missing") {
    return {
      score: 95,
      reasons: [
        "BUSINESS_HAS_NO_WEBSITE",
        "HIGH_CONVERSION_POTENTIAL_FOR_NEW_SITE",
        "IMMEDIATE_LOCAL_VISIBILITY_UPSIDE",
      ],
    };
  }

  // Case 2: Unreachable website -> Very high opportunity
  if (websiteStatus === "unreachable") {
    return {
      score: 90,
      reasons: [
        "EXISTING_WEBSITE_IS_UNREACHABLE_OR_BROKEN",
        "LOST_CUSTOMER_TRAFFIC_AND_LEADS",
        "URGENT_NEED_FOR_MODERN_HOSTED_PRESENCE",
      ],
    };
  }

  // Case 3: Live website with audit findings
  let score = 20; // baseline opportunity for live sites

  // Low conversion score adds up to 35 points
  if (scores.conversion < 40) {
    score += 35;
    reasons.push("WEAK_CONVERSION_ARCHITECTURE");
  } else if (scores.conversion < 70) {
    score += 20;
    reasons.push("SUBOPTIMAL_CALL_TO_ACTIONS");
  }

  // Low UX score adds up to 25 points
  if (scores.ux < 50) {
    score += 25;
    reasons.push("POOR_USER_EXPERIENCE_AND_HIERARCHY");
  } else if (scores.ux < 75) {
    score += 15;
    reasons.push("OUTDATED_LAYOUT_AND_NAVIGATION");
  }

  // Low SEO score adds up to 15 points
  if (scores.seo < 50) {
    score += 15;
    reasons.push("DEFICIENT_LOCAL_SEO_AND_METADATA");
  }

  // High severity issues bonus
  const highSeverityCount = allIssues.filter((i) => i.severity === "high").length;
  if (highSeverityCount >= 2) {
    score += 10;
    reasons.push(`DETECTED_${highSeverityCount}_HIGH_SEVERITY_DEFECTS`);
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    reasons,
  };
}

/**
 * Synthesizes Phase 10 design inputs tailored to solve identified audit defects
 */
export function synthesizePhase10DesignInputs(
  lead: BusinessLead,
  industry?: string,
  issues: AuditIssue[] = []
): Phase10DesignInputs {
  const normInd = (industry || (lead && (lead.industry || lead.category)) || "").toLowerCase();

  let visualDirection = "warm artisanal culinary storytelling";
  let layoutStrategy = "fullscreen visual hero with staggered narrative sections";
  let requiredSections = ["hero", "signature_dishes", "menu", "atmosphere_story", "reviews", "contact", "footer"];
  let ctaStrategy = "table reservation with WhatsApp concierge";
  let imageryDirection = "warm ambient lighting, artisan roast craft, macro food photography";
  let contentPriorities = ["signature offerings", "heritage story", "reservation booking", "location & hours"];

  if (normInd.includes("hotel") || normInd.includes("hospitality")) {
    visualDirection = "luxury bespoke hospitality editorial";
    layoutStrategy = "cinematic hero with suite showcases and guest experience gallery";
    requiredSections = ["hero", "suite_showcase", "amenities", "dining", "guest_reviews", "booking", "contact", "footer"];
    ctaStrategy = "suite reservation and VIP concierge inquiry";
    imageryDirection = "architectural suite photography, ambient dusk terrace lighting, curated linen textures";
    contentPriorities = ["suite amenities", "private dining", "reservation calendar", "concierge services"];
  } else if (normInd.includes("dental") || normInd.includes("health")) {
    visualDirection = "clean clinical authority with approachable warmth";
    layoutStrategy = "high-trust clinic presentation with treatment cards and doctor credentials";
    requiredSections = ["hero", "treatments", "doctor_profile", "technology", "patient_reviews", "booking", "contact", "footer"];
    ctaStrategy = "instant appointment consultation booking";
    imageryDirection = "bright clinical interior, smiling patients, modern dental equipment";
    contentPriorities = ["treatments offered", "doctor qualifications", "patient before/after", "online booking"];
  } else if (normInd.includes("wellness") || normInd.includes("spa")) {
    visualDirection = "organic botanical serenity with calming earth tones";
    layoutStrategy = "sensory journey layout with therapy menus and quiet aesthetic pacing";
    requiredSections = ["hero", "treatments", "therapies", "ambiance_gallery", "testimonials", "booking", "contact", "footer"];
    ctaStrategy = "spa appointment and holistic package reservation";
    imageryDirection = "botanical oils, warm candlelight, stone textures, calming wellness interior";
    contentPriorities = ["signature therapies", "ayurvedic rituals", "wellness retreat packages"];
  }

  // Address conversion deficiencies discovered in audit
  const hasNoWhatsappIssue = issues.some((i) => i.evidence.includes("WhatsApp"));
  if (hasNoWhatsappIssue) {
    ctaStrategy += " + prominent floating WhatsApp conversion widget";
  }

  const hasNoReviewsIssue = issues.some((i) => i.evidence.includes("social proof") || i.evidence.includes("testimonial"));
  if (hasNoReviewsIssue && !requiredSections.includes("reviews")) {
    requiredSections.splice(requiredSections.length - 2, 0, "reviews");
  }

  return {
    visualDirection,
    layoutStrategy,
    requiredSections,
    ctaStrategy,
    imageryDirection,
    contentPriorities,
  };
}

/**
 * Creates a synthetic baseline audit for leads with missing or unreachable websites
 */
export function createSyntheticMissingWebsiteAudit(
  lead: BusinessLead
): {
  technical: TechnicalAuditResult;
  mobile: MobileAuditResult;
  ux: UxAuditResult;
  seo: SeoAuditResult;
  conversion: ConversionAuditResult;
  performance: PerformanceSignals;
  accessibility: AccessibilityAuditResult;
} {
  return {
    technical: {
      https: false,
      titleLength: 0,
      metaDescriptionLength: 0,
      viewportPresent: false,
      canonicalPresent: false,
      h1Count: 0,
      h2Count: 0,
      scriptCount: 0,
      stylesheetCount: 0,
      imageCount: 0,
      imagesMissingAlt: 0,
      pageSizeKb: 0,
      issues: [
        {
          category: "technical",
          severity: "high",
          evidence: "No active website discovered for this business.",
          recommendation: "Build and deploy a modern, hosted WebsiteBanja website.",
        },
      ],
    },
    mobile: {
      status: "static_analysis",
      viewportConfigured: false,
      responsiveMetaPresent: false,
      hasClickablePhone: Boolean(lead.phone),
      hasMobileNavigation: false,
      issues: [
        {
          category: "mobile",
          severity: "high",
          evidence: "Missing mobile web presence.",
          recommendation: "Deploy a mobile-first responsive web application.",
        },
      ],
    },
    ux: {
      score: 10,
      hasPrimaryCtaAboveFold: false,
      hasClearNavigation: false,
      hasTrustSignals: false,
      hasClearValueProposition: false,
      issues: [
        {
          category: "ux",
          severity: "high",
          evidence: "Prospect lacks any dedicated digital user experience.",
          recommendation: "Create structured digital storytelling showcasing products and reviews.",
        },
      ],
    },
    seo: {
      score: 10,
      titleOptimal: false,
      metaDescriptionOptimal: false,
      singleH1Present: false,
      hasOpenGraph: false,
      hasTwitterCard: false,
      hasLocationRelevance: false,
      issues: [
        {
          category: "seo",
          severity: "high",
          evidence: "Zero search engine presence or indexed web properties.",
          recommendation: "Publish an SEO-optimized website targeting local discovery keywords.",
        },
      ],
    },
    conversion: {
      score: 20,
      hasPhoneCta: Boolean(lead.phone),
      hasEmailCta: Boolean(lead.email),
      hasContactForm: false,
      hasBookingLink: false,
      hasWhatsAppLink: false,
      hasPhysicalAddress: Boolean(lead.address),
      hasTestimonials: false,
      issues: [
        {
          category: "conversion",
          severity: "high",
          evidence: "No online conversion funnel or digital lead capture.",
          recommendation: "Deploy interactive booking forms and direct contact channels.",
        },
      ],
    },
    performance: {
      status: "static_analysis",
      htmlSizeBytes: 0,
      imageCount: 0,
      scriptCount: 0,
      stylesheetCount: 0,
      externalDomainCount: 0,
    },
    accessibility: {
      score: 50,
      missingAltCount: 0,
      hasLangAttribute: false,
      hasHeadingHierarchy: false,
      issues: [],
    },
  };
}
