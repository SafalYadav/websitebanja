"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import { signupRoute } from "@/lib/editorRoutes";
import { PLANS, formatINR } from "@/lib/plans";
import { Check, X, Sparkles } from "lucide-react";

export default function Pricing() {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const freePlan = PLANS.free;
  const proPlan = PLANS.paid_pro;

  return (
    <section id="pricing" className="py-24 sm:py-32 px-6 relative overflow-hidden" aria-label="Pricing Plans">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[800px] rounded-full bg-cyan-500/5 blur-[160px] dark:bg-cyan-500/10" />

      <div className="mx-auto max-w-7xl relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200/60 dark:border-cyan-800/40 px-3.5 py-1.5 rounded-full inline-block">
            Fair & Transparent
          </span>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-zinc-900 dark:text-white">
            Start for free, upgrade when you grow
          </h2>
          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
            No hidden fees or unexpected charges. Build, customize, and publish your first business website today.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto items-stretch">
          {/* Free Starter Tier */}
          <motion.article
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35 }}
            className="surface-card rounded-3xl p-8 sm:p-9 flex flex-col justify-between"
          >
            <div>
              <div className="mb-6 pb-6 border-b border-zinc-200/80 dark:border-white/10">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  {freePlan.name}
                </span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-4xl sm:text-5xl font-black text-zinc-900 dark:text-white tracking-tight">
                    {formatINR(freePlan.priceINR)}
                  </span>
                  <span className="text-sm font-medium text-zinc-500">/ {freePlan.period}</span>
                </div>
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-2 leading-relaxed">
                  {freePlan.description}
                </p>
              </div>

              <div className="space-y-3.5 text-sm text-zinc-700 dark:text-zinc-300">
                {freePlan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    {feature.included ? (
                      <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <X className="h-4 w-4 text-zinc-400 flex-shrink-0 opacity-50" />
                    )}
                    <span className={feature.included ? "" : "text-zinc-400 line-through opacity-60"}>
                      {feature.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => router.push(signupRoute())}
              className="mt-8 w-full rounded-2xl border border-zinc-300 bg-white py-3.5 text-sm font-bold text-zinc-800 shadow-xs hover:bg-zinc-100 active:scale-[0.99] dark:border-white/10 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
            >
              Get Started Free
            </button>
          </motion.article>

          {/* Paid Pro Tier (₹500/month) */}
          <motion.article
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, delay: 0.08 }}
            className="rounded-3xl border-2 border-cyan-500/60 bg-gradient-to-b from-cyan-50/80 via-white to-white p-8 sm:p-9 shadow-xl backdrop-blur-md dark:from-cyan-950/40 dark:via-[#0A0B10] dark:to-[#0A0B10] flex flex-col justify-between relative overflow-hidden surface-tactile"
          >
            <div className="absolute top-4 right-4">
              <span className="flex items-center gap-1 rounded-full bg-cyan-600 px-3 py-1 text-[11px] font-bold text-white shadow-md shadow-cyan-600/30">
                <Sparkles className="h-3 w-3" />
                {proPlan.badge}
              </span>
            </div>

            <div>
              <div className="mb-6 pb-6 border-b border-cyan-200/60 dark:border-cyan-500/20">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                  {proPlan.name}
                </span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-4xl sm:text-5xl font-black text-zinc-900 dark:text-white tracking-tight">
                    {formatINR(proPlan.priceINR)}
                  </span>
                  <span className="text-sm font-medium text-zinc-500">/ {proPlan.period}</span>
                </div>
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-2 leading-relaxed">
                  {proPlan.description}
                </p>
              </div>

              <div className="space-y-3.5 text-sm text-zinc-800 dark:text-zinc-200">
                {proPlan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    <span className={feature.highlight ? "font-bold text-cyan-700 dark:text-cyan-300" : ""}>
                      {feature.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => router.push(signupRoute())}
              className="btn-primary-luminous mt-8 w-full rounded-2xl py-3.5 text-sm font-bold text-white shadow-lg transition cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-500/30"
            >
              Upgrade to Pro ({formatINR(proPlan.priceINR)}/mo)
            </button>
          </motion.article>
        </div>
      </div>
    </section>
  );
}
