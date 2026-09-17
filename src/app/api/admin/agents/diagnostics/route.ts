// src/app/api/admin/agents/diagnostics/route.ts
import { NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/adminAuth";
import { runBossAgent } from "@/lib/agents/boss";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";
import { checkMemoryRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/agents/diagnostics
 * Retrieves current agent operational health, anomalies, and recommendations.
 * Strictly restricted to verified administrators.
 */
export async function GET(req: Request) {
  try {
    const ip = getClientIp(req);
    const { success: allowed } = checkMemoryRateLimit(`admin_diag_${ip}`, 30, 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { success: false, message: "Too many diagnostic requests. Please wait a moment." },
        { status: 429 }
      );
    }

    // Server-side admin authorization verification
    const auth = await verifyAdminAuth(req);
    if (!auth.isAdmin) {
      return NextResponse.json(
        { success: false, message: auth.error || "Forbidden: Administrator access required." },
        { status: auth.error?.includes("Missing") ? 401 : 403 }
      );
    }

    const url = new URL(req.url);
    const rawWindow = url.searchParams.get("windowMinutes");
    const windowMinutes = rawWindow ? parseInt(rawWindow, 10) : 1440;

    const report = await runBossAgent({
      windowMinutes: isNaN(windowMinutes) ? 1440 : windowMinutes,
    }, {
      userId: auth.userId,
    });

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (err) {
    const safeErrorMsg = sanitizeErrorOutput(String(err));
    console.error("[API /api/admin/agents/diagnostics Error]:", safeErrorMsg);
    return NextResponse.json(
      { success: false, message: "Failed to generate supervisory diagnostics report." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/agents/diagnostics
 * Triggers supervisory analysis with optional custom window and threshold overrides.
 * Strictly restricted to verified administrators.
 */
export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const { success: allowed } = checkMemoryRateLimit(`admin_diag_${ip}`, 30, 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { success: false, message: "Too many diagnostic requests. Please wait a moment." },
        { status: 429 }
      );
    }

    // Server-side admin authorization verification
    const auth = await verifyAdminAuth(req);
    if (!auth.isAdmin) {
      return NextResponse.json(
        { success: false, message: auth.error || "Forbidden: Administrator access required." },
        { status: auth.error?.includes("Missing") ? 401 : 403 }
      );
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Body is optional
    }

    const windowMinutes = typeof body?.windowMinutes === "number" ? body.windowMinutes : 1440;

    const report = await runBossAgent({
      windowMinutes,
      thresholdOverrides: body?.thresholdOverrides,
      syntheticTelemetry: body?.syntheticTelemetry,
    }, {
      userId: auth.userId,
    });

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (err) {
    const safeErrorMsg = sanitizeErrorOutput(String(err));
    console.error("[API /api/admin/agents/diagnostics Error]:", safeErrorMsg);
    return NextResponse.json(
      { success: false, message: "Failed to generate supervisory diagnostics report." },
      { status: 500 }
    );
  }
}
