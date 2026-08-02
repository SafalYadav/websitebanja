"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Wand2,
  Globe,
  Zap,
  Rocket,
  ShieldCheck,
} from "lucide-react";

const features = [
  {
    icon: Wand2,
    title: "AI Website Generation",
    desc: "Describe your business in one sentence and AI instantly builds your website.",
  },
  {
    icon: Globe,
    title: "Beautiful Responsive Design",
    desc: "Every website works perfectly on mobile, tablet and desktop.",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    desc: "Optimized performance with Next.js and modern technologies.",
  },
  {
    icon: Rocket,
    title: "One Click Publish",
    desc: "Launch your business website within minutes without coding.",
  },
  {
    icon: ShieldCheck,
    title: "SEO Optimized",
    desc: "Built with clean structure for better Google rankings.",
  },
  {
    icon: Sparkles,
    title: "Premium Templates",
    desc: "Modern templates crafted for restaurants, gyms, salons and more.",
  },
];

export default function Features() {
  const router = useRouter();
  return (
 <section
  id="features"
  className="relative overflow-hidden bg-black py-32"
>

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
              Powerful Features
            </span>

          </div>

          <h2 className="mt-8 text-5xl font-black text-white md:text-6xl">

            Everything You Need

            <br />

            To Build Faster

          </h2>

          <p className="mx-auto mt-8 max-w-2xl text-lg leading-8 text-zinc-400">

            WebsiteBanja combines AI, modern design and
            automation to help any business launch a
            professional website in minutes.

          </p>

        </motion.div>

        <div className="mt-24 grid gap-8 md:grid-cols-2 xl:grid-cols-3">        
             {features.map((feature, index) => {
            const Icon = feature.icon;

            return (
              <motion.div
                key={feature.title}
                initial={{
                  opacity: 0,
                  y: 30,
                }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  duration: 0.5,
                  delay: index * 0.1,
                }}
                viewport={{
                  once: true,
                }}
                whileHover={{
                  y: -8,
                }}
                className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-xl"
              >

                {/* Glow */}

                <div className="absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100">

                  <div className="absolute -top-24 left-1/2 h-52 w-52 -translate-x-1/2 rounded-full bg-violet-500/20 blur-[90px]" />

                </div>

                {/* Icon */}

                <div className="relative z-10 mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-violet-600 to-purple-600 shadow-xl">

                  <Icon className="h-8 w-8 text-white" />

                </div>

                {/* Title */}

                <h3 className="relative z-10 text-2xl font-bold text-white">

                  {feature.title}

                </h3>

                {/* Description */}

                <p className="relative z-10 mt-5 leading-8 text-zinc-400">

                  {feature.desc}

                </p>

                {/* Bottom line */}

                <div className="relative z-10 mt-8 h-[2px] w-0 bg-gradient-to-r from-blue-500 via-violet-500 to-cyan-400 transition-all duration-500 group-hover:w-full" />

              </motion.div>
            );
          })}/div   </div>

        {/* Bottom CTA */}

        <motion.div
          initial={{
            opacity: 0,
            y: 40,
          }}
          whileInView={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.6,
            delay: 0.2,
          }}
          viewport={{
            once: true,
          }}
          className="mt-28"
        >

          <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black p-12">

            {/* Background Glow */}

            <div className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/20 blur-[140px]" />

            <div className="relative z-10 text-center">

              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-r from-blue-600 via-violet-600 to-cyan-500 shadow-2xl">

                <Rocket className="h-10 w-10 text-white" />

              </div>

              <h2 className="mt-8 text-4xl font-black text-white md:text-5xl">
                Ready to Launch Your Website?
              </h2>

              <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-zinc-400">
                Build your complete business website in minutes using AI.
                No coding. No design skills. Just describe your business.
              </p>

              <div className="mt-10 flex flex-wrap items-center justify-center gap-5">

             <button
  onClick={() => router.push("/builder")}
  className="rounded-2xl bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 px-8 py-4 text-lg font-semibold text-white shadow-xl transition hover:scale-105"
>
  🚀 Start Building
</button>

                <button className="rounded-2xl border border-white/10 bg-white/5 px-8 py-4 text-lg font-semibold text-white backdrop-blur-xl transition hover:bg-white/10">
                  View Templates
                </button>

              </div>

            </div>

          </div>

        </motion.div>

      </div>

    </section>
  );
}