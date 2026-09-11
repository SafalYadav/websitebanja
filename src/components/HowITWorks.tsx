"use client";

import { motion, useReducedMotion } from "framer-motion";
import { MessageSquareText, Cpu, LayoutGrid, Rocket, ArrowRight, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { dashboardRoute } from "@/lib/editorRoutes";

const PIPELINE_STEPS = [
  {
    step: "01",
    phase: "DISCOVERY & INTAKE",
    icon: MessageSquareText,
    title: "Conversational or Guided Intake",
    description: "Consult in real-time with Mitra AI Architect via voice or chat, or fill out our guided business questionnaire. Zero technical terms needed.",
    color: "from-cyan-500 to-blue-500",
    glow: "rgba(6, 182, 212, 0.15)",
    highlights: ["Mitra AI Architect", "Voice & Chat options", "Industry detection"],
  },
  {
    step: "02",
    phase: "BESPOKE SYNTHESIS",
    icon: Cpu,
    title: "Autonomous Design & Copywriting",
    description: "Our system crafts tailored copy, pairs harmonious WCAG AAA palettes, and structures conversion-focused responsive sections.",
    color: "from-blue-500 to-indigo-500",
    glow: "rgba(59, 130, 246, 0.15)",
    highlights: ["Persuasive Sales Copy", "Harmonious Palettes", "Zero Generic Templates"],
  },
  {
    step: "03",
    phase: "STUDIO WORKBENCH",
    icon: LayoutGrid,
    title: "Visual Drag & Drop Customization",
    description: "Tweak copy inline, reorder or duplicate sections, test fluid desktop/tablet/mobile viewports, and refine palettes with live feedback.",
    color: "from-indigo-500 to-cyan-500",
    glow: "rgba(99, 102, 241, 0.15)",
    highlights: ["Live viewport switcher", "Instant local autosave", "Full section control"],
  },
  {
    step: "04",
    phase: "GLOBAL EDGE DEPLOY",
    icon: Rocket,
    title: "1-Click Global Publishing",
    description: "Launch directly to our ultra-fast global CDN with automatic SSL certificates, SEO meta tags, OpenGraph previews, and custom slugs.",
    color: "from-emerald-500 to-teal-500",
    glow: "rgba(16, 185, 129, 0.15)",
    highlights: ["Sub-50ms edge delivery", "Free public URL", "SSL & SEO ready"],
  },
];

export default function HowItWorks() {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();

  return (
    <section id="how-it-works" className="py-24 sm:py-32 px-6 relative overflow-hidden" aria-label="How WebsiteBanja Works">
      <div className="mx-auto max-w-7xl relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200/60 dark:border-cyan-800/40 px-3.5 py-1.5 rounded-full inline-block">
            The Studio Process
          </span>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-zinc-950 dark:text-white leading-tight">
            From raw concept to published website in 60 seconds
          </h2>
          <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-2xl mx-auto">
            Experience a frictionless creation pipeline that replaces months of agency back-and-forth with instantaneous, bespoke intelligence.
          </p>
        </div>

        {/* Interconnected Timeline Grid */}
        <div className="relative">
          {/* Subtle connecting line for desktop */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500/20 via-blue-500/40 to-emerald-500/20 -translate-y-12 z-0" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
            {PIPELINE_STEPS.map((item, idx) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.step}
                  initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: idx * 0.08 }}
                  whileHover={shouldReduceMotion ? {} : { y: -4 }}
                  className="surface-card rounded-3xl p-7 transition-all duration-300 flex flex-col justify-between group"
                  style={{
                    boxShadow: `0 10px 30px -15px ${item.glow}`,
                  }}
                >
                  <div>
                    {/* Header: Icon & Step Number */}
                    <div className="flex items-center justify-between mb-6">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr ${item.color} text-white shadow-md transition-transform duration-200 group-hover:scale-105`}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className="font-mono text-2xl font-black text-zinc-300 dark:text-zinc-700">
                        {item.step}
                      </span>
                    </div>

                    {/* Phase Tag */}
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 block mb-2">
                      {item.phase}
                    </span>

                    <h3 className="text-lg font-bold text-zinc-950 dark:text-white mb-2 leading-snug">
                      {item.title}
                    </h3>

                    <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-6">
                      {item.description}
                    </p>
                  </div>

                  {/* Highlights checklist */}
                  <div className="pt-4 border-t border-zinc-100 dark:border-white/5 space-y-2">
                    {item.highlights.map((highlight) => (
                      <div key={highlight} className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                        <span>{highlight}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Bottom CTA bar */}
        <div className="mt-16 text-center">
          <button
            type="button"
            onClick={() => router.push(dashboardRoute())}
            className="btn-primary-luminous inline-flex items-center gap-2.5 rounded-2xl px-8 py-4 text-sm font-bold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <span>Start Building in the Studio</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
