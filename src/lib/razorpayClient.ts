import { supabase } from "@/lib/supabase";

declare global {
  interface Window {
    Razorpay?: any;
  }
}

/**
 * Ensures Razorpay Checkout script (checkout.js) is loaded dynamically.
 */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }

    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const existingScript = document.getElementById("razorpay-checkout-script");
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(true));
      existingScript.addEventListener("error", () => resolve(false));
      return;
    }

    const script = document.createElement("script");
    script.id = "razorpay-checkout-script";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export interface CheckoutOptions {
  amountPaise?: number;
  onSuccess?: (verifyResult: any) => void;
  onError?: (error: Error) => void;
  onDismiss?: () => void;
}

/**
 * Initiates Razorpay Standard Web Checkout flow:
 * 1. Calls /api/billing/create-order
 * 2. Opens Razorpay payment modal
 * 3. On success, calls /api/billing/verify-payment with HMAC-SHA256 signature
 */
export async function launchRazorpayProCheckout({
  amountPaise = 50000,
  onSuccess,
  onError,
  onDismiss,
}: CheckoutOptions = {}): Promise<void> {
  try {
    const loaded = await loadRazorpayScript();
    if (!loaded) {
      throw new Error("Unable to load Razorpay payment gateway script. Please check your internet connection.");
    }

    // Get current authenticated user session
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }

    // Step 1: Create Order
    const orderRes = await fetch("/api/billing/create-order", {
      method: "POST",
      headers,
      body: JSON.stringify({ amount: amountPaise, currency: "INR" }),
    });

    const orderData = await orderRes.json();
    if (!orderRes.ok || !orderData.success) {
      throw new Error(orderData.error || "Failed to initialize payment order.");
    }

    const keyId = orderData.key_id || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

    // Step 2: Open Razorpay Modal
    const options = {
      key: keyId,
      amount: orderData.amount,
      currency: orderData.currency || "INR",
      name: "WebsiteBanja AI",
      description: "Paid Pro Plan — Unlimited Studio Changes",
      order_id: orderData.order_id,
      handler: async function (response: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      }) {
        try {
          // Step 3: Verify Payment Signature
          const verifyRes = await fetch("/api/billing/verify-payment", {
            method: "POST",
            headers,
            body: JSON.stringify(response),
          });

          const verifyData = await verifyRes.json();
          if (!verifyRes.ok || !verifyData.success) {
            throw new Error(verifyData.error || "Payment signature verification failed.");
          }

          onSuccess?.(verifyData);
        } catch (verifyErr: any) {
          onError?.(verifyErr instanceof Error ? verifyErr : new Error(String(verifyErr)));
        }
      },
      modal: {
        ondismiss: function () {
          onDismiss?.();
        },
      },
      prefill: {
        name: session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name || "",
        email: session?.user?.email || "",
      },
      theme: {
        color: "#06B6D4", // Cyan
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.on("payment.failed", function (response: any) {
      console.error("[Razorpay Payment Failed]", response.error);
      onError?.(new Error(response?.error?.description || "Payment failed."));
    });
    rzp.open();
  } catch (err: any) {
    console.error("[launchRazorpayProCheckout Error]", err);
    onError?.(err instanceof Error ? err : new Error(String(err)));
  }
}
