"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import BuilderPage from "@/app/builder/page";
import { useBuilderStore } from "@/store/builderStore";

export default function EditorPage() {
  const params = useParams();
  const setProjectId = useBuilderStore((state) => state.setProjectId);

  useEffect(() => {
    if (params?.id) {
      setProjectId(params.id as string);
    }
  }, [params, setProjectId]);

  return <BuilderPage />;
}