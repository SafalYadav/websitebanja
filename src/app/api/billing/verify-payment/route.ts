export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { validateUserAuth } from "@/lib/supabaseServer";
import { dbUpsertUserSubscription } from "@/lib/db/queries";
import { elevateQuotaToPro } from "@/lib/studioQuota";

/**
 * POST /api/billing/verify-payment (or /api/verify-payment)
 * Verifies Razorpay payment signature via HMAC-SHA256.
 * On match: activates Paid Pro subscription and elevates Studio change quota.
 */
export async function POST(request: Request) {
  try {
    const auth = await validateUserAuth(request);
    if (!auth.user) {
      return NextResponse.json(
        { success: false, error: auth.error || "Authentication required" },
        { status: 401 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      razorpay_order_id?: string;
      razorpay_payment_id?: string;
      razorpay_signature?: string;
    };

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required payment fields: razorpay_order_id, razorpay_payment_id, and razorpay_signature are required.",
        },
        { status: 400 }
      );
    }

    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key_secret) {
      throw new Error("RAZORPAY_KEY_SECRET is not configured on server.");
    }

    // Step 3 Algorithm: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
    const expectedSignature = crypto
      .createHmac("sha256", key_secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    // Timing-safe comparison to prevent timing attacks
    const expectedBuffer = Buffer.from(expectedSignature, "utf8");
    const receivedBuffer = Buffer.from(razorpay_signature, "utf8");

    const isMatch =
      expectedBuffer.length === receivedBuffer.length &&
      crypto.timingSafeEqual(expectedBuffer, receivedBuffer);

    if (!isMatch) {
      console.warn(
        `[Razorpay Signature Mismatch] user=${auth.user.id} order=${razorpay_order_id} payment=${razorpay_payment_id}`
      );
      return NextResponse.json(
        {
          success: false,
          error: "Payment verification failed: Signature mismatch. Transaction has NOT been marked as paid.",
        },
        { status: 400 }
      );
    }

    // Mark subscription as active Paid Pro in DB (source of truth) with 30-day stacking entitlement
    const updatedSub = await dbUpsertUserSubscription(auth.user.id, "paid_pro", "active_paid", 500);

    // Elevate Studio change quota to Pro
    const updatedQuota = await elevateQuotaToPro(auth.user.id);

    return NextResponse.json({
      success: true,
      message: "Payment verified successfully. Welcome to Paid Pro!",
      isPro: true,
      planId: "paid_pro",
      expiresAt: updatedSub.current_period_end,
      quota: updatedQuota,
    });

  } catch (err) {
    console.error("[Razorpay verify-payment] Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Internal error during payment verification.",
      },
      { status: 500 }
    );
  }
}
