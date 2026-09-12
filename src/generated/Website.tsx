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

export default function GeneratedWebsite() {
  return (
    <main
      className="min-h-screen w-full transition-colors duration-300 relative"
      style={{
        backgroundColor: "#EEF2FF",
        color: "#1E1B4B",
        fontFamily: "Inter",
        "--wb-primary": "#DC2626",
        "--wb-secondary": "#EA580C",
        "--wb-accent": "#EA580C",
        "--wb-bg": "#EEF2FF",
        "--wb-bg-alt": "#F1F5F9",
        "--wb-surface": "#FFFFFF",
        "--wb-surface-hover": "#FFFFFF",
        "--wb-card": "#FFFFFF",
        "--wb-card-fg": "#1E1B4B",
        "--wb-fg": "#1E1B4B",
        "--wb-muted": "#475569",
        "--wb-border": "#C7D2FE",
        "--wb-ring": "#4F46E5",
        "--wb-destructive": "#DC2626",
        "--wb-glow-primary": "rgba(220, 38, 38, 0.18)",
        "--wb-glow-secondary": "rgba(234, 88, 12, 0.14)",
        "--wb-gradient-primary": "linear-gradient(135deg, #DC2626 0%, #EA580C 100%)",
        "--wb-font-heading": "Calistoga",
        "--wb-font-body": "Inter",
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
    </main>
  );
}
