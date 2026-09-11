// WHY runtime = "nodejs": Native pg.Pool queries against Azure PostgreSQL require Node.js runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { validateUserAuth } from "@/lib/supabaseServer";
import { dbGetUserSubscription, dbUpsertUserSubscription } from "@/lib/db/queries";
import { PLANS, getPlan, formatINR } from "@/lib/plans";

/**
 * GET /api/subscription
 * Retrieves the current authenticated user's plan and subscription status from Azure PostgreSQL.
 */
export async function GET(request: Request) {
  try {
    const auth = await validateUserAuth(request);
    if (!auth.user) {
      const errMsg = auth.error || "Unauthorized";
      return NextResponse.json({ success: false, error: errMsg, message: errMsg }, { status: auth.status });
    }

    const sub = await dbGetUserSubscription(auth.user.id);
    const planId = sub?.plan_id || "free";
    const status = sub?.status || "free";
    const isPro = planId === "paid_pro" && status === "active_paid";
    const planDef = getPlan(planId);

    return NextResponse.json({
      success: true,
      data: {
        userId: auth.user.id,
        planId,
        status,
        isPro,
        amountINR: isPro ? 500 : 0,
        formattedPrice: isPro ? formatINR(500) : formatINR(0),
        period: planDef.period,
        plan: planDef,
      },
    });
  } catch (err) {
    console.error("[GET /api/subscription] Error:", err);
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Failed to load subscription details." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/subscription
 * Activates or switches user subscription in Azure PostgreSQL.
 * Supported plans: 'free' (₹0) and 'paid_pro' (₹500/month).
 */
export async function POST(request: Request) {
  try {
    const auth = await validateUserAuth(request);
    if (!auth.user) {
      const errMsg = auth.error || "Unauthorized";
      return NextResponse.json({ success: false, error: errMsg, message: errMsg }, { status: auth.status });
    }

    const body = (await request.json().catch(() => ({}))) as {
      planId?: string;
      action?: "upgrade" | "cancel";
    };

    const targetPlanId = body.planId === "paid_pro" || body.action === "upgrade" ? "paid_pro" : "free";

    if (targetPlanId === "paid_pro") {
      const updated = await dbUpsertUserSubscription(auth.user.id, "paid_pro", "active_paid", 500);
      return NextResponse.json({
        success: true,
        message: "Successfully activated Paid Pro plan (₹500/month).",
        data: {
          planId: updated.plan_id,
          status: updated.status,
          isPro: true,
          amountINR: 500,
          formattedPrice: formatINR(500),
          plan: PLANS.paid_pro,
        },
      });
    } else {
      const updated = await dbUpsertUserSubscription(auth.user.id, "free", "free", 0);
      return NextResponse.json({
        success: true,
        message: "Successfully updated subscription to Free Starter.",
        data: {
          planId: updated.plan_id,
          status: updated.status,
          isPro: false,
          amountINR: 0,
          formattedPrice: formatINR(0),
          plan: PLANS.free,
        },
      });
    }
  } catch (err) {
    console.error("[POST /api/subscription] Error:", err);
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Failed to update subscription." },
      { status: 500 }
    );
  }
}
