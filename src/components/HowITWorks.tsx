"use client";

import { motion } from "framer-motion";
import { MessageSquareText, Cpu, LayoutGrid, Rocket } from "lucide-react";

const STEPS = [
  {
    step: "01",
    icon: MessageSquareText,
    title: "Describe Your Business",
    description: "Enter your business name, industry, mission, target audience, and preferred aesthetic. No technical jargon needed.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    step: "02",
    icon: Cpu,
    title: "AI Architecture Engine",
    description: "Our multi-agent pipeline analyzes your industry, generates persuasive copywriting, and structures responsive sections.",
    color: "from-violet-500 to-purple-500",
  },
  {
    step: "03",
    icon: LayoutGrid,
    title: "Customize in Studio",
    description: "Fine-tune headlines, drag & drop sections, tweak palettes, and inspect responsive desktop, tablet, and mobile views.",
    color: "from-purple-500 to-pink-500",
  },
  {
    step: "04",
    icon: Rocket,
    title: "1-Click Instant Launch",
    description: "Publish your live website with a single click. Instant global CDN hosting, SSL encryption, and high SEO performance.",
    color: "from-emerald-500 to-teal-500",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 px-6 relative">
      <div className="mx-auto max-w-7xl">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/60 border border-violet-200/60 dark:border-violet-800/40 px-3.5 py-1.5 rounded-full inline-block">
            Simple 4-Step Process
          </span>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-zinc-900 dark:text-white">
            From idea to published website in minutes
          </h2>
          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400">
            How WebsiteBanja AI transforms simple business prompts into complete, conversion-focused websites.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                className="relative rounded-3xl border border-zinc-200/80 bg-white/70 p-6 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/40 hover:shadow-md transition group"
              >
                <div className="flex items-center justify-between mb-5">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr ${item.color} text-white shadow-md transition group-hover:scale-105`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="font-mono text-2xl font-black text-zinc-300 dark:text-zinc-700">
                    {item.step}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">
                  {item.title}
                </h3>

                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {item.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
