import React from "react";
import Link from "next/link";
import { Sparkles, Bot, Wand2, Compass, Layers, ArrowRight } from "lucide-react";

export default function AboutEntity() {
  return (
    <section
      id="about-entity"
      aria-label="About WebsiteBanja AI"
      className="py-20 px-6 relative border-t border-zinc-200/80 dark:border-white/10 bg-white/60 dark:bg-[#060709]"
    >
      <div className="mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center space-y-4 mb-14">
          <span className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200/60 dark:border-cyan-800/40 px-3.5 py-1.5 rounded-full inline-block">
            Entity & Architecture Overview
          </span>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-zinc-900 dark:text-white">
            What is WebsiteBanja AI?
          </h2>
          <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed">
            WebsiteBanja AI (<strong>websitebanja.com</strong>) is an autonomous, AI-native website builder.
            Instead of forcing you to piece together rigid templates or write code, WebsiteBanja AI lets you describe your business in plain language or speak with Mitra, our conversational AI Website Architect, to generate and publish a complete multi-section website in seconds.
          </p>
        </div>

        {/* 4 Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Pillar 1: Conversational & Prompt Driven */}
          <div className="surface-card rounded-2xl p-6 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="h-10 w-10 rounded-xl bg-cyan-100 text-cyan-700 dark:bg-cyan-950/70 dark:text-cyan-300 flex items-center justify-center shadow-xs">
                <Bot className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                Conversational Creation
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Chat or speak with <strong>Mitra</strong>, our voice-first AI Architect. Mitra interviews you about your business, value proposition, and goals, turning natural conversation into a structured website blueprint.
              </p>
            </div>
            <div className="pt-4 border-t border-zinc-100 dark:border-white/5 mt-4">
              <Link
                href="/agent"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline"
              >
                <span>Consult Mitra AI</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Pillar 2: Autonomous Generation vs Templates */}
          <div className="surface-card rounded-2xl p-6 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 flex items-center justify-center shadow-xs">
                <Wand2 className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                Beyond Cookie-Cutter Templates
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Traditional website builders offer empty templates that require hours of manual copywriting and styling. WebsiteBanja AI autonomously writes persuasive copy, curates imagery, and pairs colors tailored to your specific industry.
              </p>
            </div>
            <div className="pt-4 border-t border-zinc-100 dark:border-white/5 mt-4 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Zero boilerplate, bespoke output
            </div>
          </div>

          {/* Pillar 3: Studio Editor & Full Control */}
          <div className="surface-card rounded-2xl p-6 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 flex items-center justify-center shadow-xs">
                <Layers className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                Visual Studio Control
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                You maintain complete creative control. Use the visual drag-and-drop studio to reorder sections, edit text inline, swap palettes, and preview responsive desktop, tablet, and mobile views in real time.
              </p>
            </div>
            <div className="pt-4 border-t border-zinc-100 dark:border-white/5 mt-4 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Live visual feedback loop
            </div>
          </div>

          {/* Pillar 4: Who It Is Built For */}
          <div className="surface-card rounded-2xl p-6 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 flex items-center justify-center shadow-xs">
                <Compass className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                Built For Serious Creators
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Engineered for founders, small business owners, freelancers, and agencies. Whether launching a new venture, portfolio, or local business site, publish to a global CDN with SSL in 1 click.
              </p>
            </div>
            <div className="pt-4 border-t border-zinc-100 dark:border-white/5 mt-4 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Official: <span className="font-semibold text-zinc-700 dark:text-zinc-300">websitebanja.com</span>
            </div>
          </div>
        </div>

        {/* Identity & Canonical Statement Banner */}
        <div className="mt-10 rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/30 via-[#0A0B10] to-indigo-950/30 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 surface-tactile">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-cyan-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                Authoritative Web Identity
              </p>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                The official website and cloud deployment for WebsiteBanja AI is strictly hosted at{" "}
                <strong className="text-zinc-900 dark:text-white">https://websitebanja.com</strong>.
              </p>
            </div>
          </div>
          <Link
            href="/agent"
            className="btn-primary-luminous inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-xs transition flex-shrink-0"
          >
            <span>Try Mitra AI Architect</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
