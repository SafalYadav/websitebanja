"use client";

import React from "react";
import Link from "next/link";
import { useBuilderStore } from "@/store/builderStore";
import { useGeneratedWebsiteStore } from "@/store/generatedWebsiteStore";
import { resolveWebsiteTheme } from "@/lib/websiteTheme";
import { normalizeWebsiteData } from "@/lib/normalizeWebsite";
import { cn } from "@/lib/utils";
import { WebsiteUIContext } from "@/contexts/WebsiteUIContext";

// Import Section components
import HeroSection from "./HeroSection";
import AboutSection from "./AboutSection";
import ServicesSection from "./ServicesSection";
import FeaturesSection from "./FeaturesSection";
import ProductsSection from "./ProductsSection";
import FAQSection from "./FAQSection";
import ContactSection from "./ContactSection";
import FooterSection from "./FooterSection";

import { MessageCircle, Globe } from "lucide-react";

import type {
  WebsiteData,
  Hero,
  About,
  Service,
  Feature,
  FAQ,
  Contact,
  Footer,
  ProductsSectionData,
  WebsitePage,
} from "@/types/website";

const SECTION_LABELS: Record<string, string> = {
  hero: "Hero Section",
  about: "About Story",
  services: "Services Section",
  features: "Features Grid",
  products: "Product Catalog",
  catalog: "Product Catalog",
  faq: "FAQ Accordion",
  contact: "Contact Details",
  footer: "Footer Section",
};

import type { CatalogItem } from "@/lib/catalog";

interface WebsiteRendererProps {
  data?: WebsiteData;
  catalogItems?: CatalogItem[];
  pColor?: string | null;
  sColor?: string | null;
  brandStyle?: string | null;
  category?: string | null;
  businessName?: string | null;
  isPublic?: boolean;
  activePageSlug?: string;
  publicSlug?: string;
  whatsappNumber?: string | null;
  phone?: string | null;
  whatsappMessage?: string | null;
  whatsappEnabled?: boolean | null;
}

export default function WebsiteRenderer({
  data,
  catalogItems,
  pColor,
  sColor,
  brandStyle,
  category,
  businessName,
  isPublic = false,
  activePageSlug,
  publicSlug,
  whatsappNumber,
  phone,
  whatsappMessage,
  whatsappEnabled,
}: WebsiteRendererProps) {
  const storeWebsite = useGeneratedWebsiteStore((state) => state.website);
  const projectId = useBuilderStore((state) => state.projectId);
  const storePrimaryColor = useBuilderStore((state) => state.primaryColor);
  const storeSecondaryColor = useBuilderStore((state) => state.secondaryColor);
  const storeStyle = useBuilderStore((state) => state.style);
  const storeCategory = useBuilderStore((state) => state.category);
  const storeBusinessName = useBuilderStore((state) => state.businessName);
  const storeWhatsappNumber = useBuilderStore((state) => state.whatsappNumber);
  const storePhone = useBuilderStore((state) => state.phone);
  const storeWhatsappMessage = useBuilderStore((state) => state.whatsappMessage);
  const storeWhatsappEnabled = useBuilderStore((state) => state.whatsappEnabled);

  const resolvedWhatsappNumber = isPublic ? (whatsappNumber ?? "") : storeWhatsappNumber;
  const resolvedPhone = isPublic ? (phone ?? "") : storePhone;
  const resolvedWhatsappMessage = isPublic ? (whatsappMessage ?? "") : storeWhatsappMessage;
  const resolvedWhatsappEnabled = isPublic ? (whatsappEnabled ?? false) : storeWhatsappEnabled;
  const selectedSection = useGeneratedWebsiteStore((state) => state.selectedSection);
  const setSelectedSection = useGeneratedWebsiteStore((state) => state.setSelectedSection);
  const setSelectedElement = useGeneratedWebsiteStore((state) => state.setSelectedElement);
  const isPreviewMode = useGeneratedWebsiteStore((state) => state.isPreviewMode);
  const activePageId = useGeneratedWebsiteStore((state) => state.activePageId);
  const setActivePage = useGeneratedWebsiteStore((state) => state.setActivePage);
  const catalogVersion = useGeneratedWebsiteStore((state) => state.catalogVersion);
  const [fetchedCatalog, setFetchedCatalog] = React.useState<CatalogItem[]>([]);

  React.useEffect(() => {
    let isCancelled = false;
    if (!isPublic && projectId && !catalogItems) {
      setFetchedCatalog([]); // Prevent stale catalog from previous project
      import("@/lib/catalog").then((mod) => {
        mod.getCatalogItems(projectId).then(({ data }) => {
          if (!isCancelled && data) setFetchedCatalog(data);
        });
      });
    }
    return () => {
      isCancelled = true;
    };
  }, [isPublic, projectId, catalogItems, catalogVersion]);

  const finalCatalogItems = catalogItems || fetchedCatalog;

  const rawWebsite = isPublic ? data : (data || storeWebsite);
  const primaryColor = isPublic ? (pColor ?? null) : (pColor !== undefined ? pColor : storePrimaryColor);
  const secondaryColor = isPublic ? (sColor ?? null) : (sColor !== undefined ? sColor : storeSecondaryColor);
  const resolvedStyle = isPublic ? (brandStyle ?? null) : (brandStyle !== undefined ? brandStyle : storeStyle);
  const resolvedCategory = isPublic ? (category ?? null) : (category !== undefined ? category : storeCategory);
  const resolvedBusinessName = isPublic ? (businessName ?? null) : (businessName !== undefined ? businessName : storeBusinessName);

  // 1. Resolve isolated website theme tokens
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

  // Determine active page & section order
  const pages: WebsitePage[] = Array.isArray(rawWebsite?.pages) && rawWebsite.pages.length > 0
    ? rawWebsite.pages
    : [
        {
          id: "home",
          slug: "",
          title: "Home",
          isHome: true,
          sectionOrder: rawWebsite?.sectionOrder || website.sectionOrder || ["hero", "about", "services", "contact", "footer"],
        },
      ];

  let activePage: WebsitePage = pages[0];
  if (activePageSlug !== undefined) {
    activePage = pages.find((p) => p.slug === activePageSlug) || pages[0];
  } else if (!isPublic && activePageId) {
    activePage = pages.find((p) => p.id === activePageId) || pages[0];
  }

  const activeSectionOrder = activePage?.sectionOrder || website.sectionOrder || [];

  const handleSwitchPage = (slug: string) => {
    if (!setActivePage) return;
    // target can be empty string for home page
    const targetPage = pages.find((p) => p.slug === slug || (slug === "home" && p.isHome));
    if (targetPage) {
      setActivePage(targetPage.id);
    }
  };

  return (
    <WebsiteUIContext.Provider value={{ publicSlug, onSwitchPage: !isPublic ? handleSwitchPage : undefined }}>
      <div
        className="wb-website-root min-h-full w-full transition-colors duration-300 relative"
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
      {/* Global Navigation Bar */}
      <nav
        className="sticky top-0 z-30 w-full backdrop-blur-xl border-b transition-colors px-4 sm:px-8 py-3 flex items-center justify-between"
        style={{
          backgroundColor: `${theme.surface}e6`,
          borderColor: theme.border,
        }}
      >
        <div
          className={cn("flex items-center gap-2", isInteractiveStudio && "cursor-pointer hover:opacity-80 ring-offset-4 ring-offset-transparent hover:ring-2 ring-violet-500 rounded p-1 -ml-1")}
          onClick={() => {
            if (isInteractiveStudio) {
              setSelectedSection("navbar");
              setSelectedElement({
                sectionKey: "navbar",
                elementPath: "navbar.logo",
                elementType: "logo",
              });
            }
          }}
        >
          {website?.navbar?.logo?.type === "image" && website?.navbar?.logo?.imageUrl ? (
            <img src={website?.navbar?.logo?.imageUrl} alt="Logo" className="h-8 max-w-[150px] object-contain" />
          ) : (
            <>
              <Globe className="h-4 w-4" style={{ color: theme.primary }} />
              <span className="font-extrabold text-xs sm:text-sm tracking-tight" style={{ color: theme.fg }}>
                {website?.navbar?.logo?.text || resolvedBusinessName || "Website"}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          {(website?.navbar?.links && website?.navbar?.links?.length > 0 ? website?.navbar?.links : pages.map(p => ({
            id: p.id,
            label: p.title,
            action: { type: "page" as const, target: p.slug }
          }))).map((link) => {
            const isPageActive = link.action.type === "page" && (link.action.target === activePage.slug || (!link.action.target && activePage.isHome));
            
            if (isPublic && publicSlug) {
              const href = link.action.type === "page" 
                ? (link.action.target ? `/p/${publicSlug}/${link.action.target}` : `/p/${publicSlug}`)
                : "#";
                
              return (
                <Link
                  key={link.id}
                  href={href}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs font-bold transition",
                    isPageActive ? "shadow-xs" : "opacity-70 hover:opacity-100"
                  )}
                  style={{
                    backgroundColor: isPageActive ? theme.primary : "transparent",
                    color: isPageActive ? "#ffffff" : theme.fg,
                  }}
                >
                  {link.label}
                </Link>
              );
            }

            return (
              <button
                key={link.id}
                type="button"
                onClick={() => {
                  if (link.action.type === "page") {
                    const targetPage = pages.find(p => p.slug === link.action.target || (p.isHome && !link.action.target));
                    if (targetPage) setActivePage(targetPage.id);
                  }
                }}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer",
                  isPageActive ? "shadow-xs" : "opacity-70 hover:opacity-100"
                )}
                style={{
                  backgroundColor: isPageActive ? theme.primary : "transparent",
                  color: isPageActive ? "#ffffff" : theme.fg,
                }}
              >
                {link.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Render Active Page Sections */}
      {activeSectionOrder.map((key) => {
        const rawSectionData = (rawWebsite as Record<string, unknown> | null | undefined)?.[key] ?? (website as Record<string, unknown>)[key];
        const baseType = key.split("_")[0];
        const isSelected = isInteractiveStudio && selectedSection === key;
        const label = SECTION_LABELS[baseType] || baseType;

        let content = null;
        switch (baseType) {
          case "hero": {
            const heroData = (rawSectionData && typeof rawSectionData === "object" ? rawSectionData : website.hero) as Hero & { image?: string };
            content = <HeroSection sectionKey={key} {...heroData} image={heroData.image || website.hero.image} />;
            break;
          }
          case "about": {
            const aboutData = (rawSectionData && typeof rawSectionData === "object" ? rawSectionData : website.about) as About & { image?: string };
            content = <AboutSection sectionKey={key} {...aboutData} image={aboutData.image || website.about.image} />;
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
            content = <ServicesSection sectionKey={key} services={servicesData} />;
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
            content = <FeaturesSection sectionKey={key} features={featuresData} />;
            break;
          }
          case "products":
          case "catalog": {
            const productsData = (rawSectionData || website.productsSection) as ProductsSectionData;
            content = (
              <ProductsSection
                sectionKey={key}
                data={productsData}
                catalogItems={finalCatalogItems}
                whatsappNumber={resolvedWhatsappNumber || resolvedPhone}
                isPublic={isPublic}
              />
            );
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
            content = <FAQSection sectionKey={key} faq={faqData} />;
            break;
          }
          case "contact": {
            const contactData = (rawSectionData && typeof rawSectionData === "object" ? rawSectionData : website.contact) as Contact;
            content = <ContactSection sectionKey={key} contact={contactData} />;
            break;
          }
          case "footer": {
            const footerData = (rawSectionData && typeof rawSectionData === "object" ? rawSectionData : website.footer) as Footer;
            content = <FooterSection sectionKey={key} footer={footerData} />;
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
      {resolvedWhatsappEnabled && (resolvedWhatsappNumber || resolvedPhone) && (
        <a
          href={`https://wa.me/${(resolvedWhatsappNumber || resolvedPhone).replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
            resolvedWhatsappMessage || "Hi, I would like to know more about your services."
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
    </WebsiteUIContext.Provider>
  );
}
