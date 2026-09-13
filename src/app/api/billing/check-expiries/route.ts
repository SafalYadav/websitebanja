export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { dbCheckSubscriptionExpiries } from "@/lib/db/queries";

/**
 * GET or POST /api/billing/check-expiries
 * Scheduled / cron endpoint to:
 * 1. Automatically mark expired Pro subscriptions as 'expired'.
 * 2. Identify Pro subscriptions expiring within 24 hours and record pro_expiry_notification_sent_at.
 * 3. Ensure deduplication (each user is notified at most once per billing period).
 */
export async function GET(request: Request) {
  return handleCheckExpiries(request);
}

export async function POST(request: Request) {
  return handleCheckExpiries(request);
}

async function handleCheckExpiries(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get("authorization");
    const { searchParams } = new URL(request.url);
    const querySecret = searchParams.get("secret");

    if (cronSecret) {
      const isAuthorized =
        authHeader === `Bearer ${cronSecret}` ||
        querySecret === cronSecret ||
        request.headers.get("x-cron-secret") === cronSecret;

      if (!isAuthorized) {
        return NextResponse.json(
          { success: false, error: "Unauthorized cron execution." },
          { status: 401 }
        );
      }
    }

    const result = await dbCheckSubscriptionExpiries();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      expiredSubscriptionsCount: result.expiredCount,
      notifiedUsersCount: result.notifiedCount,
      notifiedUserIds: result.notifiedUsers,
    });
  } catch (err) {
    console.error("[/api/billing/check-expiries] Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Failed to process subscription expiries.",
      },
      { status: 500 }
    );
  }
}
