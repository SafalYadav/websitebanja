"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import { signupRoute } from "@/lib/editorRoutes";
import { ArrowRight, Sparkles } from "lucide-react";

export default function CtaSection() {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="py-20 sm:py-28 px-6 relative overflow-hidden" aria-label="Call to Action">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="relative rounded-3xl border border-cyan-500/30 bg-gradient-to-tr from-[#040406] via-[#0A0B10] to-[#0A1424] p-10 sm:p-16 text-center text-white shadow-2xl overflow-hidden surface-tactile"
        >
          {/* Ambient glow mesh */}
          <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-cyan-500/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-indigo-600/15 blur-3xl" />

          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-950/60 px-4 py-1.5 backdrop-blur-md">
              <Sparkles className="h-4 w-4 text-cyan-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
                Ready to Launch?
              </span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
              Build your modern business website in the next 60 seconds
            </h2>

            <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-xl mx-auto">
              Join founders, creators, and business owners building faster with WebsiteBanja AI. Zero boilerplate, bespoke architecture.
            </p>

            <div className="pt-3 flex flex-wrap justify-center gap-4">
              <button
                type="button"
                onClick={() => router.push(signupRoute())}
                className="btn-primary-luminous inline-flex items-center gap-2.5 rounded-2xl px-8 py-4 text-base font-bold text-white shadow-xl transition hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <span>Get Started For Free</span>
                <ArrowRight className="h-5 w-5 text-white" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
