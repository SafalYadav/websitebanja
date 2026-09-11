"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import { dashboardRoute } from "@/lib/editorRoutes";
import { ArrowRight, Zap, ShieldCheck, Globe, Palette, Sparkles } from "lucide-react";

export default function Hero() {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();

  return (
    <section id="home" className="relative pt-32 pb-20 sm:pt-44 sm:pb-28 overflow-hidden">
      {/* Dynamic atmospheric mesh backgrounds */}
      <div className="pointer-events-none absolute -top-28 left-1/2 -translate-x-1/2 h-[550px] w-[960px] rounded-full bg-gradient-to-b from-cyan-500/15 via-blue-500/10 to-indigo-600/10 blur-[140px] dark:from-cyan-500/20 dark:via-blue-600/10" />
      <div className="pointer-events-none absolute top-1/3 -left-32 h-96 w-96 rounded-full bg-cyan-500/10 blur-[130px] dark:bg-cyan-600/15" />
      <div className="pointer-events-none absolute top-1/4 -right-32 h-96 w-96 rounded-full bg-indigo-500/10 blur-[130px] dark:bg-indigo-600/15" />

      <div className="relative mx-auto max-w-7xl px-6">
        {/* Editorial Hero Header */}
        <div className="text-center max-w-4xl mx-auto space-y-6">
          {/* Studio Telemetry Badge */}
          <motion.div
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="inline-flex items-center gap-2.5 rounded-full border border-cyan-200/80 bg-white/90 px-4 py-1.5 shadow-xs backdrop-blur-xl dark:border-cyan-500/20 dark:bg-cyan-950/40"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
            </span>
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-cyan-800 dark:text-cyan-300">
              Autonomous Business Website Studio • Instant Launch
            </span>
          </motion.div>

          {/* High-Impact Headline */}
          <motion.h1
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.08 }}
            className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-[-0.04em] text-zinc-950 dark:text-white leading-[0.98]"
          >
            The Autonomous AI{" "}
            <span className="bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 dark:from-cyan-400 dark:via-sky-300 dark:to-indigo-400 bg-clip-text text-transparent">
              Website Studio.
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.16 }}
            className="text-base sm:text-xl md:text-2xl text-zinc-600 dark:text-zinc-300 leading-relaxed max-w-3xl mx-auto font-normal"
          >
            Turn raw business ideas into bespoke, conversion-grade websites in 60 seconds.
            Every layout, color harmony, and sales copy tailored specifically for your business — zero templates, zero code.
          </motion.p>

          {/* Action CTAs */}
          {/* Action CTAs: Balanced Neutral Choice */}
          <motion.div
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.24 }}
            className="flex flex-wrap items-center justify-center gap-4 pt-3"
          >
            <button
              type="button"
              onClick={() => router.push("/agent")}
              className="btn-primary-luminous group inline-flex items-center gap-3 rounded-2xl px-8 py-4 text-base font-bold text-white shadow-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-500/30"
            >
              <Sparkles className="h-5 w-5 text-cyan-200" />
              <span>Talk with AI Agent</span>
              <ArrowRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" />
            </button>

            <button
              type="button"
              onClick={() => router.push(dashboardRoute())}
              className="inline-flex items-center gap-2.5 rounded-2xl border border-zinc-300/90 bg-white/90 px-8 py-4 text-base font-bold text-zinc-900 shadow-xs backdrop-blur-md transition-all duration-200 hover:bg-zinc-100 hover:border-zinc-400 dark:border-white/15 dark:bg-zinc-900/90 dark:text-zinc-100 dark:hover:bg-zinc-800 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
            >
              <span>Use Business Details</span>
              <ArrowRight className="h-4 w-4 text-zinc-400" />
            </button>
          </motion.div>

          {/* Value Proof Badges */}
          <motion.div
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.32 }}
            className="flex flex-wrap items-center justify-center gap-y-3 gap-x-8 pt-6 text-xs font-semibold text-zinc-500 dark:text-zinc-400"
          >
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              <span>Synthesizes in &lt;60s</span>
            </div>
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-cyan-500" />
              <span>Bespoke Brand Layouts</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-blue-500" />
              <span>Instant Edge CDN Hosting</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>Free Plan Available</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
