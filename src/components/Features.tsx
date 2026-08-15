"use client";

import { motion } from "framer-motion";
import {
  PenTool,
  Palette,
  Layers,
  Smartphone,
  Globe2,
  Search,
} from "lucide-react";

const FEATURES = [
  {
    icon: PenTool,
    title: "AI Copywriter Engine",
    description: "Generates industry-specific headlines, value propositions, feature descriptions, and calls-to-action that actually convert visitors.",
  },
  {
    icon: Palette,
    title: "Dynamic Palette Engine",
    description: "Applies harmonized brand color palettes, font pairings, and contrast tokens tailored to your business identity.",
  },
  {
    icon: Layers,
    title: "Section Drag-and-Drop Studio",
    description: "Effortlessly reorder, duplicate, delete, and add new sections (Hero, About, Services, Features, FAQ, Contact, Footer).",
  },
  {
    icon: Smartphone,
    title: "Multi-Device Responsive Canvas",
    description: "Preview and test your website fluidly across Desktop, Tablet, and Mobile viewports with zero layout shifts.",
  },
  {
    icon: Globe2,
    title: "1-Click Global Publishing",
    description: "Launch directly to a fast, secure public URL with zero server management, global CDN caching, and SSL certificates.",
  },
  {
    icon: Search,
    title: "Built-In SEO & Social Cards",
    description: "Automatic title tags, meta descriptions, and OpenGraph social share previews pre-configured for search engines.",
  },
];

export default function Features() {
  return (
    <section id="features" className="py-24 px-6 relative">
      <div className="mx-auto max-w-7xl">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/60 border border-violet-200/60 dark:border-violet-800/40 px-3.5 py-1.5 rounded-full inline-block">
            Engineered For Excellence
          </span>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-zinc-900 dark:text-white">
            Everything you need to launch a world-class website
          </h2>
          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400">
            Professional AI architecture under the hood, intuitive visual controls on top.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.08 }}
                className="rounded-3xl border border-zinc-200/80 bg-white/70 p-7 shadow-xs backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/40 hover:shadow-md hover:border-violet-300 dark:hover:border-violet-500/30 transition group"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-400 mb-5 transition group-hover:scale-105">
                  <Icon className="h-6 w-6" />
                </div>

                <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">
                  {feat.title}
                </h3>

                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {feat.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
