// src/lib/intelligence/planning/businessSectionPlanner.ts
/**
 * Business Section Planner
 * Requirement #9: Business-Aware Section Planning
 * Requirement #10: Duplicate Section Prevention
 *
 * Dynamically plans section architecture according to the business domain, transaction mechanics,
 * and available grounded evidence. Strictly forbids duplicate-purpose sections.
 */

import type { SectionPurpose, BusinessSectionPlan, SectionDescriptor } from "./types";
import type { SemanticBusinessAnalysis } from "../semantic/businessSemanticReasoner";
import type { GroundedBusinessProfile } from "../grounding/types";
import { placeContactAtEnd } from "./sectionOrder";

export class BusinessSectionPlanner {
  private static instance: BusinessSectionPlanner;

  private constructor() {}

  public static getInstance(): BusinessSectionPlanner {
    if (!BusinessSectionPlanner.instance) {
      BusinessSectionPlanner.instance = new BusinessSectionPlanner();
    }
    return BusinessSectionPlanner.instance;
  }

  /**
   * Plans the bespoke section sequence, purpose map, and omission rules for a business.
   */
  public planSections(params: {
    semanticAnalysis: SemanticBusinessAnalysis;
    profile?: GroundedBusinessProfile;
    hasReviews?: boolean;
    hasServices?: boolean;
    hasProducts?: boolean;
  }): BusinessSectionPlan {
    const domain = params.semanticAnalysis.domain.toLowerCase();
    const purposeMap: Record<string, SectionPurpose> = {
      hero: "HERO",
      about: "STORY",
      story: "STORY",
      services: "OFFERINGS",
      offerings: "OFFERINGS",
      products: "OFFERINGS",
      catalog: "OFFERINGS",
      curated_collection: "OFFERINGS",
      features: "VALUE_PROP",
      highlights: "VALUE_PROP",
      reviews: "PROOF",
      testimonials: "PROOF",
      social_proof: "PROOF",
      faq: "FAQ",
      faqs: "FAQ",
      contact: "CONTACT",
      booking: "CONTACT",
      reservation: "CONTACT",
      inquiry: "CONTACT",
      appointment: "CONTACT",
      lead_capture: "CONTACT",
      get_in_touch: "CONTACT",
      footer: "NAVIGATION",
    };

    // Determine primary transaction type based on business intent
    let primaryTransactionType: BusinessSectionPlan["primaryTransactionType"] = "inquiry_consultation";
    if (domain.includes("rental") || domain.includes("mobility") || domain.includes("transport")) {
      primaryTransactionType = "direct_booking";
    } else if (domain.includes("restaurant") || domain.includes("hotel") || domain.includes("hospitality")) {
      primaryTransactionType = "direct_booking";
    } else if (domain.includes("ecommerce") || domain.includes("retail")) {
      primaryTransactionType = "direct_purchase";
    } else if (domain.includes("local_service") || domain.includes("contractor") || domain.includes("agency")) {
      primaryTransactionType = "quote_request";
    }

    const omitted: string[] = [];

    // Anti-fabrication check: if 0 verified reviews exist, omit reviews section completely
    if (params.hasReviews === false) {
      omitted.push("reviews", "testimonials");
    }

    // Dynamic sequence construction tailored to distinct customer transaction journeys:
    let baseOrder: string[];

    switch (primaryTransactionType) {
      case "direct_booking":
        // Rentals, Mobility, Hospitality: Hook -> Fleet/Rooms -> Why Us -> Booking Action -> Authentic Social Proof -> Rental FAQs -> Story -> Footer
        baseOrder = ["hero", "services", "features", "contact"];
        if (params.hasReviews !== false) {
          baseOrder.push("reviews");
        }
        baseOrder.push("faq", "about", "footer");
        break;

      case "direct_purchase":
        // Ecommerce, Retail: Hook -> Catalog/Products -> Buyer Trust -> Authentic Reviews -> Shipping & Warranty FAQs -> Story -> Contact -> Footer
        baseOrder = ["hero", "services", "features"];
        if (params.hasReviews !== false) {
          baseOrder.push("reviews");
        }
        baseOrder.push("faq", "about", "contact", "footer");
        break;

      case "quote_request":
        // Contractors, Trade Services, B2B: Hook -> Capabilities/Work -> Quality Proof -> Authentic Reviews -> Request Estimate CTA -> Team/Background -> FAQs -> Footer
        baseOrder = ["hero", "services", "features"];
        if (params.hasReviews !== false) {
          baseOrder.push("reviews");
        }
        baseOrder.push("contact", "about", "faq", "footer");
        break;

      case "inquiry_consultation":
      default:
        // Healthcare, Clinics, Law, Advisory: Hook -> Specializations -> Doctor/Founder Credentials -> Patient Care Values -> Patient Reviews -> Appointment Booking -> Consultation FAQs -> Footer
        baseOrder = ["hero", "services", "about", "features"];
        if (params.hasReviews !== false) {
          baseOrder.push("reviews");
        }
        baseOrder.push("contact", "faq", "footer");
        break;
    }

    // Filter out omitted sections
    const sectionOrder = baseOrder.filter((sec) => !omitted.includes(sec));

    // Enforce Duplicate Purpose Prevention:
    // Only 1 section per SectionPurpose allowed (except footer navigation).
    const deduplicatedOrder = this.deduplicatePurposes(sectionOrder, purposeMap);

    return {
      businessDomain: domain,
      primaryTransactionType,
      requiredSections: ["hero", "services", "contact", "footer"],
      optionalSections: ["features", "about", "faq", "reviews"].filter((s) => !omitted.includes(s)),
      omittedSections: omitted,
      sectionOrder: deduplicatedOrder,
      purposeMap,
      rationale: `Section architecture tailored to ${domain} with primary flow oriented toward ${primaryTransactionType}. Sequence: [${deduplicatedOrder.join(" -> ")}]. Duplicate purpose sections pruned.`,
    };
  }

  /**
   * Filters a list of section keys ensuring no two sections serve the same semantic purpose.
   */
  public deduplicatePurposes(
    sections: string[],
    purposeMap: Record<string, SectionPurpose>
  ): string[] {
    const seenPurposes = new Set<SectionPurpose>();
    const uniqueSections: string[] = [];

    for (const sec of sections) {
      const normalized = sec.toLowerCase().trim();
      const purpose = purposeMap[normalized] || ("VALUE_PROP" as SectionPurpose);

      // Navigation / Footer is exempt from single-purpose deduplication
      if (purpose === "NAVIGATION") {
        uniqueSections.push(sec);
        continue;
      }

      if (!seenPurposes.has(purpose)) {
        seenPurposes.add(purpose);
        uniqueSections.push(sec);
      }
    }

    // Ensure hero is always first and footer is always last
    if (!uniqueSections.includes("hero")) {
      uniqueSections.unshift("hero");
    }
    if (!uniqueSections.includes("footer")) {
      uniqueSections.push("footer");
    }

    return placeContactAtEnd(uniqueSections);
  }
}

export const businessSectionPlanner = BusinessSectionPlanner.getInstance();
