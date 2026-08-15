"use client";

import Link from "next/link";
import {
  FaGithub,
  FaLinkedin,
  FaInstagram,
  FaXTwitter,
} from "react-icons/fa6";

import Logo from "@/components/brand/Logo";

export default function Footer() {
  const scrollTo = (target: string) => {
    const el = document.querySelector(target);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <footer
      id="footer"
      className="relative overflow-hidden border-t border-zinc-200/80 bg-white/70 dark:border-white/10 dark:bg-black/90"
    >
      <div className="relative mx-auto max-w-7xl px-6 py-16 sm:py-20">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-5">
          {/* Logo & Description */}
          <div className="lg:col-span-2 space-y-4">
            <Logo imageSize={42} textClassName="text-xl" subtitleClassName="text-[11px]" />

            <p className="max-w-sm text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              The autonomous AI website builder for founders, creators, and modern businesses. Build, customize, and publish your next website in 60 seconds.
            </p>

            {/* Status indicator */}
            <div className="flex items-center gap-2 pt-2 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>All AI Systems Operational</span>
            </div>

            {/* Socials */}
            <div className="flex gap-3 pt-2">
              {[
                { icon: FaXTwitter, label: "X" },
                { icon: FaGithub, label: "GitHub" },
                { icon: FaLinkedin, label: "LinkedIn" },
                { icon: FaInstagram, label: "Instagram" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 shadow-2xs hover:bg-violet-50 hover:text-violet-600 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white transition"
                  >
                    <Icon size={16} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-white mb-4">
              Product
            </h3>
            <div className="space-y-3 text-sm text-zinc-600 dark:text-zinc-400 flex flex-col">
              <button type="button" onClick={() => scrollTo("#how-it-works")} className="text-left hover:text-zinc-900 dark:hover:text-white transition">
                How It Works
              </button>
              <button type="button" onClick={() => scrollTo("#features")} className="text-left hover:text-zinc-900 dark:hover:text-white transition">
                Features
              </button>
              <button type="button" onClick={() => scrollTo("#showcase")} className="text-left hover:text-zinc-900 dark:hover:text-white transition">
                Showcase
              </button>
              <button type="button" onClick={() => scrollTo("#pricing")} className="text-left hover:text-zinc-900 dark:hover:text-white transition">
                Pricing
              </button>
              <button type="button" onClick={() => scrollTo("#faq")} className="text-left hover:text-zinc-900 dark:hover:text-white transition">
                FAQ
              </button>
            </div>
          </div>

          {/* Platform */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-white mb-4">
              Platform
            </h3>
            <div className="space-y-3 text-sm text-zinc-600 dark:text-zinc-400 flex flex-col">
              <Link href="/dashboard" className="hover:text-zinc-900 dark:hover:text-white transition">
                Dashboard
              </Link>
              <Link href="/login" className="hover:text-zinc-900 dark:hover:text-white transition">
                Sign In
              </Link>
              <Link href="/signup" className="hover:text-zinc-900 dark:hover:text-white transition">
                Create Account
              </Link>
              <Link href="/forgot-password" className="hover:text-zinc-900 dark:hover:text-white transition">
                Reset Password
              </Link>
            </div>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-white mb-4">
              Legal & Privacy
            </h3>
            <div className="space-y-3 text-sm text-zinc-600 dark:text-zinc-400 flex flex-col">
              <span className="hover:text-zinc-900 dark:hover:text-white transition cursor-pointer">
                Privacy Policy
              </span>
              <span className="hover:text-zinc-900 dark:hover:text-white transition cursor-pointer">
                Terms of Service
              </span>
              <span className="hover:text-zinc-900 dark:hover:text-white transition cursor-pointer">
                Security Posture
              </span>
              <span className="hover:text-zinc-900 dark:hover:text-white transition cursor-pointer">
                Cookie Settings
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-14 border-t border-zinc-200/80 dark:border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <p>© {new Date().getFullYear()} WebsiteBanja AI. Built for serious creators.</p>
          <div className="flex items-center gap-6">
            <span>Powered by OpenAI & Supabase</span>
          </div>
        </div>
      </div>
    </footer>
  );
}