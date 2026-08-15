"use client";

import { motion } from "framer-motion";
import { Check, X, Clock, DollarSign, Code, Zap } from "lucide-react";

export default function BeforeAfterComparison() {
  return (
    <section className="py-24 px-6 relative overflow-hidden bg-zinc-100/60 dark:bg-zinc-950/40 border-y border-zinc-200/80 dark:border-white/5">
      <div className="mx-auto max-w-6xl">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/60 border border-violet-200/60 dark:border-violet-800/40 px-3.5 py-1.5 rounded-full inline-block mb-3">
            The New Standard
          </span>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-zinc-900 dark:text-white">
            Why build websites the hard way?
          </h2>
          <p className="mt-4 text-sm sm:text-base text-zinc-600 dark:text-zinc-400">
            Compare the slow, expensive traditional agency process against WebsiteBanja&apos;s instant AI studio.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
          {/* Traditional Way */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="rounded-3xl border border-red-200/80 bg-white/80 p-8 shadow-lg dark:border-red-950/40 dark:bg-zinc-900/40 flex flex-col justify-between"
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
                  <DollarSign className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <span><strong>$2,500 – $10,000+</strong> upfront agency quotes or rigid monthly retainers.</span>
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
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="rounded-3xl border border-violet-500/40 bg-gradient-to-b from-violet-50/80 to-white p-8 shadow-xl dark:from-violet-950/30 dark:to-zinc-900/80 flex flex-col justify-between relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-violet-500/10 blur-3xl" />

            <div>
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-violet-200/60 dark:border-violet-500/20">
                <div>
                  <span className="text-xs font-bold uppercase text-violet-600 dark:text-violet-400 tracking-wider">The WebsiteBanja Way</span>
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white mt-0.5">Autonomous AI Studio</h3>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-md shadow-violet-600/30">
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
                  <span>Full visual Studio Editor with drag-and-drop, palette engines, and instant 1-click publishing.</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-4 border-t border-violet-200/60 dark:border-white/10 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
              ✓ Instant, professional, completely autonomous.
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
