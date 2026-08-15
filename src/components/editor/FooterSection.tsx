"use client";

import { Sparkles } from "lucide-react";
import type { Footer } from "@/types/website";

interface FooterSectionProps {
  footer?: Footer | null;
}

export default function FooterSection({ footer }: FooterSectionProps) {
  const currentYear = new Date().getFullYear();
  const safeCopyright =
    typeof footer?.copyright === "string" && footer.copyright.trim()
      ? footer.copyright
      : `© ${currentYear} All Rights Reserved.`;

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
          <div className="space-y-2 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2.5">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-xl font-bold text-white shadow-md text-xs"
                style={{ background: "var(--wb-gradient-primary)" }}
              >
                ✦
              </div>
              <span className="text-lg font-bold tracking-tight" style={{ color: "var(--wb-fg)" }}>
                Digital Excellence
              </span>
            </div>
            <p className="text-xs max-w-xs" style={{ color: "var(--wb-muted)" }}>
              Empowering ambitious brands with state-of-the-art digital experiences and lasting impact.
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
          <p>{safeCopyright}</p>

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