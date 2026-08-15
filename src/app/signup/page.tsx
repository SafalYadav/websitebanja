"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { loginRoute } from "@/lib/editorRoutes";
import { signUp, signInWithGoogle } from "@/lib/auth";
import { Eye, EyeOff } from "lucide-react";
import ThemeToggle from "@/components/theme/ThemeToggle";
import Logo from "@/components/brand/Logo";

export default function SignupPage() {
  const shouldReduceMotion = useReducedMotion();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMessage("Please provide both an email and password.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const { error } = await signUp(email, password);

    if (error) {
      setErrorMessage(error.message);
      setIsLoading(false);
      return;
    }

    setSuccessMessage("🎉 Account created successfully! Check your email to confirm your account or sign in.");
    setIsLoading(false);
  }

  async function handleGoogleSignup() {
    setIsGoogleLoading(true);
    setErrorMessage(null);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setErrorMessage(error.message);
        setIsGoogleLoading(false);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to sign in with Google.");
      setIsGoogleLoading(false);
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
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Create an account</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-2 text-sm">
            Start building your dream websites with AI today
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

          {successMessage && (
            <motion.div
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              role="alert"
              className="rounded-xl border border-green-500/30 bg-green-50 p-3.5 text-sm text-green-700 dark:bg-green-950/40 dark:text-green-300"
            >
              {successMessage}
            </motion.div>
          )}

          {/* Google OAuth Button */}
          <button
            type="button"
            onClick={handleGoogleSignup}
            disabled={isGoogleLoading || isLoading}
            className="w-full flex items-center justify-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 py-3 px-4 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
          >
            {isGoogleLoading ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-violet-600 dark:border-white border-t-transparent" />
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#EA4335"
                  d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.4 8.9 5 12 5z"
                />
                <path
                  fill="#4285F4"
                  d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.3 14.7c-.2-.7-.4-1.4-.4-2.2s.2-1.5.4-2.2L1.6 7.4C.6 9.4 0 11.6 0 14s.6 4.6 1.6 6.6l3.7-2.9z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.8-2.5 1.2-4.3 1.2-3.1 0-5.8-2.4-6.7-5.3L1.6 16c1.9 3.8 5.8 7 10.4 7z"
                />
              </svg>
            )}
            <span>{isGoogleLoading ? "Connecting to Google..." : "Continue with Google"}</span>
          </button>

          {/* OR Divider */}
          <div className="relative flex items-center justify-center">
            <div className="w-full border-t border-zinc-200 dark:border-white/10" />
            <span className="absolute bg-white dark:bg-zinc-900 px-3 text-xs uppercase tracking-wider text-zinc-500">
              or sign up with email
            </span>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label htmlFor="signup-name" className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
                Full Name (Optional)
              </label>
              <input
                id="signup-name"
                type="text"
                autoComplete="name"
                placeholder="Alex Carter"
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 transition focus:border-violet-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-white/10 dark:bg-black/40 dark:text-white dark:placeholder-zinc-500 dark:focus:bg-black/60"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="signup-email" className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
                Email Address
              </label>
              <input
                id="signup-email"
                type="email"
                autoComplete="email"
                required
                placeholder="name@example.com"
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 transition focus:border-violet-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-white/10 dark:bg-black/40 dark:text-white dark:placeholder-zinc-500 dark:focus:bg-black/60"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="signup-password" className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="signup-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={6}
                  placeholder="•••••••• (minimum 6 characters)"
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 pr-11 text-sm text-zinc-900 placeholder-zinc-400 transition focus:border-violet-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-white/10 dark:bg-black/40 dark:text-white dark:placeholder-zinc-500 dark:focus:bg-black/60"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || isGoogleLoading}
              className="w-full mt-2 flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 via-violet-600 to-indigo-600 py-3.5 px-4 text-sm font-bold text-white shadow-lg shadow-violet-600/25 transition hover:opacity-95 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                "Create Account"
              )}
            </button>
          </form>
        </div>

        <p className="mt-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Already have an account?{" "}
          <Link href={loginRoute()} className="font-semibold text-violet-600 dark:text-violet-400 hover:underline">
            Sign in
          </Link>
        </p>
      </motion.div>
    </main>
  );
}
