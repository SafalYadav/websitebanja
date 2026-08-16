import { getCategoryImages } from "./categoryImages";
import type { WebsiteData, Hero, About, Service, Feature, FAQ, Contact, Footer } from "@/types/website";

export interface NormalizedWebsiteData {
  hero: Hero & { image?: string };
  about: About & { image?: string };
  services: Array<Service & { image?: string }>;
  features: Array<Feature & { image?: string }>;
  faq: FAQ[];
  contact: Contact;
  footer: Footer;
  sectionOrder: string[];
  navbar?: import("@/types/website").NavbarConfig;
  pages?: import("@/types/website").WebsitePage[];
  products?: import("@/types/website").ProductItem[];
  [key: string]: any;
}

const DEFAULT_ORDER = ["hero", "about", "services", "features", "faq", "contact", "footer"];

export function normalizeWebsiteData(
  raw: Partial<WebsiteData> | null | undefined,
  category?: string | null,
  businessName?: string | null,
  description?: string | null
): NormalizedWebsiteData {
  const data = raw || {};
  const images = getCategoryImages(category, businessName, description);

  // 1. Normalize Hero
  const rawHero = (data.hero && typeof data.hero === "object" ? data.hero : {}) as Partial<Hero>;
  const hero: Hero & { image?: string } = {
    title: typeof rawHero.title === "string" && rawHero.title.trim() ? rawHero.title : "Crafting Excellence For Modern Clients",
    subtitle:
      typeof rawHero.subtitle === "string" && rawHero.subtitle.trim()
        ? rawHero.subtitle
        : "Discover tailored solutions, superior craftsmanship, and dedicated service designed to accelerate your growth.",
    button: typeof rawHero.button === "string" && rawHero.button.trim() ? rawHero.button : "Explore Services",
    image: images.hero,
  };

  // 2. Normalize About
  const rawAbout = (data.about && typeof data.about === "object" ? data.about : {}) as Partial<About>;
  const about: About & { image?: string } = {
    title: typeof rawAbout.title === "string" && rawAbout.title.trim() ? rawAbout.title : "Driven by Passion & Commitment",
    content:
      typeof rawAbout.content === "string" && rawAbout.content.trim()
        ? rawAbout.content
        : "We are a dedicated team committed to delivering exceptional experiences that empower our clients to succeed with confidence.",
    image: images.about,
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
      image: images.services[idx % images.services.length],
    }));

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
      image: images.features[idx % images.features.length],
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
    phone: typeof rawContact.phone === "string" ? rawContact.phone : "",
    email: typeof rawContact.email === "string" ? rawContact.email : "",
    address: typeof rawContact.address === "string" ? rawContact.address : "",
  };

  // 7. Normalize Footer
  const rawFooter = (data.footer && typeof data.footer === "object" ? data.footer : {}) as Partial<Footer>;
  const footer: Footer = {
    copyright:
      typeof rawFooter.copyright === "string" && rawFooter.copyright.trim()
        ? rawFooter.copyright
        : `© ${new Date().getFullYear()} All Rights Reserved.`,
  };

  // 8. Normalize Section Order
  let sectionOrder: string[] = [];
  if (Array.isArray(data.sectionOrder) && data.sectionOrder.length > 0) {
    sectionOrder = data.sectionOrder.filter((k): k is string => typeof k === "string" && Boolean(k.trim()));
  } else {
    sectionOrder = [...DEFAULT_ORDER];
  }

  const result: NormalizedWebsiteData = {
    ...data,
    hero,
    about,
    services,
    features,
    faq,
    contact,
    footer,
    sectionOrder,
  };

  return result;
}
