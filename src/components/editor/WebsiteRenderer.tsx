"use client";

import { useBuilderStore } from "@/store/builderStore";
import { useGeneratedWebsiteStore } from "@/store/generatedWebsiteStore";
import { resolveWebsiteTheme } from "@/lib/websiteTheme";
import { normalizeWebsiteData } from "@/lib/normalizeWebsite";
import { cn } from "@/lib/utils";

// Import Section components
import HeroSection from "./HeroSection";
import AboutSection from "./AboutSection";
import ServicesSection from "./ServicesSection";
import FeaturesSection from "./FeaturesSection";
import FAQSection from "./FAQSection";
import ContactSection from "./ContactSection";
import FooterSection from "./FooterSection";

import { MessageCircle } from "lucide-react";

import type { WebsiteData, Hero, About, Service, Feature, FAQ, Contact, Footer } from "@/types/website";

const SECTION_LABELS: Record<string, string> = {
  hero: "Hero Section",
  about: "About Section",
  services: "Services Section",
  features: "Features Grid",
  faq: "FAQ Accordion",
  contact: "Contact Details",
  footer: "Footer Section",
};

interface WebsiteRendererProps {
  data?: WebsiteData;
  pColor?: string | null;
  sColor?: string | null;
  brandStyle?: string | null;
  category?: string | null;
  businessName?: string | null;
  isPublic?: boolean;
}

export default function WebsiteRenderer({
  data,
  pColor,
  sColor,
  brandStyle,
  category,
  businessName,
  isPublic = false,
}: WebsiteRendererProps) {
  const storeWebsite = useGeneratedWebsiteStore((state) => state.website);
  const storePrimaryColor = useBuilderStore((state) => state.primaryColor);
  const storeSecondaryColor = useBuilderStore((state) => state.secondaryColor);
  const storeStyle = useBuilderStore((state) => state.style);
  const storeCategory = useBuilderStore((state) => state.category);
  const storeBusinessName = useBuilderStore((state) => state.businessName);
  const storeWhatsappNumber = useBuilderStore((state) => state.whatsappNumber);
  const storePhone = useBuilderStore((state) => state.phone);
  const storeWhatsappMessage = useBuilderStore((state) => state.whatsappMessage);
  const storeWhatsappEnabled = useBuilderStore((state) => state.whatsappEnabled);
  const selectedSection = useGeneratedWebsiteStore((state) => state.selectedSection);
  const setSelectedSection = useGeneratedWebsiteStore((state) => state.setSelectedSection);
  const isPreviewMode = useGeneratedWebsiteStore((state) => state.isPreviewMode);

  const rawWebsite = data || storeWebsite;
  const primaryColor = pColor !== undefined ? pColor : storePrimaryColor;
  const secondaryColor = sColor !== undefined ? sColor : storeSecondaryColor;
  const resolvedStyle = brandStyle !== undefined ? brandStyle : storeStyle;
  const resolvedCategory = category !== undefined ? category : storeCategory;
  const resolvedBusinessName = businessName !== undefined ? businessName : storeBusinessName;

  // 1. Resolve isolated website theme tokens (strictly isolated from editor UI theme)
  const theme = resolveWebsiteTheme({
    style: resolvedStyle,
    primaryColor,
    secondaryColor,
    category: resolvedCategory,
    businessName: resolvedBusinessName,
  });

  // 2. Safely normalize all website data and imagery
  const website = normalizeWebsiteData(rawWebsite, resolvedCategory, resolvedBusinessName);

  if (!rawWebsite && !website) {
    return (
      <div className="flex h-96 w-full items-center justify-center text-zinc-500 font-medium">
        No website content available.
      </div>
    );
  }

  const isInteractiveStudio = !isPublic && !isPreviewMode;

  return (
    <div
      className="wb-website-root min-h-full w-full transition-colors duration-300"
      style={{
        backgroundColor: theme.bg,
        color: theme.fg,
        fontFamily: theme.fontFamily,
        "--wb-primary": theme.primary,
        "--wb-secondary": theme.secondary,
        "--wb-accent": theme.accent,
        "--wb-bg": theme.bg,
        "--wb-bg-alt": theme.bgAlt,
        "--wb-surface": theme.surface,
        "--wb-surface-hover": theme.surfaceHover,
        "--wb-fg": theme.fg,
        "--wb-muted": theme.muted,
        "--wb-border": theme.border,
        "--wb-glow-primary": theme.glowPrimary,
        "--wb-glow-secondary": theme.glowSecondary,
        "--wb-gradient-primary": theme.gradientPrimary,
        "--wb-gradient-secondary": theme.gradientSecondary,
        "--wb-gradient-text": theme.gradientText,
        "--wb-gradient-hero": theme.gradientHeroOverlay,
      } as React.CSSProperties}
    >
      {(website.sectionOrder || []).map((key) => {
        const rawSectionData = (rawWebsite as Record<string, unknown> | null | undefined)?.[key] ?? (website as Record<string, unknown>)[key];
        const baseType = key.split("_")[0];
        const isSelected = isInteractiveStudio && selectedSection === key;
        const label = SECTION_LABELS[baseType] || baseType;

        let content = null;
        switch (baseType) {
          case "hero": {
            const heroData = (rawSectionData && typeof rawSectionData === "object" ? rawSectionData : website.hero) as Hero & { image?: string };
            content = <HeroSection {...heroData} image={heroData.image || website.hero.image} />;
            break;
          }
          case "about": {
            const aboutData = (rawSectionData && typeof rawSectionData === "object" ? rawSectionData : website.about) as About & { image?: string };
            content = <AboutSection {...aboutData} image={aboutData.image || website.about.image} />;
            break;
          }
          case "services": {
            let servicesData: Service[] = [];
            if (Array.isArray(rawSectionData)) {
              servicesData = rawSectionData;
            } else if (rawSectionData && typeof rawSectionData === "object") {
              const vals = Object.values(rawSectionData).filter((v): v is Service => Boolean(v && typeof v === "object" && "title" in v));
              servicesData = vals.length > 0 ? vals : website.services;
            } else {
              servicesData = website.services;
            }
            content = <ServicesSection services={servicesData} />;
            break;
          }
          case "features": {
            let featuresData: Feature[] = [];
            if (Array.isArray(rawSectionData)) {
              featuresData = rawSectionData;
            } else if (rawSectionData && typeof rawSectionData === "object") {
              const vals = Object.values(rawSectionData).filter((v): v is Feature => Boolean(v && typeof v === "object" && "title" in v));
              featuresData = vals.length > 0 ? vals : website.features;
            } else {
              featuresData = website.features;
            }
            content = <FeaturesSection features={featuresData} />;
            break;
          }
          case "faq": {
            let faqData: FAQ[] = [];
            if (Array.isArray(rawSectionData)) {
              faqData = rawSectionData;
            } else if (rawSectionData && typeof rawSectionData === "object") {
              const vals = Object.values(rawSectionData).filter((v): v is FAQ => Boolean(v && typeof v === "object" && "question" in v));
              faqData = vals.length > 0 ? vals : website.faq;
            } else {
              faqData = website.faq;
            }
            content = <FAQSection faq={faqData} />;
            break;
          }
          case "contact": {
            const contactData = (rawSectionData && typeof rawSectionData === "object" ? rawSectionData : website.contact) as Contact;
            content = <ContactSection contact={contactData} />;
            break;
          }
          case "footer": {
            const footerData = (rawSectionData && typeof rawSectionData === "object" ? rawSectionData : website.footer) as Footer;
            content = <FooterSection footer={footerData} />;
            break;
          }
          default:
            content = null;
        }

        if (!isInteractiveStudio) {
          return (
            <div key={key} id={`wb-section-${key}`}>
              {content}
            </div>
          );
        }

        return (
          <div
            key={key}
            id={`wb-section-${key}`}
            onClick={() => setSelectedSection(key)}
            className={cn(
              "group/section relative transition-all duration-150 cursor-pointer scroll-mt-6",
              isSelected
                ? "ring-2 ring-violet-500 ring-offset-4 ring-offset-black/60 shadow-2xl"
                : "hover:ring-1 hover:ring-violet-400/40"
            )}
          >
            {/* Floating Section Chip */}
            <div
              className={cn(
                "absolute top-3 left-4 z-30 flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold shadow-xl transition-all duration-150 backdrop-blur-md",
                isSelected
                  ? "bg-violet-600 text-white opacity-100 scale-100 ring-2 ring-white/20"
                  : "bg-black/80 text-zinc-300 border border-white/10 opacity-0 group-hover/section:opacity-100 scale-95 group-hover/section:scale-100"
              )}
            >
              <span className="capitalize">{label}</span>
              <span className="text-zinc-400 font-normal">
                {isSelected ? "• Active" : "• Click to edit"}
              </span>
            </div>

            {content}
          </div>
        );
      })}

      {/* Floating WhatsApp Quick Action Button */}
      {storeWhatsappEnabled && (storeWhatsappNumber || storePhone) && (
        <a
          href={`https://wa.me/${(storeWhatsappNumber || storePhone).replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
            storeWhatsappMessage || "Hi, I would like to know more about your services."
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            if (isInteractiveStudio) {
              e.preventDefault();
            }
          }}
          className="fixed bottom-20 lg:bottom-6 right-4 sm:right-6 z-40 flex items-center gap-2 sm:gap-2.5 rounded-full bg-emerald-500 px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-bold text-white shadow-xl shadow-emerald-500/30 transition-all hover:bg-emerald-600 hover:scale-105 active:scale-95 group select-none"
        >
          <MessageCircle className="h-4 sm:h-5 w-4 sm:w-5 animate-pulse" />
          <span className="hidden sm:inline font-semibold">Chat on WhatsApp</span>
        </a>
      )}
    </div>
  );
}
