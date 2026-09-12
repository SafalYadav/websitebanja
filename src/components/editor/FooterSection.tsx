"use client";

import { Sparkles } from "lucide-react";
import EditableElement from "@/components/editor/EditableElement";
import type { Footer } from "@/types/website";

import { useGeneratedWebsiteStore } from "@/store/generatedWebsiteStore";

interface FooterSectionProps {
  sectionKey?: string;
  footer?: (Footer & { businessName?: string }) | null;
  businessName?: string | null;
  brand?: { name?: string; shortName?: string; tagline?: string; description?: string } | null;
  navbarLogoText?: string | null;
  heroTitle?: string | null;
  heroSubtitle?: string | null;
}

export default function FooterSection({
  sectionKey = "footer",
  footer,
  businessName,
  brand,
  navbarLogoText,
  heroTitle,
  heroSubtitle,
}: FooterSectionProps) {
  const currentYear = new Date().getFullYear();
  const website = useGeneratedWebsiteStore((state) => state.website);
  
  const safeCopyright =
    typeof footer?.copyright === "string" && footer.copyright.trim()
      ? footer.copyright
      : `© ${currentYear} All Rights Reserved.`;

  const brandName =
    (typeof footer?.businessName === "string" && footer.businessName.trim() ? footer.businessName.trim() : null) ||
    (typeof businessName === "string" && businessName.trim() ? businessName.trim() : null) ||
    (typeof brand?.name === "string" && brand.name.trim() ? brand.name.trim() : null) ||
    (typeof navbarLogoText === "string" && navbarLogoText.trim() ? navbarLogoText.trim() : null) ||
    (typeof website?.navbar?.logo?.text === "string" && website.navbar.logo.text.trim()) ||
    (typeof (website as any)?.businessName === "string" && (website as any).businessName.trim()) ||
    (typeof heroTitle === "string" && heroTitle.trim() ? heroTitle.split("&")[0].trim() : null) ||
    (typeof website?.hero?.title === "string" ? website.hero.title.split("&")[0].trim() : "Brand");

  const brandDescription =
    (typeof brand?.description === "string" && brand.description.trim() ? brand.description.trim() : null) ||
    (typeof heroSubtitle === "string" && heroSubtitle.trim()
      ? (heroSubtitle.length > 120 ? `${heroSubtitle.slice(0, 117)}...` : heroSubtitle)
      : null) ||
    (typeof website?.hero?.subtitle === "string" && website.hero.subtitle.trim()
      ? (website.hero.subtitle.length > 120 ? `${website.hero.subtitle.slice(0, 117)}...` : website.hero.subtitle)
      : "Dedicated to superior craftsmanship, uncompromising quality, and client-first excellence.");

  return (
    <footer
      className="relative border-t py-16 px-6 sm:px-10 overflow-hidden"
      style={{
        backgroundColor: "var(--wb-bg)",
        borderColor: "var(--wb-border)",
      }}
    >
      {/* Subtle top glow line */}
      <div
        className="absolute top-0 left-1/4 right-1/4 h-[1px]"
        style={{
          background: "linear-gradient(90deg, transparent, var(--wb-primary), transparent)",
        }}
      />

      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 pb-12 border-b border-[var(--wb-border)]">
          {/* Brand & Mission Statement */}
          <div className="space-y-2 text-center md:text-left flex flex-col items-center md:items-start">
            {website?.navbar?.logo?.type === "image" && website.navbar.logo.imageUrl ? (
              <img src={website.navbar.logo.imageUrl} alt="Logo" className="h-8 max-w-[150px] object-contain mb-2" />
            ) : (
              <div className="flex items-center justify-center md:justify-start gap-2.5">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-xl font-bold text-white shadow-md text-xs"
                  style={{ background: "var(--wb-gradient-primary)" }}
                >
                  ✦
                </div>
                <span className="text-lg font-bold tracking-tight" style={{ color: "var(--wb-fg)" }}>
                  {brandName}
                </span>
              </div>
            )}
            <p className="text-xs max-w-sm leading-relaxed" style={{ color: "var(--wb-muted)" }}>
              {brandDescription}
            </p>
          </div>

          {/* Jump Navigation Anchors */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-semibold" style={{ color: "var(--wb-muted)" }}>
            <a href="#wb-section-hero" className="transition hover:text-[var(--wb-primary)]">
              Home
            </a>
            <a href="#wb-section-about" className="transition hover:text-[var(--wb-primary)]">
              About
            </a>
            <a href="#wb-section-services" className="transition hover:text-[var(--wb-primary)]">
              Services
            </a>
            <a href="#wb-section-features" className="transition hover:text-[var(--wb-primary)]">
              Features
            </a>
            <a href="#wb-section-faq" className="transition hover:text-[var(--wb-primary)]">
              FAQ
            </a>
            <a href="#contact" className="transition hover:text-[var(--wb-primary)]">
              Contact
            </a>
          </div>
        </div>

        {/* Bottom Credits & Legal Notice */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs" style={{ color: "var(--wb-muted)" }}>
          <EditableElement
            sectionKey={sectionKey}
            elementPath={`${sectionKey}.copyright`}
            elementType="paragraph"
            label="Copyright Text"
          >
            <p>{safeCopyright}</p>
          </EditableElement>

          <div
            className="flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-medium backdrop-blur-sm"
            style={{
              backgroundColor: "var(--wb-surface)",
              borderColor: "var(--wb-border)",
            }}
          >
            <Sparkles className="h-3 w-3 text-[var(--wb-primary)]" />
            <span>Crafted with WebsiteBanja AI</span>
          </div>
        </div>
      </div>
    </footer>
  );
}