// src/lib/ai/requirementModel.ts

/**
 * Structured representation of a website generation request.
 * This model is used throughout Phase 3 & Phase 4 pipelines.
 */
export interface ContactInfo {
  email?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
}

export interface WebsiteRequirement {
  /** High-level user intent (create, modify, add-feature, remove-feature, etc.) */
  intent: string;
  /** Business details */
  business: {
    name: string;
    type?: string; // e.g., "dental clinic", "italian restaurant", "car rental"
    industry?: string; // normalized industry keyword: "dental", "restaurant", "car_rental", "real_estate", "gym", "saas", "ecommerce", "local_service"
  };
  /** Target audience description */
  audience?: string;
  /** Physical location */
  location?: string;
  /** Primary and listed services */
  services?: string[];
  /** Products or catalog items */
  products?: Array<{
    name: string;
    price?: number;
    description?: string;
    category?: string;
    image?: string;
  }>;
  /** Pricing structure or details */
  pricing?: string;
  /** Contact information */
  contactInformation?: ContactInfo;
  /** Call to action (e.g. "Book Appointment", "Order on WhatsApp", "Start Free Trial") */
  cta?: string;
  /** Pages and their ordered sections */
  pages?: Array<{ name: string; slug?: string; sections: string[] }>;
  /** Free-form content snippets keyed by section */
  content?: Record<string, string>;
  /** Branding information */
  brand?: {
    colors?: { primary?: string; secondary?: string; accent?: string };
    typography?: { heading?: string; body?: string };
    logoUrl?: string;
    style?: string; // e.g., "clean", "dark luxury", "modern", "playful"
  };
  /** Functional requirements (e.g., booking, ecommerce, auth) */
  functionality?: {
    booking?: boolean;
    ecommerce?: boolean;
    auth?: boolean;
    forms?: boolean;
    whatsappDirect?: boolean;
    integrations?: string[];
  };
  /** Backend configuration */
  backend?: {
    requirement?: "managed_booking" | "managed_orders" | "static" | string;
    config?: Record<string, unknown>;
  };
  /** Third-party integrations */
  integrations?: string[];
  /** Responsive & accessibility preferences */
  responsive?: {
    mobileFirst?: boolean;
    breakpoints?: { sm?: number; md?: number; lg?: number };
  };
  /** High-level design preferences */
  designPreferences?: {
    density?: "compact" | "medium" | "spacious";
    themeMode?: "light" | "dark" | "system";
    contrastLevel?: "standard" | "high";
    style?: string;
    accentEmphasis?: "subtle" | "prominent" | "high";
    [key: string]: unknown;
  };
  /** Any special free-form instructions */
  specialInstructions?: string[];
}
