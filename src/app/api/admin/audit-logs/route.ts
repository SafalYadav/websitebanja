// src/app/api/admin/audit-logs/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/adminAuth";
import { dbGetAdminAuditLogs } from "@/lib/db/queries";
import { checkMemoryRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/supabaseServer";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";

/**
 * GET /api/admin/audit-logs
 * Retrieves bounded privilege audit logs (ADMIN_GRANTED, ADMIN_REVOKED, PRO_GRANTED, PRO_REVOKED).
 * Strictly restricted to verified administrators.
 */
export async function GET(req: Request) {
  try {
    const ip = getClientIp(req);
    const { success: allowed } = checkMemoryRateLimit(`admin_audit_${ip}`, 30, 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { success: false, message: "Too many audit log requests. Please slow down." },
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

    const url = new URL(req.url);
    const rawLimit = url.searchParams.get("limit");
    const limit = rawLimit ? Math.min(Math.max(1, parseInt(rawLimit, 10)), 100) : 50;

    const logs = await dbGetAdminAuditLogs(limit);

    return NextResponse.json({
      success: true,
      data: logs,
    });
  } catch (err) {
    const safeMsg = sanitizeErrorOutput(String(err));
    console.error("[GET /api/admin/audit-logs Error]:", safeMsg);
    return NextResponse.json(
      { success: false, message: "Failed to retrieve administrative audit logs." },
      { status: 500 }
    );
  }
}
