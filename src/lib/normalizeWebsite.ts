import { getCategoryImages, getImageIntentForSection } from "./categoryImages";
import { generateDesignStrategy } from "./ai/designStrategy";
import type {
  Hero,
  About,
  Service,
  Feature,
  FAQ,
  Contact,
  Footer,
  ButtonActionConfig,
  DesignStrategyData,
  BrandIdentity,
} from "@/types/website";

export interface NormalizedWebsiteData {
  businessName?: string;
  brand?: BrandIdentity;
  hero: Hero & { image?: string };
  about: About & { image?: string };
  services: Array<Service & { image?: string }>;
  features: Array<Feature & { image?: string }>;
  faq: FAQ[];
  contact: Contact;
  footer: Footer;
  sectionOrder: string[];
  designStrategy?: DesignStrategyData;
  navbar?: import("@/types/website").NavbarConfig;
  pages?: import("@/types/website").WebsitePage[];
  products?: import("@/types/website").ProductItem[];
  [key: string]: unknown;
}

const DEFAULT_ORDER = ["hero", "about", "services", "features", "faq", "contact", "footer"];

const PROMPT_LEAKAGE_REGEX =
  /\b(autonomous\s+design\s+direction|design\s+intelligence|system\s+prompt|visual\s+archetype|warm_artisanal|dark_technical|clean_clinical|luxury_bespoke|minimal_editorial|expressive_creative|high_trust_service|bold_brutalist|warm\s+artisanal|dark\s+technical|clean\s+clinical|luxury\s+bespoke|minimal\s+editorial|expressive\s+creative|high\s+trust\s+service|bold\s+brutalist)\b/gi;

function sanitizeString(str: unknown, fallback = ""): string {
  if (typeof str !== "string") return fallback;
  const cleaned = str.replace(PROMPT_LEAKAGE_REGEX, "").trim();
  return cleaned || fallback;
}

export function normalizeWebsiteData(
  raw: any,
  category?: string | null | { category?: string | null; businessName?: string | null; description?: string | null },
  businessName?: string | null,
  description?: string | null
): NormalizedWebsiteData {
  const data = raw || {};
  const actualCategory = (typeof category === "object" && category !== null) ? category.category : category;
  const actualBusinessName = (typeof category === "object" && category !== null) ? category.businessName : businessName;
  const actualDescription = (typeof category === "object" && category !== null) ? category.description : description;

  const strategy = data.designStrategy || generateDesignStrategy({
    category: actualCategory ?? undefined,
    businessName: actualBusinessName ?? undefined,
    description: actualDescription ?? undefined,
  });
  const images = getCategoryImages(actualCategory, actualBusinessName, actualDescription);

  // 1. Normalize Hero
  const rawHero = (data.hero && typeof data.hero === "object" ? data.hero : {}) as Partial<Hero>;
  const catLower = (actualCategory || "").toLowerCase();
  
  const getDomainHeroDefaults = () => {
    const name = actualBusinessName || businessName || "Our Brand";
    if (catLower.includes("ceramic") || catLower.includes("pottery") || catLower.includes("tableware") || catLower.includes("stoneware")) {
      return {
        title: `Handcrafted Stoneware & Contemporary Ceramics at ${name}`,
        subtitle: "Functional pottery and sculptural ceramic vessels thrown on the wheel and fired with natural ash glazes.",
        button: "Explore Collection",
        trustBadges: ["Handmade in Small Batches", "100% Food-Safe Glazes", "High-Fire Durability"],
      };
    }
    if (catLower.includes("agency") || catLower.includes("creative studio") || catLower.includes("branding")) {
      return {
        title: `Crafting High-Impact Brands & Digital Experiences at ${name}`,
        subtitle: "Strategic design, iconic visual identity, and bespoke digital experiences for world-class innovators.",
        button: "View Selected Cases",
        trustBadges: ["Global Design Awards", "Full-Stack Creative Direction", "Founder-Led Collaboration"],
      };
    }
    if (catLower.includes("cafe") || catLower.includes("coffee") || catLower.includes("restaurant") || catLower.includes("bakery") || catLower.includes("dining")) {
      return {
        title: `Artisanal Flavors & Warm Atmosphere at ${name}`,
        subtitle: "Experience handcrafted culinary creations, specialty coffee, and an unforgettable welcoming ambiance.",
        button: "Explore Menu",
        trustBadges: ["Single-Origin Beans", "Freshly Baked Daily", "Welcoming Atmosphere"],
      };
    }
    if (catLower.includes("dental") || catLower.includes("dentist") || catLower.includes("clinic") || catLower.includes("medical")) {
      return {
        title: `Gentle, Modern Healthcare for Your Family at ${name}`,
        subtitle: "Comprehensive clinical care delivered with advanced technology, certified specialists, and a compassionate touch.",
        button: "Book Appointment",
        trustBadges: ["Board-Certified Specialists", "Digital 3D Diagnostics", "Pain-Free Comfort"],
      };
    }
    if (catLower.includes("architect") || catLower.includes("interior") || catLower.includes("design studio")) {
      return {
        title: `Sculpting Timeless Spaces & Modern Architecture`,
        subtitle: `Bespoke residential and commercial architecture shaped by light, materiality, and meticulous craft.`,
        button: "Explore Selected Works",
        trustBadges: ["Chartered Architectural Practice", "Sustainable Materials", "Published Blueprint Design"],
      };
    }
    if (catLower.includes("fashion") || catLower.includes("luxury") || catLower.includes("jewelry") || catLower.includes("boutique")) {
      return {
        title: `The Essence of Modern Atelier Elegance`,
        subtitle: `Meticulously tailored silhouettes, pure natural textiles, and timeless luxury crafted for discerning collectors.`,
        button: "Discover Collection",
        trustBadges: ["Pure Silk & Cashmere", "Master Tailoring", "Private Concierge"],
      };
    }
    if (catLower.includes("plumber") || catLower.includes("electric") || catLower.includes("service") || catLower.includes("repair")) {
      return {
        title: `Dependable 24/7 Professional Service in Your Area`,
        subtitle: `Certified technicians, transparent upfront pricing, and rapid local response for your home and business.`,
        button: "Contact Us Now",
        trustBadges: ["Licensed, Bonded & Insured", "100% Workmanship Guarantee", "Rapid Local Arrival"],
      };
    }
    if (catLower.includes("saas") || catLower.includes("software") || catLower.includes("tech") || catLower.includes("ai")) {
      return {
        title: `Next-Generation Platform Built for Speed & Precision`,
        subtitle: `Empower your workflows with intelligent automation, seamless integrations, and real-time clarity.`,
        button: "Start Free Trial",
        trustBadges: ["Enterprise-Grade Security", "Sub-50ms Response", "99.99% Uptime"],
      };
    }
    return {
      title: `Crafted With Distinction at ${name}`,
      subtitle: `Discover tailored solutions, superior craftsmanship, and dedicated care designed specifically for your needs.`,
      button: "Explore Offerings",
      trustBadges: ["Verified Standards", "Experienced Team", "Client-Focused"],
    };
  };

  const domainDefaults = getDomainHeroDefaults();

  // Intra-page image uniqueness registry
  const usedImages = new Set<string>();

  const assignUniqueImage = (candidate?: string, pool: string[] = []): string => {
    if (candidate && typeof candidate === "string" && candidate.trim()) {
      const clean = candidate.trim();
      if (!usedImages.has(clean)) {
        usedImages.add(clean);
        return clean;
      }
    }
    for (const img of pool) {
      if (img && !usedImages.has(img)) {
        usedImages.add(img);
        return img;
      }
    }
    const allCategoryPool = [
      images.hero,
      images.about,
      ...(images.services || []),
      ...(images.features || []),
    ];
    for (const img of allCategoryPool) {
      if (img && !usedImages.has(img)) {
        usedImages.add(img);
        return img;
      }
    }
    const baseImg = (candidate && typeof candidate === "string" && candidate.trim()) || pool[0] || images.hero;
    const delimiter = baseImg.includes("?") ? "&" : "?";
    const variantImg = `${baseImg}${delimiter}uid=${usedImages.size + 1}`;
    usedImages.add(variantImg);
    return variantImg;
  };

  const hero: Hero & { image?: string } = {
    title: sanitizeString(rawHero.title) || domainDefaults.title,
    subtitle: sanitizeString(rawHero.subtitle) || domainDefaults.subtitle,
    button: sanitizeString(rawHero.button) || domainDefaults.button,
    image: assignUniqueImage(rawHero.image, [images.hero]),
    buttonAction: rawHero.buttonAction,
    layoutVariant: rawHero.layoutVariant || strategy.heroType,
    badges: (() => {
      const defaultBadge = (actualCategory || "Featured").toUpperCase();
      if (Array.isArray(rawHero.badges) && rawHero.badges.length > 0) {
        const cleaned = rawHero.badges
          .map((b) => sanitizeString(b))
          .filter(Boolean);
        if (cleaned.length > 0) return cleaned;
      }
      return [defaultBadge];
    })(),
    trustBadges: (() => {
      if (Array.isArray(rawHero.trustBadges) && rawHero.trustBadges.length > 0) {
        const cleaned = rawHero.trustBadges.map((b) => sanitizeString(b)).filter(Boolean);
        if (cleaned.length >= 2) return cleaned;
      }
      return domainDefaults.trustBadges;
    })(),
    imageIntent: (() => {
      const defaultIntent = getImageIntentForSection(actualCategory, "hero", actualBusinessName);
      const raw = rawHero.imageIntent as Record<string, unknown> | undefined;
      if (!raw) return defaultIntent;
      return {
        subject: (raw.subject as string) || (raw.description as string) || defaultIntent.subject,
        visualStyle: (raw.visualStyle as string) || (raw.lighting as string) || defaultIntent.visualStyle,
        aspectRatio: (raw.aspectRatio as string) || defaultIntent.aspectRatio,
        composition: (raw.composition as string) || defaultIntent.composition,
        crop: (raw.crop as string) || defaultIntent.crop,
        purpose: (raw.purpose as string) || defaultIntent.purpose,
        fallbackType: (raw.fallbackType as "svg_geometric" | "abstract_mesh" | "tonal_composition") || defaultIntent.fallbackType,
      };
    })(),
    backgroundStyle: rawHero.backgroundStyle || strategy.backgroundStrategy,
    spatial3d: rawHero.spatial3d || strategy.spatial3d,
    heroBackground: rawHero.heroBackground || strategy.heroBackground,
  };

  // 2. Normalize About
  const rawAbout = (data.about && typeof data.about === "object" ? data.about : {}) as Partial<About>;
  const about: About & { image?: string } = {
    title: typeof rawAbout.title === "string" && rawAbout.title.trim() ? rawAbout.title : `Our Heritage & Philosophy`,
    content:
      typeof rawAbout.content === "string" && rawAbout.content.trim()
        ? rawAbout.content
        : `At ${businessName || "our brand"}, we are dedicated to setting exceptional standards through continuous attention to detail, genuine care for our clients, and uncompromising quality.`,
    image: assignUniqueImage(rawAbout.image, [images.about, ...images.services]),
    badge: typeof rawAbout.badge === "string" && rawAbout.badge.trim() ? rawAbout.badge : "OUR STORY",
    highlights: Array.isArray(rawAbout.highlights) && rawAbout.highlights.length > 0 ? rawAbout.highlights : undefined,
  };

  // 3. Normalize Services
  let rawServicesList: unknown[] = [];
  if (Array.isArray(data.services)) {
    rawServicesList = data.services;
  } else if (data.services && typeof data.services === "object") {
    const possibleItems = (data.services as { items?: unknown[] }).items;
    if (Array.isArray(possibleItems)) {
      rawServicesList = possibleItems;
    }
  }

  const services: Array<Service & { image?: string }> = rawServicesList
    .filter((s): s is Record<string, unknown> => Boolean(s && typeof s === "object"))
    .map((s, idx) => ({
      title: typeof s.title === "string" && s.title.trim() ? s.title : `Service ${idx + 1}`,
      description:
        typeof s.description === "string" && s.description.trim()
          ? s.description
          : "Tailored to your requirements with precision and high standards.",
      image: assignUniqueImage(
        typeof s.image === "string" && s.image.trim() ? s.image : undefined,
        [images.services[idx % images.services.length], ...images.services, ...images.features]
      ),
      buttonAction: (s.buttonAction as ButtonActionConfig | undefined),
      cardFamily: (s.cardFamily as any) || undefined,
      badge: (s.badge as string) || (s.tag as string) || undefined,
      tag: (s.tag as string) || undefined,
      metric: (s.metric as string) || undefined,
    }));

  if (services.length === 0) {
    const catLower = (actualCategory || "").toLowerCase();
    const fallbackTitles = catLower.includes("dental") || catLower.includes("clinic")
      ? ["Comprehensive Oral Examination", "Painless Root Canal Therapy", "Cosmetic Smile Makeover", "Dental Implants"]
      : catLower.includes("restaurant") || catLower.includes("food")
      ? ["Artisanal Dine-in Experience", "Chef's Tasting Menu", "Private Party Catering", "Express Takeaway & Delivery"]
      : catLower.includes("car") || catLower.includes("rental")
      ? ["Self-Drive Premium Fleet", "Chauffeur Airport Transfers", "Long-Term Corporate Leasing", "24/7 Roadside Assistance"]
      : ["Tailored Solutions", "Professional Consultation", "Rapid Implementation", "24/7 Dedicated Support"];

    for (let idx = 0; idx < fallbackTitles.length; idx++) {
      services.push({
        title: fallbackTitles[idx],
        description: "Delivering uncompromising quality and dedicated service tailored to your exact needs.",
        image: assignUniqueImage(undefined, [images.services[idx % images.services.length], ...images.services, ...images.features]),
      });
    }
  }

  // 4. Normalize Features
  let rawFeaturesList: unknown[] = [];
  if (Array.isArray(data.features)) {
    rawFeaturesList = data.features;
  } else if (data.features && typeof data.features === "object") {
    const possibleItems = (data.features as { items?: unknown[] }).items;
    if (Array.isArray(possibleItems)) {
      rawFeaturesList = possibleItems;
    }
  }

  const features: Array<Feature & { image?: string }> = rawFeaturesList
    .filter((f): f is Record<string, unknown> => Boolean(f && typeof f === "object"))
    .map((f, idx) => ({
      title: typeof f.title === "string" && f.title.trim() ? f.title : `Feature ${idx + 1}`,
      description:
        typeof f.description === "string" && f.description.trim()
          ? f.description
          : "Built for speed, security, and exceptional performance.",
      image: assignUniqueImage(
        typeof f.image === "string" && f.image.trim() ? f.image : undefined,
        [images.features[idx % images.features.length], ...images.features, ...images.services]
      ),
      buttonAction: ((f as Record<string, unknown>).buttonAction as ButtonActionConfig | undefined),
      cardFamily: (f.cardFamily as any) || undefined,
      badge: (f.badge as string) || (f.tag as string) || undefined,
      tag: (f.tag as string) || undefined,
      metric: (f.metric as string) || undefined,
    }));

  // 5. Normalize FAQ
  let rawFaqList: unknown[] = [];
  if (Array.isArray(data.faq)) {
    rawFaqList = data.faq;
  } else if (data.faq && typeof data.faq === "object") {
    const possibleItems = (data.faq as { items?: unknown[] }).items;
    if (Array.isArray(possibleItems)) {
      rawFaqList = possibleItems;
    }
  }

  const faq: FAQ[] = rawFaqList
    .filter((q): q is Record<string, unknown> => Boolean(q && typeof q === "object"))
    .map((q, idx) => ({
      question: typeof q.question === "string" && q.question.trim() ? q.question : `Frequently Asked Question ${idx + 1}`,
      answer:
        typeof q.answer === "string" && q.answer.trim()
          ? q.answer
          : "We provide dedicated customer assistance and tailored solutions.",
    }));

  // 6. Normalize Contact
  const rawContact = (data.contact && typeof data.contact === "object" ? data.contact : {}) as Partial<Contact>;
  const contact: Contact = {
    phone: typeof rawContact.phone === "string" && rawContact.phone.trim() ? rawContact.phone : "+1 (555) 019-2834",
    email: typeof rawContact.email === "string" && rawContact.email.trim() ? rawContact.email : "contact@websitebanja.com",
    address: typeof rawContact.address === "string" && rawContact.address.trim() ? rawContact.address : "Downtown Metropolitan Hub",
  };

  // Brand Identity
  const rawBrand = (data.brand && typeof data.brand === "object" ? data.brand : {}) as Record<string, unknown>;
  const resolvedBrandName = sanitizeString(rawBrand.name) || actualBusinessName || "Brand";
  const brand: BrandIdentity = {
    name: resolvedBrandName,
    shortName: sanitizeString(rawBrand.shortName) || resolvedBrandName.split(" ")[0],
    tagline: sanitizeString(rawBrand.tagline) || undefined,
    industry: sanitizeString(rawBrand.industry) || actualCategory || "General",
    description: sanitizeString(rawBrand.description) || actualDescription || undefined,
  };

  // Navbar
  const rawNavbar = (data.navbar && typeof data.navbar === "object" ? data.navbar : {}) as Record<string, any>;
  const navbar: import("@/types/website").NavbarConfig = {
    logo: {
      type: rawNavbar.logo?.type === "image" && rawNavbar.logo?.imageUrl ? "image" as const : "text" as const,
      text: sanitizeString(rawNavbar.logo?.text) || brand.name,
      imageUrl: rawNavbar.logo?.imageUrl,
    },
    links: Array.isArray(rawNavbar.links) && rawNavbar.links.length > 0 ? rawNavbar.links : undefined,
  };

  // 7. Normalize Footer
  const rawFooter = (data.footer && typeof data.footer === "object" ? data.footer : {}) as Partial<Footer & { businessName?: string }>;
  const footer: Footer & { businessName?: string } = {
    businessName: sanitizeString(rawFooter.businessName) || brand.name,
    copyright:
      typeof rawFooter.copyright === "string" && rawFooter.copyright.trim()
        ? rawFooter.copyright
        : `© ${new Date().getFullYear()} ${brand.name}. All Rights Reserved.`,
  };

  // 8. Normalize Section Order
  let sectionOrder: string[] = [];
  if (Array.isArray(data.sectionOrder) && data.sectionOrder.length > 0) {
    sectionOrder = data.sectionOrder.filter((k: any): k is string => typeof k === "string" && Boolean(k.trim()));
  } else {
    sectionOrder = [...(strategy.sectionSequence || DEFAULT_ORDER)];
  }

  const result: NormalizedWebsiteData = {
    ...data,
    businessName: brand.name,
    brand,
    navbar,
    hero,
    about,
    services,
    features,
    faq,
    contact,
    footer,
    sectionOrder,
    designStrategy: strategy,
    skillExecutionPlan: data.skillExecutionPlan || strategy.skillExecutionPlan,
  };

  return result;
}
