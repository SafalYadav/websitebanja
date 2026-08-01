"use client";

import { motion } from "framer-motion";
import {
  Sparkles,
  PencilLine,
  Bot,
  Palette,
  Rocket,
} from "lucide-react";

const steps = [
  {
    number: "01",
    icon: PencilLine,
    title: "Describe Your Business",
    description:
      "Tell our AI about your business in one simple sentence.",
  },
  {
    number: "02",
    icon: Bot,
    title: "AI Creates Everything",
    description:
      "AI generates pages, sections, colors, images and content automatically.",
  },
  {
    number: "03",
    icon: Palette,
    title: "Customize",
    description:
      "Edit text, colors, layouts or ask AI to regenerate anything.",
  },
  {
    number: "04",
    icon: Rocket,
    title: "Publish",
    description:
      "Connect your domain and launch instantly.",
  },
];

export default function HowItWorks() {
  return (
    <section className="relative overflow-hidden bg-black py-32">

      <div className="absolute left-1/2 top-20 h-[450px] w-[450px] -translate-x-1/2 rounded-full bg-violet-600/10 blur-[140px]" />

      <div className="relative mx-auto max-w-7xl px-6">

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: .6 }}
          viewport={{ once: true }}
          className="mx-auto max-w-3xl text-center"
        >

          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2 backdrop-blur-xl">

            <Sparkles className="h-4 w-4 text-violet-400" />

            <span className="text-sm text-zinc-300">
              How It Works
            </span>

          </div>

          <h2 className="mt-8 text-5xl font-black text-white md:text-6xl">

            Launch Your Website

            <br />

            In 4 Simple Steps

          </h2>

          <p className="mx-auto mt-8 max-w-2xl text-lg leading-8 text-zinc-400">

            WebsiteBanja handles the hard work.
            You just describe your business.

          </p>

        </motion.div>

        <div className="mt-24 space-y-16">
                      {steps.map((step, index) => {
            const Icon = step.icon;

            return (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.6,
                  delay: index * 0.15,
                }}
                viewport={{ once: true }}
                className="grid gap-10 lg:grid-cols-2 lg:items-center"
              >
                {/* Left */}

                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-10 backdrop-blur-xl">

                  <div className="mb-6 flex items-center gap-4">

                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-violet-600 to-purple-600 shadow-xl">

                      <Icon className="h-8 w-8 text-white" />

                    </div>

                    <div>

                      <p className="text-sm font-semibold tracking-widest text-violet-400">
                        STEP {step.number}
                      </p>

                      <h3 className="mt-2 text-3xl font-bold text-white">
                        {step.title}
                      </h3>

                    </div>

                  </div>

                  <p className="text-lg leading-8 text-zinc-400">
                    {step.description}
                  </p>

                </div>

                {/* Right */}

                <div className="flex items-center justify-center">

                  <div className="flex h-44 w-44 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-zinc-900 to-zinc-950 shadow-2xl">

                    <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-6xl font-black text-transparent">

                      {step.number}

                    </span>

                  </div>

                </div>

              </motion.div>
            );
          })}
                  </div>

        {/* CTA */}

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="mt-24 rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900 to-black p-12 text-center"
        >
          <h2 className="text-4xl font-black text-white">
            Ready to Build Your Website?
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-lg text-zinc-400">
            Build stunning websites with AI in minutes.
            No coding. No hassle.
          </p>

          <button className="mt-10 rounded-2xl bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 px-8 py-4 font-semibold text-white transition hover:scale-105">
            🚀 Start Building
          </button>
        </motion.div>

      </div>

    </section>
  );
}