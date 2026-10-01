// src/app/api/admin/intelligence/grounding/route.ts
// Grounded Business Intelligence Admin API Route
// Supports listing profiles, checking source statuses, and triggering grounded business research.

import { NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/adminAuth";
import { checkMemoryRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/supabaseServer";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";
import { groundedIntelligenceService } from "@/lib/intelligence/grounding/groundedIntelligenceService";
import { groundedProfileStore } from "@/lib/intelligence/grounding/groundedProfileStore";
import { BusinessResearchRequestSchema } from "@/lib/intelligence/grounding/schemas";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/intelligence/grounding
 * Query options:
 * - ?leadId=xxx : fetches a single profile by leadId
 * - ?tenantId=xxx : filters profiles by tenant (default: "default")
 * - no query : returns service status, source availability, and list of profiles for tenant
 */
export async function GET(req: Request) {
  try {
    const ip = getClientIp(req);
    const { success: allowed } = checkMemoryRateLimit(`admin_grounding_get_${ip}`, 60, 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { success: false, message: "Too many requests. Please wait." },
        { status: 429 }
      );
    }

    const auth = await verifyAdminAuth(req);
    if (!auth.isAdmin) {
      return NextResponse.json(
        { success: false, message: auth.error || "Forbidden: Administrator access required." },
        { status: auth.error?.includes("Missing") ? 401 : 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const leadId = searchParams.get("leadId");
    const tenantId = searchParams.get("tenantId") || "default";

    if (leadId) {
      const profile = await groundedProfileStore.getProfileByLeadId(leadId, tenantId);
      if (!profile) {
        return NextResponse.json(
          { success: false, message: `Grounded profile not found for leadId: ${leadId}` },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        profile,
        freshnessStatus: groundedProfileStore.calculateFreshness(profile.freshness.fetchedAt),
      });
    }

    // List profiles and status
    const profiles = await groundedProfileStore.listProfiles(tenantId);
    const status = groundedIntelligenceService.getStatus();

    return NextResponse.json({
      success: true,
      status,
      profiles: profiles.map((p) => ({
        businessId: p.businessId,
        businessName: p.identity.canonicalName,
        compositeConfidence: p.compositeConfidence,
        compositeConfidenceLevel: p.compositeConfidenceLevel,
        freshness: p.freshness,
        servicesCount: p.services.length,
        evidenceCount: p.evidence.length,
        forbiddenClaimsCount: p.forbiddenClaims.length,
        sourcesUsed: p.freshness.sourcesFetched,
        fetchedAt: p.freshness.fetchedAt,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: sanitizeErrorOutput(error?.message || "Internal server error") },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/intelligence/grounding
 * Triggers grounded business research for a given lead/business.
 * Validates request schema, enforces tenant isolation and secret redaction.
 */
export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const { success: allowed } = checkMemoryRateLimit(`admin_grounding_post_${ip}`, 30, 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { success: false, message: "Too many requests. Please wait." },
        { status: 429 }
      );
    }

    const auth = await verifyAdminAuth(req);
    if (!auth.isAdmin) {
      return NextResponse.json(
        { success: false, message: auth.error || "Forbidden: Administrator access required." },
        { status: auth.error?.includes("Missing") ? 401 : 403 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, message: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    const parseResult = BusinessResearchRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed for BusinessResearchRequest.",
          errors: parseResult.error.issues,
        },
        { status: 400 }
      );
    }

    const researchResult = await groundedIntelligenceService.researchBusiness(parseResult.data);

    return NextResponse.json({
      success: true,
      result: researchResult,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: sanitizeErrorOutput(error?.message || "Internal server error") },
      { status: 500 }
    );
  }
}
