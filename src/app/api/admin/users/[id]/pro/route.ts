// src/app/api/admin/users/[id]/pro/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/adminAuth";
import { dbGrantPro, dbRevokePro } from "@/lib/db/queries";
import { checkMemoryRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/supabaseServer";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/users/[id]/pro
 * Grants or revokes Pro entitlement for a target user.
 * Strictly restricted to verified administrators.
 */
export async function POST(req: Request, context: RouteContext) {
  try {
    const { id: targetUserId } = await context.params;
    if (!targetUserId || typeof targetUserId !== "string" || targetUserId.trim() === "") {
      return NextResponse.json(
        { success: false, message: "Target user ID is required." },
        { status: 400 }
      );
    }

    const ip = getClientIp(req);
    const { success: allowed } = checkMemoryRateLimit(`admin_pro_${ip}`, 20, 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { success: false, message: "Rate limit exceeded. Please wait before updating entitlements." },
        { status: 429 }
      );
    }

    const auth = await verifyAdminAuth(req);
    if (!auth.isAdmin || !auth.userId) {
      return NextResponse.json(
        { success: false, message: auth.error || "Forbidden: Administrator clearance required." },
        { status: auth.error?.includes("Missing") ? 401 : 403 }
      );
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Malformed JSON payload." },
        { status: 400 }
      );
    }

    const action = body?.action;
    const reason = typeof body?.reason === "string" ? body.reason.trim() : undefined;

    if (action !== "grant" && action !== "revoke") {
      return NextResponse.json(
        { success: false, message: "Invalid action. Must be 'grant' or 'revoke'." },
        { status: 400 }
      );
    }

    if (action === "grant") {
      const res = await dbGrantPro(targetUserId, auth.userId, reason);
      return NextResponse.json({
        success: true,
        message: res.message,
        data: { userId: targetUserId, isPro: true, planId: "paid_pro", status: "active_paid" },
      });
    } else {
      const res = await dbRevokePro(targetUserId, auth.userId, reason);
      return NextResponse.json({
        success: true,
        message: res.message,
        data: { userId: targetUserId, isPro: false, planId: "free", status: "free" },
      });
    }
  } catch (err) {
    const safeMsg = sanitizeErrorOutput(String(err));
    console.error("[POST /api/admin/users/[id]/pro Error]:", safeMsg);
    return NextResponse.json(
      { success: false, message: "Unable to update user Pro entitlement." },
      { status: 500 }
    );
  }
}
