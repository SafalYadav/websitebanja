"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import { dashboardRoute } from "@/lib/editorRoutes";
import { Sparkles, FileText, ArrowRight, MessageSquare, SlidersHorizontal, CheckCircle2 } from "lucide-react";

export default function BuildChoiceSection() {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();

  return (
    <section
      id="build-choice"
      className="py-24 sm:py-32 px-6 relative overflow-hidden"
      aria-label="Website Creation Options"
    >
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[800px] rounded-full bg-cyan-500/5 blur-[140px] dark:bg-cyan-500/10" />

      <div className="mx-auto max-w-6xl relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200/60 dark:border-cyan-800/40 px-3.5 py-1.5 rounded-full inline-block">
            Two Streamlined Creation Paths
          </span>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-zinc-950 dark:text-white leading-tight">
            Choose how you want to build
          </h2>
          <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-2xl mx-auto">
            Whether you prefer an intuitive conversation or a direct structured form, WebsiteBanja crafts a bespoke, high-converting website in seconds.
          </p>
        </div>

        {/* 2-Choice Grid with Equal Visual Weight */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
          {/* Path A: Talk with AI Agent */}
          <motion.div
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            whileHover={shouldReduceMotion ? {} : { y: -4 }}
            className="surface-card rounded-3xl p-8 sm:p-10 flex flex-col justify-between group transition-all duration-300"
          >
            <div>
              {/* Header Badge & Icon */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700 dark:bg-cyan-950/80 dark:text-cyan-300 shadow-xs">
                  <Sparkles className="h-6 w-6" />
                </div>
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/60 px-3 py-1 rounded-full border border-cyan-200/70 dark:border-cyan-800/50">
                  Conversational
                </span>
              </div>

              <h3 className="text-2xl font-bold text-zinc-950 dark:text-white mb-3 tracking-tight">
                Talk with AI Agent
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-6">
                Chat or speak naturally with <strong>Mitra AI</strong>, our intelligent website architect. Mitra interviews you about your business, value proposition, and ideal customers to synthesize a custom blueprint.
              </p>

              {/* Feature bullet highlights */}
              <div className="space-y-2.5 mb-8 text-xs text-zinc-700 dark:text-zinc-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-cyan-500 flex-shrink-0" />
                  <span>Real-time voice or text conversational interview</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-cyan-500 flex-shrink-0" />
                  <span>Automatic value proposition extraction</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-cyan-500 flex-shrink-0" />
                  <span>Perfect if you want guided creative direction</span>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-zinc-200/80 dark:border-white/10">
              <button
                type="button"
                onClick={() => router.push("/agent")}
                className="btn-primary-luminous w-full rounded-2xl py-4 px-6 text-sm font-bold text-white flex items-center justify-center gap-2.5 transition cursor-pointer"
              >
                <MessageSquare className="h-4 w-4" />
                <span>Talk with Mitra AI</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </motion.div>

          {/* Path B: Use Business Details */}
          <motion.div
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.08 }}
            whileHover={shouldReduceMotion ? {} : { y: -4 }}
            className="surface-card rounded-3xl p-8 sm:p-10 flex flex-col justify-between group transition-all duration-300"
          >
            <div>
              {/* Header Badge & Icon */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 shadow-xs">
                  <FileText className="h-6 w-6" />
                </div>
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1 rounded-full border border-indigo-200/70 dark:border-indigo-800/50">
                  Structured
                </span>
              </div>

              <h3 className="text-2xl font-bold text-zinc-950 dark:text-white mb-3 tracking-tight">
                Use Business Details
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-6">
                Directly enter your business name, category, core services, and target location. The autonomous pipeline instantly structures all pages and copywriting around your exact parameters.
              </p>

              {/* Feature bullet highlights */}
              <div className="space-y-2.5 mb-8 text-xs text-zinc-700 dark:text-zinc-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                  <span>Structured form for precise specification</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                  <span>Direct industry classification and palette mapping</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                  <span>Perfect if you already have existing business copy</span>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-zinc-200/80 dark:border-white/10">
              <button
                type="button"
                onClick={() => router.push(dashboardRoute())}
                className="btn-primary-luminous w-full rounded-2xl py-4 px-6 text-sm font-bold text-white flex items-center justify-center gap-2.5 transition cursor-pointer"
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span>Enter Business Details</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
