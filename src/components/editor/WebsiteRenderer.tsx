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
import ProcessSection from "./ProcessSection";
import ReviewsSection from "./ReviewsSection";

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
  signature_dishes: "Chef's Signature Dishes",
  atmosphere_story: "Atmosphere & Heritage",
  menu: "Artisanal Menu",
  gallery: "Visual Gallery",
  trust_proof: "Clinical Trust & Standards",
  doctor_clinic: "Doctors & Clinical Team",
  treatment_process: "Treatment Experience",
  workflow_steps: "Platform Workflow",
  selected_works: "Selected Architecture",
  project_details: "Project Blueprint",
  curated_collection: "Curated Collection",
  craft_heritage: "Atelier Craft & Heritage",
  emergency_services: "24/7 Emergency Response",
  trust_guarantees: "Guarantees & Licensure",
  service_area: "Service Radius",
  selected_cases: "Selected Case Studies",
  creative_capabilities: "Creative Capabilities",
  awards_metrics: "Awards & Recognition",
  reviews: "Verified Client Reviews",
  pricing: "Pricing & Plans",
  reservation: "Table Reservation",
  booking: "Appointment Booking",
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
  const [fetchedCatalogData, setFetchedCatalogData] = React.useState<{ projectId: string; items: CatalogItem[] } | null>(null);
  const fetchedCatalog = (fetchedCatalogData && fetchedCatalogData.projectId === projectId) ? fetchedCatalogData.items : [];

  React.useEffect(() => {
    let isCancelled = false;
    if (!isPublic && projectId && !catalogItems) {
      import("@/lib/catalog").then((mod) => {
        mod.getCatalogItems(projectId).then(({ data }) => {
          if (!isCancelled && data) {
            setFetchedCatalogData({ projectId, items: data });
          }
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
  const rawCategory = isPublic ? (category ?? null) : (category !== undefined ? category : storeCategory);
  const resolvedCategory =
    (typeof rawCategory === "string" && rawCategory.trim() ? rawCategory : null) ||
    (typeof (rawWebsite as any)?.brand?.industry === "string" && (rawWebsite as any).brand.industry.trim() ? (rawWebsite as any).brand.industry : null) ||
    (typeof (rawWebsite as any)?.category === "string" && (rawWebsite as any).category.trim() ? (rawWebsite as any).category : null) ||
    (typeof storeCategory === "string" && storeCategory.trim() ? storeCategory : null) ||
    (() => {
      const text = [
        (rawWebsite as any)?.brand?.description || "",
        (rawWebsite as any)?.hero?.title || "",
        (rawWebsite as any)?.hero?.subtitle || "",
        (rawWebsite as any)?.about?.content || "",
      ].join(" ").toLowerCase();

      if (text.includes("ceramic") || text.includes("pottery") || text.includes("tableware") || text.includes("stoneware")) return "Ceramics E-commerce";
      if (text.includes("dent") || text.includes("orthodont") || text.includes("oral health")) return "Dental Clinic";
      if (text.includes("architect") || text.includes("interior design") || text.includes("spatial")) return "Architecture Studio";
      if (text.includes("restaurant") || text.includes("cafe") || text.includes("coffee") || text.includes("dining") || text.includes("bistro")) return "Restaurant & Cafe";
      if (text.includes("couture") || (text.includes("fashion") && !text.includes("agency"))) return "Luxury Fashion";
      if (text.includes("saas") || text.includes("software") || text.includes("ai platform") || text.includes("pipeline")) return "SaaS & Technology";
      if (text.includes("electric") || text.includes("plumb") || text.includes("locksmith") || text.includes("hvac")) return "Local Service Business";
      if (text.includes("agency") || text.includes("branding") || text.includes("creative studio")) return "Creative Agency";

      const arch = (rawWebsite as any)?.designStrategy?.visualArchetype;
      if (arch === "clean_clinical") return "Dental Clinic";
      if (arch === "dark_technical") return "SaaS & Technology";
      if (arch === "high_trust_service") return "Local Service Business";
      return null;
    })();

  const rawBusinessName = isPublic ? (businessName ?? null) : (businessName !== undefined ? businessName : storeBusinessName);
  const resolvedBusinessName =
    (typeof rawBusinessName === "string" && rawBusinessName.trim() ? rawBusinessName : null) ||
    (typeof (rawWebsite as any)?.brand?.name === "string" && (rawWebsite as any).brand.name.trim() ? (rawWebsite as any).brand.name : null) ||
    (typeof (rawWebsite as any)?.businessName === "string" && (rawWebsite as any).businessName.trim() ? (rawWebsite as any).businessName : null) ||
    (typeof (rawWebsite as any)?.name === "string" && (rawWebsite as any).name.trim() ? (rawWebsite as any).name : null) ||
    (typeof storeBusinessName === "string" && storeBusinessName.trim() ? storeBusinessName : null) ||
    (typeof (rawWebsite as any)?.navbar?.logo?.text === "string" && (rawWebsite as any).navbar.logo.text.trim() ? (rawWebsite as any).navbar.logo.text : null) ||
    (typeof (rawWebsite as any)?.hero?.title === "string" ? (rawWebsite as any).hero.title.split("&")[0].trim() : null) ||
    "Brand";

  // 1. Safely normalize all website data and imagery
  const website = normalizeWebsiteData(rawWebsite, resolvedCategory, resolvedBusinessName);

  // 2. Resolve isolated website theme tokens with contrast verification
  const isDarkCanvas = Boolean(
    website?.designStrategy?.backgroundStrategy?.color?.startsWith("#0") ||
    website?.designStrategy?.backgroundStrategy?.color?.startsWith("#1") ||
    website?.designStrategy?.visualArchetype === "dark_technical"
  );
  const theme = resolveWebsiteTheme({
    style: resolvedStyle,
    primaryColor,
    secondaryColor,
    category: resolvedCategory,
    businessName: resolvedBusinessName,
    archetype: website?.designStrategy?.visualArchetype,
    colorMode: isDarkCanvas ? "dark" : "light",
  });

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

  const designatedAboutKey = activeSectionOrder.includes("about")
    ? "about"
    : activeSectionOrder.find((k) => {
        const raw = (rawWebsite as Record<string, unknown> | null | undefined)?.[k] ?? (website as Record<string, unknown>)[k];
        const isCustom = Boolean(raw && typeof raw === "object" && !Array.isArray(raw) && Object.keys(raw).length > 0 && (raw as any).title);
        const bType = k.split("_")[0];
        const isAboutMatch = k === "about" || k === "atmosphere_story" || k === "craft_heritage" || k === "doctor_clinic" || bType === "story" || bType === "heritage" || bType === "clinic";
        return isAboutMatch && !isCustom;
      });

  const designatedServicesKey = activeSectionOrder.includes("services")
    ? "services"
    : activeSectionOrder.find((k) => {
        const raw = (rawWebsite as Record<string, unknown> | null | undefined)?.[k] ?? (website as Record<string, unknown>)[k];
        const hasCustom = (Array.isArray(raw) && raw.length > 0) || (Boolean(raw) && typeof raw === "object" && !Array.isArray(raw) && Object.values(raw as Record<string, unknown>).some((v) => Boolean(v && typeof v === "object" && "title" in v)));
        const bType = k.split("_")[0];
        const isServicesMatch = k === "services" || k === "signature_dishes" || k === "menu" || k === "emergency_services" || k === "creative_capabilities" || k === "capabilities" || bType === "services" || bType === "menu" || bType === "emergency";
        return isServicesMatch && !hasCustom;
      });

  const designatedFeaturesKey = activeSectionOrder.includes("features")
    ? "features"
    : activeSectionOrder.find((k) => {
        const raw = (rawWebsite as Record<string, unknown> | null | undefined)?.[k] ?? (website as Record<string, unknown>)[k];
        const hasCustom = (Array.isArray(raw) && raw.length > 0) || (Boolean(raw) && typeof raw === "object" && !Array.isArray(raw) && Object.values(raw as Record<string, unknown>).some((v) => Boolean(v && typeof v === "object" && "title" in v)));
        const bType = k.split("_")[0];
        const isFeaturesMatch = k === "features" || k === "trust_proof" || k === "trust_guarantees" || k === "service_area" || k === "awards_metrics" || k === "selected_works" || k === "selected_cases" || k === "gallery" || k === "lookbook" || k === "pricing" || bType === "features" || bType === "trust" || bType === "awards" || bType === "selected" || bType === "gallery" || bType === "pricing";
        return isFeaturesMatch && !hasCustom;
      });

  const handleSwitchPage = (slug: string) => {
    if (!setActivePage) return;
    // target can be empty string for home page
    const targetPage = pages.find((p) => p.slug === slug || (slug === "home" && p.isHome));
    if (targetPage) {
      setActivePage(targetPage.id);
    }
  };

  return (
    <WebsiteUIContext.Provider value={{ publicSlug, onSwitchPage: !isPublic ? handleSwitchPage : undefined, isPublic }}>
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
      {/* Dynamic Background Texture Surfaces */}
      {(() => {
        const bgType = website.designStrategy?.backgroundStrategy?.type || (() => {
          const cat = (resolvedCategory || "").toLowerCase();
          if (cat.includes("restaurant") || cat.includes("cafe") || cat.includes("dining") || cat.includes("bistro")) return "warm_glow";
          if (cat.includes("dental") || cat.includes("clinic") || cat.includes("doctor") || cat.includes("medical")) return "clinical_calm";
          if (cat.includes("saas") || cat.includes("software") || cat.includes("ai") || cat.includes("tech")) return "tech_grid";
          if (cat.includes("fashion") || cat.includes("luxury") || cat.includes("atelier")) return "luxury_noir";
          return "subtle_grain";
        })();

        return (
          <>
            {bgType === "tech_grid" && (
              <>
                <div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(to_right,rgba(56,189,248,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(56,189,248,0.06)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_85%_65%_at_50%_30%,#000_65%,transparent_100%)]" />
                <div className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[760px] h-[360px] z-0 bg-gradient-to-b from-cyan-500/12 via-sky-500/6 to-transparent blur-3xl rounded-full" />
              </>
            )}
            {bgType === "dot_grid" && (
              <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(rgba(148,163,184,0.16)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_75%_65%_at_50%_30%,#000_70%,transparent_100%)]" />
            )}
            {bgType === "tonal_field" && (
              <div
                className="pointer-events-none fixed inset-0 z-0 opacity-35 blur-3xl"
                style={{
                  background: `radial-gradient(circle at 50% 20%, ${theme.glowPrimary || "var(--wb-primary)"}, transparent 70%)`,
                }}
              />
            )}
            {bgType === "warm_glow" && (
              <div
                className="pointer-events-none fixed inset-0 z-0 opacity-60 blur-3xl"
                style={{
                  background: "radial-gradient(ellipse 75% 45% at 50% -5%, rgba(245, 158, 11, 0.22), transparent 75%), radial-gradient(circle at 90% 65%, rgba(217, 119, 6, 0.15), transparent 60%)",
                }}
              />
            )}
            {bgType === "clinical_calm" && (
              <div
                className="pointer-events-none fixed inset-0 z-0"
                style={{
                  background: "radial-gradient(circle at 12% 15%, rgba(14, 165, 233, 0.12), transparent 55%), radial-gradient(circle at 88% 65%, rgba(16, 185, 129, 0.09), transparent 55%)",
                }}
              />
            )}
            {bgType === "luxury_noir" && (
              <div
                className="pointer-events-none fixed inset-0 z-0"
                style={{
                  background: "radial-gradient(circle at 50% 0%, rgba(212, 175, 55, 0.12), transparent 65%), radial-gradient(circle at 85% 85%, rgba(180, 140, 40, 0.06), transparent 50%)",
                }}
              />
            )}
            {bgType === "subtle_grain" && (
              <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(rgba(100,116,139,0.10)_1px,transparent_1px)] [background-size:16px_16px]" />
            )}
          </>
        );
      })()}

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
                {website?.navbar?.logo?.text || (website as any)?.brand?.name || resolvedBusinessName || "Website"}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          {(website?.navbar?.links && website?.navbar?.links?.length > 0 ? website?.navbar?.links : pages.map(p => ({
            id: p.id,
            label: p.title,
            action: { type: "page" as const, target: p.slug }
          }))).map((link: any) => {
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
        const label = SECTION_LABELS[key] || SECTION_LABELS[baseType] || key;

        let content = null;

        if (key === "hero" || baseType === "hero") {
          const heroData = (rawSectionData && typeof rawSectionData === "object" ? rawSectionData : website.hero) as Hero & { image?: string; imageFit?: any; imageFocalPoint?: string };
          content = (
            <HeroSection
              sectionKey={key}
              {...heroData}
              image={heroData.image || website.hero.image}
              imageFit={heroData.imageFit || (website.hero as any)?.imageFit}
              imageFocalPoint={heroData.imageFocalPoint || (website.hero as any)?.imageFocalPoint}
              heroBackground={heroData.heroBackground || website.designStrategy?.heroBackground}
              category={resolvedCategory || website.brand?.industry}
              visualArchetype={website.designStrategy?.visualArchetype}
            />
          );
        } else if (
          key === "about" ||
          key === "atmosphere_story" ||
          key === "doctor_clinic" ||
          key === "project_details" ||
          key === "craft_heritage" ||
          key === "studio_philosophy" ||
          key === "manifesto" ||
          baseType === "about"
        ) {
          const hasCustomAbout = Boolean(
            rawSectionData &&
            typeof rawSectionData === "object" &&
            !Array.isArray(rawSectionData) &&
            Object.keys(rawSectionData).length > 0 &&
            (rawSectionData as any).title
          );

          if (!hasCustomAbout) {
            if (key !== designatedAboutKey) {
              return null;
            }
          }

            const aboutData = (hasCustomAbout ? rawSectionData : website.about) as About & { image?: string; imageFit?: any; imageFocalPoint?: string };
            content = (
              <AboutSection
                sectionKey={key}
                {...aboutData}
                image={aboutData.image || website.about.image}
                imageFit={aboutData.imageFit || (website.about as any)?.imageFit}
                imageFocalPoint={aboutData.imageFocalPoint || (website.about as any)?.imageFocalPoint}
                badge={aboutData.badge}
                highlights={aboutData.highlights}
              />
            );
          } else if (
            key === "treatment_process" ||
            key === "workflow_steps" ||
            key === "process" ||
            key === "methodology" ||
            baseType === "process" ||
            baseType === "workflow" ||
            baseType === "treatment"
          ) {
            const processObj = (rawSectionData && typeof rawSectionData === "object" && !Array.isArray(rawSectionData)) ? (rawSectionData as Record<string, unknown>) : null;
            const stepsData = Array.isArray(rawSectionData)
              ? rawSectionData
              : (rawSectionData && typeof rawSectionData === "object" && "steps" in rawSectionData && Array.isArray((rawSectionData as any).steps))
              ? (rawSectionData as any).steps
              : null;
            content = (
              <ProcessSection
                sectionKey={key}
                steps={stepsData}
                category={resolvedCategory || undefined}
                title={typeof processObj?.title === "string" ? processObj.title : undefined}
                subtitle={typeof processObj?.subtitle === "string" ? processObj.subtitle : undefined}
                badge={typeof processObj?.badge === "string" ? processObj.badge : undefined}
              />
            );
          } else if (
            key === "reviews" ||
            key === "testimonials" ||
            key === "patient_reviews" ||
            key === "guest_reviews" ||
            baseType === "reviews" ||
            baseType === "testimonials"
          ) {
            const reviewsObj = (rawSectionData && typeof rawSectionData === "object" && !Array.isArray(rawSectionData)) ? (rawSectionData as Record<string, unknown>) : null;
            const reviewsData = Array.isArray(rawSectionData)
              ? rawSectionData
              : (rawSectionData && typeof rawSectionData === "object" && "reviews" in rawSectionData && Array.isArray((rawSectionData as any).reviews))
              ? (rawSectionData as any).reviews
              : (website as any).reviews || null;
            const sectionPlan = (website as any).skillExecutionPlan?.sections?.find(
              (s: any) => s.sectionType === key || s.sectionType === baseType
            );
            const resolvedCardFamily = (reviewsObj?.cardFamily as any) || sectionPlan?.cardFamily;
            content = (
              <ReviewsSection
                sectionKey={key}
                reviews={reviewsData}
                category={resolvedCategory || undefined}
                title={typeof reviewsObj?.title === "string" ? reviewsObj.title : undefined}
                subtitle={typeof reviewsObj?.subtitle === "string" ? reviewsObj.subtitle : undefined}
                badge={typeof reviewsObj?.badge === "string" ? reviewsObj.badge : undefined}
                cardFamily={resolvedCardFamily}
              />
            );
          } else if (
            key === "services" ||
            key === "signature_dishes" ||
            key === "menu" ||
            key === "emergency_services" ||
            key === "creative_capabilities" ||
            key === "capabilities" ||
            baseType === "services" ||
            baseType === "menu" ||
            baseType === "emergency"
          ) {
            let servicesData: Service[] = [];
            const sectionObj = (rawSectionData && typeof rawSectionData === "object" && !Array.isArray(rawSectionData)) ? (rawSectionData as Record<string, unknown>) : null;
            const hasCustomServices = Array.isArray(rawSectionData) && rawSectionData.length > 0;
            if (hasCustomServices) {
              servicesData = rawSectionData as Service[];
            } else if (rawSectionData && typeof rawSectionData === "object" && !Array.isArray(rawSectionData)) {
              const vals = Object.values(rawSectionData).filter((v): v is Service => Boolean(v && typeof v === "object" && "title" in v));
              servicesData = vals.length > 0 ? vals : website.services;
            } else {
              if (key !== designatedServicesKey) {
                return null;
              }
              servicesData = website.services;
            }
            const sectionPlan = (website as any).skillExecutionPlan?.sections?.find(
              (s: any) => s.sectionType === key || s.sectionType === baseType
            );
            const resolvedCardFamily = (sectionObj?.cardFamily as any) || sectionPlan?.cardFamily;
            content = (
              <ServicesSection
                sectionKey={key}
                services={servicesData}
                category={resolvedCategory || undefined}
                title={typeof sectionObj?.title === "string" ? sectionObj.title : undefined}
                subtitle={typeof sectionObj?.subtitle === "string" ? sectionObj.subtitle : undefined}
                badge={typeof sectionObj?.badge === "string" ? sectionObj.badge : undefined}
                cardTreatment={website.designStrategy?.cardTreatment}
                visualArchetype={website.designStrategy?.visualArchetype}
                cardFamily={resolvedCardFamily}
              />
            );
          } else if (
            key === "features" ||
            key === "trust_proof" ||
            key === "trust_guarantees" ||
            key === "service_area" ||
            key === "awards_metrics" ||
            key === "selected_works" ||
            key === "selected_cases" ||
            key === "gallery" ||
            key === "lookbook" ||
            key === "pricing" ||
            baseType === "features" ||
            baseType === "trust" ||
            baseType === "awards" ||
            baseType === "selected" ||
            baseType === "gallery" ||
            baseType === "pricing"
          ) {
            let featuresData: Feature[] = [];
            const sectionObj = (rawSectionData && typeof rawSectionData === "object" && !Array.isArray(rawSectionData)) ? (rawSectionData as Record<string, unknown>) : null;
            const hasCustomFeatures = Array.isArray(rawSectionData) && rawSectionData.length > 0;
            if (hasCustomFeatures) {
              featuresData = rawSectionData as Feature[];
            } else if (rawSectionData && typeof rawSectionData === "object" && !Array.isArray(rawSectionData)) {
              const vals = Object.values(rawSectionData).filter((v): v is Feature => Boolean(v && typeof v === "object" && "title" in v));
              featuresData = vals.length > 0 ? vals : website.features;
            } else {
              if (key !== designatedFeaturesKey) {
                return null;
              }
              featuresData = website.features;
            }
            const sectionPlan = (website as any).skillExecutionPlan?.sections?.find(
              (s: any) => s.sectionType === key || s.sectionType === baseType
            );
            const resolvedCardFamily = (sectionObj?.cardFamily as any) || sectionPlan?.cardFamily;
            content = (
              <FeaturesSection
                sectionKey={key}
                features={featuresData}
                category={resolvedCategory || undefined}
                title={typeof sectionObj?.title === "string" ? sectionObj.title : undefined}
                subtitle={typeof sectionObj?.subtitle === "string" ? sectionObj.subtitle : undefined}
                badge={typeof sectionObj?.badge === "string" ? sectionObj.badge : undefined}
                cardTreatment={website.designStrategy?.cardTreatment}
                visualArchetype={website.designStrategy?.visualArchetype}
                cardFamily={resolvedCardFamily}
              />
            );
          } else if (key === "products" || key === "catalog" || key === "curated_collection" || baseType === "products" || baseType === "catalog" || baseType === "curated") {
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
          } else if (key === "faq" || baseType === "faq") {
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
          } else if (key === "contact" || key === "reservation" || key === "booking" || baseType === "contact" || baseType === "reservation" || baseType === "booking") {
            const contactData = (rawSectionData && typeof rawSectionData === "object" ? rawSectionData : website.contact) as Contact;
            content = <ContactSection sectionKey={key} contact={contactData} />;
          } else if (key === "footer" || baseType === "footer") {
            const footerData = (rawSectionData && typeof rawSectionData === "object" ? rawSectionData : website.footer) as Footer;
            content = (
              <FooterSection
                sectionKey={key}
                footer={footerData}
                businessName={resolvedBusinessName}
                brand={(website as any)?.brand}
                navbarLogoText={website?.navbar?.logo?.text}
                heroTitle={website?.hero?.title}
                heroSubtitle={website?.hero?.subtitle}
              />
            );
          } else {
            content = null;
          }

          if (!content) return null;

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
