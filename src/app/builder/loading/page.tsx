"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useBuilderStore } from "@/store/builderStore";
import { useGeneratedWebsiteStore } from "@/store/generatedWebsiteStore";

export default function LoadingPage() {
  const router = useRouter();

  const {
    businessName,
    category,
    description,
    targetAudience,

    style,
    primaryColor,
    secondaryColor,

    phone,
    email,
    website,
    instagram,
    facebook,
    address,
  } = useBuilderStore();

  const {
    setWebsite,
    setIsGenerating,
  } = useGeneratedWebsiteStore();

  useEffect(() => {
    async function generateWebsite() {
      try {
        setIsGenerating(true);

        const response = await fetch("/api/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            businessName,
            category,
            description,
            targetAudience,

            style,
            primaryColor,
            secondaryColor,

            phone,
            email,
            website,
            instagram,
            facebook,
            address,
          }),
        });

        const data = await response.json();
        console.log("API Response:", data);

        if (!response.ok || !data.success) {
          throw new Error(data.message || "Generation failed");
        }

        console.log("AI Response:", data);

setWebsite(data.data);

console.log("Stored Website:", data.data);

router.push("/");
      } catch (err) {
        console.error(err);
        alert("Failed to generate website.");
      } finally {
        setIsGenerating(false);
      }
    }

    generateWebsite();
  }, [
    businessName,
    category,
    description,
    targetAudience,
    style,
    primaryColor,
    secondaryColor,
    phone,
    email,
    website,
    instagram,
    facebook,
    address,
    router,
    setWebsite,
    setIsGenerating,
  ]);

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
          <div className="h-full w-full animate-pulse rounded-full bg-gradient-to-r from-blue-500 via-violet-500 to-purple-500" />
        </div>

        <div className="mt-10 space-y-4 text-left">
          <p>✅ Understanding Business...</p>
          <p>✅ Choosing Best Template...</p>
          <p>⏳ Writing Website Content...</p>
          <p>⏳ Generating Layout...</p>
          <p>⏳ Optimizing Content...</p>
          <p>🚀 Finalizing Website...</p>
        </div>
      </div>
    </main>
  );
}