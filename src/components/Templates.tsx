"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

const templates = [
  {
    title: "Restaurant",
    emoji: "🍔",
    color: "from-orange-500 to-red-500",
  },
  {
    title: "Cafe",
    emoji: "☕",
    color: "from-amber-500 to-yellow-500",
  },
  {
    title: "Gym",
    emoji: "💪",
    color: "from-zinc-700 to-zinc-900",
  },
  {
    title: "Salon",
    emoji: "💇",
    color: "from-pink-500 to-fuchsia-500",
  },
  {
    title: "Dental",
    emoji: "🦷",
    color: "from-cyan-500 to-blue-500",
  },
  {
    title: "Portfolio",
    emoji: "💼",
    color: "from-violet-500 to-indigo-600",
  },
];

export default function Templates() {
  return (
   <section
  id="templates"
  className="relative overflow-hidden bg-[#050505] py-32"
>

      <div className="absolute left-1/2 top-24 h-[450px] w-[450px] -translate-x-1/2 rounded-full bg-violet-600/10 blur-[150px]" />

      <div className="relative mx-auto max-w-7xl px-6">

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: .6 }}
          viewport={{ once: true }}
          className="mx-auto max-w-3xl text-center"
        >

          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2">

            <Sparkles className="h-4 w-4 text-violet-400"/>

            <span className="text-sm text-zinc-300">
              AI Templates
            </span>

          </div>

          <h2 className="mt-8 text-5xl font-black text-white md:text-6xl">

            Ready Made

            <br/>

            Business Templates

          </h2>

          <p className="mx-auto mt-8 max-w-2xl text-lg leading-8 text-zinc-400">

            Choose any business category and let AI
            build your complete website within minutes.

          </p>

        </motion.div>

        <div className="mt-20 grid gap-8 md:grid-cols-2 xl:grid-cols-3"></div>
                  {templates.map((template, index) => (
            <motion.div
              key={template.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: index * 0.1,
              }}
              viewport={{ once: true }}
              whileHover={{
                y: -10,
                scale: 1.02,
              }}
              className="group relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/70 backdrop-blur-xl"
            >

              {/* Glow */}

              <div
                className={`absolute inset-0 bg-gradient-to-br ${template.color} opacity-0 blur-3xl transition duration-500 group-hover:opacity-20`}
              />

              {/* Fake Browser */}

              <div className="relative h-64 overflow-hidden">

                <div className="flex items-center gap-2 border-b border-white/10 bg-zinc-950 px-4 py-3">

                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500" />
                  <div className="h-3 w-3 rounded-full bg-green-500" />

                </div>

                <div
                  className={`flex h-full items-center justify-center bg-gradient-to-br ${template.color}`}
                >

                  <div className="text-center">

                    <div className="text-6xl">
                      {template.emoji}
                    </div>

                    <h3 className="mt-4 text-3xl font-black text-white">
                      {template.title}
                    </h3>

                  </div>

                </div>

              </div>

              {/* Bottom */}

              <div className="p-6">

                <h4 className="text-2xl font-bold text-white">
                  {template.title} Website
                </h4>

                <p className="mt-3 leading-7 text-zinc-400">
                  AI generates a beautiful website specially
                  crafted for your {template.title.toLowerCase()} business.
                </p>

                <button className="mt-6 rounded-xl bg-white px-5 py-3 font-semibold text-black transition hover:scale-105">
                  Preview Template →
                </button>

              </div>

            </motion.div>
          ))}
                  </div>

        {/* Bottom CTA */}

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="mt-24"
        >
          <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black p-12">

            <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/20 blur-[160px]" />

            <div className="relative z-10 text-center">

              <h2 className="text-4xl font-black text-white md:text-5xl">
                100+ AI Templates Coming Soon
              </h2>

              <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-zinc-400">
                Restaurants, cafes, gyms, salons, doctors,
                agencies, portfolios, ecommerce and many more.
              </p>

              <button className="mt-10 rounded-2xl bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 px-8 py-4 font-semibold text-white shadow-xl transition hover:scale-105">
                🚀 Explore Templates
              </button>

            </div>

          </div>
        </motion.div>

      

    </section>
  );
}