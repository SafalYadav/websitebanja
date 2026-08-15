import type { BackendRequirement } from "@/types/project";

export interface BackendRequirementAnalysis {
  requiresBackend: boolean;
  requirementType: BackendRequirement;
  title: string;
  description: string;
  capabilities: string[];
  options: {
    managed: {
      title: string;
      description: string;
      features: string[];
    };
    custom: {
      title: string;
      description: string;
      features: string[];
    };
  };
}

/**
 * Deterministically analyzes website category and section structure
 * to determine if a dedicated backend infrastructure is recommended.
 */
export function detectBackendRequirement(
  category?: string | null
): BackendRequirementAnalysis {
  const normCategory = (category || "").toLowerCase();

  // 1. Booking / Appointment businesses (Clinics, Salons, Hotels, Real Estate)
  if (
    normCategory.includes("clinic") ||
    normCategory.includes("doctor") ||
    normCategory.includes("salon") ||
    normCategory.includes("spa") ||
    normCategory.includes("hotel") ||
    normCategory.includes("resort")
  ) {
    return {
      requiresBackend: true,
      requirementType: "managed_booking",
      title: "Real-time Booking & Appointment Engine",
      description: "Recommended for service scheduling, automated SMS/email reminders, and calendar slot sync.",
      capabilities: ["Calendar Slot Availability", "Automated Booking Confirmation", "Customer Cancellation Portal"],
      options: {
        managed: {
          title: "WebsiteBanja Managed Booking",
          description: "Fully automated booking infrastructure managed on high-availability cloud database.",
          features: ["Zero maintenance", "Automatic SMS/WhatsApp alerts", "Stripe/Razorpay deposit collection"],
        },
        custom: {
          title: "Connect Your Own Calendar / CRM",
          description: "Sync with existing Calendly, Cal.com, or custom Webhook endpoint.",
          features: ["Direct CRM sync", "Custom webhook payload", "BYO database"],
        },
      },
    };
  }

  // 2. Orders / Commerce / Delivery (Restaurants, Cafes, Grocery, Retail)
  if (
    normCategory.includes("restaurant") ||
    normCategory.includes("cafe") ||
    normCategory.includes("grocery") ||
    normCategory.includes("supermarket") ||
    normCategory.includes("commerce") ||
    normCategory.includes("shop")
  ) {
    return {
      requiresBackend: true,
      requirementType: "managed_orders",
      title: "Order Processing & Menu Management",
      description: "Recommended for online orders, live table reservations, order tracking, and receipt notifications.",
      capabilities: ["Live Order Notification", "Inventory Item Toggle", "Customer Contact Auto-Capture"],
      options: {
        managed: {
          title: "WebsiteBanja Managed Order Pipeline",
          description: "Instant order dashboard, kitchen receipt alerts, and payment processing.",
          features: ["Real-time table/order dispatch", "WhatsApp order confirmation", "Payment gateway integration"],
        },
        custom: {
          title: "Connect Your Own POS / Database",
          description: "Stream incoming orders to your existing POS, Supabase, or REST endpoint.",
          features: ["Custom POS integration", "Secure API signature", "Webhook dispatch"],
        },
      },
    };
  }

  // 3. Simple Static Sites (Portfolio, Agency, Tech Landing, General Business)
  return {
    requiresBackend: false,
    requirementType: "static",
    title: "High-Speed Edge CDN (Static)",
    description: "Your website is optimized for lightning-fast edge delivery with zero server maintenance.",
    capabilities: ["Sub-50ms Global TTFB", "Instant SSL Provisioning", "Form submissions routed via Email API"],
    options: {
      managed: {
        title: "Standard Global Edge Delivery",
        description: "Cached on 300+ edge points with built-in form capture.",
        features: ["Unlimited bandwidth", "Auto-renewing SSL", "Instant invalidation"],
      },
      custom: {
        title: "Custom Form Endpoint / Webhook",
        description: "Optionally forward contact form inquiries to a custom webhook URL.",
        features: ["Zapier / Make.com sync", "Custom CRM ingest", "No server provisioning required"],
      },
    },
  };
}
