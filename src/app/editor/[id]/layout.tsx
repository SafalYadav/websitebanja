"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { dashboardRoute } from "@/lib/editorRoutes";
import { getProject } from "@/lib/projects";
import { useBuilderStore } from "@/store/builderStore";

export default function EditorLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const setProjectId = useBuilderStore((state) => state.setProjectId);
  const hydrateFromProject = useBuilderStore((state) => state.hydrateFromProject);

  useEffect(() => {
    async function loadProject() {
      setStatus("loading");
      const { data, error } = await getProject(params.id);
      if (error || !data) { setStatus("error"); return; }
      setProjectId(params.id);
      hydrateFromProject(data);
      setStatus("ready");
    }
    void loadProject();
  }, [hydrateFromProject, params.id, setProjectId]);

  if (status === "loading") return <main className="flex min-h-screen items-center justify-center bg-black text-zinc-400">Loading project…</main>;
  if (status === "error") return <main className="flex min-h-screen items-center justify-center bg-black px-6 text-center text-white"><div><h1 className="text-3xl font-bold">Project unavailable</h1><p className="mt-3 text-zinc-400">It may have been deleted or you may no longer have access.</p><button onClick={() => router.push(dashboardRoute())} className="mt-6 rounded-xl bg-white px-5 py-3 font-semibold text-black">Back to dashboard</button></div></main>;
  return children;
}
