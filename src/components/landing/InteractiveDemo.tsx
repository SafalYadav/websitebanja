"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, Laptop, Smartphone, CheckCircle, RefreshCw } from "lucide-react";

interface SampleBusiness {
  id: string;
  name: string;
  category: string;
  palette: {
    primary: string;
    secondary: string;
    bg: string;
  };
  headline: string;
  subtitle: string;
  cta: string;
  features: string[];
}

const SAMPLES: SampleBusiness[] = [
  {
    id: "coffee",
    name: "Aura Artisan Coffee",
    category: "Specialty Cafe & Roastery",
    palette: {
      primary: "#d97706",
      secondary: "#92400e",
      bg: "#1c1917",
    },
    headline: "Ethically Sourced. Masterfully Roasted.",
    subtitle: "Experience single-origin micro-lots roasted daily with precision and sustainable craftsmanship in downtown Seattle.",
    cta: "Explore Our Roasts",
    features: ["Single-Origin Beans", "Fresh Daily Roasting", "Zero-Waste Packaging"],
  },
  {
    id: "saas",
    name: "Nexus Flow AI",
    category: "Enterprise Workflow Automation",
    palette: {
      primary: "#6366f1",
      secondary: "#4338ca",
      bg: "#0f172a",
    },
    headline: "Automate Cross-Team Workflows with Autonomous AI.",
    subtitle: "Eliminate repetitive manual ops. Connect your tech stack and execute multi-step workflows in milliseconds.",
    cta: "Start Free Trial",
    features: ["Real-time Sync", "SOC2 Compliant", "99.99% Uptime SLA"],
  },
  {
    id: "dental",
    name: "Lumina Dental Studio",
    category: "Modern Cosmetic Dentistry",
    palette: {
      primary: "#06b6d4",
      secondary: "#0e7490",
      bg: "#0f172a",
    },
    headline: "Gentle, State-of-the-Art Dental Care.",
    subtitle: "Comfort-first preventive and cosmetic treatments using advanced 3D imaging in a calm, boutique clinic setting.",
    cta: "Book Consultation",
    features: ["Same-Day Crowns", "Painless Whitening", "Virtual Check-ins"],
  },
];

export default function InteractiveDemo() {
  const [selected, setSelected] = useState<SampleBusiness>(SAMPLES[0]);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [isGenerating, setIsGenerating] = useState(false);

  function handleSelect(sample: SampleBusiness) {
    if (sample.id === selected.id) return;
    setIsGenerating(true);
    setTimeout(() => {
      setSelected(sample);
      setIsGenerating(false);
    }, 300);
  }

  return (
    <div className="w-full max-w-5xl mx-auto rounded-3xl border border-zinc-200 bg-white/70 p-4 sm:p-6 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/70">
      {/* Top Demo Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-zinc-200 dark:border-white/10">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Live AI Generator Demo
          </span>
        </div>

        {/* Business Selector Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {SAMPLES.map((sample) => {
            const isActive = sample.id === selected.id;
            return (
              <button
                key={sample.id}
                type="button"
                onClick={() => handleSelect(sample)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                  isActive
                    ? "bg-violet-600 text-white shadow-md shadow-violet-600/25"
                    : "border border-zinc-200 bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                }`}
              >
                <span>{sample.name.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>

        {/* Device Switcher */}
        <div className="flex items-center rounded-xl border border-zinc-200 bg-zinc-100 p-1 dark:border-white/10 dark:bg-zinc-900">
          <button
            type="button"
            onClick={() => setDevice("desktop")}
            aria-label="Desktop view"
            className={`rounded-lg p-1.5 transition ${
              device === "desktop"
                ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-white"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            }`}
          >
            <Laptop className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setDevice("mobile")}
            aria-label="Mobile view"
            className={`rounded-lg p-1.5 transition ${
              device === "mobile"
                ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-white"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            }`}
          >
            <Smartphone className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Interactive Canvas */}
      <div className="mt-5 flex justify-center overflow-hidden rounded-2xl bg-zinc-900/40 p-2 sm:p-6 border border-zinc-200/60 dark:border-white/5">
        <motion.div
          layout
          className={`relative overflow-hidden rounded-2xl border border-zinc-700/50 bg-black text-white shadow-2xl transition-all duration-300 ${
            device === "mobile" ? "w-[340px]" : "w-full max-w-4xl"
          }`}
          style={{ minHeight: "440px" }}
        >
          {/* Browser Bar */}
          <div className="flex items-center justify-between border-b border-white/10 bg-zinc-950 px-4 py-2.5 text-xs text-zinc-400">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-green-500/80" />
            </div>
            <div className="flex items-center gap-2 rounded-md bg-zinc-900 px-3 py-1 font-mono text-[11px] text-zinc-300">
              <span>https://{selected.id}.websitebanja.com</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-emerald-400 font-bold uppercase">● Live Preview</span>
            </div>
          </div>

          {/* Website Canvas Area */}
          <div className="relative p-6 sm:p-10">
            <AnimatePresence mode="wait">
              {isGenerating ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex h-72 flex-col items-center justify-center gap-3 text-center"
                >
                  <RefreshCw className="h-7 w-7 text-violet-400 animate-spin" />
                  <p className="text-sm font-medium text-zinc-400">
                    AI synthesizing bespoke sections & styling...
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key={selected.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-8"
                >
                  {/* Navbar Simulation */}
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <span className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: selected.palette.primary }}
                      />
                      {selected.name}
                    </span>
                    <span className="text-xs text-zinc-400 hidden sm:inline">
                      {selected.category}
                    </span>
                  </div>

                  {/* Hero Simulation */}
                  <div className="text-center py-6 sm:py-10 max-w-2xl mx-auto space-y-4">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider"
                      style={{
                        backgroundColor: `${selected.palette.primary}25`,
                        color: selected.palette.primary,
                      }}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      AI Curated Concept
                    </span>

                    <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                      {selected.headline}
                    </h2>

                    <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                      {selected.subtitle}
                    </p>

                    <div className="pt-2 flex flex-wrap justify-center gap-3">
                      <button
                        type="button"
                        className="rounded-xl px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-lg transition hover:opacity-90 active:scale-95 flex items-center gap-2"
                        style={{
                          background: `linear-gradient(135deg, ${selected.palette.primary}, ${selected.palette.secondary})`,
                        }}
                      >
                        {selected.cta}
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Features Mini-Bar */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-white/10">
                    {selected.features.map((feat) => (
                      <div
                        key={feat}
                        className="flex items-center gap-2 rounded-xl bg-white/5 p-3 text-xs text-zinc-300"
                      >
                        <CheckCircle
                          className="h-4 w-4 flex-shrink-0"
                          style={{ color: selected.palette.primary }}
                        />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
