"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { dashboardRoute, editorRoute, type EditorStep } from "@/lib/editorRoutes";
import { useBuilderStore } from "@/store/builderStore";

interface BuilderRedirectProps {
  step?: EditorStep;
}

export default function BuilderRedirect({ step }: BuilderRedirectProps) {
  const router = useRouter();
  const projectId = useBuilderStore((state) => state.projectId);

  useEffect(() => {
    if (projectId) {
      router.replace(editorRoute(projectId, step));
      return;
    }

    router.replace(dashboardRoute());
  }, [projectId, router, step]);

  return null;
}
