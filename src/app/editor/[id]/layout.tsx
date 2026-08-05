"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";

import { getProject } from "@/lib/projects";
import { useBuilderStore } from "@/store/builderStore";

export default function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const projectId = params?.id as string | undefined;

  const setProjectId = useBuilderStore((state) => state.setProjectId);
  const hydrateFromProject = useBuilderStore(
    (state) => state.hydrateFromProject
  );

  useEffect(() => {
    if (!projectId) {
      return;
    }

    const id = projectId;

    setProjectId(id);

    async function loadProject() {
      const { data, error } = await getProject(id);

      if (error || !data) {
        console.error("Failed to load project:", error);
        return;
      }

      hydrateFromProject(data);
    }

    loadProject();
  }, [projectId, setProjectId, hydrateFromProject]);

  return children;
}
