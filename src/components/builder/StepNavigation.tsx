"use client";

import { useRouter } from "next/navigation";

interface StepNavigationProps {
  back?: string;
  next?: string;
  nextText?: string;
}

export default function StepNavigation({
  back,
  next,
  nextText = "Next →",
}: StepNavigationProps) {
  const router = useRouter();

  return (
    <div className="mt-10 flex items-center justify-between">

      <button
        onClick={() => {
          if (back) {
            router.push(back);
          } else {
            router.back();
          }
        }}
        className="rounded-2xl border border-white/10 px-8 py-4 text-white transition hover:bg-white/10"
      >
        ← Back
      </button>

      <button
        onClick={() => {
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