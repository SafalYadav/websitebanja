"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import { dashboardRoute } from "@/lib/editorRoutes";
import { ArrowRight, Sparkles, Zap, ShieldCheck, Globe } from "lucide-react";
import InteractiveDemo from "@/components/landing/InteractiveDemo";

export default function Hero() {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();

  const scrollTo = (target: string) => {
    const el = document.querySelector(target);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <section id="home" className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 overflow-hidden">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 h-[450px] w-[650px] rounded-full bg-violet-600/10 blur-[140px] dark:bg-violet-600/15" />
      <div className="pointer-events-none absolute top-20 right-10 h-72 w-72 rounded-full bg-blue-500/10 blur-[120px]" />
      <div className="pointer-events-none absolute top-40 left-10 h-72 w-72 rounded-full bg-cyan-500/10 blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-6">
        {/* Main Hero Header */}
        <div className="text-center max-w-3xl mx-auto space-y-6">
          {/* Badge */}
          <motion.div
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50/80 px-4 py-1.5 backdrop-blur-md dark:border-violet-800/40 dark:bg-violet-950/40"
          >
            <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            <span className="text-xs font-semibold tracking-wide text-violet-700 dark:text-violet-300">
              Next-Gen Autonomous AI Website Builder
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
            className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-zinc-900 dark:text-white leading-[1.08]"
          >
            Describe your business.{" "}
            <span className="bg-gradient-to-r from-blue-600 via-violet-600 to-indigo-600 bg-clip-text text-transparent">
              AI builds your website.
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.2 }}
            className="text-base sm:text-xl text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-2xl mx-auto"
          >
            Generate complete, multi-section business websites in 60 seconds with bespoke copywriting, palettes, and live visual studio editing. Zero coding or templates required.
          </motion.p>

          {/* Action CTAs */}
          <motion.div
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.3 }}
            className="flex flex-wrap items-center justify-center gap-4 pt-2"
          >
            <button
              type="button"
              onClick={() => router.push(dashboardRoute())}
              className="flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-blue-600 via-violet-600 to-indigo-600 px-8 py-4 text-base font-bold text-white shadow-xl shadow-violet-600/25 transition hover:opacity-95 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Create Website Free</span>
              <ArrowRight className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={() => scrollTo("#how-it-works")}
              className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-7 py-4 text-base font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-100 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              See How It Works
            </button>
          </motion.div>

          {/* Key Value Points */}
          <motion.div
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="flex flex-wrap items-center justify-center gap-6 pt-4 text-xs font-medium text-zinc-500 dark:text-zinc-400"
          >
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              <span>Instant 60s Generation</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-blue-500" />
              <span>1-Click Global Publishing</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>No Credit Card Required</span>
            </div>
          </motion.div>
        </div>

        {/* Live Interactive Product Demo Showcase */}
        <motion.div
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="mt-14"
        >
          <InteractiveDemo />
        </motion.div>
      </div>
    </section>
  );
}
