"use client";

import React, { useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Cpu, ShieldCheck, Zap, BarChart3, Layers, Sparkles } from "lucide-react";

export interface BentoCardItem {
  id?: string;
  title: string;
  description: string;
  tag?: string;
  icon?: "cpu" | "shield" | "zap" | "chart" | "layers" | "sparkles";
  colSpan?: "col-span-1" | "col-span-2" | "col-span-3";
}

export interface BentoGrid21stProps {
  heading?: string;
  subheading?: string;
  badge?: string;
  items?: BentoCardItem[];
}

const defaultItems: BentoCardItem[] = [
  {
    id: "card-1",
    title: "Autonomous Architecture Engine",
    description: "Deep domain intelligence generates fully responsive, accessible, token-harmonized layouts on demand.",
    tag: "Core Engine",
    icon: "cpu",
    colSpan: "col-span-2",
  },
  {
    id: "card-2",
    title: "Sub-Second Rendering",
    description: "Zero hydration delays with compiled CSS variable design tokens and optimized asset pipelines.",
    tag: "Performance",
    icon: "zap",
    colSpan: "col-span-1",
  },
  {
    id: "card-3",
    title: "Real-Time Telemetry",
    description: "Live conversion analytics, behavioral heatmaps, and continuous component self-healing.",
    tag: "Intelligence",
    icon: "chart",
    colSpan: "col-span-1",
  },
  {
    id: "card-4",
    title: "Enterprise Multi-Tenant Isolation",
    description: "Strict project sandboxing guarantees zero cross-tenant contamination, hardened state persistence, and cryptographic integrity.",
    tag: "Security",
    icon: "shield",
    colSpan: "col-span-2",
  },
];

interface BentoCardComponentProps {
  item: BentoCardItem;
  idx: number;
  isSpan2: boolean;
  shouldReduceMotion: boolean | null;
  getIcon: (type?: string) => React.ReactNode;
}

function BentoCardComponent({ item, idx, isSpan2, shouldReduceMotion, getIcon }: BentoCardComponentProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (shouldReduceMotion || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    cardRef.current.style.setProperty("--mouse-x", `${x}px`);
    cardRef.current.style.setProperty("--mouse-y", `${y}px`);
  };

  const handleMouseLeave = () => {
    if (!cardRef.current) return;
    cardRef.current.style.setProperty("--mouse-x", "50%");
    cardRef.current.style.setProperty("--mouse-y", "50%");
  };

  return (
    <motion.div
      ref={cardRef}
      key={item.id || idx}
      tabIndex={0}
      role="article"
      aria-label={item.title}
      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{
        duration: 0.4,
        delay: shouldReduceMotion ? 0 : idx * 0.08,
        ease: [0.16, 1, 0.3, 1] as const,
      }}
      whileHover={
        shouldReduceMotion
          ? {}
          : {
              y: -4,
              transition: { duration: 0.2 },
            }
      }
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative p-8 rounded-2xl border backdrop-blur-md flex flex-col justify-between overflow-hidden group transition-all duration-300 focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none ${
        isSpan2 ? "md:col-span-2" : "md:col-span-1"
      }`}
      style={{
        backgroundColor: "var(--wb-surface)",
        borderColor: "var(--wb-border)",
        borderRadius: "var(--wb-radius-card, 1rem)",
        boxShadow: "var(--wb-shadow-subtle)",
      }}
    >
      {/* 21st.dev Dynamic Ambient Edge Hover Highlight */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl"
        style={{
          background: "radial-gradient(400px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), var(--wb-glow-primary, rgba(14, 165, 233, 0.3)), transparent 70%)",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div
            className="p-3 rounded-xl border flex items-center justify-center transition-colors group-hover:scale-110"
            style={{
              backgroundColor: "var(--wb-bg)",
              borderColor: "var(--wb-border)",
              color: "var(--wb-primary)",
            }}
          >
            {getIcon(item.icon)}
          </div>
          {item.tag && (
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full border"
              style={{
                backgroundColor: "var(--wb-surface)",
                borderColor: "var(--wb-border)",
                color: "var(--wb-primary)",
              }}
            >
              {item.tag}
            </span>
          )}
        </div>

        <h3
          className="text-xl sm:text-2xl font-bold tracking-tight mb-3"
          style={{ fontFamily: "var(--wb-font-heading)", color: "var(--wb-fg)" }}
        >
          {item.title}
        </h3>

        <p
          className="text-sm leading-relaxed"
          style={{ color: "var(--wb-muted)" }}
        >
          {item.description}
        </p>
      </div>

      <div className="mt-8 pt-4 border-t flex items-center justify-between text-xs font-medium" style={{ borderColor: "var(--wb-border)" }}>
        <span style={{ color: "var(--wb-muted)" }}>Explore capability</span>
        <span className="group-hover:translate-x-1 transition-transform" style={{ color: "var(--wb-primary)" }}>→</span>
      </div>
    </motion.div>
  );
}

export default function BentoGrid21st({
  heading = "Engineered for Exponential Scale",
  subheading = "Modular, resilient, and visually captivating components crafted to turn visitors into loyal advocates.",
  badge = "Feature Showcase",
  items = defaultItems,
}: BentoGrid21stProps) {
  const shouldReduceMotion = useReducedMotion();

  const getIcon = (type?: string) => {
    switch (type) {
      case "cpu":
        return <Cpu className="w-5 h-5" aria-hidden="true" />;
      case "shield":
        return <ShieldCheck className="w-5 h-5" aria-hidden="true" />;
      case "zap":
        return <Zap className="w-5 h-5" aria-hidden="true" />;
      case "chart":
        return <BarChart3 className="w-5 h-5" aria-hidden="true" />;
      case "layers":
        return <Layers className="w-5 h-5" aria-hidden="true" />;
      default:
        return <Sparkles className="w-5 h-5" aria-hidden="true" />;
    }
  };

  return (
    <section
      className="py-24 sm:py-32 px-6 sm:px-12 relative overflow-hidden transition-colors duration-300"
      style={{
        backgroundColor: "var(--wb-bg)",
        color: "var(--wb-fg)",
        fontFamily: "var(--wb-font-body)",
      }}
      aria-label="Features Bento Grid"
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
            {heading}
          </h2>

          <p
            className="text-base sm:text-lg max-w-2xl mx-auto"
            style={{ color: "var(--wb-muted)" }}
          >
            {subheading}
          </p>
        </div>

        {/* Asymmetric Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {items.map((item, idx) => {
            const isSpan2 = item.colSpan === "col-span-2" || (idx === 0 || idx === 3);
            return (
              <BentoCardComponent
                key={item.id || idx}
                item={item}
                idx={idx}
                isSpan2={isSpan2}
                shouldReduceMotion={shouldReduceMotion}
                getIcon={getIcon}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
