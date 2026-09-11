"use client";

import React, { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Menu, X, Globe, Phone } from "lucide-react";
import type { NavbarConfig, NavLink } from "@/types/website";
import { useWebsiteUI } from "@/contexts/WebsiteUIContext";

interface NavbarSectionProps {
  navbar?: NavbarConfig;
  businessName?: string;
  phone?: string | null;
  whatsappNumber?: string | null;
  className?: string;
}

export default function NavbarSection({
  navbar,
  businessName = "Website",
  phone,
  whatsappNumber: _whatsappNumber,
  className = "",
}: NavbarSectionProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const { onSwitchPage } = useWebsiteUI();

  const links: NavLink[] =
    navbar?.links && navbar.links.length > 0
      ? navbar.links
      : [
          { id: "nav-home", label: "Home", action: { type: "scroll", target: "hero" } },
          { id: "nav-services", label: "Services", action: { type: "scroll", target: "services" } },
          { id: "nav-about", label: "About", action: { type: "scroll", target: "about" } },
          { id: "nav-contact", label: "Contact", action: { type: "scroll", target: "contact" } },
        ];

  const handleLinkClick = (link: NavLink) => {
    setMobileMenuOpen(false);
    if (link.action.type === "scroll") {
      const el = document.getElementById(link.action.target) || document.querySelector(`[data-section="${link.action.target}"]`);
      if (el) {
        el.scrollIntoView({ behavior: shouldReduceMotion ? "auto" : "smooth", block: "start" });
      }
    } else if (link.action.type === "page" && onSwitchPage) {
      onSwitchPage(link.action.target);
    }
  };

  return (
    <header
      className={`sticky top-0 z-40 w-full backdrop-blur-xl border-b transition-colors px-4 sm:px-8 py-3.5 flex items-center justify-between ${className}`}
      style={{
        backgroundColor: "var(--wb-surface, rgba(255,255,255,0.9))",
        borderColor: "var(--wb-border, rgba(0,0,0,0.08))",
        color: "var(--wb-fg, #0F172A)",
      }}
      role="banner"
    >
      {/* Brand / Logo */}
      <div className="flex items-center gap-2.5">
        {navbar?.logo?.type === "image" && navbar?.logo?.imageUrl ? (
          <img
            src={navbar.logo.imageUrl}
            alt={navbar.logo.text || businessName}
            className="h-8 max-w-[160px] object-contain"
          />
        ) : (
          <div className="flex items-center gap-2">
            <div
              className="p-1.5 rounded-lg flex items-center justify-center text-white"
              style={{ backgroundColor: "var(--wb-primary, #2563EB)" }}
            >
              <Globe className="h-4 w-4" aria-hidden="true" />
            </div>
            <span className="font-extrabold text-sm sm:text-base tracking-tight" style={{ color: "var(--wb-fg, #0F172A)" }}>
              {navbar?.logo?.text || businessName}
            </span>
          </div>
        )}
      </div>

      {/* Desktop Navigation Links */}
      <nav className="hidden md:flex items-center gap-1.5" role="navigation" aria-label="Main Navigation">
        {links.map((link) => (
          <button
            key={link.id}
            type="button"
            onClick={() => handleLinkClick(link)}
            className="px-3.5 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition-colors duration-150 hover:opacity-100 cursor-pointer"
            style={{
              color: "var(--wb-fg, #0F172A)",
              opacity: 0.8,
            }}
          >
            {link.label}
          </button>
        ))}

        {/* Quick Contact Action in Navbar */}
        {phone && (
          <a
            href={`tel:${phone}`}
            className="ml-2 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white shadow-xs flex items-center gap-1.5 transition-transform duration-150 hover:scale-105 active:scale-95"
            style={{ backgroundColor: "var(--wb-primary, #2563EB)" }}
            aria-label={`Call us at ${phone}`}
          >
            <Phone className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Call</span>
          </a>
        )}
      </nav>

      {/* Mobile Hamburger Toggle */}
      <div className="md:hidden flex items-center gap-2">
        {phone && (
          <a
            href={`tel:${phone}`}
            className="p-2 rounded-lg text-white"
            style={{ backgroundColor: "var(--wb-primary, #2563EB)" }}
            aria-label="Call directly"
          >
            <Phone className="h-4 w-4" />
          </a>
        )}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg border focus:outline-hidden"
          style={{ borderColor: "var(--wb-border, rgba(0,0,0,0.1))" }}
          aria-expanded={mobileMenuOpen}
          aria-label="Toggle mobile menu"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 w-full border-b p-4 flex flex-col gap-2 shadow-xl md:hidden z-50"
            style={{
              backgroundColor: "var(--wb-surface, #FFFFFF)",
              borderColor: "var(--wb-border, rgba(0,0,0,0.1))",
            }}
          >
            {links.map((link) => (
              <button
                key={link.id}
                type="button"
                onClick={() => handleLinkClick(link)}
                className="w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold transition hover:bg-black/5 dark:hover:bg-white/5"
                style={{ color: "var(--wb-fg, #0F172A)" }}
              >
                {link.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
