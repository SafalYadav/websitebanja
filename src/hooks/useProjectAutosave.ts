"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { updateProject } from "@/lib/projects";
import type { ProjectUpdates } from "@/types/project";

export function useProjectAutosave(
  projectId: string,
  updates: ProjectUpdates,
  enabled: boolean = true
) {
  const [isSaving, setIsSaving] = useState(false);
  const [isError, setIsError] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date>(new Date());
  
  const updatesRef = useRef(updates);
  const lastSavedRef = useRef("");
  const initializedRef = useRef(false);
  const currentProjectIdRef = useRef(projectId);
  const enabledRef = useRef(enabled);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    updatesRef.current = updates;
    enabledRef.current = enabled;
  });

  // When projectId changes, immediately abort pending saves and reset initialization
  useEffect(() => {
    if (currentProjectIdRef.current !== projectId) {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      currentProjectIdRef.current = projectId;
      initializedRef.current = false;
      lastSavedRef.current = "";
    }
  }, [projectId]);

  const saveNow = useCallback(async () => {
    if (!projectId || !enabledRef.current) return;
    
    // Verify updates payload is valid
    const currentUpdates = updatesRef.current;
    if (!currentUpdates || Object.keys(currentUpdates).length === 0) return;

    // If json_data is explicitly passed, make sure it's not undefined/null
    if ("json_data" in currentUpdates && (!currentUpdates.json_data || Object.keys(currentUpdates.json_data).length === 0)) {
      return;
    }

    const nextFingerprint = JSON.stringify(currentUpdates);
    if (nextFingerprint === lastSavedRef.current) return;

    setIsSaving(true);
    setIsError(false);
    try {
      const { error } = await updateProject(projectId, currentUpdates);
      if (error) throw error;
      lastSavedRef.current = nextFingerprint;
      setLastSavedAt(new Date());
    } catch (err) {
      console.warn(`[Autosave] Failed to save project ${projectId}:`, err);
      setIsError(true);
    } finally {
      setIsSaving(false);
    }
  }, [projectId]);

  const fingerprint = JSON.stringify(updates);

  useEffect(() => {
    if (!enabled || !projectId) {
      return;
    }

    if (!initializedRef.current) {
      initializedRef.current = true;
      lastSavedRef.current = fingerprint;
      return;
    }

    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }

    timerRef.current = window.setTimeout(() => {
      void saveNow().catch(() => undefined);
    }, 600);

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [fingerprint, saveNow, enabled, projectId]);

  return { isSaving, isError, lastSavedAt, saveNow };
}

