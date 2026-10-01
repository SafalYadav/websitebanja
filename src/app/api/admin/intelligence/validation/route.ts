// src/app/api/admin/intelligence/validation/route.ts
/**
 * Quality Gate & Self-Correction Validation Admin API Route
 * Provides authenticated, tenant-isolated validation execution, history retrieval,
 * and bounded self-correction loop execution.
 */

import { NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/adminAuth";
import { checkMemoryRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/supabaseServer";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";
import { validationOrchestrator } from "@/lib/intelligence/validation/validationOrchestrator";
import { validationStore } from "@/lib/intelligence/validation/validationStore";
import { ValidationContextSchema } from "@/lib/intelligence/validation/schemas";
import { z } from "zod";

export const dynamic = "force-dynamic";

const RequestActionSchema = z.object({
  action: z.enum(["validate", "repair_loop"]).default("validate"),
  context: ValidationContextSchema,
});

/**
 * GET /api/admin/intelligence/validation
 * Query params:
 * - ?validationId=xxx : fetch single report by validationId
 * - ?projectId=xxx&tenantId=xxx : fetch latest report or history for project
 */
export async function GET(req: Request) {
  try {
    const ip = getClientIp(req);
    const { success: allowed } = checkMemoryRateLimit(`admin_val_get_${ip}`, 60, 60 * 1000);
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
    const validationId = searchParams.get("validationId");
    const projectId = searchParams.get("projectId");
    const tenantId = searchParams.get("tenantId") || "default";

    if (validationId) {
      const report = validationStore.getReport(validationId, tenantId);
      if (!report) {
        return NextResponse.json(
          { success: false, message: `Validation report ${validationId} not found` },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, report });
    }

    if (projectId) {
      const history = validationStore.getProjectHistory(tenantId, projectId);
      const latest = validationStore.getLatestProjectReport(tenantId, projectId);
      return NextResponse.json({
        success: true,
        projectId,
        latestReport: latest,
        history: history ? history.cycles : [],
      });
    }

    return NextResponse.json({
      success: true,
      service: "ValidationOrchestrator",
      stages: ["SEMANTIC", "VISUAL", "CTA", "NAVIGATION", "CLAIMS", "ACCESSIBILITY", "PERFORMANCE"],
      status: "operational",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: sanitizeErrorOutput(err?.message || "Internal server error") },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/intelligence/validation
 * Executes validation or bounded self-correction loop.
 */
export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const { success: allowed } = checkMemoryRateLimit(`admin_val_post_${ip}`, 30, 60 * 1000);
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

    const body = await req.json();
    const parseResult = RequestActionSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid validation request body",
          errors: parseResult.error.format(),
        },
        { status: 400 }
      );
    }

    const { action, context } = parseResult.data;

    if (action === "repair_loop") {
      const result = await validationOrchestrator.executeSelfCorrectionLoop(context as any);
      return NextResponse.json({
        success: true,
        action: "repair_loop",
        decision: result.finalReport.decision,
        cycles: result.cycles,
        repaired: result.repaired,
        report: result.finalReport,
        ceoAlert: result.ceoAlert || null,
        repairedWebsiteData: result.finalWebsiteData,
      });
    }

    const report = await validationOrchestrator.validateWebsite(context as any);
    return NextResponse.json({
      success: true,
      action: "validate",
      decision: report.decision,
      report,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: sanitizeErrorOutput(err?.message || "Internal server error") },
      { status: 500 }
    );
  }
}
