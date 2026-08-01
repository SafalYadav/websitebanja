"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  Play,
  Sparkles,
  Star,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import BrowserPreview from "./BrowserPreview";

export default function Hero() {
  return (
    <section
  id="home"
  className="relative overflow-hidden bg-black pt-36 pb-24"
>

      {/* Background Blur */}

      <div className="absolute left-1/2 top-40 h-[550px] w-[550px] -translate-x-1/2 rounded-full bg-violet-700/20 blur-[150px]" />

      <div className="absolute right-20 top-32 h-80 w-80 rounded-full bg-blue-500/10 blur-[140px]" />

      <div className="absolute left-20 bottom-10 h-72 w-72 rounded-full bg-cyan-500/10 blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-6">

        <div className="grid items-center gap-20 lg:grid-cols-2">

          {/* LEFT */}

          <motion.div
            initial={{
              opacity: 0,
              y: 40,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.7,
            }}
          >

            {/* Badge */}

            <motion.div
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              transition={{
                delay: 0.2,
              }}
              className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2 backdrop-blur-xl"
            >

              <Sparkles
                size={16}
                className="text-violet-400"
              />

              <span className="text-sm text-zinc-300">
                AI Powered Website Builder
              </span>

            </motion.div>

            {/* Heading */}

            <motion.h1
              initial={{
                opacity: 0,
                y: 20,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                delay: 0.3,
              }}
              className="text-6xl font-black leading-none tracking-tight text-white md:text-7xl"
            >

              Build Your

              <br />

              Business

              <br />

              Website

              <br />

              with{" "}

              <span className="bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent">
                AI
              </span>

            </motion.h1>

            {/* Description */}

            <motion.p
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              transition={{
                delay: 0.5,
              }}
              className="mt-8 max-w-xl text-xl leading-9 text-zinc-400"
            >
              Create stunning business websites in minutes.

              No coding.

              No templates.

              Just describe your business and let AI build
              everything for you.
            </motion.p>

            {/* Buttons */}

            <motion.div
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              transition={{
                delay: 0.7,
              }}
              className="mt-10 flex flex-wrap gap-5"
            >

              <Button
                size="lg"
                className="rounded-2xl bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 px-8 py-7 text-lg shadow-xl transition hover:scale-105"
              >

                🚀 Start Building

                <ArrowRight className="ml-2 h-5 w-5" />

              </Button>

              <Button
                size="lg"
                variant="outline"
                className="rounded-2xl border-white/10 bg-white/5 px-8 py-7 text-lg text-white backdrop-blur-xl hover:bg-white/10"
              >

                <Play
                  size={18}
                  className="mr-2"
                />

                Watch Demo

              </Button>

            </motion.div>            {/* Trust */}

            <motion.div
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              transition={{
                delay: 0.9,
              }}
              className="mt-10 flex items-center gap-4"
            >

              <div className="flex">

                {[1, 2, 3, 4, 5].map((item) => (
                  <Star
                    key={item}
                    size={18}
                    className="fill-yellow-400 text-yellow-400"
                  />
                ))}

              </div>

              <p className="text-sm text-zinc-500">
                Trusted by businesses worldwide
              </p>

            </motion.div>

          </motion.div>

          {/* RIGHT */}

          <motion.div
            initial={{
              opacity: 0,
              x: 60,
            }}
            animate={{
              opacity: 1,
              x: 0,
            }}
            transition={{
              duration: 0.8,
              delay: 0.4,
            }}
            className="relative"
          >

            {/* Glow */}

            <div className="absolute inset-0 rounded-[40px] bg-gradient-to-r from-violet-500/20 via-blue-500/20 to-cyan-500/20 blur-3xl" />

            <div className="relative">
              <BrowserPreview />
            </div>

          </motion.div>

        </div>

      </div>

      {/* Bottom Fade */}

      <div className="pointer-events-none absolute bottom-0 left-0 h-40 w-full bg-gradient-to-b from-transparent to-black" />

    </section>
  );
}