"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { updateProject } from "@/lib/projects";
import type { ProjectUpdates } from "@/types/project";

export function useProjectAutosave(projectId: string, updates: ProjectUpdates) {
  const [isSaving, setIsSaving] = useState(false);
  const updatesRef = useRef(updates);
  const lastSavedRef = useRef("");
  const initializedRef = useRef(false);
  const fingerprint = JSON.stringify(updates);

  useEffect(() => {
    updatesRef.current = updates;
  });

  const saveNow = useCallback(async () => {
    if (!projectId) throw new Error("Project not found");
    const nextFingerprint = JSON.stringify(updatesRef.current);
    if (nextFingerprint === lastSavedRef.current) return;
    setIsSaving(true);
    const { error } = await updateProject(projectId, updatesRef.current);
    setIsSaving(false);
    if (error) throw error;
    lastSavedRef.current = nextFingerprint;
  }, [projectId]);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      lastSavedRef.current = fingerprint;
      return;
    }
    const timer = window.setTimeout(() => void saveNow().catch(() => undefined), 700);
    return () => window.clearTimeout(timer);
  }, [fingerprint, saveNow]);

  return { isSaving, saveNow };
}
