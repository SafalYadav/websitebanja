"use client";

import { useEffect, useState } from "react";

import { updateProject } from "@/lib/projects";
import { useBuilderStore } from "@/store/builderStore";
import { useGeneratedWebsiteStore } from "@/store/generatedWebsiteStore";

export default function LoadingPage() {
  const [isComplete, setIsComplete] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const projectId = useBuilderStore((state) => state.projectId);

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

  const { setWebsite, setIsGenerating } = useGeneratedWebsiteStore();

  useEffect(() => {
    async function generateWebsite() {
      if (!projectId) {
        setErrorMessage("Project not found");
        return;
      }

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

        if (!response.ok || !data.success) {
          throw new Error(data.message || "Generation failed");
        }

        setWebsite(data.data);

        const { error } = await updateProject(projectId, {
          json_data: data.data,
        });

        if (error) {
          throw new Error(error.message);
        }

        setIsComplete(true);
      } catch (err) {
        console.error(err);
        setErrorMessage(
          err instanceof Error ? err.message : "Failed to generate website."
        );
      } finally {
        setIsGenerating(false);
      }
    }

    generateWebsite();
  }, [
    projectId,
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
    setWebsite,
    setIsGenerating,
  ]);

  if (errorMessage) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="w-full max-w-xl px-8 text-center">
          <h1 className="text-4xl font-bold">Generation Failed</h1>
          <p className="mt-4 text-red-400">{errorMessage}</p>
        </div>
      </main>
    );
  }

  if (isComplete) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="w-full max-w-xl px-8 text-center">
          <h1 className="text-4xl font-bold">✅ Website Generated!</h1>
          <p className="mt-4 text-zinc-400">
            Your website has been saved to your project.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black text-white">
      <div className="w-full max-w-xl px-8 text-center">
        <h1 className="text-4xl font-bold">🤖 AI is Building Your Website</h1>

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
