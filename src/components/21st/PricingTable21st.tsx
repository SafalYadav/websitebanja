"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Sparkles, ArrowRight } from "lucide-react";

export interface PricingTierItem {
  id?: string;
  name: string;
  price: string | number;
  period?: string;
  description: string;
  features: string[];
  isPopular?: boolean;
  ctaText?: string;
  onSelect?: () => void;
}

export interface PricingTable21stProps {
  title?: string;
  subtitle?: string;
  badge?: string;
  tiers?: PricingTierItem[];
}

const defaultTiers: PricingTierItem[] = [
  {
    id: "free",
    name: "Free Starter",
    price: "₹0",
    period: "/forever free",
    description: "Essential capabilities for testing business ideas and building initial web presence.",
    features: [
      "3 AI requests per rolling 7 days",
      "WebsiteBanja public URL (/p/slug)",
      "Full Visual Studio Editor access",
      "Responsive layouts & auto SSL",
    ],
    isPopular: false,
    ctaText: "Get Started Free",
  },
  {
    id: "pro",
    name: "Paid Pro",
    price: "₹500",
    period: "/month",
    description: "Complete design intelligence suite for serious businesses requiring custom domains & power.",
    features: [
      "50 AI requests per rolling 7 days",
      "Custom domain connection (yourbrand.com)",
      "WebsiteBanja public URL fallback",
      "Managed / BYO backend infrastructure",
      "Remove WebsiteBanja footer badge",
      "Global CDN edge delivery & priority support",
    ],
    isPopular: true,
    ctaText: "Upgrade to Pro (₹500/mo)",
  },
];

export default function PricingTable21st({
  title = "Transparent, Predictable Investment",
  subtitle = "Choose the plan that fits your growth velocity. Scale dynamically without unexpected surprises.",
  badge = "Flexible Pricing",
  tiers = defaultTiers,
}: PricingTable21stProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section
      className="py-24 sm:py-32 px-6 sm:px-12 relative overflow-hidden transition-colors duration-300"
      style={{
        backgroundColor: "var(--wb-bg)",
        color: "var(--wb-fg)",
        fontFamily: "var(--wb-font-body)",
      }}
      aria-label="Pricing Section"
    >
      <div className="max-w-6xl mx-auto">
        {/* Header Block */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          {badge && (
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-4 border"
              style={{
                backgroundColor: "var(--wb-surface)",
                borderColor: "var(--wb-border)",
                color: "var(--wb-primary)",
              }}
            >
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{badge}</span>
            </div>
          )}

          <h2
            className="text-3xl sm:text-5xl font-bold tracking-tight mb-5"
            style={{ fontFamily: "var(--wb-font-heading)" }}
          >
            {title}
          </h2>

          <p
            className="text-base sm:text-lg max-w-2xl mx-auto"
            style={{ color: "var(--wb-muted)" }}
          >
            {subtitle}
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {tiers.map((tier, idx) => {
            const isPopular = tier.isPopular;

            return (
              <motion.div
                key={tier.id || idx}
                initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.4,
                  delay: shouldReduceMotion ? 0 : idx * 0.1,
                  ease: [0.16, 1, 0.3, 1] as const,
                }}
                className={`relative rounded-2xl p-8 sm:p-10 flex flex-col justify-between border backdrop-blur-md transition-all duration-300 ${
                  isPopular
                    ? "shadow-2xl scale-100 lg:-translate-y-2"
                    : "shadow-sm hover:shadow-md"
                }`}
                style={{
                  backgroundColor: "var(--wb-surface)",
                  borderColor: isPopular ? "var(--wb-primary)" : "var(--wb-border)",
                  borderRadius: "var(--wb-radius-card, 1rem)",
                  boxShadow: isPopular
                    ? "0 20px 40px -15px var(--wb-glow-primary)"
                    : "var(--wb-shadow-subtle)",
                }}
              >
                {/* 21st.dev Popular Gradient Ring Badge */}
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span
                      className="inline-flex items-center gap-1.5 px-4 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-md rounded-full"
                      style={{
                        backgroundColor: "var(--wb-primary)",
                      }}
                    >
                      <Sparkles className="w-3 h-3" aria-hidden="true" />
                      Most Popular
                    </span>
                  </div>
                )}

                <div>
                  <div className="mb-6">
                    <h3
                      className="text-2xl font-bold tracking-tight mb-2"
                      style={{ fontFamily: "var(--wb-font-heading)" }}
                    >
                      {tier.name}
                    </h3>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--wb-muted)" }}>
                      {tier.description}
                    </p>
                  </div>

                  <div className="flex items-baseline gap-1 mb-8">
                    <span
                      className="text-4xl sm:text-5xl font-extrabold tracking-tight"
                      style={{ fontFamily: "var(--wb-font-heading)", color: "var(--wb-fg)" }}
                    >
                      {tier.price}
                    </span>
                    {tier.period && (
                      <span className="text-sm font-medium" style={{ color: "var(--wb-muted)" }}>
                        {tier.period}
                      </span>
                    )}
                  </div>

                  {/* Feature Checklist */}
                  <div className="space-y-3.5 mb-8">
                    {tier.features.map((feat, fIdx) => (
                      <div key={fIdx} className="flex items-center gap-3 text-sm">
                        <div
                          className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                          style={{
                            backgroundColor: isPopular ? "var(--wb-primary)" : "var(--wb-border)",
                            color: isPopular ? "#FFFFFF" : "var(--wb-primary)",
                          }}
                        >
                          <Check className="w-3 h-3 stroke-[3]" aria-hidden="true" />
                        </div>
                        <span style={{ color: "var(--wb-fg)" }}>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card CTA */}
                <button
                  type="button"
                  onClick={tier.onSelect}
                  className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 font-semibold text-sm transition-all transform active:scale-95"
                  style={{
                    backgroundColor: isPopular ? "var(--wb-primary)" : "var(--wb-surface)",
                    color: isPopular ? "#FFFFFF" : "var(--wb-fg)",
                    border: isPopular ? "none" : "1px solid var(--wb-border)",
                    borderRadius: "var(--wb-radius-button, 0.5rem)",
                    boxShadow: isPopular ? "0 8px 20px -4px var(--wb-glow-primary)" : undefined,
                  }}
                  aria-label={`${tier.ctaText || "Select Plan"} for ${tier.name}`}
                >
                  <span>{tier.ctaText || "Get Started"}</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
