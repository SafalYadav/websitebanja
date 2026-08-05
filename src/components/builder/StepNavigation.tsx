"use client";

import { useRouter } from "next/navigation";

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
  nextText = "Next →",
  backText = "← Back",
  onNext,
  onBack,
}: StepNavigationProps) {
  const router = useRouter();

  return (
    <div className="mt-10 flex items-center justify-between">
      <button
        onClick={async () => {
          if (onBack) {
            await onBack();
            return;
          }

          if (back) {
            router.push(back);
            return;
          }

          router.back();
        }}
        className="rounded-2xl border border-white/10 px-8 py-4 text-white transition hover:bg-white/10"
      >
        {backText}
      </button>

      <button
        onClick={async () => {
          if (onNext) {
            await onNext();
            return;
          }

          if (next) {
            router.push(next);
          }
        }}
        className="rounded-2xl bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 px-10 py-4 font-semibold text-white transition hover:scale-105"
      >
        {nextText}
      </button>
    </div>
  );
}