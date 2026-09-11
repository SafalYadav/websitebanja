// src/lib/ai/uiux-pro-max/generator/pageOverrides.ts

import type { UiUxDesignSystem } from "../types";
import type { WebsiteRequirement } from "../../requirementModel";
import { reasonDesignSystem } from "../reasoning/reasoningEngine";

export interface PageDesignOverride {
  pageSlug: string;
  patternOverride?: {
    name: string;
    sections: string[];
    ctaPlacement: string;
  };
  densityOverride?: number;
  antiPatternsOverride?: string[];
  notes?: string;
}

export interface MasterDesignSystemPackage {
  master: UiUxDesignSystem;
  pages: Record<string, PageDesignOverride>;
}

/**
 * Creates page-specific design intelligence overrides on top of a MASTER design system.
 * e.g., 'pricing' page can elevate conversion CTA and comparison tables;
 * 'contact' page can switch to form-centric layout.
 */
export function generatePageOverride(
  pageSlug: string,
  master: UiUxDesignSystem,
  _pageRequirement?: Partial<WebsiteRequirement>
): PageDesignOverride {
  const slug = pageSlug.toLowerCase().trim();

  switch (slug) {
    case "pricing":
      return {
        pageSlug: "pricing",
        patternOverride: {
          name: "Tier Comparison + Feature Matrix + FAQ",
          sections: ["PricingHeader", "PricingTiers", "FeatureComparison", "Testimonials", "FAQ", "CTA"],
          ctaPlacement: "Inside each pricing tier card",
        },
        densityOverride: 7, // Tighter for tabular comparisons
        notes: "High conversion pricing table pattern with emphasized primary plan",
      };

    case "contact":
      return {
        pageSlug: "contact",
        patternOverride: {
          name: "Interactive Form + Direct Channels + Map/Location",
          sections: ["ContactHero", "ContactForm", "DirectChannels", "LocationMap", "OfficeHours"],
          ctaPlacement: "Form submission button",
        },
        densityOverride: 3, // Spacious for form accessibility
        notes: "Accessible, low-friction inquiry layout",
      };

    case "about":
      return {
        pageSlug: "about",
        patternOverride: {
          name: "Origin Story + Team + Mission + Credentials",
          sections: ["AboutHero", "MissionVision", "FounderStory", "TeamGrid", "Certifications", "CTA"],
          ctaPlacement: "Bottom of narrative",
        },
        densityOverride: 3,
        notes: "Storytelling layout focused on trust and team credibility",
      };

    default:
      return {
        pageSlug: slug || "home",
        patternOverride: {
          name: master.pattern.name,
          sections: master.pattern.sections,
          ctaPlacement: master.pattern.ctaPlacement,
        },
        densityOverride: master.dials.density,
        notes: "Standard page layout following master design system",
      };
  }
}

/**
 * Packages a complete Master + Pages design system architecture for a project.
 */
export function createProjectDesignSystem(
  req: WebsiteRequirement,
  pageSlugs: string[] = ["home", "about", "pricing", "contact"]
): MasterDesignSystemPackage {
  const master = reasonDesignSystem(req);
  const pages: Record<string, PageDesignOverride> = {};

  for (const slug of pageSlugs) {
    pages[slug] = generatePageOverride(slug, master);
  }

  return {
    master,
    pages,
  };
}
