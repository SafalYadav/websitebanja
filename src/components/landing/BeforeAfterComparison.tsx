"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check, X, Clock, IndianRupee, Code, Zap } from "lucide-react";

export default function BeforeAfterComparison() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section
      id="why-websitebanja"
      className="py-24 sm:py-32 px-6 relative overflow-hidden bg-zinc-100/60 dark:bg-[#060709] border-y border-zinc-200/80 dark:border-white/5"
      aria-label="Why WebsiteBanja Comparison"
    >
      <div className="mx-auto max-w-6xl relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200/60 dark:border-cyan-800/40 px-3.5 py-1.5 rounded-full inline-block">
            The Modern Standard
          </span>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-zinc-900 dark:text-white">
            Why build websites the hard way?
          </h2>
          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400">
            Compare the slow, expensive traditional agency process against WebsiteBanja&apos;s instant AI studio.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
          {/* Traditional Way */}
          <motion.div
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="rounded-3xl border border-red-200/80 bg-white/80 p-8 sm:p-10 shadow-lg dark:border-red-950/40 dark:bg-[#0A0B10]/80 flex flex-col justify-between surface-tactile"
          >
            <div>
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-200 dark:border-white/10">
                <div>
                  <span className="text-xs font-bold uppercase text-red-500 tracking-wider">Traditional Method</span>
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white mt-0.5">Agencies & Templates</h3>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400">
                  <X className="h-5 w-5" />
                </div>
              </div>

              <ul className="space-y-4 text-sm text-zinc-600 dark:text-zinc-400">
                <li className="flex items-start gap-3">
                  <Clock className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <span><strong>3 to 6 Weeks</strong> turnaround with endless email back-and-forth.</span>
                </li>
                <li className="flex items-start gap-3">
                  <IndianRupee className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <span><strong>₹50,000 – ₹2,00,000+</strong> upfront agency quotes or rigid monthly retainers.</span>
                </li>
                <li className="flex items-start gap-3">
                  <Code className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <span>Generic templates stuffed with bloated plugins, slow load times, and complex codebases.</span>
                </li>
                <li className="flex items-start gap-3">
                  <X className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <span>You write all the marketing copy, headlines, and value propositions yourself.</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-4 border-t border-zinc-100 dark:border-white/5 text-xs text-red-500/90 font-medium">
              ❌ High friction, high cost, slow execution.
            </div>
          </motion.div>

          {/* WebsiteBanja AI */}
          <motion.div
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="rounded-3xl border border-cyan-500/40 bg-gradient-to-b from-cyan-50/80 via-white to-white p-8 sm:p-10 shadow-xl dark:from-cyan-950/30 dark:via-[#0A0B10] dark:to-[#0A0B10] flex flex-col justify-between relative overflow-hidden surface-tactile"
          >
            <div className="pointer-events-none absolute top-0 right-0 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl" />

            <div>
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-cyan-200/60 dark:border-cyan-500/20">
                <div>
                  <span className="text-xs font-bold uppercase text-cyan-600 dark:text-cyan-400 tracking-wider">The WebsiteBanja Way</span>
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white mt-0.5">Autonomous AI Studio</h3>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-600 text-white shadow-md shadow-cyan-600/30">
                  <Zap className="h-5 w-5" />
                </div>
              </div>

              <ul className="space-y-4 text-sm text-zinc-700 dark:text-zinc-300">
                <li className="flex items-start gap-3">
                  <Check className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span><strong>60 Seconds</strong> from business description to fully functional website.</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span><strong>100% Free</strong> to generate, customize, and publish your first website.</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>Bespoke AI copywriter crafts compelling sales copy tailored to your industry.</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>Full visual Studio Editor with drag-and-drop, color harmonies, and instant 1-click publishing.</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-4 border-t border-cyan-200/60 dark:border-white/10 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
              ✓ Instant, professional, completely autonomous.
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
