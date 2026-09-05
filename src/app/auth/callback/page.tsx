"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { dashboardRoute, loginRoute } from "@/lib/editorRoutes";
import { AlertCircle, Loader2 } from "lucide-react";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const exchangeAttempted = useRef(false);

  useEffect(() => {
    // Prevent duplicate executions in React strict mode
    if (exchangeAttempted.current) return;
    exchangeAttempted.current = true;

    async function handleAuthCallback() {
      // 1. Check for error parameters from OAuth provider
      const error = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");

      if (error || errorDescription) {
        setErrorMessage(errorDescription || error || "Google sign-in failed. Please try again.");
        return;
      }

      // 2. Read authorization code
      const code = searchParams.get("code");

      try {
        if (code) {
          // Exchange authorization code for a session
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            // Check if a valid session is already established
            const { data: sessionData } = await supabase.auth.getSession();
            if (sessionData.session) {
              router.replace(dashboardRoute());
              return;
            }
            setErrorMessage(exchangeError.message || "Unable to exchange authentication code.");
            return;
          }

          if (data?.session) {
            router.replace(dashboardRoute());
            return;
          }
        }

        // 3. Fallback: Check if session is already active or restored
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          setErrorMessage(sessionError.message || "Failed to verify user session.");
          return;
        }

        if (sessionData?.session) {
          router.replace(dashboardRoute());
          return;
        }

        // Neither code nor existing session found
        if (!code) {
          setErrorMessage("No authentication code was received from Google.");
        } else {
          setErrorMessage("Failed to establish a valid session. Please try signing in again.");
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "An unexpected error occurred during authentication.";
        setErrorMessage(message);
      }
    }

    void handleAuthCallback();
  }, [router, searchParams]);

  if (errorMessage) {
    return (
      <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-xl dark:border-red-900/40 dark:bg-zinc-900">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50">
          <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Authentication Failed</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{errorMessage}</p>
        <div className="mt-6">
          <Link
            href={loginRoute()}
            className="inline-flex items-center justify-center rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-violet-700 transition"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-xl dark:border-white/10 dark:bg-zinc-900">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-950/50">
        <Loader2 className="h-6 w-6 animate-spin text-violet-600 dark:text-violet-400" />
      </div>
      <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Signing you in...</h2>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Completing secure Google authentication. You will be redirected shortly.
      </p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 py-12 dark:bg-[#09090B] transition-colors duration-200">
      <Suspense
        fallback={
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-xl dark:border-white/10 dark:bg-zinc-900">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-950/50">
              <Loader2 className="h-6 w-6 animate-spin text-violet-600 dark:text-violet-400" />
            </div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Signing you in...</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Connecting with Google authentication...
            </p>
          </div>
        }
      >
        <AuthCallbackContent />
      </Suspense>
    </main>
  );
}
