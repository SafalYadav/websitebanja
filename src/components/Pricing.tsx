"use client";

import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "₹0",
    description: "Perfect for trying WebsiteBanja.",
    featured: false,
    features: [
      "1 AI Website",
      "Basic Templates",
      "Community Support",
      "WebsiteBanja Branding",
    ],
  },
  {
    name: "Pro",
    price: "₹999",
    description: "Best for freelancers & businesses.",
    featured: true,
    features: [
      "Unlimited Websites",
      "Premium Templates",
      "AI Content Generation",
      "Custom Domain",
      "Priority Support",
      "No Branding",
    ],
  },
  {
    name: "Business",
    price: "Custom",
    description: "For agencies & enterprises.",
    featured: false,
    features: [
      "Unlimited Everything",
      "Team Members",
      "White Label",
      "API Access",
      "Dedicated Support",
    ],
  },
];

export default function Pricing() {
  return (
    <section className="relative overflow-hidden bg-black py-32">

      <div className="absolute left-1/2 top-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-violet-600/10 blur-[160px]" />

      <div className="relative mx-auto max-w-7xl px-6">

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: .6 }}
          viewport={{ once: true }}
          className="mx-auto max-w-3xl text-center"
        >

          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2">

            <Sparkles className="h-4 w-4 text-violet-400"/>

            <span className="text-sm text-zinc-300">
              Pricing
            </span>

          </div>

          <h2 className="mt-8 text-5xl font-black text-white md:text-6xl">

            Simple Pricing

          </h2>

          <p className="mt-8 text-lg leading-8 text-zinc-400">

            Start free. Upgrade whenever your business grows.

          </p>

        </motion.div>

        <div className="mt-20 grid gap-8 lg:grid-cols-3">
                      {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: index * 0.15,
              }}
              viewport={{ once: true }}
              whileHover={{
                y: -8,
              }}
              className={`relative overflow-hidden rounded-3xl border ${
                plan.featured
                  ? "border-violet-500 bg-gradient-to-b from-violet-500/10 to-zinc-900"
                  : "border-white/10 bg-zinc-900/70"
              } p-8 backdrop-blur-xl`}
            >

              {plan.featured && (
                <div className="absolute right-6 top-6 rounded-full bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 px-4 py-1 text-xs font-bold text-white">
                  MOST POPULAR
                </div>
              )}

              <h3 className="text-3xl font-black text-white">
                {plan.name}
              </h3>

              <p className="mt-3 text-zinc-400">
                {plan.description}
              </p>

              <div className="mt-8">

                <span className="text-5xl font-black text-white">
                  {plan.price}
                </span>

                {plan.price !== "Custom" && (
                  <span className="ml-2 text-zinc-500">
                    /month
                  </span>
                )}

              </div>

              <div className="mt-10 space-y-5">

                {plan.features.map((feature) => (
                  <div
                    key={feature}
                    className="flex items-center gap-3"
                  >

                    <Check className="h-5 w-5 text-green-400" />

                    <span className="text-zinc-300">
                      {feature}
                    </span>

                  </div>
                ))}

              </div>

              <button
                className={`mt-10 w-full rounded-2xl py-4 font-semibold transition ${
                  plan.featured
                    ? "bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 text-white hover:scale-[1.02]"
                    : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                {plan.featured
                  ? "🚀 Get Started"
                  : "Choose Plan"}
              </button>

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
                Start Free Today
              </h2>

              <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-zinc-400">
                Build your first AI website in minutes and upgrade only when you
                need more powerful features.
              </p>

              <button className="mt-10 rounded-2xl bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 px-8 py-4 font-semibold text-white shadow-xl transition hover:scale-105">
                🚀 Start Building Free
              </button>

            </div>

          </div>
        </motion.div>

      </div>

    </section>
  );
}
