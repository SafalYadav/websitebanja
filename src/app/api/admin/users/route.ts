// src/app/api/admin/users/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/adminAuth";
import { dbGetAdminUsersDirectory } from "@/lib/db/queries";
import { checkMemoryRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/supabaseServer";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";

/**
 * GET /api/admin/users
 * Returns directory of users with real identity, roles, and plan statuses.
 * Strictly restricted to verified administrators.
 */
export async function GET(req: Request) {
  try {
    const ip = getClientIp(req);
    const { success: allowed } = checkMemoryRateLimit(`admin_users_${ip}`, 30, 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { success: false, message: "Too many requests. Please slow down." },
        { status: 429 }
      );
    }

    const auth = await verifyAdminAuth(req);
    if (!auth.isAdmin) {
      return NextResponse.json(
        { success: false, message: auth.error || "Forbidden: Administrator clearance required." },
        { status: auth.error?.includes("Missing") ? 401 : 403 }
      );
    }

    const users = await dbGetAdminUsersDirectory();

    return NextResponse.json({
      success: true,
      data: users,
    });
  } catch (err) {
    const safeMsg = sanitizeErrorOutput(String(err));
    console.error("[GET /api/admin/users Error]:", safeMsg);
    return NextResponse.json(
      { success: false, message: "Failed to retrieve administrative user directory." },
      { status: 500 }
    );
  }
}
