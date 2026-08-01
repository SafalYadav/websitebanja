"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Sparkles } from "lucide-react";

export default function BrowserPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7 }}
      className="mx-auto mt-16 w-full max-w-5xl"
    >
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-zinc-900 shadow-2xl">

        {/* Browser Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-zinc-950 px-5 py-3">
          <div className="flex gap-2">
            <div className="h-3 w-3 rounded-full bg-red-500" />
            <div className="h-3 w-3 rounded-full bg-yellow-500" />
            <div className="h-3 w-3 rounded-full bg-green-500" />
          </div>

          <div className="rounded-full bg-zinc-800 px-5 py-1 text-xs text-zinc-400">
            www.websitebanja.com
          </div>

          <Sparkles className="h-5 w-5 text-violet-400" />
        </div>

        {/* Content */}
        <div className="grid gap-6 p-8 md:grid-cols-2">

          {/* AI Panel */}
          <div className="rounded-2xl border border-white/10 bg-zinc-950 p-6">

            <p className="mb-3 text-sm text-zinc-500">
              AI Prompt
            </p>

            <div className="rounded-xl bg-zinc-900 p-4 text-white">
              Create a modern restaurant website with online ordering and table booking.
            </div>

            <div className="mt-6 space-y-3">

              {[
                "Generating Hero Section...",
                "Creating About Page...",
                "Adding Services...",
                "Optimizing SEO...",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-lg bg-zinc-900 p-3"
                >
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="text-sm text-zinc-300">{item}</span>
                </div>
              ))}

            </div>

          </div>

          {/* Website Preview */}
          <div className="rounded-2xl border border-white/10 bg-white text-black overflow-hidden">

            <div className="bg-gradient-to-r from-violet-600 to-blue-600 px-6 py-8 text-white">
              <h2 className="text-3xl font-bold">
                Bella Restaurant
              </h2>

              <p className="mt-2 opacity-90">
                Delicious food delivered fresh.
              </p>

              <button className="mt-5 rounded-xl bg-white px-5 py-2 font-semibold text-black">
                Order Now
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 p-6">

              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-28 rounded-xl bg-zinc-200"
                />
              ))}

            </div>

          </div>

        </div>
      </div>
    </motion.div>
  );
}