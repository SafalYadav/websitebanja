"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Cpu,
  Palette,
  Layers,
  Smartphone,
  Globe2,
  Search,
  CheckCircle2,
} from "lucide-react";

export default function Features() {
  const shouldReduceMotion = useReducedMotion();
  const [activePaletteIndex, setActivePaletteIndex] = useState(0);

  const PALETTES = [
    { name: "Cyan Kinetic", primary: "#06B6D4", secondary: "#3B82F6", bg: "#040406" },
    { name: "Nordic Emerald", primary: "#059669", secondary: "#0D9488", bg: "#061A14" },
    { name: "Sunset Amber", primary: "#D97706", secondary: "#EA580C", bg: "#1A1006" },
    { name: "Royal Violet", primary: "#7C3AED", secondary: "#4F46E5", bg: "#120B24" },
  ];

  return (
    <section id="features" className="py-24 sm:py-32 px-6 relative overflow-hidden" aria-label="Product Features">
      {/* Subtle atmospheric ambient light */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[900px] rounded-full bg-cyan-500/5 blur-[160px] dark:bg-cyan-500/10" />

      <div className="mx-auto max-w-7xl relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200/60 dark:border-cyan-800/40 px-3.5 py-1.5 rounded-full inline-block">
            Engineered For Craft & Conversion
          </span>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-zinc-950 dark:text-white leading-tight">
            Engineered to convert visitors into loyal customers.
          </h2>
          <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Every section, font pairing, color harmony, and sales copy line is tailored specifically for your target audience.
          </p>
        </div>

        {/* Bento Grid Architecture */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* ANCHOR CARD: Bespoke Design & Strategic Copywriting (Span 2 cols on lg) */}
          <motion.div
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="lg:col-span-2 surface-card rounded-3xl p-8 sm:p-10 relative overflow-hidden flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between gap-3 mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700 dark:bg-cyan-950/80 dark:text-cyan-300 shadow-xs">
                  <Cpu className="h-6 w-6" />
                </div>
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/60 px-3 py-1 rounded-full border border-cyan-200/70 dark:border-cyan-800/50">
                  Core Architecture
                </span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-bold text-zinc-950 dark:text-white mb-3 tracking-tight">
                Bespoke Design & Strategic Copywriting
              </h3>
              <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-300 leading-relaxed max-w-xl mb-8">
                Unlike generic website generators that spit out repetitive templates, WebsiteBanja crafts tailored brand architecture, persuasive copy, intuitive conversion paths, and responsive layouts tailored to your exact industry.
              </p>

              {/* Interactive Pipeline Visualization */}
              <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/80 p-4 sm:p-5 dark:border-white/10 dark:bg-[#040406]/80 mb-4">
                <span className="text-[11px] font-mono font-bold uppercase text-zinc-400 tracking-wider block mb-3">
                  Live Generation Pipeline Workflow
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="rounded-xl border border-zinc-200/80 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900/90 space-y-1">
                    <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 font-bold block">
                      STAGE 01
                    </span>
                    <span className="font-semibold text-zinc-900 dark:text-white block">
                      Semantic Intake
                    </span>
                    <span className="text-[11px] text-zinc-500">
                      Niche & Target audience profiling
                    </span>
                  </div>

                  <div className="rounded-xl border border-zinc-200/80 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900/90 space-y-1">
                    <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 font-bold block">
                      STAGE 02
                    </span>
                    <span className="font-semibold text-zinc-900 dark:text-white block">
                      Palette & Type Matrix
                    </span>
                    <span className="text-[11px] text-zinc-500">
                      Harmonized WCAG AAA contrast
                    </span>
                  </div>

                  <div className="rounded-xl border border-zinc-200/80 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900/90 space-y-1">
                    <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 font-bold block">
                      STAGE 03
                    </span>
                    <span className="font-semibold text-zinc-900 dark:text-white block">
                      CRO Section Flow
                    </span>
                    <span className="text-[11px] text-zinc-500">
                      High-converting layout hierarchy
                    </span>
                  </div>

                  <div className="rounded-xl border border-zinc-200/80 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900/90 space-y-1">
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold block">
                      STAGE 04
                    </span>
                    <span className="font-semibold text-zinc-900 dark:text-white block">
                      Edge CDN Deploy
                    </span>
                    <span className="text-[11px] text-zinc-500">
                      Sub-50ms global delivery
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="h-4 w-4 text-cyan-500" />
                Framer Motion Micro-Interactions
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="h-4 w-4 text-cyan-500" />
                Tailwind CSS Fluid Spacing
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="h-4 w-4 text-cyan-500" />
                Zero Hallucinated Placeholders
              </span>
            </div>
          </motion.div>

          {/* CARD 2: Dynamic Palette & Contrast Engine with Interactive Swatches */}
          <motion.div
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.08 }}
            className="surface-card rounded-3xl p-8 flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between gap-3 mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700 dark:bg-cyan-950/80 dark:text-cyan-300 shadow-xs">
                  <Palette className="h-6 w-6" />
                </div>
                <span className="font-mono text-xs text-zinc-400 uppercase">
                  WCAG AAA
                </span>
              </div>

              <h3 className="text-xl font-bold text-zinc-950 dark:text-white mb-2 tracking-tight">
                Harmonic Color Tokens
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-6">
                Generates sophisticated color systems tailored to consumer emotion and industry trust thresholds.
              </p>

              {/* Interactive Palette Switcher Widget */}
              <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-[#040406]/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                    {PALETTES[activePaletteIndex].name}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: PALETTES[activePaletteIndex].primary }}
                    />
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: PALETTES[activePaletteIndex].secondary }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 pt-1">
                  {PALETTES.map((pal, idx) => (
                    <button
                      key={pal.name}
                      type="button"
                      onClick={() => setActivePaletteIndex(idx)}
                      className={`h-8 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                        activePaletteIndex === idx
                          ? "border-zinc-900 ring-2 ring-cyan-500 dark:border-white"
                          : "border-transparent opacity-80 hover:opacity-100"
                      }`}
                      style={{ background: `linear-gradient(135deg, ${pal.primary}, ${pal.secondary})` }}
                      aria-label={`Select ${pal.name}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-zinc-200/80 dark:border-white/10 text-xs text-zinc-500">
              <span>Automatic dark/light mode token inversion</span>
            </div>
          </motion.div>

          {/* CARD 3: Multi-Device Responsive Canvas */}
          <motion.div
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.16 }}
            className="surface-card rounded-3xl p-8 flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between gap-3 mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 shadow-xs">
                  <Smartphone className="h-6 w-6" />
                </div>
                <span className="font-mono text-xs text-zinc-400 uppercase">
                  Zero Shift
                </span>
              </div>

              <h3 className="text-xl font-bold text-zinc-950 dark:text-white mb-2 tracking-tight">
                Multi-Device Viewport Canvas
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-6">
                Inspect and refine your layouts seamlessly across Desktop (1440px), Tablet (768px), and Mobile (375px) viewports with zero layout shift.
              </p>

              {/* Viewport Frame Preview */}
              <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-[#040406]/80 text-center space-y-2">
                <div className="flex justify-center gap-2">
                  <span className="rounded-md bg-white dark:bg-zinc-900 px-2 py-1 text-[10px] font-mono font-bold text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800">
                    Desktop 100%
                  </span>
                  <span className="rounded-md bg-white dark:bg-zinc-900 px-2 py-1 text-[10px] font-mono font-bold text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800">
                    Tablet 768px
                  </span>
                  <span className="rounded-md bg-white dark:bg-zinc-900 px-2 py-1 text-[10px] font-mono font-bold text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800">
                    Mobile 375px
                  </span>
                </div>
                <span className="text-[11px] text-zinc-400 block font-mono">
                  Cumulative Layout Shift (CLS): 0.00
                </span>
              </div>
            </div>

            <div className="pt-6 border-t border-zinc-200/80 dark:border-white/10 text-xs text-zinc-500">
              <span>Fluid typography using modern clamp() scales</span>
            </div>
          </motion.div>

          {/* CARD 4: Section Drag-and-Drop Studio */}
          <motion.div
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.24 }}
            className="surface-card rounded-3xl p-8 flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between gap-3 mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 shadow-xs">
                  <Layers className="h-6 w-6" />
                </div>
                <span className="font-mono text-xs text-zinc-400 uppercase">
                  Full Control
                </span>
              </div>

              <h3 className="text-xl font-bold text-zinc-950 dark:text-white mb-2 tracking-tight">
                Visual Studio Editor
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-6">
                Effortlessly reorder, duplicate, remove, or inject new sections (Hero, About, Services, Bento Grid, Testimonials, FAQ, Contact).
              </p>

              {/* Stacked sections mockup */}
              <div className="space-y-1.5 rounded-2xl border border-zinc-200/80 bg-zinc-50 p-3.5 dark:border-zinc-800 dark:bg-[#040406]/80 text-xs font-mono">
                <div className="rounded-lg bg-white p-2 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-800 flex justify-between items-center">
                  <span>☰ 01 Hero Section</span>
                  <span className="text-[10px] text-emerald-500 font-bold">Active</span>
                </div>
                <div className="rounded-lg bg-white p-2 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-800 flex justify-between items-center">
                  <span>☰ 02 Services Showcase</span>
                  <span className="text-[10px] text-zinc-400">3 Cards</span>
                </div>
                <div className="rounded-lg bg-white p-2 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-800 flex justify-between items-center">
                  <span>☰ 03 Conversion CTA</span>
                  <span className="text-[10px] text-cyan-500 font-bold">Lead Magnet</span>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-zinc-200/80 dark:border-white/10 text-xs text-zinc-500">
              <span>Instant local autosave & cloud synchronization</span>
            </div>
          </motion.div>

          {/* CARD 5: Autonomous SEO & OpenGraph Social Previews */}
          <motion.div
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.32 }}
            className="surface-card rounded-3xl p-8 flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between gap-3 mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-100 text-teal-700 dark:bg-teal-950/80 dark:text-teal-300 shadow-xs">
                  <Search className="h-6 w-6" />
                </div>
                <span className="font-mono text-xs text-zinc-400 uppercase">
                  Rank Ready
                </span>
              </div>

              <h3 className="text-xl font-bold text-zinc-950 dark:text-white mb-2 tracking-tight">
                Built-In SEO & Schema Markup
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-6">
                Automated title tags, meta descriptions, LocalBusiness JSON-LD schema, and OpenGraph social preview images for every launch.
              </p>

              {/* SERP Preview Simulation */}
              <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50 p-3.5 dark:border-zinc-800 dark:bg-[#040406]/80 text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-mono">
                  <Globe2 className="h-3 w-3 text-cyan-500" />
                  <span>https://yourbusiness.websitebanja.live</span>
                </div>
                <span className="font-semibold text-cyan-600 dark:text-cyan-400 text-xs block truncate">
                  Your Business | Premium Services & Online Booking
                </span>
                <p className="text-[11px] text-zinc-500 line-clamp-2 leading-relaxed">
                  Discover top-rated services, transparent pricing, verified client reviews, and instant online consultations.
                </p>
              </div>
            </div>

            <div className="pt-6 border-t border-zinc-200/80 dark:border-white/10 text-xs text-zinc-500">
              <span>Automatic sitemap & semantic HTML5 tags</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
