"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { dashboardRoute } from "@/lib/editorRoutes";
import { ArrowLeft } from "lucide-react";
import ThemeToggle from "@/components/theme/ThemeToggle";
import Logo from "@/components/brand/Logo";

interface BuilderLayoutProps {
  title: string;
  description: string;
  children: ReactNode;
}

export default function BuilderLayout({
  title,
  description,
  children,
}: BuilderLayoutProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#09090B] dark:text-zinc-100 transition-colors duration-200">
      {/* Top Onboarding Header */}
      <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-[#09090B]/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link
            href={dashboardRoute()}
            className="flex items-center gap-2 text-xs font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Dashboard</span>
          </Link>

          <Link href="/" className="flex items-center gap-2">
            <Logo imageSize={32} textClassName="text-base" subtitleClassName="text-[9px]" />
          </Link>

          <ThemeToggle />
        </div>
      </header>

      {/* Main Flow Form */}
      <main className="mx-auto max-w-4xl px-6 py-10 sm:py-14">
        <motion.div
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="rounded-3xl border border-zinc-200 bg-white p-6 sm:p-10 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/60"
        >
          <div className="mb-8">
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
              {title}
            </h1>
            <p className="mt-2 text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {description}
            </p>
          </div>

          <div>{children}</div>
        </motion.div>
      </main>
    </div>
  );
}