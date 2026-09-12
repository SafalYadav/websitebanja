export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { validateUserAuth } from "@/lib/supabaseServer";

function getRazorpayClient(): Razorpay {
  const key_id = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    throw new Error("Razorpay server credentials are not configured.");
  }

  return new Razorpay({
    key_id,
    key_secret,
  });
}

/**
 * POST /api/billing/create-order (or /api/create-order)
 * Creates a Razorpay payment order for the Paid Pro plan (₹500 / 50000 paise).
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
      amount?: number;
      currency?: string;
      receipt?: string;
    };

    // Default Pro subscription amount: ₹500 = 50,000 paise
    const amountInPaise = typeof body.amount === "number" && body.amount > 0 ? body.amount : 50000;
    const currency = body.currency || "INR";

    // Validate minimum amount: 100 paise (₹1)
    if (amountInPaise < 100) {
      return NextResponse.json(
        { success: false, error: "Minimum order amount is 100 paise (₹1)." },
        { status: 400 }
      );
    }

    const razorpay = getRazorpayClient();
    const receipt = body.receipt || `rcpt_${auth.user.id.slice(0, 8)}_${Date.now().toString(36)}`;

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency,
      receipt,
      notes: {
        userId: auth.user.id,
        userEmail: auth.user.email || "",
        planId: "paid_pro",
      },
    });

    return NextResponse.json({
      success: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID,
      receipt: order.receipt,
    });
  } catch (err: any) {
    console.error("[Razorpay create-order] Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err?.error?.description || err?.message || "Failed to create Razorpay payment order.",
      },
      { status: 500 }
    );
  }
}
