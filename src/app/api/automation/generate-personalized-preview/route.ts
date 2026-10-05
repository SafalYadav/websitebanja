// src/app/api/automation/generate-personalized-preview/route.ts
/**
 * WebsiteBanja Personalized Preview Generation Automation API
 * Phase: Phase 10 (Automated Personalized Preview Generation)
 *
 * Endpoint: POST /api/automation/generate-personalized-preview
 * Purpose: Secure internal automation boundary for generating audit-driven preview websites
 */

export const maxDuration = 120;
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { emitAgentEvent } from "@/lib/telemetry/agentTelemetry";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";
import { canonicalGenerationOrchestrator } from "@/lib/intelligence/orchestration/canonicalGenerationOrchestrator";
import type { PersonalizedPreviewRequest, PersonalizedPreviewResponse } from "@/lib/personalization/types";

const MAX_PAYLOAD_BYTES = 256 * 1024; // 256 KB
import { isAuthorized } from "@/lib/automation/auth";
import { verifyAdminAuth } from "@/lib/adminAuth";

export async function POST(req: Request) {
  const requestId = `req_p10_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  // 1. Authorization Check
  if (!(await isAuthorized(req))) {
    emitAgentEvent({
      event: "automation.auth_failed",
      agent: "n8n_automation",
      requestId,
      status: "error",
      metadata: { error: "Missing or invalid authorization" },
    });

    const errorBody = {
      success: false,
      status: "failed",
      error: {
        code: "UNAUTHORIZED",
        message: "Unauthorized automation request. Provide valid secret via x-automation-secret or Bearer token.",
      },
      handoffPhase: "phase11_personalized_outreach",
      leadId: "unknown",
      auditId: "unknown",
      business: { name: "Unknown", industry: "unknown", category: "unknown", location: "unknown" },
    };
    return NextResponse.json(errorBody, { status: 401 });
  }

  // 2. Payload Extraction & Size Check
  let rawBodyText = "";
  try {
    rawBodyText = await req.text();
  } catch {
    const errorBody = {
      success: false,
      status: "failed",
      error: {
        code: "INVALID_BODY",
        message: "Failed to read request body stream",
      },
      handoffPhase: "phase11_personalized_outreach",
      leadId: "unknown",
      auditId: "unknown",
      business: { name: "Unknown", industry: "unknown", category: "unknown", location: "unknown" },
    };
    return NextResponse.json(errorBody, { status: 400 });
  }

  if (rawBodyText.length > MAX_PAYLOAD_BYTES) {
    const errorBody = {
      success: false,
      status: "failed",
      error: {
        code: "PAYLOAD_TOO_LARGE",
        message: `Payload exceeds maximum allowed limit of ${MAX_PAYLOAD_BYTES / 1024} KB`,
      },
      handoffPhase: "phase11_personalized_outreach",
      leadId: "unknown",
      auditId: "unknown",
      business: { name: "Unknown", industry: "unknown", category: "unknown", location: "unknown" },
    };
    return NextResponse.json(errorBody, { status: 413 });
  }

  // 3. JSON Parsing & Input Validation
  let parsedBody: PersonalizedPreviewRequest;
  try {
    parsedBody = rawBodyText ? JSON.parse(rawBodyText) : {};
  } catch {
    const errorBody = {
      success: false,
      status: "failed",
      error: {
        code: "MALFORMED_JSON",
        message: "Invalid JSON syntax in request body",
      },
      handoffPhase: "phase11_personalized_outreach",
      leadId: "unknown",
      auditId: "unknown",
      business: { name: "Unknown", industry: "unknown", category: "unknown", location: "unknown" },
    };
    return NextResponse.json(errorBody, { status: 400 });
  }

  if (!parsedBody.leadId && !parsedBody.overrideLead) {
    const errorBody = {
      success: false,
      status: "failed",
      error: {
        code: "VALIDATION_FAILED",
        message: "Field 'leadId' is required to generate a personalized preview.",
      },
      handoffPhase: "phase11_personalized_outreach",
      leadId: "unknown",
      auditId: "unknown",
      business: { name: "Unknown", industry: "unknown", category: "unknown", location: "unknown" },
    };
    return NextResponse.json(errorBody, { status: 400 });
  }

  // 4. Generate Personalized Preview via Canonical Generation Orchestrator
  try {
    const admin = await verifyAdminAuth(req);
    const tenantId = admin.isAdmin && admin.userId ? admin.userId : process.env.AUTOMATION_TENANT_ID;
    if (!tenantId) return NextResponse.json({ success: false, error: { code: "AUTOMATION_TENANT_REQUIRED", message: "Configure a server-side automation tenant or authenticate as administrator" } }, { status: 403 });
    const identity = { tenantId, userId: admin.isAdmin ? admin.userId : undefined };
    const canonicalRes = await canonicalGenerationOrchestrator.generateWebsite({
      businessName: parsedBody.overrideLead?.businessName || "Business",
      leadId: parsedBody.leadId,
      auditId: parsedBody.auditId,
      overrideLead: parsedBody.overrideLead as any,
      overrideAudit: parsedBody.overrideAudit as any,
      placesPhotos: parsedBody.placesPhotos,
      placesReviews: parsedBody.placesReviews,
      userId: identity.userId,
      tenantId: identity.tenantId,
      source: "api",
    });

    if (!canonicalRes.success) {
      return NextResponse.json(
        {
          success: false,
          status: canonicalRes.status === "RESEARCH_REQUIRED" || canonicalRes.status === "WAITING_HUMAN_APPROVAL" ? canonicalRes.status.toLowerCase() : "failed",
          researchId: canonicalRes.researchId,
          correlationId: canonicalRes.correlationId,
          error: {
            code: canonicalRes.error?.code || "GENERATION_FAILED",
            message: canonicalRes.error?.message || "Canonical generation failed",
          },
          leadId: parsedBody.leadId || "unknown",
          auditId: parsedBody.auditId || "unknown",
          business: {
            name: canonicalRes.businessContext.businessName,
            industry: canonicalRes.businessContext.domain,
            category: canonicalRes.businessContext.domain,
            location: canonicalRes.businessContext.location,
          },
          handoffPhase: "phase11_personalized_outreach",
        },
        { status: canonicalRes.status === "RESEARCH_REQUIRED" || canonicalRes.status === "WAITING_HUMAN_APPROVAL" ? 409 : 500 }
      );
    }

    const response: PersonalizedPreviewResponse = {
      success: true,
      status: canonicalRes.status === "FAILED" ? "failed" : "generated",
      preview: {
        id: canonicalRes.preview.id,
        slug: canonicalRes.preview.slug,
        url: canonicalRes.preview.url,
        qualityScore: canonicalRes.validationReport?.overallScore ?? canonicalRes.previewDetails?.qualityScore ?? 0,
        designArchetype: canonicalRes.websiteData.designStrategy?.visualArchetype || "",
        sectionCount: canonicalRes.websiteData.sectionOrder?.length || 0,
        imageManifest: canonicalRes.previewDetails?.imageManifest || [],
        contrastReport: canonicalRes.previewDetails?.contrastReport,
      },
      business: {
        name: canonicalRes.businessContext.businessName,
        industry: canonicalRes.businessContext.domain,
        category: canonicalRes.businessContext.domain,
        location: canonicalRes.businessContext.location,
        phone: canonicalRes.businessContext.phone,
      },
      leadId: parsedBody.leadId || "lead_preview",
      auditId: parsedBody.auditId || "audit_preview",
      handoffPhase: "phase11_personalized_outreach",
    };

    return NextResponse.json({ ...response, correlationId: canonicalRes.correlationId }, { status: 200 });
  } catch (err: unknown) {
    const safeMessage = sanitizeErrorOutput(err);
    const errorBody = {
      success: false,
      status: "failed",
      error: {
        code: "PREVIEW_GENERATION_FAILED",
        message: safeMessage || "Unexpected error during personalized preview generation",
      },
      handoffPhase: "phase11_personalized_outreach",
      leadId: parsedBody.leadId || "unknown",
      auditId: parsedBody.auditId || "unknown",
      business: { name: "Unknown", industry: "unknown", category: "unknown", location: "unknown" },
    };
    return NextResponse.json(errorBody, { status: 500 });
  }
}
