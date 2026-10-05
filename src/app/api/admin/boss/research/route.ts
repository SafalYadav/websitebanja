// src/app/api/admin/boss/research/route.ts
import { NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/adminAuth";
import { getBossResearchReport } from "@/lib/agents/boss";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";
import { checkMemoryRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/boss/research
 * Returns a static reference catalog. It is not live research or approval authority.
 * Strictly restricted to verified administrators.
 */
export async function GET(req: Request) {
  try {
    const ip = getClientIp(req);
    const { success: allowed } = checkMemoryRateLimit(`admin_boss_research_${ip}`, 30, 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { success: false, message: "Too many research requests. Please wait a moment." },
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

    const report = getBossResearchReport();

    return NextResponse.json({
      success: true,
      data: report,
      evidenceKind: "reference_catalog",
      runtimeVerified: false,
      activationAllowed: false,
    });
  } catch (err) {
    const safeErrorMsg = sanitizeErrorOutput(String(err));
    console.error("[API /api/admin/boss/research Error]:", safeErrorMsg);
    return NextResponse.json(
      { success: false, message: "Failed to generate Boss research report." },
      { status: 500 }
    );
  }
}
