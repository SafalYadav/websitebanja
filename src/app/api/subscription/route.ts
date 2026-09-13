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
    const expiresAt = sub?.current_period_end ? new Date(sub.current_period_end).toISOString() : null;
    const isPro = planId === "paid_pro" && status === "active_paid";
    const now = Date.now();

    // Check if Pro is expiring soon (<= 24 hours remaining)
    let isExpiringSoon = false;
    let daysRemaining = 0;
    let hoursRemaining = 0;
    let formattedExpiryDate = "";

    if (expiresAt) {
      const expMs = new Date(expiresAt).getTime();
      const diffMs = expMs - now;
      if (diffMs > 0) {
        hoursRemaining = Math.ceil(diffMs / (1000 * 60 * 60));
        daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        isExpiringSoon = isPro && diffMs <= 24 * 60 * 60 * 1000;
        formattedExpiryDate = new Intl.DateTimeFormat("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }).format(new Date(expiresAt));
      }
    }

    const planDef = getPlan(isPro ? "paid_pro" : "free");

    return NextResponse.json({
      success: true,
      data: {
        userId: auth.user.id,
        planId: isPro ? "paid_pro" : "free",
        status: isPro ? "active_paid" : status,
        isPro,
        expiresAt,
        isExpiringSoon,
        daysRemaining,
        hoursRemaining,
        formattedExpiryDate,
        expiryNotification: isExpiringSoon
          ? {
              title: "Your Pro plan expires tomorrow.",
              message:
                "Your Pro access will expire in 1 day. Renew Pro to continue enjoying Unlimited Studio Changes and Pro features.",
              cta: "Renew Pro — ₹500",
            }
          : null,
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
 * Downgrades or cancels subscription in Azure PostgreSQL back to Free Starter.
 * Upgrading to Paid Pro is strictly gated behind verified Razorpay payment.
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

    if (body.planId === "paid_pro" || body.action === "upgrade") {
      return NextResponse.json(
        {
          success: false,
          error: "Direct Pro upgrade without payment is disabled. Please complete payment via Razorpay checkout.",
        },
        { status: 403 }
      );
    }

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

  } catch (err) {
    console.error("[POST /api/subscription] Error:", err);
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Failed to update subscription." },
      { status: 500 }
    );
  }
}
