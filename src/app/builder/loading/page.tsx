"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoadingPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/editor");
    }, 6000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-black text-white">

      <div className="w-full max-w-xl px-8 text-center">

        <h1 className="text-4xl font-bold">
          🤖 AI is Building Your Website
        </h1>

        <p className="mt-4 text-zinc-400">
          Please wait while our AI designs your website...
        </p>

        <div className="mt-10 h-3 overflow-hidden rounded-full bg-white/10">

          <div className="h-full w-full animate-pulse rounded-full bg-gradient-to-r from-blue-500 via-violet-500 to-purple-500"></div>

        </div>

        <div className="mt-10 space-y-4 text-left">

          <p>✅ Understanding Business...</p>

          <p>✅ Choosing Best Template...</p>

          <p>⏳ Writing Website Content...</p>

          <p>○ Creating Images...</p>

          <p>○ Optimizing SEO...</p>

          <p>○ Publishing Website...</p>

        </div>

      </div>

    </main>
  );
}