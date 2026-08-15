"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface StepNavigationProps {
  back?: string;
  next?: string;
  nextText?: string;
  backText?: string;
  onNext?: () => void | Promise<void>;
  onBack?: () => void | Promise<void>;
}

export default function StepNavigation({
  back,
  next,
  nextText = "Continue",
  backText = "Back",
  onNext,
  onBack,
}: StepNavigationProps) {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  async function runAction(action?: () => void | Promise<void>, route?: string) {
    if (isNavigating) return;
    setIsNavigating(true);
    try {
      if (action) await action();
      else if (route) router.push(route);
      else router.back();
    } finally {
      setIsNavigating(false);
    }
  }

  return (
    <div className="mt-10 pt-6 border-t border-zinc-200/80 dark:border-white/10 flex items-center justify-between gap-4">
      <button
        type="button"
        onClick={() => runAction(onBack, back)}
        disabled={isNavigating}
        className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-100 px-6 py-3.5 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-200 active:scale-[0.98] disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>{backText}</span>
      </button>

      <button
        type="button"
        onClick={() => runAction(onNext, next)}
        disabled={isNavigating}
        className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-violet-600 to-indigo-600 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-600/25 transition hover:opacity-95 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
      >
        {isNavigating ? (
          <>
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            <span>Saving...</span>
          </>
        ) : (
          <>
            <span>{nextText}</span>
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>
    </div>
  );
}
