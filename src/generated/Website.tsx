"use client";
import React from "react";
import GeneratedNavbar from "./Navbar";
import GeneratedHeroSection from "./HeroSection";
import GeneratedServicesSection from "./ServicesSection";
import GeneratedAboutSection from "./AboutSection";
import GeneratedFeaturesSection from "./FeaturesSection";
import GeneratedFAQSection from "./FAQSection";
import GeneratedContactSection from "./ContactSection";
import GeneratedFooterSection from "./FooterSection";
import GeneratedHeroGlow21st from "./HeroGlow21st";
import GeneratedBentoGrid21st from "./BentoGrid21st";
import GeneratedPricingTable21st from "./PricingTable21st";
import GeneratedAnimatedCta21st from "./AnimatedCta21st";

export default function GeneratedWebsite() {
  return (
    <main
      className="min-h-screen w-full transition-colors duration-300 relative"
      style={{
        backgroundColor: "#F8FAFC",
        color: "#1E293B",
        fontFamily: "Open Sans",
        "--wb-primary": "#6366F1",
        "--wb-secondary": "#38BDF8",
        "--wb-accent": "#EA580C",
        "--wb-bg": "#F8FAFC",
        "--wb-bg-alt": "#F1F5F9",
        "--wb-surface": "#FFFFFF",
        "--wb-surface-hover": "#FFFFFF",
        "--wb-card": "#FFFFFF",
        "--wb-card-fg": "#1E293B",
        "--wb-fg": "#1E293B",
        "--wb-muted": "#475569",
        "--wb-border": "#E2E8F0",
        "--wb-ring": "#2563EB",
        "--wb-destructive": "#DC2626",
        "--wb-glow-primary": "rgba(99, 102, 241, 0.18)",
        "--wb-glow-secondary": "rgba(56, 189, 248, 0.14)",
        "--wb-gradient-primary": "linear-gradient(135deg, #6366F1 0%, #38BDF8 100%)",
        "--wb-font-heading": "Poppins",
        "--wb-font-body": "Open Sans",
        "--wb-radius-default": "0.5rem",
        "--wb-radius-button": "0.5rem",
        "--wb-radius-card": "0.75rem",
        "--wb-shadow-subtle": "0 1px 2px rgba(0,0,0,0.05)",
        "--wb-shadow-medium": "0 4px 6px -1px rgba(0,0,0,0.1)",
        "--wb-shadow-prominent": "0 10px 15px -3px rgba(0,0,0,0.1)",
      } as React.CSSProperties}
    >
      <GeneratedNavbar />
      <GeneratedHeroSection />
      <GeneratedServicesSection />
      <GeneratedAboutSection />
      <GeneratedFeaturesSection />
      <GeneratedFAQSection />
      <GeneratedContactSection />
      <GeneratedFooterSection />
      <GeneratedHeroGlow21st />
      <GeneratedBentoGrid21st />
      <GeneratedPricingTable21st />
      <GeneratedAnimatedCta21st />
    </main>
  );
}
