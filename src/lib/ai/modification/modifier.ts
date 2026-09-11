// src/lib/ai/modification/modifier.ts

import type { WebsiteData } from "@/types/website";
import { executeStudioActions, type StudioAiAction } from "@/lib/studioAiActions";

export interface ModificationResult {
  updatedWebsite: WebsiteData;
  appliedActions: string[];
  preservedFields: string[];
}

/**
 * High-intelligence incremental modification engine.
 * Applies targeted modifications to WebsiteData while strictly preserving
 * all unrelated fields, components, sections, and catalog items.
 */
export function applyIncrementalModification(
  currentWebsite: WebsiteData,
  instruction: string,
  context?: {
    whatsappNumber?: string;
    targetSection?: string;
  }
): ModificationResult {
  const clean = instruction.toLowerCase().trim();
  const actions: StudioAiAction[] = [];
  const preservedFields: string[] = [];

  // Track initial state keys for preservation check
  if (currentWebsite.hero?.title) preservedFields.push("hero.title");
  if (currentWebsite.about?.content) preservedFields.push("about.content");
  if (currentWebsite.productsSection?.products?.length) preservedFields.push("productsSection.products");
  if (currentWebsite.contact?.phone) preservedFields.push("contact.phone");

  // 1. "Add online reservation"
  if (clean.includes("reservation") || clean.includes("booking")) {
    const currentOrder = currentWebsite.sectionOrder || ["hero", "about", "services", "contact", "footer"];
    if (!currentOrder.includes("reservation")) {
      const heroIdx = currentOrder.indexOf("hero");
      const insertIdx = heroIdx !== -1 ? heroIdx + 1 : 1;
      const newOrder = [...currentOrder];
      newOrder.splice(insertIdx, 0, "reservation");

      actions.push({
        action: "reorder_sections",
        payload: { newOrder, sectionOrder: newOrder },
        summary: "Added reservation section immediately following Hero banner.",
      });
    }

    actions.push({
      action: "update_button",
      payload: {
        path: "hero.button",
        label: "Reserve a Table",
      },
      summary: "Updated Hero CTA button text to 'Reserve a Table'.",
    });

    actions.push({
      action: "set_button_scroll_target",
      payload: {
        path: "hero.buttonAction",
        target: "reservation",
      },
      summary: "Configured Hero CTA to smoothly scroll to Reservation section.",
    });
  }

  // 2. "Remove gallery"
  else if (clean.includes("remove") && (clean.includes("gallery") || clean.includes("photos"))) {
    const currentOrder = currentWebsite.sectionOrder || [];
    if (currentOrder.includes("gallery")) {
      actions.push({
        action: "delete_section",
        payload: { sectionKey: "gallery" },
        summary: "Removed Gallery section from page layout.",
      });
    }
  }

  // 3. "Change the hero CTA to WhatsApp"
  else if (clean.includes("whatsapp") && (clean.includes("hero") || clean.includes("cta") || clean.includes("button"))) {
    const phone = context?.whatsappNumber || currentWebsite.contact?.phone || "+919876543210";
    actions.push({
      action: "set_button_whatsapp",
      payload: {
        path: "hero.button",
        label: "Book on WhatsApp",
        phone,
      },
      summary: `Changed Hero CTA to direct WhatsApp booking (${phone}).`,
    });
  }

  // 4. "Make the design more premium"
  else if (clean.includes("premium") || clean.includes("luxury") || clean.includes("dark luxury")) {
    actions.push({
      action: "update_theme",
      payload: {
        style: "dark luxury",
        primaryColor: "#D4AF37", // Elegant Champagne Gold
        secondaryColor: "#E11D48", // Crimson Red
      },
      summary: "Upgraded website aesthetic to Dark Luxury theme with Champagne Gold and Crimson accents.",
    });
  }

  const { updatedWebsite, appliedSummaries } = executeStudioActions(currentWebsite, actions);

  return {
    updatedWebsite,
    appliedActions: appliedSummaries,
    preservedFields,
  };
}
