"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, Sparkles } from "lucide-react";

const faqs = [
  {
    question: "How does WebsiteBanja build websites?",
    answer:
      "Simply describe your business and our AI automatically generates a complete modern website with sections, images, content and responsive layouts.",
  },
  {
    question: "Do I need coding knowledge?",
    answer:
      "No. WebsiteBanja is built for everyone. You can generate, edit and publish websites without writing any code.",
  },
  {
    question: "Can I connect my own domain?",
    answer:
      "Yes. You can connect your custom domain and publish your website with just a few clicks.",
  },
  {
    question: "Can I edit the AI generated website?",
    answer:
      "Absolutely. Edit text, images, colors and layouts anytime using our visual editor or AI.",
  },
  {
    question: "Is hosting included?",
    answer:
      "Yes. Hosting is included for supported plans, so your website is ready to go live instantly.",
  },
  {
    question: "Can I export my website?",
    answer:
      "Export functionality will be available for supported plans, giving you full flexibility over your project.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
   <section
  id="faq"
  className="relative overflow-hidden bg-[#050505] py-32"
>

      <div className="absolute left-1/2 top-20 h-[450px] w-[450px] -translate-x-1/2 rounded-full bg-violet-600/10 blur-[150px]" />

      <div className="relative mx-auto max-w-5xl px-6">

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: .6 }}
          viewport={{ once: true }}
          className="text-center"
        >

          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2">

            <Sparkles className="h-4 w-4 text-violet-400"/>

            <span className="text-sm text-zinc-300">
              FAQ
            </span>

          </div>

          <h2 className="mt-8 text-5xl font-black text-white md:text-6xl">

            Frequently Asked

            <br />

            Questions

          </h2>

        </motion.div>

        <div className="mt-20 space-y-5">
                      {faqs.map((faq, index) => (
            <motion.div
              key={faq.question}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.4,
                delay: index * 0.08,
              }}
              viewport={{ once: true }}
              className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl"
            >

              <button
                onClick={() =>
                  setOpen(open === index ? null : index)
                }
                className="flex w-full items-center justify-between p-7 text-left"
              >

                <h3 className="text-xl font-semibold text-white">

                  {faq.question}

                </h3>

                <ChevronDown
                  className={`h-6 w-6 text-zinc-400 transition duration-300 ${
                    open === index ? "rotate-180" : ""
                  }`}
                />

              </button>

              <div
                className={`grid transition-all duration-300 ${
                  open === index
                    ? "grid-rows-[1fr]"
                    : "grid-rows-[0fr]"
                }`}
              >

                <div className="overflow-hidden">

                  <p className="px-7 pb-7 leading-8 text-zinc-400">

                    {faq.answer}

                  </p>

                </div>

              </div>

            </motion.div>
          ))}
                  </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="mt-20 text-center"
        >

          <p className="text-lg text-zinc-400">

            Still have questions?

          </p>

          <button className="mt-6 rounded-2xl bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 px-8 py-4 font-semibold text-white transition hover:scale-105">

            Contact Us

          </button>

        </motion.div>

      </div>

    </section>
  );
}