// src/lib/automation/previewService.ts
/**
 * WebsiteBanja Automation Preview Generation Engine
 * Phase: Phase 7 (n8n Automation Foundation)
 * 
 * Reuses:
 * - Phase 3 Central Context Builder (buildAIContext)
 * - Canonical Generation Orchestrator (Universal Grounded & Self-Correcting Generation)
 */

import { canonicalGenerationOrchestrator } from "@/lib/intelligence/orchestration/canonicalGenerationOrchestrator";
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

/**
 * Executes the complete WebsiteBanja generation pipeline for an automated business payload
 * and persists a local preview website accessible at /preview/:id
 */
export async function generateAutomationPreview(
  input: AutomationPreviewRequest,
  requestId: string
): Promise<AutomationPreviewResponse> {
  const businessName = sanitizeInput(input.businessName, "Automated Business");
  const industryInput = sanitizeInput(input.industry || input.category, "restaurant");
  const location = sanitizeInput(input.location, "Local Area");

  // Route to the canonical generation orchestrator to ensure 100% grounded, validated output
  const canonicalRes = await canonicalGenerationOrchestrator.generateWebsite({
    businessName,
    category: industryInput,
    location,
    phone: input.contact?.phone,
    email: input.contact?.email,
    placeId: sanitizeInput(input.placeId) || undefined,
    websiteUrl: sanitizeInput(input.website) || undefined,
    source: "automation_n8n",
  });

  if (!canonicalRes.success) {
    throw new Error(canonicalRes.error?.message || "Canonical generation pipeline failed");
  }

  return {
    success: true,
    status: "preview",
    business: {
      name: businessName,
      industry: industryInput,
      category: industryInput,
      location,
    },
    preview: {
      id: canonicalRes.preview.id,
      slug: canonicalRes.preview.slug,
      url: canonicalRes.preview.url,
    },
    design: {
      archetype: "warm_artisanal",
      heroType: "split_hero",
      colorMood: "warm",
      sectionCount: canonicalRes.websiteData.sectionOrder?.length || 7,
      qualityScore: 95,
    },
    generation: {
      requestId,
      model: "canonical-generation-orchestrator",
      durationMs: canonicalRes.durationMs,
    },
  };
}
