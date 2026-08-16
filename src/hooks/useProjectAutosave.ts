"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { updateProject } from "@/lib/projects";
import type { ProjectUpdates } from "@/types/project";

export function useProjectAutosave(projectId: string, updates: ProjectUpdates) {
  const [isSaving, setIsSaving] = useState(false);
  const [isError, setIsError] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date>(new Date());
  const updatesRef = useRef(updates);
  const lastSavedRef = useRef("");
  const initializedRef = useRef(false);
  const fingerprint = JSON.stringify(updates);

  useEffect(() => {
    updatesRef.current = updates;
  });

  const saveNow = useCallback(async () => {
    if (!projectId) return;
    const nextFingerprint = JSON.stringify(updatesRef.current);
    if (nextFingerprint === lastSavedRef.current) return;
    setIsSaving(true);
    setIsError(false);
    try {
      const { error } = await updateProject(projectId, updatesRef.current);
      if (error) throw error;
      lastSavedRef.current = nextFingerprint;
      setLastSavedAt(new Date());
    } catch {
      setIsError(true);
    } finally {
      setIsSaving(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      lastSavedRef.current = fingerprint;
      return;
    }
    const timer = window.setTimeout(() => void saveNow().catch(() => undefined), 600);
    return () => window.clearTimeout(timer);
  }, [fingerprint, saveNow]);

  return { isSaving, isError, lastSavedAt, saveNow };
}
