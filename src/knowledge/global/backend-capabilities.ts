import type { GlobalKnowledgeEntry, BackendCapabilityPayload } from "./types";

export const managedBookingCapability: GlobalKnowledgeEntry<BackendCapabilityPayload> = {
  metadata: {
    id: "wb:global:backend_capabilities:managed_booking:v1",
    category: "backend_capabilities",
    title: "Real-time Booking & Appointment Engine",
    description: "Automated service scheduling, calendar slot availability, and instant confirmation alerts",
    version: "1.0.0",
    status: "active",
    source: "src/knowledge/global/backend-capabilities.ts",
    schemaVersion: "1.0.0",
    updatedAt: "2026-09-05T00:00:00Z",
    tags: ["booking", "appointments", "scheduling", "calendar", "reminders"]
  },
  data: {
    requirementType: "managed_booking",
    title: "Real-time Booking & Appointment Engine",
    description: "Recommended for service scheduling, automated SMS/WhatsApp reminders, and calendar slot sync.",
    requiresBackend: true,
    applicableCategories: [
      "clinic", "doctor", "salon", "spa", "hotel", "resort", "real estate"
    ],
    capabilities: [
      "Calendar Slot Availability",
      "Automated Booking Confirmation",
      "Customer Cancellation Portal"
    ],
    options: {
      managed: {
        title: "WebsiteBanja Managed Booking",
        description: "Fully automated booking infrastructure managed on high-availability cloud database.",
        features: [
          "Zero maintenance",
          "Automatic SMS/WhatsApp alerts",
          "Stripe/Razorpay deposit collection"
        ]
      },
      custom: {
        title: "Connect Your Own Calendar / CRM",
        description: "Sync with existing Calendly, Cal.com, or custom Webhook endpoint.",
        features: [
          "Direct CRM sync",
          "Custom webhook payload",
          "BYO database"
        ]
      }
    }
  }
};

export const managedOrdersCapability: GlobalKnowledgeEntry<BackendCapabilityPayload> = {
  metadata: {
    id: "wb:global:backend_capabilities:managed_orders:v1",
    category: "backend_capabilities",
    title: "Order Processing & Menu Management Pipeline",
    description: "Online order ingestion, live kitchen receipt alerts, order tracking, and inventory sync",
    version: "1.0.0",
    status: "active",
    source: "src/knowledge/global/backend-capabilities.ts",
    schemaVersion: "1.0.0",
    updatedAt: "2026-09-05T00:00:00Z",
    tags: ["orders", "commerce", "menu", "inventory", "checkout", "dispatch"]
  },
  data: {
    requirementType: "managed_orders",
    title: "Order Processing & Menu Management",
    description: "Recommended for online orders, live table reservations, order tracking, and receipt notifications.",
    requiresBackend: true,
    applicableCategories: [
      "restaurant", "cafe", "grocery", "supermarket", "commerce", "shop", "e-commerce"
    ],
    capabilities: [
      "Live Order Notification",
      "Inventory Item Toggle",
      "Customer Contact Auto-Capture"
    ],
    options: {
      managed: {
        title: "WebsiteBanja Managed Order Pipeline",
        description: "Instant order dashboard, kitchen receipt alerts, and payment processing.",
        features: [
          "Real-time table/order dispatch",
          "WhatsApp order confirmation",
          "Payment gateway integration"
        ]
      },
      custom: {
        title: "Connect Your Own POS / Database",
        description: "Stream incoming orders to your existing POS, Supabase, or REST endpoint.",
        features: [
          "Custom POS integration",
          "Secure API signature",
          "Webhook dispatch"
        ]
      }
    }
  }
};

export const staticCapability: GlobalKnowledgeEntry<BackendCapabilityPayload> = {
  metadata: {
    id: "wb:global:backend_capabilities:static:v1",
    category: "backend_capabilities",
    title: "High-Speed Edge CDN (Static)",
    description: "Lightning-fast static page generation cached across 300+ global edge points with zero server management",
    version: "1.0.0",
    status: "active",
    source: "src/knowledge/global/backend-capabilities.ts",
    schemaVersion: "1.0.0",
    updatedAt: "2026-09-05T00:00:00Z",
    tags: ["static", "edge", "cdn", "fast", "cache", "serverless"]
  },
  data: {
    requirementType: "static",
    title: "High-Speed Edge CDN (Static)",
    description: "Your website is optimized for lightning-fast edge delivery with zero server maintenance.",
    requiresBackend: false,
    applicableCategories: [
      "portfolio", "agency", "tech", "architecture", "education", "general"
    ],
    capabilities: [
      "Sub-50ms Global TTFB",
      "Instant SSL Provisioning",
      "Form submissions routed via Email API"
    ],
    options: {
      managed: {
        title: "Standard Global Edge Delivery",
        description: "Cached on 300+ edge points with built-in form capture.",
        features: [
          "Unlimited bandwidth",
          "Auto-renewing SSL",
          "Instant invalidation"
        ]
      },
      custom: {
        title: "Custom Form Endpoint / Webhook",
        description: "Optionally forward contact form inquiries to a custom webhook URL.",
        features: [
          "Zapier / Make.com sync",
          "Custom CRM ingest",
          "No server provisioning required"
        ]
      }
    }
  }
};

export const customApiCapability: GlobalKnowledgeEntry<BackendCapabilityPayload> = {
  metadata: {
    id: "wb:global:backend_capabilities:custom_api:v1",
    category: "backend_capabilities",
    title: "Custom API & External Webhook Ingestion",
    description: "Signed webhook dispatch and external REST endpoint streaming for enterprise integrations",
    version: "1.0.0",
    status: "active",
    source: "src/knowledge/global/backend-capabilities.ts",
    schemaVersion: "1.0.0",
    updatedAt: "2026-09-05T00:00:00Z",
    tags: ["webhook", "custom_api", "integration", "rest", "crm", "zapier"]
  },
  data: {
    requirementType: "custom_api",
    title: "Custom Webhook & API Bridge",
    description: "Streams platform events (leads, orders, bookings) to client-specified HTTP webhooks.",
    requiresBackend: true,
    applicableCategories: [
      "enterprise", "custom"
    ],
    capabilities: [
      "HMAC-SHA256 Payload Signing",
      "Automatic Exponential Backoff Retries",
      "Custom Header Support"
    ],
    options: {
      managed: {
        title: "WebsiteBanja Webhook Forwarder",
        description: "Buffered queue ensuring 100% reliable event delivery.",
        features: [
          "Event replay capability",
          "Delivery log inspector",
          "Dead letter queue"
        ]
      },
      custom: {
        title: "Direct REST Webhook",
        description: "Synchronous HTTP POST to target URL.",
        features: [
          "Configurable timeout",
          "Bearer token auth support",
          "Raw JSON payload"
        ]
      }
    }
  }
};

export const GLOBAL_BACKEND_CAPABILITIES: GlobalKnowledgeEntry<BackendCapabilityPayload>[] = [
  managedBookingCapability,
  managedOrdersCapability,
  staticCapability,
  customApiCapability,
];
