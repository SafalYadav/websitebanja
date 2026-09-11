"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { dashboardRoute, homeRoute, loginRoute, signupRoute } from "@/lib/editorRoutes";
import { Menu, X, Sparkles, ArrowRight, LogOut, LayoutDashboard } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { signOut } from "@/lib/auth";
import ThemeToggle from "@/components/theme/ThemeToggle";
import Logo from "@/components/brand/Logo";

const scrollTo = (target: string) => {
  const el = document.querySelector(target);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
};

export default function Navbar() {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setLoggedIn(!!session);
    }

    void checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      setLoggedIn(!!session);
    });

    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      subscription.unsubscribe();
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  async function handleLogout() {
    await signOut();
    setLoggedIn(false);
    router.push(homeRoute());
  }

  return (
    <header className="fixed top-0 left-0 z-50 w-full transition-all duration-300 py-3 sm:py-4 px-4 sm:px-6">
      <div
        className={`mx-auto max-w-7xl flex h-16 items-center justify-between px-4 sm:px-6 rounded-2xl sm:rounded-full border transition-all duration-300 surface-tactile ${
          scrolled
            ? "bg-white/90 backdrop-blur-xl border-zinc-200/90 shadow-lg shadow-zinc-900/5 dark:bg-zinc-950/90 dark:border-white/10 dark:shadow-black/40"
            : "bg-white/75 backdrop-blur-lg border-zinc-200/60 shadow-xs dark:bg-zinc-950/70 dark:border-white/10"
        }`}
      >
        {/* Brand Logo with Studio Badge */}
        <button
          type="button"
          onClick={() => scrollTo("#home")}
          className="flex cursor-pointer items-center gap-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 rounded-lg group"
        >
          <Logo imageSize={38} textClassName="text-lg font-black tracking-tight" subtitleClassName="text-[9px] uppercase tracking-wider text-cyan-600 dark:text-cyan-400 font-bold" />
          <span className="hidden sm:inline-block rounded-full bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border border-cyan-200/70 dark:border-cyan-800/40 px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-widest">
            Studio
          </span>
        </button>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
          {[
            { label: "Studio Demo", target: "#studio-demo" },
            { label: "Features", target: "#features" },
            { label: "How It Works", target: "#how-it-works" },
            { label: "Why Us", target: "#why-websitebanja" },
            { label: "Pricing", target: "#pricing" },
            { label: "FAQ", target: "#faq" },
          ].map((link) => (
            <button
              key={link.target}
              type="button"
              onClick={() => scrollTo(link.target)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
            >
              {link.label}
            </button>
          ))}

          <Link
            href="/agent"
            className="ml-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200/60 dark:border-cyan-800/40 hover:bg-cyan-100 dark:hover:bg-cyan-900/40 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Mitra AI</span>
          </Link>
        </nav>

        {/* Action Controls */}
        <div className="hidden sm:flex items-center gap-3">
          <ThemeToggle />

          {loggedIn ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => router.push(dashboardRoute())}
                className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 px-4 py-2 text-xs font-bold shadow-sm hover:opacity-90 active:scale-[0.98] transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                <span>Dashboard</span>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                aria-label="Logout"
                title="Logout"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 text-zinc-500 hover:text-red-600 hover:border-red-200 dark:border-white/10 dark:text-zinc-400 dark:hover:text-red-400 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => router.push(loginRoute())}
                className="rounded-full px-3.5 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
              >
                Sign In
              </button>

              <button
                type="button"
                onClick={() => router.push(signupRoute())}
                className="btn-primary-luminous inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold text-white shadow-md transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
              >
                <span>Start Free</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="flex sm:hidden items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle navigation menu"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-800 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
          >
            {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="sm:hidden mt-2 mx-auto max-w-md rounded-2xl border border-zinc-200/90 bg-white/95 p-5 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-zinc-950/95"
          >
            <nav className="flex flex-col space-y-2">
              {[
                { label: "Studio Demo", target: "#studio-demo" },
                { label: "Features", target: "#features" },
                { label: "How It Works", target: "#how-it-works" },
                { label: "Why Us", target: "#why-websitebanja" },
                { label: "Pricing", target: "#pricing" },
                { label: "FAQ", target: "#faq" },
              ].map((link) => (
                <button
                  key={link.target}
                  type="button"
                  onClick={() => {
                    scrollTo(link.target);
                    setIsOpen(false);
                  }}
                  className="w-full text-left py-2 px-3 rounded-xl text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                >
                  {link.label}
                </button>
              ))}

              <Link
                href="/agent"
                onClick={() => setIsOpen(false)}
                className="py-2 px-3 rounded-xl text-sm font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200/50 dark:border-cyan-800/40 flex items-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                <span>Mitra AI Architect</span>
              </Link>

              <div className="pt-3 border-t border-zinc-100 dark:border-white/10 flex flex-col gap-2">
                {loggedIn ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        router.push(dashboardRoute());
                        setIsOpen(false);
                      }}
                      className="w-full rounded-xl bg-zinc-900 dark:bg-white py-2.5 text-center text-sm font-bold text-white dark:text-zinc-900"
                    >
                      Studio Dashboard
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await handleLogout();
                        setIsOpen(false);
                      }}
                      className="w-full rounded-xl border border-red-200 bg-red-50/80 py-2 text-center text-xs font-semibold text-red-600 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-400"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        router.push(loginRoute());
                        setIsOpen(false);
                      }}
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 text-center text-sm font-semibold text-zinc-800 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        router.push(signupRoute());
                        setIsOpen(false);
                      }}
                      className="btn-primary-luminous w-full rounded-xl py-2.5 text-center text-sm font-bold text-white shadow-md"
                    >
                      Start Free Trial
                    </button>
                  </>
                )}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
