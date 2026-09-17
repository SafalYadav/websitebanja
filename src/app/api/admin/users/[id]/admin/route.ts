// src/app/api/admin/users/[id]/admin/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { verifyAdminAuth, grantAdminRole, revokeAdminRole } from "@/lib/adminAuth";
import { checkMemoryRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/supabaseServer";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/users/[id]/admin
 * Grants or revokes administrative role on a target user.
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
    const { success: allowed } = checkMemoryRateLimit(`admin_privilege_${ip}`, 20, 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { success: false, message: "Rate limit exceeded. Please wait before updating privileges." },
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
    const targetEmail = typeof body?.targetEmail === "string" ? body.targetEmail.trim() : undefined;

    if (action !== "grant" && action !== "revoke") {
      return NextResponse.json(
        { success: false, message: "Invalid action. Must be 'grant' or 'revoke'." },
        { status: 400 }
      );
    }

    if (action === "grant") {
      const res = await grantAdminRole(targetUserId, auth.userId, reason);
      return NextResponse.json({
        success: true,
        message: res.message,
        data: { userId: targetUserId, isAdmin: true },
      });
    } else {
      const res = await revokeAdminRole(targetUserId, auth.userId, targetEmail, reason);
      return NextResponse.json({
        success: true,
        message: res.message,
        data: { userId: targetUserId, isAdmin: false },
      });
    }
  } catch (err) {
    const safeMsg = sanitizeErrorOutput(String(err));
    const errMsg = err instanceof Error ? err.message : "Privilege modification failed.";

    // Guard against self-lockout and primary bootstrap admin revocation
    if (
      errMsg.includes("cannot revoke") ||
      errMsg.includes("primary bootstrap administrator") ||
      errMsg.includes("own administrative clearance")
    ) {
      return NextResponse.json(
        { success: false, message: errMsg },
        { status: 403 }
      );
    }

    console.error("[POST /api/admin/users/[id]/admin Error]:", safeMsg);
    return NextResponse.json(
      { success: false, message: "Unable to update administrative privileges." },
      { status: 500 }
    );
  }
}
