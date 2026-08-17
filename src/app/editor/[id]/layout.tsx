"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { dashboardRoute } from "@/lib/editorRoutes";
import { getProject } from "@/lib/projects";
import { useBuilderStore } from "@/store/builderStore";
import { useGeneratedWebsiteStore } from "@/store/generatedWebsiteStore";
import type { WebsiteData } from "@/types/website";

export default function EditorLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let isCancelled = false;

    async function loadProject() {
      if (!params?.id) return;
      setStatus("loading");

      // Clear previous project state to prevent any state leakage
      useBuilderStore.getState().clearProject();
      useGeneratedWebsiteStore.getState().clearWebsite();

      const { data, error } = await getProject(params.id);
      if (isCancelled) return;

      if (error || !data) {
        setStatus("error");
        return;
      }

      useBuilderStore.getState().hydrateFromProject(data);

      if (data.json_data && Object.keys(data.json_data).length > 0) {
        useGeneratedWebsiteStore.getState().setWebsiteForProject(params.id, data.json_data as WebsiteData);
      }

      setStatus("ready");
    }

    void loadProject();

    return () => {
      isCancelled = true;
    };
  }, [params?.id]);

  if (status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-900 text-zinc-400">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
          <span className="text-xs font-semibold">Loading project workspace...</span>
        </div>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black px-6 text-center text-white">
        <div>
          <h1 className="text-3xl font-bold">Project unavailable</h1>
          <p className="mt-3 text-zinc-400">It may have been deleted or you may no longer have access.</p>
          <button
            onClick={() => router.push(dashboardRoute())}
            className="mt-6 rounded-xl bg-white px-5 py-3 font-semibold text-black"
          >
            Back to dashboard
          </button>
        </div>
      </main>
    );
  }

  return children;
}
