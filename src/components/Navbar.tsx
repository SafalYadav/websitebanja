"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { dashboardRoute, homeRoute, loginRoute, signupRoute } from "@/lib/editorRoutes";
import { Button } from "@/components/ui/button";
import { Menu, X, Sparkles, LayoutDashboard, LogOut } from "lucide-react";
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

  useEffect(() => {
    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setLoggedIn(!!session);
    }

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      setLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    await signOut();
    setLoggedIn(false);
    router.push(homeRoute());
  }

  return (
    <header className="fixed top-0 left-0 z-50 w-full border-b border-zinc-200/80 bg-white/80 backdrop-blur-xl transition-colors duration-200 dark:border-white/10 dark:bg-[#09090B]/80">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <button
          type="button"
          onClick={() => scrollTo("#home")}
          className="flex cursor-pointer items-center text-left"
        >
          <Logo imageSize={44} textClassName="text-xl" subtitleClassName="text-[11px]" />
        </button>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-8 md:flex">
          <button
            type="button"
            onClick={() => scrollTo("#how-it-works")}
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition"
          >
            How It Works
          </button>

          <button
            type="button"
            onClick={() => scrollTo("#features")}
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition"
          >
            Features
          </button>

          <button
            type="button"
            onClick={() => scrollTo("#showcase")}
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition"
          >
            Showcase
          </button>

          <button
            type="button"
            onClick={() => scrollTo("#pricing")}
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition"
          >
            Pricing
          </button>

          <button
            type="button"
            onClick={() => scrollTo("#faq")}
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition"
          >
            FAQ
          </button>
        </nav>

        {/* Right Action Bar */}
        <div className="hidden items-center gap-3.5 md:flex">
          <ThemeToggle />

          {loggedIn ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => router.push(dashboardRoute())}
                className="flex items-center gap-1.5 rounded-xl border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-100 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Button>

              <button
                type="button"
                onClick={handleLogout}
                title="Sign out"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-red-400 dark:hover:bg-red-950/30 transition"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => router.push(loginRoute())}
                className="px-4 py-2 text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white transition"
              >
                Sign In
              </button>

              <button
                type="button"
                onClick={() => router.push(signupRoute())}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-600/25 transition hover:opacity-95 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Sparkles className="h-4 w-4" />
                Start Free
              </button>
            </div>
          )}
        </div>

        {/* Mobile Hamburger */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
            className="rounded-xl border border-zinc-200 bg-white p-2 text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
          >
            {isOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="border-b border-zinc-200 bg-white/95 backdrop-blur-2xl dark:border-white/10 dark:bg-zinc-950/95 md:hidden">
          <div className="flex flex-col gap-4 p-6 text-sm font-medium">
            <button
              type="button"
              onClick={() => {
                scrollTo("#how-it-works");
                setIsOpen(false);
              }}
              className="text-left py-1 text-zinc-700 dark:text-zinc-300"
            >
              How It Works
            </button>

            <button
              type="button"
              onClick={() => {
                scrollTo("#features");
                setIsOpen(false);
              }}
              className="text-left py-1 text-zinc-700 dark:text-zinc-300"
            >
              Features
            </button>

            <button
              type="button"
              onClick={() => {
                scrollTo("#showcase");
                setIsOpen(false);
              }}
              className="text-left py-1 text-zinc-700 dark:text-zinc-300"
            >
              Showcase
            </button>

            <button
              type="button"
              onClick={() => {
                scrollTo("#pricing");
                setIsOpen(false);
              }}
              className="text-left py-1 text-zinc-700 dark:text-zinc-300"
            >
              Pricing
            </button>

            <button
              type="button"
              onClick={() => {
                scrollTo("#faq");
                setIsOpen(false);
              }}
              className="text-left py-1 text-zinc-700 dark:text-zinc-300"
            >
              FAQ
            </button>

            <div className="pt-4 border-t border-zinc-200 dark:border-white/10 flex flex-col gap-2.5">
              {loggedIn ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      router.push(dashboardRoute());
                      setIsOpen(false);
                    }}
                    className="w-full rounded-xl bg-violet-600 py-3 text-center font-semibold text-white"
                  >
                    Go to Dashboard
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await handleLogout();
                      setIsOpen(false);
                    }}
                    className="w-full rounded-xl border border-red-200 bg-red-50 py-2.5 text-center text-sm font-medium text-red-600 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-400"
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
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-100 py-2.5 text-center font-semibold text-zinc-800 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      router.push(signupRoute());
                      setIsOpen(false);
                    }}
                    className="w-full rounded-xl bg-gradient-to-r from-blue-600 via-violet-600 to-indigo-600 py-3 text-center font-semibold text-white shadow-lg"
                  >
                    Start Free
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
