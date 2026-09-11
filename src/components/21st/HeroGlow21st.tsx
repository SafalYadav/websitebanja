"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";

export interface HeroGlow21stProps {
  badge?: string;
  title?: string;
  subtitle?: string;
  primaryCta?: string;
  secondaryCta?: string;
  onPrimaryClick?: () => void;
  onSecondaryClick?: () => void;
  metrics?: Array<{ label: string; value: string }>;
}

export default function HeroGlow21st({
  badge = "Next-Gen AI Platform",
  title = "Accelerate Your Vision With Intelligent Design",
  subtitle = "Harness cutting-edge generative technology and adaptive design systems to build high-performance web experiences in seconds.",
  primaryCta = "Get Started Free",
  secondaryCta = "Book a Live Demo",
  onPrimaryClick,
  onSecondaryClick,
  metrics = [
    { label: "Uptime SLA", value: "99.99%" },
    { label: "Speed Increase", value: "3.8x" },
    { label: "Active Builders", value: "100k+" },
  ],
}: HeroGlow21stProps) {
  const shouldReduceMotion = useReducedMotion();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.12,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
    },
  };

  return (
    <section
      className="relative overflow-hidden pt-28 pb-20 sm:pt-36 sm:pb-32 px-6 sm:px-12 flex flex-col items-center text-center justify-center min-h-[85vh] transition-colors duration-300"
      style={{
        backgroundColor: "var(--wb-bg)",
        color: "var(--wb-fg)",
        fontFamily: "var(--wb-font-body)",
      }}
      aria-label="Hero Section"
    >
      {/* 21st.dev Ambient Glow Backdrop */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden flex items-center justify-center">
        <motion.div
          animate={
            shouldReduceMotion
              ? {}
              : {
                  scale: [1, 1.12, 1],
                  opacity: [0.35, 0.55, 0.35],
                }
          }
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-24 w-[600px] sm:w-[850px] h-[450px] rounded-full blur-[110px]"
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
                  scale: [1.05, 0.95, 1.05],
                  opacity: [0.25, 0.45, 0.25],
                }
          }
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute top-48 w-[400px] sm:w-[650px] h-[350px] rounded-full blur-[90px]"
          style={{
            background: "radial-gradient(circle, var(--wb-glow-secondary) 0%, transparent 75%)",
          }}
          aria-hidden="true"
        />
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-4xl mx-auto flex flex-col items-center"
      >
        {/* Subtle pill badge with glow border */}
        <motion.div
          variants={itemVariants}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium mb-6 shadow-sm border backdrop-blur-md transition-all hover:scale-105 cursor-default"
          style={{
            backgroundColor: "var(--wb-surface)",
            borderColor: "var(--wb-border)",
            color: "var(--wb-primary)",
          }}
        >
          <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{badge}</span>
        </motion.div>

        {/* Hero Title with Gradient Text */}
        <motion.h1
          variants={itemVariants}
          className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-6 max-w-3xl"
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
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          variants={itemVariants}
          className="text-lg sm:text-xl md:text-2xl mb-10 max-w-2xl font-normal leading-relaxed"
          style={{ color: "var(--wb-muted)" }}
        >
          {subtitle}
        </motion.p>

        {/* Call to Actions */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto mb-16"
        >
          <button
            type="button"
            onClick={onPrimaryClick}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 text-base font-semibold text-white shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            style={{
              backgroundColor: "var(--wb-primary)",
              borderRadius: "var(--wb-radius-button, 0.5rem)",
              boxShadow: "0 10px 25px -5px var(--wb-glow-primary)",
            }}
            aria-label={primaryCta}
          >
            <span>{primaryCta}</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>

          {secondaryCta && (
            <button
              type="button"
              onClick={onSecondaryClick}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 text-base font-medium border backdrop-blur-md transition-all hover:bg-opacity-80"
              style={{
                backgroundColor: "var(--wb-surface)",
                borderColor: "var(--wb-border)",
                color: "var(--wb-fg)",
                borderRadius: "var(--wb-radius-button, 0.5rem)",
              }}
              aria-label={secondaryCta}
            >
              <span>{secondaryCta}</span>
            </button>
          )}
        </motion.div>

        {/* 21st.dev Metric Trust Badges Floating Card */}
        {metrics && metrics.length > 0 && (
          <motion.div
            variants={itemVariants}
            className="w-full max-w-2xl grid grid-cols-3 gap-3 sm:gap-6 p-4 sm:p-6 rounded-2xl border backdrop-blur-xl shadow-xl transition-all"
            style={{
              backgroundColor: "var(--wb-surface)",
              borderColor: "var(--wb-border)",
              borderRadius: "var(--wb-radius-card, 1rem)",
            }}
          >
            {metrics.map((metric, idx) => (
              <div key={idx} className="flex flex-col items-center justify-center">
                <span
                  className="text-xl sm:text-3xl font-extrabold tracking-tight"
                  style={{
                    color: idx === 0 ? "var(--wb-primary)" : "var(--wb-fg)",
                    fontFamily: "var(--wb-font-heading)",
                  }}
                >
                  {metric.value}
                </span>
                <span
                  className="text-xs sm:text-sm font-medium mt-1"
                  style={{ color: "var(--wb-muted)" }}
                >
                  {metric.label}
                </span>
              </div>
            ))}
          </motion.div>
        )}
      </motion.div>
    </section>
  );
}
