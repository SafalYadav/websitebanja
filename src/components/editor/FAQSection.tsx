"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { HelpCircle, ChevronDown } from "lucide-react";
import type { FAQ } from "@/types/website";

interface FAQSectionProps {
  faq?: FAQ[] | null;
}

export default function FAQSection({ faq }: FAQSectionProps) {
  const shouldReduceMotion = useReducedMotion();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const safeFaq = Array.isArray(faq)
    ? faq.filter((item): item is FAQ => Boolean(item && typeof item === "object"))
    : [];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  if (safeFaq.length === 0) {
    return (
      <section
        className="relative py-16 px-6 sm:px-10 text-center"
        style={{
          backgroundColor: "var(--wb-bg)",
          borderColor: "var(--wb-border)",
        }}
      >
        <div className="mx-auto max-w-xl p-8 rounded-3xl border border-dashed border-[var(--wb-border)]">
          <HelpCircle className="h-6 w-6 mx-auto mb-2 text-[var(--wb-primary)]" />
          <h3 className="text-base font-bold" style={{ color: "var(--wb-fg)" }}>
            FAQ Section
          </h3>
          <p className="text-xs mt-1" style={{ color: "var(--wb-muted)" }}>
            No questions listed yet. Add items in the inspector panel.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="relative py-24 sm:py-32 px-6 sm:px-10 overflow-hidden">
      {/* Soft background ambient glow */}
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full blur-3xl opacity-20 -z-10"
        style={{ backgroundColor: "var(--wb-glow-primary)" }}
      />

      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="text-center mb-16 space-y-3">
          <div
            className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-wider border backdrop-blur-sm"
            style={{
              backgroundColor: "var(--wb-surface)",
              borderColor: "var(--wb-border)",
              color: "var(--wb-primary)",
            }}
          >
            <HelpCircle className="h-3.5 w-3.5" />
            <span>Got Questions?</span>
          </div>

          <h2
            className="text-3xl sm:text-5xl font-extrabold tracking-tight"
            style={{ color: "var(--wb-fg)" }}
          >
            Frequently Asked Questions
          </h2>

          <p className="text-sm sm:text-base leading-relaxed" style={{ color: "var(--wb-muted)" }}>
            Everything you need to know about our workflow, deliverables, and service standards.
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-4">
          {safeFaq.map((item, index) => {
            const isOpen = openIndex === index;

            return (
              <motion.div
                key={index}
                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: index * 0.04 }}
                className="rounded-3xl border transition-all duration-300 shadow-lg overflow-hidden backdrop-blur-xl"
                style={{
                  backgroundColor: "var(--wb-surface)",
                  borderColor: isOpen ? "var(--wb-primary)" : "var(--wb-border)",
                  boxShadow: isOpen ? "0 10px 30px -10px var(--wb-glow-primary)" : undefined,
                }}
              >
                <button
                  type="button"
                  onClick={() => toggleFAQ(index)}
                  className="w-full flex items-center justify-between gap-4 p-6 sm:p-7 text-left transition"
                >
                  <span
                    className="text-base sm:text-lg font-bold tracking-tight"
                    style={{ color: isOpen ? "var(--wb-primary)" : "var(--wb-fg)" }}
                  >
                    {item.question}
                  </span>
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-2xl border flex-shrink-0 transition-transform duration-300"
                    style={{
                      borderColor: "var(--wb-border)",
                      backgroundColor: isOpen ? "var(--wb-glow-primary)" : "transparent",
                      color: isOpen ? "var(--wb-primary)" : "var(--wb-muted)",
                      transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                    >
                      <div className="px-6 sm:px-7 pb-7 pt-1 border-t border-[var(--wb-border)]">
                        <p
                          className="text-sm sm:text-base leading-relaxed"
                          style={{ color: "var(--wb-muted)" }}
                        >
                          {item.answer}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}