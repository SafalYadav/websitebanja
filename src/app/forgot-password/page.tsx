"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { loginRoute } from "@/lib/editorRoutes";
import { resetPasswordForEmail } from "@/lib/auth";
import { ArrowLeft, Mail } from "lucide-react";
import ThemeToggle from "@/components/theme/ThemeToggle";
import Logo from "@/components/brand/Logo";

export default function ForgotPasswordPage() {
  const shouldReduceMotion = useReducedMotion();

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleResetSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage("Please enter your email address.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const { error } = await resetPasswordForEmail(email.trim());
      if (error) {
        setErrorMessage(error.message);
        setIsLoading(false);
        return;
      }
      setIsSuccess(true);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to send reset link.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col justify-center items-center bg-slate-50 text-slate-900 dark:bg-[#09090B] dark:text-zinc-100 px-4 py-12 relative transition-colors duration-200">
      {/* Top Bar with Theme Toggle */}
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <motion.div
        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8 flex flex-col items-center">
          <Link href="/" className="inline-block mb-3">
            <Logo imageSize={48} textClassName="text-2xl" subtitleClassName="text-xs" />
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Reset your password</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-2 text-sm">
            Enter your email and we will send you a reset link
          </p>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/60 space-y-6">
          {errorMessage && (
            <motion.div
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              role="alert"
              className="rounded-xl border border-red-500/30 bg-red-50 p-3.5 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
            >
              {errorMessage}
            </motion.div>
          )}

          {isSuccess ? (
            <motion.div
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4 space-y-4"
            >
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400 text-2xl">
                <Mail className="h-7 w-7" />
              </div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Check your email</h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                We&apos;ve sent a password reset link to <strong className="text-zinc-900 dark:text-white">{email}</strong>.
              </p>
              <div className="pt-2">
                <Link
                  href={loginRoute()}
                  className="inline-flex w-full items-center justify-center rounded-xl bg-zinc-100 hover:bg-zinc-200 py-3 px-4 text-sm font-semibold text-zinc-800 transition active:scale-[0.99] border border-zinc-200 dark:bg-white/10 dark:hover:bg-white/15 dark:text-white dark:border-white/10"
                >
                  Back to Login
                </Link>
              </div>
            </motion.div>
          ) : (
            <form onSubmit={handleResetSubmit} className="space-y-4">
              <div>
                <label htmlFor="reset-email" className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
                  Email Address
                </label>
                <input
                  id="reset-email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="name@example.com"
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 transition focus:border-violet-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-white/10 dark:bg-black/40 dark:text-white dark:placeholder-zinc-500 dark:focus:bg-black/60"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 via-violet-600 to-indigo-600 py-3.5 px-4 text-sm font-bold text-white shadow-lg shadow-violet-600/25 transition hover:opacity-95 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  "Send Reset Link"
                )}
              </button>

              <div className="pt-2 text-center">
                <Link
                  href={loginRoute()}
                  className="text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition inline-flex items-center gap-1.5"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </main>
  );
}
