import type { GlobalKnowledgeEntry, IntegrationPayload } from "./types";

export const whatsappIntegration: GlobalKnowledgeEntry<IntegrationPayload> = {
  metadata: {
    id: "wb:global:integrations:whatsapp:v1",
    category: "integrations",
    title: "WhatsApp Direct Connect",
    description: "Instant customer conversation initiator via official wa.me deep links with pre-filled inquiry copy",
    version: "1.0.0",
    status: "active",
    source: "src/knowledge/global/integrations.ts",
    schemaVersion: "1.0.0",
    updatedAt: "2026-09-05T00:00:00Z",
    tags: ["whatsapp", "chat", "direct", "messaging", "inquiry"]
  },
  data: {
    integrationKey: "whatsapp",
    name: "WhatsApp Direct Connect",
    description: "Enables buttons and floating widgets to trigger instant WhatsApp chats with sanitized phone numbers and pre-filled inquiry messages.",
    configurationRequirements: ["phone_number_e164", "default_message"],
    endpoint: "https://wa.me/{phone}?text={message}",
    supportedActions: ["whatsapp"],
    isProOnly: false,
    documentationUrl: "/docs/integrations/whatsapp",
    capabilities: [
      "Auto-normalizes 10-digit Indian numbers with +91 country prefix",
      "Encodes custom contextual inquiry messages per product or service",
      "Works seamlessly across desktop browser, Android, and iOS WhatsApp clients"
    ]
  }
};

export const leadCaptureIntegration: GlobalKnowledgeEntry<IntegrationPayload> = {
  metadata: {
    id: "wb:global:integrations:lead_capture:v1",
    category: "integrations",
    title: "Lead Capture & Contact Form Pipeline",
    description: "Secure contact form inquiry submission with atomic JSONB persistence and PII quarantine",
    version: "1.0.0",
    status: "active",
    source: "src/knowledge/global/integrations.ts",
    schemaVersion: "1.0.0",
    updatedAt: "2026-09-05T00:00:00Z",
    tags: ["leads", "contact", "form", "inquiries", "pii", "pipeline"]
  },
  data: {
    integrationKey: "lead_capture",
    name: "Lead Capture Pipeline",
    description: "Captures inbound visitor inquiries directly into projects.json_data->'leads' via atomic RPC `submit_public_lead`, with automated PII stripping on public previews and published snapshots.",
    configurationRequirements: ["recipient_email", "notification_enabled"],
    endpoint: "/api/leads/submit",
    supportedActions: ["scroll", "none"],
    isProOnly: false,
    capabilities: [
      "Atomic append to project leads array (capped at 5,000 inquiries)",
      "Strict PII quarantine: leads stripped automatically by published_versions triggers",
      "Zero LLM prompt exposure: leads are excluded from AI generation context",
      "Rate limited to 10 submissions per IP per hour to prevent spam"
    ]
  }
};

export const customDomainsIntegration: GlobalKnowledgeEntry<IntegrationPayload> = {
  metadata: {
    id: "wb:global:integrations:custom_domains:v1",
    category: "integrations",
    title: "Custom Domain & Automated SSL Provisioning",
    description: "CNAME-based custom domain routing with automated Let's Encrypt / Cloudflare SSL edge termination",
    version: "1.0.0",
    status: "active",
    source: "src/knowledge/global/integrations.ts",
    schemaVersion: "1.0.0",
    updatedAt: "2026-09-05T00:00:00Z",
    tags: ["domains", "cname", "ssl", "dns", "custom", "pro"]
  },
  data: {
    integrationKey: "custom_domains",
    name: "Custom Domain & Edge SSL",
    description: "Allows Pro plan subscribers to map apex domains (example.com) or subdomains (www.example.com) with automated SSL certificate generation.",
    configurationRequirements: ["domain_name", "cname_target", "txt_verification_token"],
    endpoint: "https://api.websitebanja.com/v1/domains",
    supportedActions: ["url"],
    isProOnly: true,
    capabilities: [
      "Zero-downtime automated certificate renewal via Cloudflare for SaaS",
      "Instant apex-to-www canonical redirects",
      "Sub-50ms global edge routing across 300+ CDN points of presence"
    ]
  }
};

export const analyticsEventsIntegration: GlobalKnowledgeEntry<IntegrationPayload> = {
  metadata: {
    id: "wb:global:integrations:analytics_events:v1",
    category: "integrations",
    title: "Privacy-Preserving Telemetry & Conversion Analytics",
    description: "First-party visitor telemetry recording pageviews, section dwell time, and CTA click conversions",
    version: "1.0.0",
    status: "active",
    source: "src/knowledge/global/integrations.ts",
    schemaVersion: "1.0.0",
    updatedAt: "2026-09-05T00:00:00Z",
    tags: ["analytics", "telemetry", "events", "tracking", "conversions"]
  },
  data: {
    integrationKey: "analytics_events",
    name: "First-Party Site Telemetry",
    description: "Lightweight, cookie-free telemetry engine tracking high-value user conversions without third-party tracking scripts or GDPR cookie banners.",
    configurationRequirements: ["telemetry_enabled"],
    endpoint: "/api/telemetry/event",
    supportedActions: ["scroll", "page", "url", "whatsapp", "call", "email"],
    isProOnly: false,
    capabilities: [
      "Tracks CTA clicks, WhatsApp handoffs, phone dials, and contact form submissions",
      "Aggregates hourly and daily visitor metrics in public.analytics_events",
      "Zero PII collection: uses salted daily session hashes without persistent tracking cookies"
    ]
  }
};

export const adminPortalIntegration: GlobalKnowledgeEntry<IntegrationPayload> = {
  metadata: {
    id: "wb:global:integrations:admin_portal:v1",
    category: "integrations",
    title: "Embedded Site Owner Admin Portal",
    description: "Role-based administrative dashboard for site owners to view customer leads, edit catalog inventory, and invite collaborators",
    version: "1.0.0",
    status: "active",
    source: "src/knowledge/global/integrations.ts",
    schemaVersion: "1.0.0",
    updatedAt: "2026-09-05T00:00:00Z",
    tags: ["admin", "dashboard", "rbac", "management", "leads", "portal"]
  },
  data: {
    integrationKey: "admin_portal",
    name: "Site Owner Management Portal",
    description: "Protected administrative workspace reachable at `/p/[slug]/admin` providing lead management, live inventory controls, and team RBAC.",
    configurationRequirements: ["admin_enabled", "allowed_roles"],
    endpoint: "/p/{slug}/admin",
    supportedActions: ["page", "url"],
    isProOnly: true,
    capabilities: [
      "Role-Based Access Control: OWNER, ADMIN, EDITOR, STAFF",
      "Instant CSV export of quarantined customer inquiries",
      "Real-time stock toggle for catalog items (active / draft / out_of_stock)",
      "Protected by Supabase Auth and non-recursive RLS policy `is_website_member`"
    ]
  }
};

export const GLOBAL_INTEGRATIONS: GlobalKnowledgeEntry<IntegrationPayload>[] = [
  whatsappIntegration,
  leadCaptureIntegration,
  customDomainsIntegration,
  analyticsEventsIntegration,
  adminPortalIntegration,
];
