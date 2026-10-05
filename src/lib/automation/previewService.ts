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
import type { CanonicalGenerationResponse } from "@/lib/intelligence/orchestration/types";

const responseStates: Record<CanonicalGenerationResponse["status"], AutomationPreviewResponse["status"]> = {
  READY: "preview", REPAIRED: "preview", FAILED: "failed", RESEARCH_REQUIRED: "research_required",
  WAITING_HUMAN_APPROVAL: "waiting_human_approval", QUALITY_BLOCKED: "quality_blocked", REJECTED: "rejected",
};

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
  requestId: string,
  identity: { userId?: string; tenantId: string }
): Promise<AutomationPreviewResponse> {
  const businessName = sanitizeInput(input.businessName, "Automated Business");
  const industryInput = sanitizeInput(input.industry || input.category);
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
    userId: identity.userId,
    tenantId: identity.tenantId,
    requirements: { description: input.description, style: input.style },
  });

  if (!canonicalRes.success) {
    return {
      success: false, status: responseStates[canonicalRes.status],
      researchId: canonicalRes.researchId, correlationId: canonicalRes.correlationId, error: canonicalRes.error,
      business: { name: businessName, industry: industryInput, location },
      preview: { id: "", slug: "", url: "" },
      generation: { requestId, model: "canonical-generation-orchestrator", durationMs: canonicalRes.durationMs },
    };
  }

  return {
    success: true,
    correlationId: canonicalRes.correlationId,
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
      archetype: canonicalRes.websiteData.designStrategy?.visualArchetype || "",
      heroType: canonicalRes.websiteData.hero.layoutVariant || "",
      colorMood: canonicalRes.websiteData.designStrategy?.colorMood || "",
      sectionCount: canonicalRes.websiteData.sectionOrder?.length || 0,
      qualityScore: canonicalRes.previewDetails?.qualityScore || 0,
    },
    generation: {
      requestId,
      model: "canonical-generation-orchestrator",
      durationMs: canonicalRes.durationMs,
    },
  };
}
