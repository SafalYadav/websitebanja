"use client";

import Link from "next/link";
import Logo from "@/components/brand/Logo";
import ThemeToggle from "@/components/theme/ThemeToggle";
import AiTalkingAgent from "@/components/agent/AiTalkingAgent";
import { ArrowLeft, Sparkles } from "lucide-react";

export default function AgentConsultantPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-[#09090B] dark:text-zinc-100 transition-colors duration-200">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-[#09090B]/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Link>
            <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800" />
            <Logo imageSize={32} subtitleClassName="text-[10px]" />
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-violet-50 dark:bg-violet-950/40 border border-violet-200/60 dark:border-violet-800/40 px-3 py-1 text-xs font-semibold text-violet-700 dark:text-violet-300">
              <Sparkles className="h-3.5 w-3.5" />
              <span>AI Architect Studio</span>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Agent Studio */}
      <main className="flex-1 mx-auto max-w-6xl w-full px-4 sm:px-6 py-8 flex flex-col justify-center">
        <div className="text-center max-w-2xl mx-auto mb-6 space-y-2">
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            Talk to your AI Website Architect
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
            Have a voice or text conversation with Mitra to discover and synthesize your ideal website layout, copywriting, and features.
          </p>
        </div>

        <AiTalkingAgent variant="fullscreen" />
      </main>
    </div>
  );
}
