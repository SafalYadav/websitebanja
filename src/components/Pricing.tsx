"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { signupRoute } from "@/lib/editorRoutes";
import { PLANS, formatINR } from "@/lib/plans";
import { Check, X, Sparkles } from "lucide-react";

export default function Pricing() {
  const router = useRouter();
  const freePlan = PLANS.free;
  const proPlan = PLANS.paid_pro;

  return (
    <section id="pricing" className="py-24 px-6 relative">
      <div className="mx-auto max-w-7xl">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/60 border border-violet-200/60 dark:border-violet-800/40 px-3.5 py-1.5 rounded-full inline-block">
            Fair & Transparent
          </span>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-zinc-900 dark:text-white">
            Start for free, upgrade when you grow
          </h2>
          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400">
            No credit card required to start. Build, customize, and publish your first business website today.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free Starter Tier */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="rounded-3xl border border-zinc-200/80 bg-white/70 p-8 shadow-xs backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/40 flex flex-col justify-between"
          >
            <div>
              <div className="mb-6">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">{freePlan.name}</span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-4xl sm:text-5xl font-black text-zinc-900 dark:text-white">
                    {formatINR(freePlan.priceINR)}
                  </span>
                  <span className="text-sm text-zinc-500">/ {freePlan.period}</span>
                </div>
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-2">
                  {freePlan.description}
                </p>
              </div>

              <div className="space-y-3.5 pt-6 border-t border-zinc-200/60 dark:border-white/5 text-sm text-zinc-700 dark:text-zinc-300">
                {freePlan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    {feature.included ? (
                      <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <X className="h-4 w-4 text-zinc-400 flex-shrink-0 opacity-60" />
                    )}
                    <span className={feature.included ? "" : "text-zinc-400 line-through opacity-70"}>
                      {feature.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => router.push(signupRoute())}
              className="mt-8 w-full rounded-2xl border border-zinc-300 bg-white py-3.5 text-sm font-bold text-zinc-800 shadow-xs hover:bg-zinc-100 dark:border-white/10 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700 transition"
            >
              Get Started Free
            </button>
          </motion.div>

          {/* Paid Pro Tier (₹2,000/month) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="rounded-3xl border border-violet-500/50 bg-gradient-to-b from-violet-50/70 to-white p-8 shadow-xl backdrop-blur-md dark:from-violet-950/30 dark:to-zinc-900/80 flex flex-col justify-between relative overflow-hidden"
          >
            <div className="absolute top-4 right-4">
              <span className="flex items-center gap-1 rounded-full bg-violet-600 px-3 py-1 text-[11px] font-bold text-white shadow-md shadow-violet-600/30">
                <Sparkles className="h-3 w-3" />
                {proPlan.badge}
              </span>
            </div>

            <div>
              <div className="mb-6">
                <span className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                  {proPlan.name}
                </span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-4xl sm:text-5xl font-black text-zinc-900 dark:text-white">
                    {formatINR(proPlan.priceINR)}
                  </span>
                  <span className="text-sm text-zinc-500">/ {proPlan.period}</span>
                </div>
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-2">
                  {proPlan.description}
                </p>
              </div>

              <div className="space-y-3.5 pt-6 border-t border-violet-200/60 dark:border-violet-500/20 text-sm text-zinc-800 dark:text-zinc-200">
                {proPlan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    <span className={feature.highlight ? "font-bold text-violet-700 dark:text-violet-300" : ""}>
                      {feature.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => router.push(signupRoute())}
              className="mt-8 w-full rounded-2xl bg-gradient-to-r from-blue-600 via-violet-600 to-indigo-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-600/30 hover:opacity-95 active:scale-[0.99] transition"
            >
              Upgrade to Pro ({formatINR(proPlan.priceINR)}/mo)
            </button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
