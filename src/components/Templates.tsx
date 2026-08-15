"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { dashboardRoute } from "@/lib/editorRoutes";
import { ArrowRight, ExternalLink } from "lucide-react";

const SHOWCASE_ITEMS = [
  {
    title: "Artisan Coffee Roasters",
    category: "Food & Beverage",
    tagline: "Single-origin micro-lots roasted with precision and sustainability.",
    accent: "#d97706",
    sections: ["Hero with Bean Showcase", "Roast Profiles", "Tasting Notes", "Visit Cafe"],
  },
  {
    title: "Apex Fitness & Performance",
    category: "Health & Fitness",
    tagline: "High-intensity athletic training and personalized nutrition coaching.",
    accent: "#ef4444",
    sections: ["Dynamic Video Hero", "Class Schedules", "Trainer Bios", "Free Trial Pass"],
  },
  {
    title: "Vanguard Legal Advisory",
    category: "Professional Services",
    tagline: "Corporate law, intellectual property, and venture financings.",
    accent: "#3b82f6",
    sections: ["Trust Hero", "Practice Areas", "Partner Profiles", "Case Evaluation"],
  },
  {
    title: "Lumina Dental Studio",
    category: "Healthcare",
    tagline: "Comfort-first preventive and cosmetic dentistry in modern clinics.",
    accent: "#06b6d4",
    sections: ["Smile Hero", "Treatments List", "Patient Reviews", "Book Online"],
  },
];

export default function Templates() {
  const router = useRouter();

  return (
    <section id="showcase" className="py-24 px-6 relative">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div className="max-w-2xl space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/60 border border-violet-200/60 dark:border-violet-800/40 px-3.5 py-1.5 rounded-full inline-block">
              Infinite Possibilities
            </span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-zinc-900 dark:text-white">
              Generated for any industry
            </h2>
            <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400">
              No generic cookie-cutter templates. Every website is synthesized uniquely from your business profile.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push(dashboardRoute())}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-violet-600/20 hover:bg-violet-700 transition"
          >
            <span>Build Your Own</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {SHOWCASE_ITEMS.map((item, idx) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.1 }}
              className="rounded-3xl border border-zinc-200/80 bg-white/70 p-6 sm:p-8 shadow-xs backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/40 hover:shadow-lg transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-4 mb-4">
                  <span
                    className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full"
                    style={{
                      backgroundColor: `${item.accent}15`,
                      color: item.accent,
                    }}
                  >
                    {item.category}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-zinc-400">
                    <span>Autonomous AI Build</span>
                    <ExternalLink className="h-3 w-3" />
                  </div>
                </div>

                <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
                  {item.title}
                </h3>

                <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-6">
                  {item.tagline}
                </p>

                {/* Section Structure Chips */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {item.sections.map((sec) => (
                    <span
                      key={sec}
                      className="rounded-lg bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-300"
                    >
                      {sec}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-200/60 dark:border-white/5 flex items-center justify-between">
                <span className="text-xs text-zinc-500">Live Production Preview</span>
                <button
                  type="button"
                  onClick={() => router.push(dashboardRoute())}
                  className="text-xs font-bold text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1"
                >
                  Generate Similar
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}