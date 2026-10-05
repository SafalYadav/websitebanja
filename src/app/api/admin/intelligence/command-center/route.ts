// src/app/api/admin/intelligence/command-center/route.ts
// Phase 26 — CEO Command Center
// Consolidated read-oriented admin API aggregating the 15 required sections of the CEO Command Center.

import { NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/adminAuth";
import { checkMemoryRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/supabaseServer";
import { commandCenterService } from "@/lib/intelligence/commandCenter/commandCenterService";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/intelligence/command-center
 * Returns the consolidated 15-section CEO Command Center state.
 * Requires authenticated administrator clearance.
 */
export async function GET(req: Request) {
  try {
    const ip = getClientIp(req);
    const { success: allowed } = checkMemoryRateLimit(`admin_cmd_center_get_${ip}`, 60, 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { success: false, message: "Too many requests. Please wait." },
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

    const { searchParams } = new URL(req.url);
    const requestedTenant = searchParams.get("tenantId")?.trim();

    // Derive trusted identity server-side: if explicit tenant requested, verify authorization; otherwise use caller's authenticated identity
    const effectiveTenantId = requestedTenant || auth.userId;
    if (!effectiveTenantId?.trim()) {
      return NextResponse.json(
        { success: false, message: "Forbidden: Authorized workspace tenant identity required." },
        { status: 403 }
      );
    }

    // Restrict this endpoint strictly to the caller's own tenant. Cross-tenant access is prohibited
    if (requestedTenant && requestedTenant !== auth.userId) {
      return NextResponse.json(
        { success: false, message: "Forbidden: Cross-tenant workspace access prohibited. You may only view your own workspace." },
        { status: 403 }
      );
    }

    const data = await commandCenterService.getCommandCenterData({
      tenantId: effectiveTenantId,
      userId: auth.userId,
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err) {
    const message = sanitizeErrorOutput(
      err instanceof Error ? err.message : String(err)
    );
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
