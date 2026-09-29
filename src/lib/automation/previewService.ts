// src/lib/automation/previewService.ts
/**
 * WebsiteBanja Automation Preview Generation Engine
 * Phase: Phase 7 (n8n Automation Foundation)
 * 
 * Reuses:
 * - Phase 3 Central Context Builder (buildAIContext)
 * - Phase 6 Premium Website Generation Engine (Design Strategy, Rules, Brief, Section Sequencer)
 * - Phase 6.1 Intelligent Semantic Image Sourcing & Deduplication
 * - Phase 6 Quality Validator
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { normalizeIndustry, generateDesignRules } from "@/lib/ai/design/designRules";
import {
  generateDesignStrategy,
  deriveVisualArchetype,
  deriveSectionSequence,
} from "@/lib/ai/designStrategy";
import { compileDesignBrief } from "@/lib/ai/design/designBrief";
import { validateWebsiteQuality } from "@/lib/ai/design/qualityValidator";
import { resolveSemanticImage } from "@/lib/images/semanticImageSourcing";
import { buildAIContext } from "@/lib/ai/contextBuilder";
import type { WebsiteRequirement } from "@/lib/ai/requirementModel";
import type { WebsiteData, FAQ, Service, Feature } from "@/types/website";
import type { AutomationPreviewRequest, AutomationPreviewResponse } from "./types";

/**
 * Sanitizes untrusted user strings, neutralizing prompt injection tokens
 */
function sanitizeInput(str?: string, fallback = ""): string {
  if (typeof str !== "string") return fallback;
  return str
    .replace(/[<>]/g, "")
    .replace(/\b(ignore previous instructions|system prompt|developer mode)\b/gi, "")
    .trim() || fallback;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

/**
 * Executes the complete WebsiteBanja generation pipeline for an automated business payload
 * and persists a local preview website accessible at /preview/:id
 */
export async function generateAutomationPreview(
  input: AutomationPreviewRequest,
  requestId: string
): Promise<AutomationPreviewResponse> {
  const startTime = Date.now();

  const businessName = sanitizeInput(input.businessName, "Automated Business");
  const industryInput = sanitizeInput(input.industry || input.category, "restaurant");
  const description = sanitizeInput(
    input.description,
    `${businessName} is dedicated to offering distinct high-quality experiences and services.`
  );
  const location = sanitizeInput(input.location, "Local Area");
  const servicesList = (input.services || ["Core Offering", "Premium Service", "Consultation", "Support"])
    .map((s) => sanitizeInput(s))
    .filter(Boolean);
  const ctaText = sanitizeInput(input.ctaText, "Get Started");

  // 1. Build AI Context via Phase 3 Context Builder
  const aiContext = await buildAIContext({
    websiteType: industryInput,
    userPrompt: `Generate preview website for ${businessName}. Description: ${description}`,
    taskType: "generation",
    overrides: {
      businessName,
      websiteType: industryInput,
      category: industryInput,
      description,
      pages: ["home"],
      features: servicesList,
      contact: {
        phone: input.contact?.phone,
        email: input.contact?.email,
        address: location,
      },
    },
  });

  // 2. Formulate WebsiteRequirement
  const requirement: WebsiteRequirement = {
    intent: `create ${businessName} website`,
    business: {
      name: businessName,
      type: industryInput,
      industry: industryInput,
    },
    location,
    services: servicesList,
    brand: {
      style: input.style || "warm_artisanal",
    },
    cta: ctaText,
    content: {
      heroTitle: businessName,
      heroSubtitle: description,
    },
  };

  // 3. Phase 6 Design Engine: Normalization & Rules
  const normalizedInd = normalizeIndustry(requirement);
  const designRules = generateDesignRules(requirement);

  // 4. Phase 6 Design Strategy & Visual Archetype
  const strategyInput = {
    category: normalizedInd,
    businessName,
    description,
    style: input.style || "warm_artisanal",
  };
  const computedStrategy = generateDesignStrategy(strategyInput);
  const archetype = deriveVisualArchetype(strategyInput);

  // 5. Phase 6 Design Brief
  const designBrief = compileDesignBrief(computedStrategy, designRules, requirement);

  // 6. Bespoke Section Sequence
  const sectionSequence = deriveSectionSequence(archetype, {
    category: normalizedInd,
    description,
  });

  // 7. Phase 6.1 Intelligent Semantic Image Sourcing (Deduplicated per page)
  const usedInPage = new Set<string>();

  const heroImageMeta = resolveSemanticImage({
    category: normalizedInd,
    businessName,
    archetype,
    role: "hero",
    usedInPage,
  });

  const aboutImageMeta = resolveSemanticImage({
    category: normalizedInd,
    businessName,
    archetype,
    role: "about",
    usedInPage,
  });

  const servicesData: Service[] = servicesList.map((title, idx) => {
    const meta = resolveSemanticImage({
      category: normalizedInd,
      businessName,
      archetype,
      role: "services",
      itemIndex: idx,
      itemTitle: title,
      usedInPage,
    });
    return {
      title,
      description: `${title} curated and delivered with uncompromising precision and artisanal standards.`,
      price: "Inquire for details",
      image: meta.imageUrl,
    };
  });

  const featuresList = input.requirements?.length
    ? input.requirements
    : ["Artisanal Quality Standard", "Dedicated Personal Service", "Certified Experience", "100% Satisfaction Guarantee"];

  const featuresData: Feature[] = featuresList.map((title, idx) => {
    const meta = resolveSemanticImage({
      category: normalizedInd,
      businessName,
      archetype,
      role: "features",
      itemIndex: idx,
      itemTitle: title,
      usedInPage,
    });
    return {
      title,
      description: `Committed to exceeding client expectations with modern practices and dependable care.`,
      image: meta.imageUrl,
    };
  });

  const faqItems: FAQ[] = [
    {
      question: `What makes ${businessName} unique?`,
      answer: `${businessName} combines tailored personal attention with high standards of craft, ensuring every detail reflects your specific needs.`,
    },
    {
      question: `How can I book or inquire about services?`,
      answer: `You can reach out directly via our contact form, phone, or email to schedule an appointment or consultation.`,
    },
  ];

  // 8. Assemble Complete WebsiteData
  const websiteData: WebsiteData = {
    businessName,
    brand: {
      name: businessName,
      industry: normalizedInd,
      tagline: `${businessName} — Dedicated Excellence in ${location}`,
      description,
    },
    navbar: {
      logo: {
        type: "text",
        text: businessName,
      },
      links: [
        { id: "nav_services", label: "Offerings", action: { type: "scroll", target: "services" } },
        { id: "nav_features", label: "Features", action: { type: "scroll", target: "features" } },
        { id: "nav_about", label: "Story", action: { type: "scroll", target: "about" } },
        { id: "nav_contact", label: "Contact", action: { type: "scroll", target: "contact" } },
      ],
    },
    hero: {
      title: `${businessName} — Dedicated Excellence in ${location}`,
      subtitle: description,
      button: ctaText,
      eyebrow: `${designRules.industryProfile.displayName} • Verified Preview`,
      image: heroImageMeta.imageUrl,
      buttonAction: {
        type: "scroll",
        target: "contact",
        label: ctaText,
      },
      layoutVariant: computedStrategy.heroType as any,
      backgroundStyle: computedStrategy.backgroundStrategy,
      spatial3d: computedStrategy.spatial3d,
    },
    about: {
      title: `About ${businessName}`,
      content: `${description} Rooted in uncompromising dedication to quality, our mission is to deliver timeless distinction and measurable excellence in every client engagement.`,
      image: aboutImageMeta.imageUrl,
    },
    services: servicesData,
    features: featuresData,
    faq: faqItems,
    contact: {
      phone: input.contact?.phone || "+91 98765 43210",
      email: input.contact?.email || "concierge@websitebanja.local",
      address: location,
    },
    footer: {
      copyright: `© ${new Date().getFullYear()} ${businessName}. All rights reserved. Generated via WebsiteBanja n8n Automation.`,
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

  // 9. Validate Quality via Phase 6 Quality Validator
  const qualityReport = validateWebsiteQuality(
    websiteData as unknown as Record<string, unknown>,
    businessName
  );

  // 10. Persist Local Preview Data
  const baseSlug = slugify(businessName) || "preview";
  const uniqueHash = crypto.randomBytes(4).toString("hex");
  const previewId = `prev_${baseSlug}_${uniqueHash}`;
  const previewSlug = `${baseSlug}-${uniqueHash}`;

  const previewDir = path.join(process.cwd(), "scratch", "previews");
  if (!fs.existsSync(previewDir)) {
    fs.mkdirSync(previewDir, { recursive: true });
  }

  const previewFilePath = path.join(previewDir, `${previewId}.json`);
  fs.writeFileSync(previewFilePath, JSON.stringify(websiteData, null, 2), "utf-8");

  // Also write mapped previewId under previewSlug so both /preview/:id and /preview/:slug resolve smoothly
  const slugFilePath = path.join(previewDir, `${previewSlug}.json`);
  fs.writeFileSync(slugFilePath, JSON.stringify(websiteData, null, 2), "utf-8");

  const durationMs = Date.now() - startTime;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return {
    success: true,
    status: "preview",
    business: {
      name: businessName,
      industry: normalizedInd,
      category: designRules.industryProfile.displayName,
      location,
    },
    preview: {
      id: previewId,
      slug: previewSlug,
      url: `${baseUrl}/preview/${previewId}`,
    },
    design: {
      archetype,
      heroType: computedStrategy.heroType,
      colorMood: computedStrategy.colorMood,
      sectionCount: sectionSequence.length,
      qualityScore: qualityReport.score,
    },
    generation: {
      requestId,
      model: "websitebanja-premium-engine",
      durationMs,
    },
  };
}
