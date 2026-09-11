"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Zap } from "lucide-react";

export interface AnimatedCta21stProps {
  title?: string;
  subtitle?: string;
  primaryButtonText?: string;
  secondaryButtonText?: string;
  onPrimaryClick?: () => void;
  onSecondaryClick?: () => void;
  badge?: string;
}

export default function AnimatedCta21st({
  title = "Ready to Transform Your Digital Experience?",
  subtitle = "Join industry leaders who build and deploy production-grade websites in seconds. Start with a full-featured trial today.",
  primaryButtonText = "Launch Your Project Now",
  secondaryButtonText = "Talk to an Architect",
  onPrimaryClick,
  onSecondaryClick,
  badge = "Instant Deployment",
}: AnimatedCta21stProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section
      className="py-24 sm:py-32 px-6 sm:px-12 relative overflow-hidden transition-colors duration-300"
      style={{
        backgroundColor: "var(--wb-bg)",
        color: "var(--wb-fg)",
        fontFamily: "var(--wb-font-body)",
      }}
      aria-label="Call to Action Banner"
    >
      <div className="max-w-5xl mx-auto relative">
        {/* 21st.dev Container with Border Glow and Backdrop Blur */}
        <div
          className="relative rounded-3xl p-10 sm:p-16 text-center border overflow-hidden backdrop-blur-xl shadow-2xl"
          style={{
            backgroundColor: "var(--wb-surface)",
            borderColor: "var(--wb-border)",
            borderRadius: "var(--wb-radius-card, 1.5rem)",
            boxShadow: "0 20px 50px -15px var(--wb-glow-primary)",
          }}
        >
          {/* Ambient Lighting Orbs */}
          <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden flex items-center justify-center">
            <motion.div
              animate={
                shouldReduceMotion
                  ? {}
                  : {
                      scale: [1, 1.2, 1],
                      opacity: [0.35, 0.6, 0.35],
                    }
              }
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="absolute w-[500px] h-[350px] rounded-full blur-[100px]"
              style={{
                background: "radial-gradient(circle, var(--wb-glow-primary) 0%, transparent 70%)",
              }}
              aria-hidden="true"
            />
            <motion.div
              animate={
                shouldReduceMotion
                  ? {}
                  : {
                      scale: [1.1, 0.9, 1.1],
                      opacity: [0.2, 0.45, 0.2],
                    }
              }
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute -bottom-20 w-[400px] h-[250px] rounded-full blur-[80px]"
              style={{
                background: "radial-gradient(circle, var(--wb-glow-secondary) 0%, transparent 75%)",
              }}
              aria-hidden="true"
            />
          </div>

          {/* Badge */}
          {badge && (
            <div
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold mb-6 border shadow-sm backdrop-blur-md"
              style={{
                backgroundColor: "var(--wb-bg)",
                borderColor: "var(--wb-border)",
                color: "var(--wb-primary)",
              }}
            >
              <Zap className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{badge}</span>
            </div>
          )}

          {/* Title with Gradient Text */}
          <h2
            className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6 max-w-3xl mx-auto leading-tight"
            style={{ fontFamily: "var(--wb-font-heading)" }}
          >
            <span>{title.split(" ").slice(0, -2).join(" ")} </span>
            <span
              className="bg-clip-text text-transparent bg-gradient-to-r"
              style={{
                backgroundImage: "var(--wb-gradient-primary)",
              }}
            >
              {title.split(" ").slice(-2).join(" ")}
            </span>
          </h2>

          <p
            className="text-base sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
            style={{ color: "var(--wb-muted)" }}
          >
            {subtitle}
          </p>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              type="button"
              onClick={onPrimaryClick}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 text-base font-semibold text-white shadow-xl transition-all transform hover:-translate-y-0.5 active:translate-y-0"
              style={{
                backgroundColor: "var(--wb-primary)",
                borderRadius: "var(--wb-radius-button, 0.5rem)",
                boxShadow: "0 10px 25px -5px var(--wb-glow-primary)",
              }}
              aria-label={primaryButtonText}
            >
              <span>{primaryButtonText}</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>

            {secondaryButtonText && (
              <button
                type="button"
                onClick={onSecondaryClick}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 text-base font-medium border backdrop-blur-md transition-all hover:bg-opacity-80"
                style={{
                  backgroundColor: "var(--wb-bg)",
                  borderColor: "var(--wb-border)",
                  color: "var(--wb-fg)",
                  borderRadius: "var(--wb-radius-button, 0.5rem)",
                }}
                aria-label={secondaryButtonText}
              >
                <span>{secondaryButtonText}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
