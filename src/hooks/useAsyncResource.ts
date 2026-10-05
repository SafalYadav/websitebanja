"use client";

import { useCallback, useEffect, useState } from "react";

/** Derive pending state from request identity; effects only commit async results. */
export function useAsyncResource<T>(key: string, load: () => Promise<T>) {
  const [revision, setRevision] = useState(0);
  const [settled, setSettled] = useState<{ key: string; revision: number; load: typeof load; data: T | null; error: string | null } | null>(null);
  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        const data = await load();
        if (active) setSettled({ key, revision, load, data, error: null });
      } catch (error: unknown) {
        if (active) setSettled({ key, revision, load, data: null,
          error: error instanceof Error ? error.message : "Request failed" });
      }
    };
    void run();
    return () => { active = false; };
  }, [key, revision, load]);
  const sameRequest = settled?.key === key && settled.load === load;
  return {
    data: sameRequest ? settled.data : null,
    error: sameRequest && settled.revision === revision ? settled.error : null,
    loading: !sameRequest || settled.revision !== revision,
    refresh: useCallback(() => setRevision(value => value + 1), []),
    dismissError: useCallback(() => setSettled(value => value && value.key === key && value.revision === revision && value.load === load
      ? { ...value, error: null } : value), [key, revision, load]),
  };
}
