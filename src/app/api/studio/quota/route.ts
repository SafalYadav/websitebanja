export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { validateUserAuth } from "@/lib/supabaseServer";
import { getStudioQuota } from "@/lib/studioQuota";

/**
 * GET /api/studio/quota
 * Returns authoritative server-side Studio change quota and plan status for the authenticated user.
 */
export async function GET(request: Request) {
  try {
    const auth = await validateUserAuth(request);
    if (!auth.user) {
      return NextResponse.json(
        { success: false, error: auth.error || "Unauthorized" },
        { status: auth.status }
      );
    }

    const quota = await getStudioQuota(auth.user.id);

    return NextResponse.json({
      success: true,
      data: quota,
    });
  } catch (err) {
    console.error("[GET /api/studio/quota] Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Failed to load Studio quota status.",
      },
      { status: 500 }
    );
  }
}
