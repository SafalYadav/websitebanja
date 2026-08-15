"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { signupRoute } from "@/lib/editorRoutes";
import { ArrowRight, Sparkles } from "lucide-react";

export default function CtaSection() {
  const router = useRouter();

  return (
    <section className="py-20 px-6 relative overflow-hidden">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="relative rounded-3xl border border-violet-500/30 bg-gradient-to-tr from-violet-600 via-indigo-600 to-blue-600 p-10 sm:p-16 text-center text-white shadow-2xl overflow-hidden"
        >
          {/* Background circles */}
          <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-black/20 blur-3xl" />

          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 backdrop-blur-md">
              <Sparkles className="h-4 w-4 text-white" />
              <span className="text-xs font-semibold uppercase tracking-wider text-white">
                Ready to Launch?
              </span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
              Build your modern business website in the next 60 seconds
            </h2>

            <p className="text-sm sm:text-base text-white/80 leading-relaxed max-w-xl mx-auto">
              Join thousands of founders, creators, and business owners building faster with WebsiteBanja AI.
            </p>

            <div className="pt-2 flex flex-wrap justify-center gap-4">
              <button
                type="button"
                onClick={() => router.push(signupRoute())}
                className="flex items-center gap-2 rounded-2xl bg-white px-8 py-4 text-base font-bold text-zinc-900 shadow-xl transition hover:bg-zinc-100 hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Get Started For Free</span>
                <ArrowRight className="h-5 w-5 text-zinc-900" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
