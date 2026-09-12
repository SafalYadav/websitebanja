"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  FaGithub,
  FaLinkedin,
  FaInstagram,
  FaXmark,
  FaShieldHalved,
  FaFileContract,
  FaLock,
} from "react-icons/fa6";

import Logo from "@/components/brand/Logo";

export default function Footer() {
  const [legalModal, setLegalModal] = useState<"privacy" | "terms" | "security" | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && legalModal) {
        setLegalModal(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [legalModal]);

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
              WebsiteBanja AI (<strong className="font-semibold text-zinc-800 dark:text-zinc-200">websitebanja.com</strong>) is the autonomous AI website builder for founders, creators, and modern businesses. Build, customize, and publish your next website in 60 seconds.
            </p>

            {/* Status indicator */}
            <div className="flex items-center gap-2 pt-2 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>All AI Systems Operational</span>
            </div>

            {/* Socials */}
            <div className="flex gap-3 pt-2">
              {[
                {
                  icon: FaGithub,
                  label: "GitHub",
                  href: "https://github.com/SafalYadav",
                },
                {
                  icon: FaLinkedin,
                  label: "LinkedIn",
                  href: "https://www.linkedin.com/in/safal-yadav-068687292/",
                },
                {
                  icon: FaInstagram,
                  label: "Instagram",
                  href: "https://www.instagram.com/websitebanja?stkn=NXhwYWE3NGR4cnUz&utm_source=qr",
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`WebsiteBanja on ${item.label}`}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 shadow-2xs hover:bg-cyan-50 hover:text-cyan-600 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white transition"
                  >
                    <Icon size={16} />
                  </a>
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
              <Link href="/agent" className="text-left font-medium text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 transition">
                Mitra AI Architect
              </Link>
              <button type="button" onClick={() => scrollTo("#studio-demo")} className="text-left hover:text-zinc-900 dark:hover:text-white transition cursor-pointer">
                Studio Demo
              </button>
              <button type="button" onClick={() => scrollTo("#features")} className="text-left hover:text-zinc-900 dark:hover:text-white transition cursor-pointer">
                Features
              </button>
              <button type="button" onClick={() => scrollTo("#how-it-works")} className="text-left hover:text-zinc-900 dark:hover:text-white transition cursor-pointer">
                How It Works
              </button>
              <button type="button" onClick={() => scrollTo("#why-websitebanja")} className="text-left hover:text-zinc-900 dark:hover:text-white transition cursor-pointer">
                Why WebsiteBanja
              </button>
              <button type="button" onClick={() => scrollTo("#pricing")} className="text-left hover:text-zinc-900 dark:hover:text-white transition cursor-pointer">
                Pricing
              </button>
              <button type="button" onClick={() => scrollTo("#faq")} className="text-left hover:text-zinc-900 dark:hover:text-white transition cursor-pointer">
                FAQ
              </button>
              <a href="https://websitebanja.com/llms.txt" target="_blank" rel="noopener noreferrer" className="text-left text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition">
                AI Documentation (llms.txt)
              </a>
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
              <button
                type="button"
                onClick={() => setLegalModal("privacy")}
                className="text-left hover:text-zinc-900 dark:hover:text-white transition cursor-pointer"
              >
                Privacy Policy
              </button>
              <button
                type="button"
                onClick={() => setLegalModal("terms")}
                className="text-left hover:text-zinc-900 dark:hover:text-white transition cursor-pointer"
              >
                Terms of Service
              </button>
              <button
                type="button"
                onClick={() => setLegalModal("security")}
                className="text-left hover:text-zinc-900 dark:hover:text-white transition cursor-pointer"
              >
                Security Posture
              </button>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent("wb:open-cookie-settings"))}
                className="text-left hover:text-zinc-900 dark:hover:text-white transition cursor-pointer"
              >
                Cookie Settings
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-14 border-t border-zinc-200/80 dark:border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <p>© {new Date().getFullYear()} WebsiteBanja AI. Built for serious creators.</p>
          <div className="flex items-center gap-6">
            <span>Autonomous AI Website Studio</span>
          </div>
        </div>
      </div>

      {/* Legal & Compliance Modal */}
      {legalModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-zinc-950 sm:p-7">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-400">
                  {legalModal === "privacy" && <FaShieldHalved className="h-4 w-4" />}
                  {legalModal === "terms" && <FaFileContract className="h-4 w-4" />}
                  {legalModal === "security" && <FaLock className="h-4 w-4" />}
                </div>
                <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
                  {legalModal === "privacy" && "Privacy Policy"}
                  {legalModal === "terms" && "Terms of Service"}
                  {legalModal === "security" && "Security Posture"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                aria-label="Close modal"
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-900 dark:hover:text-zinc-200 transition cursor-pointer"
              >
                <FaXmark className="h-5 w-5" />
              </button>
            </div>

            <div className="my-5 space-y-4 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
              {legalModal === "privacy" && (
                <>
                  <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/60 p-3.5 dark:border-white/10 dark:bg-zinc-900/40">
                    <strong className="block text-zinc-900 dark:text-white mb-1">1. Zero Sale of Personal Data</strong>
                    WebsiteBanja AI never sells, rents, or trades your personal data or generated site content to advertisers or third parties.
                  </div>
                  <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/60 p-3.5 dark:border-white/10 dark:bg-zinc-900/40">
                    <strong className="block text-zinc-900 dark:text-white mb-1">2. Private AI Generation</strong>
                    Your project inputs, prompts, and generated web architectures remain your private data and are not utilized for foundation model re-training.
                  </div>
                  <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/60 p-3.5 dark:border-white/10 dark:bg-zinc-900/40">
                    <strong className="block text-zinc-900 dark:text-white mb-1">3. Transparent Cookie Governance</strong>
                    We use only essential cookies for authentication and functional preferences. No third-party ad pixels or tracking beacons are installed.
                  </div>
                </>
              )}

              {legalModal === "terms" && (
                <>
                  <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/60 p-3.5 dark:border-white/10 dark:bg-zinc-900/40">
                    <strong className="block text-zinc-900 dark:text-white mb-1">1. Full User Ownership</strong>
                    You retain 100% full intellectual property ownership, copyright, and commercial licensing rights over all websites, code, and content you generate.
                  </div>
                  <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/60 p-3.5 dark:border-white/10 dark:bg-zinc-900/40">
                    <strong className="block text-zinc-900 dark:text-white mb-1">2. Fair Usage & Infrastructure</strong>
                    Mitra AI Architect and autonomous generation workflows are designed for creators and teams. Abuse, automated denial of service, or scraping of system models is prohibited.
                  </div>
                  <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/60 p-3.5 dark:border-white/10 dark:bg-zinc-900/40">
                    <strong className="block text-zinc-900 dark:text-white mb-1">3. Custom Plans & Support</strong>
                    Enterprise and Custom tier services include tailored rate limits, direct technical support, and dedicated scaling pipelines.
                  </div>
                </>
              )}

              {legalModal === "security" && (
                <>
                  <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/60 p-3.5 dark:border-white/10 dark:bg-zinc-900/40">
                    <strong className="block text-zinc-900 dark:text-white mb-1">1. Modern Cryptography</strong>
                    All data in transit is protected by TLS 1.3 encryption. Cloud project databases utilize AES-256 encryption at rest.
                  </div>
                  <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/60 p-3.5 dark:border-white/10 dark:bg-zinc-900/40">
                    <strong className="block text-zinc-900 dark:text-white mb-1">2. PostgreSQL Row-Level Security</strong>
                    User accounts, projects, and secrets are enforced at the database kernel level with strict multi-tenant Row-Level Security (RLS) boundaries.
                  </div>
                  <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/60 p-3.5 dark:border-white/10 dark:bg-zinc-900/40">
                    <strong className="block text-zinc-900 dark:text-white mb-1">3. Sandboxed Client Runtime</strong>
                    Studio previews and published websites are rendered in isolated security sandboxes to protect both creator sessions and end visitors.
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end border-t border-zinc-100 pt-4 dark:border-white/10">
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                className="rounded-xl bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
}