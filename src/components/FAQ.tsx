"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

const FAQS = [
  {
    q: "Do I need coding or design skills to use WebsiteBanja?",
    a: "None at all. You simply describe what your business does and our autonomous AI pipeline writes the copy, pairs the palettes, structures the sections, and renders the website in the visual studio.",
  },
  {
    q: "Can I customize the website after the AI builds it?",
    a: "Yes! WebsiteBanja includes a complete visual Studio Editor. You can edit any text, drag and drop sections to reorder them, duplicate sections, adjust brand colors, and add new sections anytime with real-time live preview.",
  },
  {
    q: "How does the Free Plan work?",
    a: "The Free Plan allows up to 3 AI requests per 7-day rolling window, giving you full access to planning, generation, the visual editor, autosave, and free public subdomain publishing at no cost.",
  },
  {
    q: "Is the generated website responsive on mobile and tablet?",
    a: "Absolutely. Every generated layout is built from the ground up to adapt fluidly across Desktop, Tablet, and Mobile screens. You can preview all viewports directly inside the Studio Editor.",
  },
  {
    q: "How does 1-click publishing work?",
    a: "When you are happy with your website, simply click 'Publish' in the Studio toolbar. Your site is deployed immediately to a high-speed global CDN with SSL encryption and a permanent public link.",
  },
];

export default function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section id="faq" className="py-24 px-6 relative">
      <div className="mx-auto max-w-4xl">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/60 border border-violet-200/60 dark:border-violet-800/40 px-3.5 py-1.5 rounded-full inline-block">
            Frequently Asked Questions
          </span>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-zinc-900 dark:text-white">
            Everything you need to know
          </h2>
          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400">
            Got questions? We have answers. If you need further assistance, reach out anytime.
          </p>
        </div>

        <div className="space-y-4">
          {FAQS.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={faq.q}
                className="rounded-2xl border border-zinc-200/80 bg-white/70 backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/40 overflow-hidden shadow-xs"
              >
                <button
                  type="button"
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="flex w-full items-center justify-between p-6 text-left font-semibold text-zinc-900 dark:text-white"
                >
                  <span className="text-base sm:text-lg">{faq.q}</span>
                  <ChevronDown
                    className={`h-5 w-5 flex-shrink-0 text-zinc-400 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-violet-600 dark:text-violet-400" : ""
                    }`}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                    >
                      <div className="px-6 pb-6 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed border-t border-zinc-100 dark:border-white/5 pt-4">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}