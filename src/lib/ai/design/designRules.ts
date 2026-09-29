// src/lib/ai/design/designRules.ts

import type { WebsiteRequirement } from "../requirementModel";

export type SupportedIndustry =
  | "dental"
  | "restaurant"
  | "car_rental"
  | "real_estate"
  | "gym"
  | "saas"
  | "ecommerce"
  | "local_service"
  // Phase 6 — new industry coverage
  | "luxury_hotel"
  | "creative_agency"
  | "law_firm"
  | "wellness_spa"
  | "finance"
  | "education"
  | "portfolio"
  | "automotive";

export interface IndustryProfile {
  key: SupportedIndustry;
  displayName: string;
  archetype: string;
  voiceAndTone: string;
  trustSignals: string[];
  recommendedBadges: string[];
  defaultCtaText: string;
  ctaActionType: "scroll" | "whatsapp" | "call" | "page" | "url";
}

export interface DesignRules {
  industry: SupportedIndustry;
  industryProfile: IndustryProfile;
  typography: {
    headingFont: string;
    bodyFont: string;
    headingScale: number; // e.g. 1.35 to 1.75
    bodyScale: number; // e.g. 1.0 to 1.1
    lineHeight: number;
    letterSpacing: string;
    headingStyle: "uppercase" | "normal" | "serif" | "geometric";
  };
  spacing: {
    scale: number;
    density: "compact" | "medium" | "spacious";
    sectionPaddingY: string;
    cardPadding: string;
    containerMaxWidth: string;
  };
  colorSystem: {
    primaryDefault: string;
    secondaryDefault: string;
    accentDefault: string;
    bgDefault: string;
    textDefault: string;
    contrastRatio: number; // 4.5 for AA, 7.0 for AAA
    colorMood: "sterile_calm" | "warm_appetizing" | "energetic" | "luxury_prestige" | "tech_modern" | "high_trust";
  };
  cta: {
    emphasis: "prominent" | "high" | "urgent";
    primaryLabel: string;
    secondaryLabel?: string;
    buttonShape: "rounded" | "pill" | "sharp";
    actionType: "scroll" | "whatsapp" | "call" | "page" | "url";
    stickyMobileCta: boolean;
  };
  motion: {
    animationLevel: "minimal" | "subtle" | "energetic" | "smooth";
    durationBaseMs: number;
    easing: string;
    hoverZoomScale: number;
    allowBackgroundOrbs: boolean;
  };
  layout: {
    heroLayout: "split" | "centered" | "fullscreen_media";
    recommendedSections: string[];
    gridColumns: { mobile: number; tablet: number; desktop: number };
  };
}

/**
 * Normalizes input industry/business type to one of the 8 core supported industries.
 */
export function normalizeIndustry(req: WebsiteRequirement): SupportedIndustry {
  const combined = ` ${req.business.industry || ""} ${req.business.type || ""} ${req.business.name || ""} ${req.intent || ""} `.toLowerCase();

  // Phase 6 — specialized industries checked first before broad keywords
  if (
    combined.includes("hotel") ||
    combined.includes("resort") ||
    combined.includes("hospitality") ||
    combined.includes("boutique hotel") ||
    combined.includes("lodge") ||
    combined.includes("inn") ||
    combined.includes("bed and breakfast") ||
    combined.includes("b&b") ||
    combined.includes("luxury stay")
  ) {
    return "luxury_hotel";
  }

  if (
    combined.includes("spa") ||
    combined.includes("wellness") ||
    combined.includes("yoga") ||
    combined.includes("pilates") ||
    combined.includes("meditation") ||
    combined.includes("holistic") ||
    combined.includes("naturopath") ||
    combined.includes("massage") ||
    combined.includes("ayurved")
  ) {
    return "wellness_spa";
  }

  if (
    combined.includes("law firm") ||
    combined.includes("attorney") ||
    combined.includes("lawyer") ||
    combined.includes(" legal ") ||
    combined.includes("counsel") ||
    combined.includes("barrister") ||
    combined.includes("solicitor") ||
    combined.includes("litigation")
  ) {
    return "law_firm";
  }

  if (
    combined.includes("finance") ||
    combined.includes("wealth management") ||
    combined.includes("hedge fund") ||
    combined.includes("venture capital") ||
    combined.includes("private equity") ||
    combined.includes("financial advisor") ||
    combined.includes("accounting") ||
    combined.includes("investment")
  ) {
    return "finance";
  }

  if (
    combined.includes("dealership") ||
    combined.includes("showroom") ||
    combined.includes("car sales") ||
    combined.includes("luxury car") ||
    combined.includes("motorcycle") ||
    combined.includes("auto repair") ||
    combined.includes("garage") ||
    combined.includes("automobile") ||
    combined.includes("automotive")
  ) {
    return "automotive";
  }

  if (
    combined.includes("agency") ||
    combined.includes("creative studio") ||
    combined.includes("branding studio") ||
    combined.includes("design agency") ||
    combined.includes("design studio") ||
    combined.includes("advertising agency") ||
    combined.includes("marketing agency") ||
    combined.includes("digital agency")
  ) {
    return "creative_agency";
  }

  if (
    combined.includes("university") ||
    combined.includes("college") ||
    combined.includes("academy") ||
    combined.includes("institute") ||
    combined.includes("education") ||
    combined.includes("coaching") ||
    combined.includes("tutoring") ||
    combined.includes("e-learning") ||
    combined.includes("elearning") ||
    combined.includes("online course")
  ) {
    return "education";
  }

  if (
    combined.includes("portfolio") ||
    combined.includes("freelancer") ||
    combined.includes("personal brand") ||
    combined.includes("designer portfolio") ||
    combined.includes("photographer portfolio") ||
    combined.includes("artist portfolio") ||
    combined.includes("developer portfolio")
  ) {
    return "portfolio";
  }

  // Core baseline industries
  if (
    combined.includes("dental") ||
    combined.includes("dentist") ||
    combined.includes("teeth") ||
    combined.includes("orthodont") ||
    combined.includes("clinic") ||
    combined.includes("doctor") ||
    combined.includes("medical") ||
    combined.includes(" hospital ") ||
    (combined.includes("health") && !combined.includes("holistic") && !combined.includes("wellness"))
  ) {
    return "dental";
  }

  if (
    combined.includes("restaurant") ||
    combined.includes("cafe") ||
    combined.includes("coffee") ||
    combined.includes("food") ||
    combined.includes("dining") ||
    combined.includes("bakery") ||
    combined.includes("bistro") ||
    combined.includes("bar") ||
    combined.includes("pizzeria")
  ) {
    return "restaurant";
  }

  if (
    combined.includes("rental") ||
    combined.includes("car rental") ||
    combined.includes("vehicle rental") ||
    combined.includes("fleet") ||
    combined.includes("auto hire") ||
    combined.includes("cab") ||
    combined.includes("taxi")
  ) {
    return "car_rental";
  }

  if (
    combined.includes("real estate") ||
    combined.includes("real_estate") ||
    combined.includes("real-estate") ||
    combined.includes("property") ||
    combined.includes("realtor") ||
    combined.includes("apartment") ||
    combined.includes("villa") ||
    combined.includes("housing") ||
    combined.includes("architecture") ||
    combined.includes("interior")
  ) {
    return "real_estate";
  }

  if (
    combined.includes("gym") ||
    combined.includes("fitness") ||
    combined.includes("workout") ||
    combined.includes("crossfit") ||
    combined.includes("trainer") ||
    combined.includes("martial arts")
  ) {
    return "gym";
  }

  if (
    combined.includes("saas") ||
    combined.includes("software") ||
    combined.includes("tech platform") ||
    combined.includes("cloud") ||
    combined.includes("platform") ||
    combined.includes("ai tool")
  ) {
    return "saas";
  }

  if (
    combined.includes("ecommerce") ||
    combined.includes("e-commerce") ||
    combined.includes("shop") ||
    combined.includes("store") ||
    combined.includes("retail") ||
    combined.includes("clothing") ||
    combined.includes("fashion") ||
    combined.includes("grocery")
  ) {
    return "ecommerce";
  }

  // Default fallback: Local service (plumber, electrician, cleaning, HVAC, general service)
  return "local_service";
}

/**
 * Generates deep, category-aware design rules based on requirement, industry,
 * accessibility constraints, responsive goals, and user design preferences.
 */
export function generateDesignRules(req: WebsiteRequirement): DesignRules {
  const industry = normalizeIndustry(req);
  const userPref = req.designPreferences || {};
  const isDarkRequested =
    userPref.themeMode === "dark" ||
    String(userPref.style || "").toLowerCase().includes("dark") ||
    String(req.brand?.style || "").toLowerCase().includes("dark");

  const densityPref = userPref.density || (industry === "saas" || industry === "car_rental" ? "compact" : industry === "dental" || industry === "real_estate" ? "spacious" : "medium");

  switch (industry) {
    case "dental":
      return {
        industry: "dental",
        industryProfile: {
          key: "dental",
          displayName: "Dental & Healthcare Clinic",
          archetype: "Trust, clinical hygiene, patient reassurance, calm professionalism",
          voiceAndTone: "Gentle, authoritative, empathetic, transparent",
          trustSignals: ["Board-Certified Doctors", "Sterilized & Painless Care", "10,000+ Happy Smiles", "Insurance Accepted"],
          recommendedBadges: ["Emergency Dentist Available", "Same-Day Appointments"],
          defaultCtaText: req.cta || "Book Consultation",
          ctaActionType: "scroll",
        },
        typography: {
          headingFont: req.brand?.typography?.heading || "Plus Jakarta Sans, sans-serif",
          bodyFont: req.brand?.typography?.body || "Inter, sans-serif",
          headingScale: 1.35,
          bodyScale: 1.05,
          lineHeight: 1.65,
          letterSpacing: "-0.01em",
          headingStyle: "normal",
        },
        spacing: {
          scale: densityPref === "spacious" ? 1.25 : 1.0,
          density: densityPref,
          sectionPaddingY: "py-24 sm:py-32",
          cardPadding: "p-8",
          containerMaxWidth: "max-w-6xl",
        },
        colorSystem: {
          primaryDefault: req.brand?.colors?.primary || "#0284C7", // Medical Ocean Sky
          secondaryDefault: req.brand?.colors?.secondary || "#0D9488", // Vitality Teal
          accentDefault: req.brand?.colors?.accent || "#38BDF8",
          bgDefault: isDarkRequested ? "#0B1320" : "#F8FAFC",
          textDefault: isDarkRequested ? "#F8FAFC" : "#0F172A",
          contrastRatio: 7.0, // AAA accessibility target for healthcare
          colorMood: "sterile_calm",
        },
        cta: {
          emphasis: "prominent",
          primaryLabel: req.cta || "Book Appointment",
          secondaryLabel: "Call Clinic Directly",
          buttonShape: "rounded",
          actionType: req.functionality?.whatsappDirect ? "whatsapp" : "scroll",
          stickyMobileCta: true,
        },
        motion: {
          animationLevel: "subtle",
          durationBaseMs: 350,
          easing: "easeOut",
          hoverZoomScale: 1.01,
          allowBackgroundOrbs: true,
        },
        layout: {
          heroLayout: "split",
          recommendedSections: ["navbar", "hero", "services", "about", "features", "faq", "contact", "footer"],
          gridColumns: { mobile: 1, tablet: 2, desktop: 3 },
        },
      };

    case "restaurant":
      return {
        industry: "restaurant",
        industryProfile: {
          key: "restaurant",
          displayName: "Restaurant & Fine Dining",
          archetype: "Sensory appetite appeal, warmth, hospitality, visual immersion",
          voiceAndTone: "Warm, welcoming, artisanal, mouth-watering",
          trustSignals: ["Fresh Farm Ingredients", "Michelin-Trained Chef", "Signature Recipes", "Top Rated 4.9/5"],
          recommendedBadges: ["Chef's Table Available", "Outdoor Patio Seating"],
          defaultCtaText: req.cta || "Reserve a Table",
          ctaActionType: req.functionality?.whatsappDirect ? "whatsapp" : "scroll",
        },
        typography: {
          headingFont: req.brand?.typography?.heading || "Outfit, serif",
          bodyFont: req.brand?.typography?.body || "Inter, sans-serif",
          headingScale: 1.6,
          bodyScale: 1.0,
          lineHeight: 1.55,
          letterSpacing: "-0.02em",
          headingStyle: "serif",
        },
        spacing: {
          scale: 1.15,
          density: "medium",
          sectionPaddingY: "py-20 sm:py-28",
          cardPadding: "p-6",
          containerMaxWidth: "max-w-7xl",
        },
        colorSystem: {
          primaryDefault: req.brand?.colors?.primary || "#E11D48", // Crimson Red
          secondaryDefault: req.brand?.colors?.secondary || "#FB923C", // Warm Orange
          accentDefault: req.brand?.colors?.accent || "#F59E0B",
          bgDefault: isDarkRequested ? "#181112" : "#FFFBF7",
          textDefault: isDarkRequested ? "#FFF1F2" : "#1C1917",
          contrastRatio: 5.5,
          colorMood: "warm_appetizing",
        },
        cta: {
          emphasis: "prominent",
          primaryLabel: req.cta || "Reserve Table",
          secondaryLabel: "View Today's Menu",
          buttonShape: "pill",
          actionType: req.functionality?.whatsappDirect ? "whatsapp" : "scroll",
          stickyMobileCta: true,
        },
        motion: {
          animationLevel: "smooth",
          durationBaseMs: 400,
          easing: "easeInOut",
          hoverZoomScale: 1.04,
          allowBackgroundOrbs: false,
        },
        layout: {
          heroLayout: "fullscreen_media",
          recommendedSections: ["navbar", "hero", "productsSection", "about", "services", "features", "contact", "footer"],
          gridColumns: { mobile: 1, tablet: 2, desktop: 3 },
        },
      };

    case "car_rental":
      return {
        industry: "car_rental",
        industryProfile: {
          key: "car_rental",
          displayName: "Car Rental & Mobility",
          archetype: "Speed, fleet transparency, instant confirmation, frictionless booking",
          voiceAndTone: "Direct, confident, reliable, fast-paced",
          trustSignals: ["Zero Hidden Charges", "Free Cancellation up to 24h", "24/7 Roadside Assistance", "Comprehensive Insurance"],
          recommendedBadges: ["Instant Confirmation", "Unlimited Mileage Available"],
          defaultCtaText: req.cta || "Book on WhatsApp",
          ctaActionType: "whatsapp",
        },
        typography: {
          headingFont: req.brand?.typography?.heading || "Space Grotesk, sans-serif",
          bodyFont: req.brand?.typography?.body || "Inter, sans-serif",
          headingScale: 1.5,
          bodyScale: 1.0,
          lineHeight: 1.45,
          letterSpacing: "-0.03em",
          headingStyle: "geometric",
        },
        spacing: {
          scale: 0.95,
          density: "compact",
          sectionPaddingY: "py-16 sm:py-24",
          cardPadding: "p-5",
          containerMaxWidth: "max-w-7xl",
        },
        colorSystem: {
          primaryDefault: req.brand?.colors?.primary || "#2563EB", // Royal Blue
          secondaryDefault: req.brand?.colors?.secondary || "#F59E0B", // Speed Amber
          accentDefault: req.brand?.colors?.accent || "#10B981",
          bgDefault: isDarkRequested ? "#0F172A" : "#F8FAFC",
          textDefault: isDarkRequested ? "#F8FAFC" : "#0F172A",
          contrastRatio: 6.0,
          colorMood: "energetic",
        },
        cta: {
          emphasis: "urgent",
          primaryLabel: req.cta || "Book on WhatsApp",
          secondaryLabel: "Browse Fleet",
          buttonShape: "rounded",
          actionType: "whatsapp",
          stickyMobileCta: true,
        },
        motion: {
          animationLevel: "energetic",
          durationBaseMs: 250,
          easing: "easeOut",
          hoverZoomScale: 1.03,
          allowBackgroundOrbs: true,
        },
        layout: {
          heroLayout: "split",
          recommendedSections: ["navbar", "hero", "productsSection", "features", "services", "faq", "contact", "footer"],
          gridColumns: { mobile: 1, tablet: 2, desktop: 3 },
        },
      };

    case "real_estate":
      return {
        industry: "real_estate",
        industryProfile: {
          key: "real_estate",
          displayName: "Real Estate & Luxury Properties",
          archetype: "Prestige, architectural geometry, spatial grandeur, investment credibility",
          voiceAndTone: "Refined, discreet, prestigious, visionary",
          trustSignals: ["RERA Approved", "Prime Waterfront & City Locations", "$500M+ Closed Deals", "Private Viewings Only"],
          recommendedBadges: ["Exclusive Listing", "Immediate Possession"],
          defaultCtaText: req.cta || "Schedule Private Tour",
          ctaActionType: "scroll",
        },
        typography: {
          headingFont: req.brand?.typography?.heading || "Plus Jakarta Sans, serif",
          bodyFont: req.brand?.typography?.body || "Inter, sans-serif",
          headingScale: 1.65,
          bodyScale: 1.0,
          lineHeight: 1.6,
          letterSpacing: "-0.02em",
          headingStyle: "uppercase",
        },
        spacing: {
          scale: 1.3,
          density: "spacious",
          sectionPaddingY: "py-24 sm:py-36",
          cardPadding: "p-8",
          containerMaxWidth: "max-w-7xl",
        },
        colorSystem: {
          primaryDefault: req.brand?.colors?.primary || "#1E3A8A", // Architectural Navy
          secondaryDefault: req.brand?.colors?.secondary || "#D97706", // Warm Gold
          accentDefault: req.brand?.colors?.accent || "#475569",
          bgDefault: isDarkRequested ? "#0B0F19" : "#FFFFFF",
          textDefault: isDarkRequested ? "#F8FAFC" : "#0F172A",
          contrastRatio: 6.5,
          colorMood: "luxury_prestige",
        },
        cta: {
          emphasis: "prominent",
          primaryLabel: req.cta || "Schedule Private Tour",
          secondaryLabel: "Download Brochure",
          buttonShape: "sharp",
          actionType: "scroll",
          stickyMobileCta: false,
        },
        motion: {
          animationLevel: "smooth",
          durationBaseMs: 500,
          easing: "easeInOut",
          hoverZoomScale: 1.02,
          allowBackgroundOrbs: true,
        },
        layout: {
          heroLayout: "fullscreen_media",
          recommendedSections: ["navbar", "hero", "productsSection", "about", "features", "services", "contact", "footer"],
          gridColumns: { mobile: 1, tablet: 2, desktop: 3 },
        },
      };

    case "gym":
      return {
        industry: "gym",
        industryProfile: {
          key: "gym",
          displayName: "Gym & Fitness Club",
          archetype: "High energy, intensity, motivation, athletic empowerment, community",
          voiceAndTone: "Intense, motivating, relentless, encouraging",
          trustSignals: ["Certified Elite Trainers", "Open 24/7", "State-of-the-art Equipment", "Free Nutrition Counseling"],
          recommendedBadges: ["Free 1-Day Pass", "No Lock-in Contracts"],
          defaultCtaText: req.cta || "Claim Free Pass",
          ctaActionType: "scroll",
        },
        typography: {
          headingFont: req.brand?.typography?.heading || "Impact, Oswald, sans-serif",
          bodyFont: req.brand?.typography?.body || "Inter, sans-serif",
          headingScale: 1.75,
          bodyScale: 1.0,
          lineHeight: 1.35,
          letterSpacing: "0.02em",
          headingStyle: "uppercase",
        },
        spacing: {
          scale: 1.0,
          density: "medium",
          sectionPaddingY: "py-20 sm:py-28",
          cardPadding: "p-6",
          containerMaxWidth: "max-w-7xl",
        },
        colorSystem: {
          primaryDefault: req.brand?.colors?.primary || "#EA580C", // Athletic Orange-Red
          secondaryDefault: req.brand?.colors?.secondary || "#4F46E5", // Electric Indigo
          accentDefault: req.brand?.colors?.accent || "#E11D48",
          bgDefault: isDarkRequested ? "#09090B" : "#FAFAFA",
          textDefault: isDarkRequested ? "#FAFAFA" : "#09090B",
          contrastRatio: 6.0,
          colorMood: "energetic",
        },
        cta: {
          emphasis: "urgent",
          primaryLabel: req.cta || "Claim Free Pass",
          secondaryLabel: "Explore Memberships",
          buttonShape: "rounded",
          actionType: "scroll",
          stickyMobileCta: true,
        },
        motion: {
          animationLevel: "energetic",
          durationBaseMs: 220,
          easing: "easeOut",
          hoverZoomScale: 1.04,
          allowBackgroundOrbs: true,
        },
        layout: {
          heroLayout: "split",
          recommendedSections: ["navbar", "hero", "services", "productsSection", "features", "about", "faq", "contact", "footer"],
          gridColumns: { mobile: 1, tablet: 2, desktop: 3 },
        },
      };

    case "saas":
      return {
        industry: "saas",
        industryProfile: {
          key: "saas",
          displayName: "SaaS & AI Software",
          archetype: "Innovation, clarity, product utility, data security, conversion focus",
          voiceAndTone: "Clear, forward-thinking, concise, product-led",
          trustSignals: ["SOC2 Type II Certified", "99.99% Uptime SLA", "Over 50,000+ Developers", "GDPR Compliant"],
          recommendedBadges: ["14-Day Free Trial", "No Credit Card Required"],
          defaultCtaText: req.cta || "Start Free Trial",
          ctaActionType: "scroll",
        },
        typography: {
          headingFont: req.brand?.typography?.heading || "Plus Jakarta Sans, sans-serif",
          bodyFont: req.brand?.typography?.body || "Inter, sans-serif",
          headingScale: 1.45,
          bodyScale: 1.0,
          lineHeight: 1.5,
          letterSpacing: "-0.025em",
          headingStyle: "geometric",
        },
        spacing: {
          scale: 1.0,
          density: "medium",
          sectionPaddingY: "py-24 sm:py-32",
          cardPadding: "p-7",
          containerMaxWidth: "max-w-6xl",
        },
        colorSystem: {
          primaryDefault: req.brand?.colors?.primary || "#4F46E5", // Modern Indigo
          secondaryDefault: req.brand?.colors?.secondary || "#06B6D4", // Vivid Cyan
          accentDefault: req.brand?.colors?.accent || "#8B5CF6",
          bgDefault: isDarkRequested ? "#0B0F19" : "#FFFFFF",
          textDefault: isDarkRequested ? "#F8FAFC" : "#0F172A",
          contrastRatio: 6.5,
          colorMood: "tech_modern",
        },
        cta: {
          emphasis: "prominent",
          primaryLabel: req.cta || "Start Free Trial",
          secondaryLabel: "Book 15-Min Demo",
          buttonShape: "rounded",
          actionType: "scroll",
          stickyMobileCta: false,
        },
        motion: {
          animationLevel: "subtle",
          durationBaseMs: 300,
          easing: "easeOut",
          hoverZoomScale: 1.02,
          allowBackgroundOrbs: true,
        },
        layout: {
          heroLayout: "centered",
          recommendedSections: ["navbar", "hero", "features", "services", "about", "faq", "contact", "footer"],
          gridColumns: { mobile: 1, tablet: 2, desktop: 3 },
        },
      };

    case "ecommerce":
      return {
        industry: "ecommerce",
        industryProfile: {
          key: "ecommerce",
          displayName: "E-Commerce & Online Store",
          archetype: "Conversion velocity, visual browsing, trust signals, friction-free checkout",
          voiceAndTone: "Trendy, energetic, engaging, customer-centric",
          trustSignals: ["Free Express Delivery over $50", "30-Day Money Back Guarantee", "100% Authentic Products", "Secure SSL Checkout"],
          recommendedBadges: ["Flash Sale Live", "Best Seller"],
          defaultCtaText: req.cta || "Shop Now",
          ctaActionType: "scroll",
        },
        typography: {
          headingFont: req.brand?.typography?.heading || "Inter, sans-serif",
          bodyFont: req.brand?.typography?.body || "Inter, sans-serif",
          headingScale: 1.4,
          bodyScale: 1.0,
          lineHeight: 1.5,
          letterSpacing: "-0.015em",
          headingStyle: "normal",
        },
        spacing: {
          scale: 0.95,
          density: "compact",
          sectionPaddingY: "py-16 sm:py-24",
          cardPadding: "p-5",
          containerMaxWidth: "max-w-7xl",
        },
        colorSystem: {
          primaryDefault: req.brand?.colors?.primary || "#16A34A", // Fresh Emerald / Conversion Green
          secondaryDefault: req.brand?.colors?.secondary || "#F59E0B", // Harvest Amber
          accentDefault: req.brand?.colors?.accent || "#E11D48",
          bgDefault: isDarkRequested ? "#121212" : "#FFFFFF",
          textDefault: isDarkRequested ? "#F8FAFC" : "#111827",
          contrastRatio: 6.0,
          colorMood: "energetic",
        },
        cta: {
          emphasis: "urgent",
          primaryLabel: req.cta || "Shop Collection",
          secondaryLabel: "Order on WhatsApp",
          buttonShape: "rounded",
          actionType: req.functionality?.whatsappDirect ? "whatsapp" : "scroll",
          stickyMobileCta: true,
        },
        motion: {
          animationLevel: "subtle",
          durationBaseMs: 250,
          easing: "easeOut",
          hoverZoomScale: 1.05,
          allowBackgroundOrbs: false,
        },
        layout: {
          heroLayout: "split",
          recommendedSections: ["navbar", "hero", "productsSection", "features", "about", "faq", "contact", "footer"],
          gridColumns: { mobile: 2, tablet: 3, desktop: 4 },
        },
      };


    // ── Phase 6: New Industries ─────────────────────────────────────────────────

    case "luxury_hotel":
      return {
        industry: "luxury_hotel",
        industryProfile: {
          key: "luxury_hotel",
          displayName: "Luxury Hotel & Boutique Resort",
          archetype: "Aspirational escape, spatial grandeur, sensory immersion, impeccable hospitality",
          voiceAndTone: "Refined, evocative, unhurried, inviting, prestigious",
          trustSignals: ["Forbes 5-Star Rated", "Complimentary Concierge", "Award-Winning Spa", "Ocean-View Suites"],
          recommendedBadges: ["Exclusive Member Rates", "Complimentary Breakfast"],
          defaultCtaText: req.cta || "Reserve Your Suite",
          ctaActionType: "scroll",
        },
        typography: {
          headingFont: req.brand?.typography?.heading || "Cormorant Garamond, serif",
          bodyFont: req.brand?.typography?.body || "Jost, sans-serif",
          headingScale: 1.7,
          bodyScale: 1.0,
          lineHeight: 1.65,
          letterSpacing: "0.04em",
          headingStyle: "uppercase",
        },
        spacing: {
          scale: 1.4,
          density: "spacious",
          sectionPaddingY: "py-28 sm:py-40",
          cardPadding: "p-10",
          containerMaxWidth: "max-w-7xl",
        },
        colorSystem: {
          primaryDefault: req.brand?.colors?.primary || "#1C1917", // Charcoal Noir
          secondaryDefault: req.brand?.colors?.secondary || "#B8960C", // Warm Gold
          accentDefault: req.brand?.colors?.accent || "#D4AF37",
          bgDefault: isDarkRequested ? "#0C0B09" : "#FDFDFA",
          textDefault: isDarkRequested ? "#FAF5E9" : "#1C1917",
          contrastRatio: 6.5,
          colorMood: "luxury_prestige",
        },
        cta: {
          emphasis: "prominent",
          primaryLabel: req.cta || "Reserve Your Suite",
          secondaryLabel: "Explore The Property",
          buttonShape: "sharp",
          actionType: "scroll",
          stickyMobileCta: false,
        },
        motion: {
          animationLevel: "smooth",
          durationBaseMs: 600,
          easing: "easeInOut",
          hoverZoomScale: 1.03,
          allowBackgroundOrbs: false,
        },
        layout: {
          heroLayout: "fullscreen_media",
          recommendedSections: ["navbar", "hero", "about", "services", "features", "reviews", "contact", "footer"],
          gridColumns: { mobile: 1, tablet: 2, desktop: 3 },
        },
      };

    case "creative_agency":
      return {
        industry: "creative_agency",
        industryProfile: {
          key: "creative_agency",
          displayName: "Creative Agency & Design Studio",
          archetype: "Bold creative vision, cultural impact, craft excellence, portfolio authority",
          voiceAndTone: "Confident, provocative, idea-driven, culturally informed",
          trustSignals: ["Award-Winning Creative Team", "Global Brand Clients", "Cannes Lions Recognition", "End-to-End Execution"],
          recommendedBadges: ["Open for 2025 Projects", "Selected Cases"],
          defaultCtaText: req.cta || "Start a Project",
          ctaActionType: "scroll",
        },
        typography: {
          headingFont: req.brand?.typography?.heading || "Syne, sans-serif",
          bodyFont: req.brand?.typography?.body || "DM Sans, sans-serif",
          headingScale: 1.65,
          bodyScale: 1.0,
          lineHeight: 1.2,
          letterSpacing: "-0.03em",
          headingStyle: "normal",
        },
        spacing: {
          scale: 1.2,
          density: "spacious",
          sectionPaddingY: "py-24 sm:py-36",
          cardPadding: "p-8",
          containerMaxWidth: "max-w-7xl",
        },
        colorSystem: {
          primaryDefault: req.brand?.colors?.primary || "#0F0F0F",
          secondaryDefault: req.brand?.colors?.secondary || "#F5F0E8",
          accentDefault: req.brand?.colors?.accent || "#FF4D00",
          bgDefault: isDarkRequested ? "#0A0A0A" : "#F8F8F5",
          textDefault: isDarkRequested ? "#FAFAFA" : "#0F0F0F",
          contrastRatio: 7.0,
          colorMood: "luxury_prestige",
        },
        cta: {
          emphasis: "prominent",
          primaryLabel: req.cta || "Start a Project",
          secondaryLabel: "View Selected Work",
          buttonShape: "sharp",
          actionType: "scroll",
          stickyMobileCta: false,
        },
        motion: {
          animationLevel: "energetic",
          durationBaseMs: 350,
          easing: "easeOut",
          hoverZoomScale: 1.04,
          allowBackgroundOrbs: false,
        },
        layout: {
          heroLayout: "split",
          recommendedSections: ["navbar", "hero", "services", "about", "features", "reviews", "contact", "footer"],
          gridColumns: { mobile: 1, tablet: 2, desktop: 3 },
        },
      };

    case "law_firm":
      return {
        industry: "law_firm",
        industryProfile: {
          key: "law_firm",
          displayName: "Law Firm & Legal Counsel",
          archetype: "Authoritative credibility, measured precision, uncompromising advocacy, institutional trust",
          voiceAndTone: "Authoritative, precise, reassuring, professional, direct",
          trustSignals: ["25+ Years Combined Experience", "900+ Cases Won", "Confidential Consultation", "Licensed in All Jurisdictions"],
          recommendedBadges: ["Free Initial Consultation", "No Win, No Fee"],
          defaultCtaText: req.cta || "Book Consultation",
          ctaActionType: "scroll",
        },
        typography: {
          headingFont: req.brand?.typography?.heading || "Playfair Display, serif",
          bodyFont: req.brand?.typography?.body || "Inter, sans-serif",
          headingScale: 1.45,
          bodyScale: 1.05,
          lineHeight: 1.7,
          letterSpacing: "-0.01em",
          headingStyle: "normal",
        },
        spacing: {
          scale: 1.2,
          density: "spacious",
          sectionPaddingY: "py-24 sm:py-32",
          cardPadding: "p-8",
          containerMaxWidth: "max-w-6xl",
        },
        colorSystem: {
          primaryDefault: req.brand?.colors?.primary || "#1E3A5F", // Deep Authoritative Navy
          secondaryDefault: req.brand?.colors?.secondary || "#C9A84C", // Legal Gold
          accentDefault: req.brand?.colors?.accent || "#334155",
          bgDefault: isDarkRequested ? "#0D1219" : "#FAFBFC",
          textDefault: isDarkRequested ? "#F8FAFC" : "#0F172A",
          contrastRatio: 7.0,
          colorMood: "high_trust",
        },
        cta: {
          emphasis: "prominent",
          primaryLabel: req.cta || "Book Free Consultation",
          secondaryLabel: "View Our Practice Areas",
          buttonShape: "sharp",
          actionType: "scroll",
          stickyMobileCta: false,
        },
        motion: {
          animationLevel: "minimal",
          durationBaseMs: 300,
          easing: "easeOut",
          hoverZoomScale: 1.01,
          allowBackgroundOrbs: false,
        },
        layout: {
          heroLayout: "split",
          recommendedSections: ["navbar", "hero", "services", "about", "features", "faq", "contact", "footer"],
          gridColumns: { mobile: 1, tablet: 2, desktop: 3 },
        },
      };

    case "wellness_spa":
      return {
        industry: "wellness_spa",
        industryProfile: {
          key: "wellness_spa",
          displayName: "Wellness, Spa & Holistic Health",
          archetype: "Restorative sanctuary, mindful touch, organic harmony, sensory renewal",
          voiceAndTone: "Gentle, nurturing, mindful, grounded, inviting",
          trustSignals: ["Certified Therapists", "Organic & Natural Products", "Private Healing Spaces", "Personalised Wellness Plans"],
          recommendedBadges: ["New Client Offer", "Holistic Consultation Included"],
          defaultCtaText: req.cta || "Book a Treatment",
          ctaActionType: "scroll",
        },
        typography: {
          headingFont: req.brand?.typography?.heading || "Fraunces, serif",
          bodyFont: req.brand?.typography?.body || "Plus Jakarta Sans, sans-serif",
          headingScale: 1.55,
          bodyScale: 1.0,
          lineHeight: 1.7,
          letterSpacing: "0.01em",
          headingStyle: "serif",
        },
        spacing: {
          scale: 1.3,
          density: "spacious",
          sectionPaddingY: "py-24 sm:py-36",
          cardPadding: "p-8",
          containerMaxWidth: "max-w-6xl",
        },
        colorSystem: {
          primaryDefault: req.brand?.colors?.primary || "#5E7C4E", // Sage Green
          secondaryDefault: req.brand?.colors?.secondary || "#C4A882", // Warm Sand
          accentDefault: req.brand?.colors?.accent || "#7D9B6D",
          bgDefault: isDarkRequested ? "#141610" : "#FEFCF8",
          textDefault: isDarkRequested ? "#F4F1E8" : "#2C2A26",
          contrastRatio: 6.5,
          colorMood: "sterile_calm",
        },
        cta: {
          emphasis: "prominent",
          primaryLabel: req.cta || "Book a Treatment",
          secondaryLabel: "Explore Treatments",
          buttonShape: "pill",
          actionType: "scroll",
          stickyMobileCta: true,
        },
        motion: {
          animationLevel: "subtle",
          durationBaseMs: 500,
          easing: "easeInOut",
          hoverZoomScale: 1.02,
          allowBackgroundOrbs: false,
        },
        layout: {
          heroLayout: "fullscreen_media",
          recommendedSections: ["navbar", "hero", "services", "about", "features", "reviews", "faq", "contact", "footer"],
          gridColumns: { mobile: 1, tablet: 2, desktop: 3 },
        },
      };

    case "finance":
      return {
        industry: "finance",
        industryProfile: {
          key: "finance",
          displayName: "Finance, Investment & Wealth Management",
          archetype: "Institutional authority, data-driven confidence, security-first, long-term partnership",
          voiceAndTone: "Authoritative, measured, transparent, expert, discreet",
          trustSignals: ["SEC Registered Advisors", "$2B+ Assets Under Management", "Fiduciary Duty Guaranteed", "35-Year Track Record"],
          recommendedBadges: ["Schedule a Strategy Session", "Complimentary Portfolio Review"],
          defaultCtaText: req.cta || "Schedule Consultation",
          ctaActionType: "scroll",
        },
        typography: {
          headingFont: req.brand?.typography?.heading || "Instrument Serif, serif",
          bodyFont: req.brand?.typography?.body || "Inter, sans-serif",
          headingScale: 1.45,
          bodyScale: 1.0,
          lineHeight: 1.65,
          letterSpacing: "-0.015em",
          headingStyle: "normal",
        },
        spacing: {
          scale: 1.2,
          density: "spacious",
          sectionPaddingY: "py-24 sm:py-32",
          cardPadding: "p-8",
          containerMaxWidth: "max-w-6xl",
        },
        colorSystem: {
          primaryDefault: req.brand?.colors?.primary || "#0F2D52", // Deep Trust Navy
          secondaryDefault: req.brand?.colors?.secondary || "#1A5276", // Analytical Blue
          accentDefault: req.brand?.colors?.accent || "#2E86C1",
          bgDefault: isDarkRequested ? "#080F1A" : "#FAFBFC",
          textDefault: isDarkRequested ? "#E8ECF0" : "#0F1923",
          contrastRatio: 7.0,
          colorMood: "high_trust",
        },
        cta: {
          emphasis: "prominent",
          primaryLabel: req.cta || "Schedule Consultation",
          secondaryLabel: "Download Prospectus",
          buttonShape: "sharp",
          actionType: "scroll",
          stickyMobileCta: false,
        },
        motion: {
          animationLevel: "minimal",
          durationBaseMs: 350,
          easing: "easeOut",
          hoverZoomScale: 1.01,
          allowBackgroundOrbs: false,
        },
        layout: {
          heroLayout: "split",
          recommendedSections: ["navbar", "hero", "services", "features", "about", "faq", "contact", "footer"],
          gridColumns: { mobile: 1, tablet: 2, desktop: 3 },
        },
      };

    case "education":
      return {
        industry: "education",
        industryProfile: {
          key: "education",
          displayName: "Education, Academy & Learning",
          archetype: "Knowledge empowerment, structured growth, accessible excellence, community learning",
          voiceAndTone: "Encouraging, clear, inspiring, inclusive, expert",
          trustSignals: ["Accredited Institution", "95% Graduate Employment Rate", "Expert Faculty", "Globally Recognised Credentials"],
          recommendedBadges: ["Applications Open 2025", "Scholarship Available"],
          defaultCtaText: req.cta || "Apply Now",
          ctaActionType: "scroll",
        },
        typography: {
          headingFont: req.brand?.typography?.heading || "Plus Jakarta Sans, sans-serif",
          bodyFont: req.brand?.typography?.body || "Inter, sans-serif",
          headingScale: 1.45,
          bodyScale: 1.05,
          lineHeight: 1.65,
          letterSpacing: "-0.01em",
          headingStyle: "normal",
        },
        spacing: {
          scale: 1.1,
          density: "medium",
          sectionPaddingY: "py-20 sm:py-28",
          cardPadding: "p-7",
          containerMaxWidth: "max-w-7xl",
        },
        colorSystem: {
          primaryDefault: req.brand?.colors?.primary || "#2563EB", // Academic Blue
          secondaryDefault: req.brand?.colors?.secondary || "#7C3AED", // Wisdom Violet
          accentDefault: req.brand?.colors?.accent || "#0EA5E9",
          bgDefault: isDarkRequested ? "#0B0F19" : "#FFFFFF",
          textDefault: isDarkRequested ? "#F8FAFC" : "#0F172A",
          contrastRatio: 6.5,
          colorMood: "sterile_calm",
        },
        cta: {
          emphasis: "prominent",
          primaryLabel: req.cta || "Apply Now",
          secondaryLabel: "Explore Programs",
          buttonShape: "rounded",
          actionType: "scroll",
          stickyMobileCta: false,
        },
        motion: {
          animationLevel: "subtle",
          durationBaseMs: 300,
          easing: "easeOut",
          hoverZoomScale: 1.02,
          allowBackgroundOrbs: true,
        },
        layout: {
          heroLayout: "centered",
          recommendedSections: ["navbar", "hero", "services", "features", "about", "reviews", "faq", "contact", "footer"],
          gridColumns: { mobile: 1, tablet: 2, desktop: 3 },
        },
      };

    case "portfolio":
      return {
        industry: "portfolio",
        industryProfile: {
          key: "portfolio",
          displayName: "Personal Portfolio & Creative Brand",
          archetype: "Singular creative vision, curated mastery, distinctive personal voice, confident craft",
          voiceAndTone: "Personal, direct, confident, authentic",
          trustSignals: ["Available for Freelance", "Remote & Worldwide", "Trusted by Top Brands", "Fast Turnaround"],
          recommendedBadges: ["Open to Projects", "Featured Work"],
          defaultCtaText: req.cta || "Get in Touch",
          ctaActionType: "scroll",
        },
        typography: {
          headingFont: req.brand?.typography?.heading || "Bebas Neue, sans-serif",
          bodyFont: req.brand?.typography?.body || "Inter, sans-serif",
          headingScale: 1.75,
          bodyScale: 1.0,
          lineHeight: 1.3,
          letterSpacing: "0.02em",
          headingStyle: "uppercase",
        },
        spacing: {
          scale: 1.2,
          density: "spacious",
          sectionPaddingY: "py-24 sm:py-36",
          cardPadding: "p-8",
          containerMaxWidth: "max-w-7xl",
        },
        colorSystem: {
          primaryDefault: req.brand?.colors?.primary || "#111827", // Midnight Ink
          secondaryDefault: req.brand?.colors?.secondary || "#F9FAFB",
          accentDefault: req.brand?.colors?.accent || "#EF4444",
          bgDefault: isDarkRequested ? "#0A0A0B" : "#FAFAFA",
          textDefault: isDarkRequested ? "#FAFAFA" : "#111827",
          contrastRatio: 7.0,
          colorMood: "luxury_prestige",
        },
        cta: {
          emphasis: "prominent",
          primaryLabel: req.cta || "Get in Touch",
          secondaryLabel: "See My Work",
          buttonShape: "sharp",
          actionType: "scroll",
          stickyMobileCta: false,
        },
        motion: {
          animationLevel: "smooth",
          durationBaseMs: 400,
          easing: "easeInOut",
          hoverZoomScale: 1.05,
          allowBackgroundOrbs: false,
        },
        layout: {
          heroLayout: "fullscreen_media",
          recommendedSections: ["navbar", "hero", "about", "services", "features", "reviews", "contact", "footer"],
          gridColumns: { mobile: 1, tablet: 2, desktop: 3 },
        },
      };

    case "automotive":
      return {
        industry: "automotive",
        industryProfile: {
          key: "automotive",
          displayName: "Automotive & Vehicle Dealership",
          archetype: "Power and performance, precision engineering, aspirational lifestyle, premium ownership",
          voiceAndTone: "Bold, confident, performance-driven, aspirational",
          trustSignals: ["Certified Pre-Owned Inventory", "Transparent Pricing", "Manufacturer Warranty", "Zero-Km Delivery Available"],
          recommendedBadges: ["Test Drive Today", "EMI Available"],
          defaultCtaText: req.cta || "Book a Test Drive",
          ctaActionType: req.functionality?.whatsappDirect ? "whatsapp" : "scroll",
        },
        typography: {
          headingFont: req.brand?.typography?.heading || "Space Grotesk, sans-serif",
          bodyFont: req.brand?.typography?.body || "Inter, sans-serif",
          headingScale: 1.6,
          bodyScale: 1.0,
          lineHeight: 1.4,
          letterSpacing: "-0.03em",
          headingStyle: "geometric",
        },
        spacing: {
          scale: 1.0,
          density: "medium",
          sectionPaddingY: "py-20 sm:py-28",
          cardPadding: "p-6",
          containerMaxWidth: "max-w-7xl",
        },
        colorSystem: {
          primaryDefault: req.brand?.colors?.primary || "#1E293B", // Performance Slate
          secondaryDefault: req.brand?.colors?.secondary || "#EF4444", // Speed Red
          accentDefault: req.brand?.colors?.accent || "#F59E0B",
          bgDefault: isDarkRequested ? "#0F1117" : "#F8FAFC",
          textDefault: isDarkRequested ? "#F8FAFC" : "#0F172A",
          contrastRatio: 6.0,
          colorMood: "energetic",
        },
        cta: {
          emphasis: "urgent",
          primaryLabel: req.cta || "Book a Test Drive",
          secondaryLabel: "Browse Inventory",
          buttonShape: "rounded",
          actionType: req.functionality?.whatsappDirect ? "whatsapp" : "scroll",
          stickyMobileCta: true,
        },
        motion: {
          animationLevel: "energetic",
          durationBaseMs: 280,
          easing: "easeOut",
          hoverZoomScale: 1.04,
          allowBackgroundOrbs: true,
        },
        layout: {
          heroLayout: "fullscreen_media",
          recommendedSections: ["navbar", "hero", "productsSection", "services", "features", "about", "faq", "contact", "footer"],
          gridColumns: { mobile: 1, tablet: 2, desktop: 3 },
        },
      };

    case "local_service":
    default:
      return {
        industry: "local_service",
        industryProfile: {
          key: "local_service",
          displayName: "Local Home & Professional Services",
          archetype: "Immediate local trust, availability, emergency response, verified reviews",
          voiceAndTone: "Friendly, dependable, honest, straightforward",
          trustSignals: ["Licensed & Insured", "Same-Day Emergency Service", "Upfront Pricing Guaranteed", "500+ 5-Star Local Reviews"],
          recommendedBadges: ["Available 24/7 in Your Area", "Background-Checked Pros"],
          defaultCtaText: req.cta || "Call Now for Free Quote",
          ctaActionType: req.contactInformation?.phone ? "call" : req.functionality?.whatsappDirect ? "whatsapp" : "scroll",
        },
        typography: {
          headingFont: req.brand?.typography?.heading || "Inter, sans-serif",
          bodyFont: req.brand?.typography?.body || "Inter, sans-serif",
          headingScale: 1.35,
          bodyScale: 1.05,
          lineHeight: 1.55,
          letterSpacing: "-0.01em",
          headingStyle: "normal",
        },
        spacing: {
          scale: 1.0,
          density: "medium",
          sectionPaddingY: "py-18 sm:py-26",
          cardPadding: "p-6",
          containerMaxWidth: "max-w-6xl",
        },
        colorSystem: {
          primaryDefault: req.brand?.colors?.primary || "#2563EB", // Reliable Service Royal Blue
          secondaryDefault: req.brand?.colors?.secondary || "#EAB308", // Attention Yellow
          accentDefault: req.brand?.colors?.accent || "#16A34A",
          bgDefault: isDarkRequested ? "#0F172A" : "#FFFFFF",
          textDefault: isDarkRequested ? "#F8FAFC" : "#0F172A",
          contrastRatio: 7.0, // High visibility for outdoor smartphone use
          colorMood: "high_trust",
        },
        cta: {
          emphasis: "urgent",
          primaryLabel: req.cta || "Call Now",
          secondaryLabel: "Message on WhatsApp",
          buttonShape: "rounded",
          actionType: req.contactInformation?.phone ? "call" : "whatsapp",
          stickyMobileCta: true,
        },
        motion: {
          animationLevel: "minimal",
          durationBaseMs: 200,
          easing: "easeOut",
          hoverZoomScale: 1.02,
          allowBackgroundOrbs: true,
        },
        layout: {
          heroLayout: "split",
          recommendedSections: ["navbar", "hero", "services", "about", "features", "faq", "contact", "footer"],
          gridColumns: { mobile: 1, tablet: 2, desktop: 3 },
        },
      };
  }
}
