"use client";
import { useCallback, useState } from "react";
import { useAsyncResource } from "@/hooks/useAsyncResource";

interface KnowledgeVersion {
  id: string; tenant_id: string; concept_key: string; active: boolean;
  approved_by: string; created_at: string; concept: unknown; regression_report: unknown;
  active_version_id: string | null;
}
interface KnowledgeEvent {
  id: string; action: string; version_id: string; actor_user_id: string; created_at: string;
}

export default function SemanticKnowledgeVersions({ sessionToken }: { sessionToken?: string }) {
  const [actionError, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<{ versionId: string; activeVersionId: string | null } | null>(null);
  const loadVersions = useCallback(async (): Promise<{ versions: KnowledgeVersion[]; events: KnowledgeEvent[] }> => {
      if (!sessionToken) return { versions: [], events: [] };
      const response = await fetch("/api/admin/intelligence/knowledge", { headers: { Authorization: `Bearer ${sessionToken}` }, cache: "no-store" });
      if (!response.ok) throw new Error("Knowledge versions unavailable");
      const result = await response.json() as { versions: KnowledgeVersion[]; events: KnowledgeEvent[] };
      if (!Array.isArray(result.versions) || !Array.isArray(result.events)) throw new Error("Knowledge response is incomplete");
      return result;
  }, [sessionToken]);
  const { data, loading, error: loadError, refresh: load } = useAsyncResource("knowledge-versions", loadVersions);
  const versions = data?.versions ?? [];
  const events = data?.events ?? [];
  const error = actionError || loadError;
  async function rollback(versionId: string) {
    if (!sessionToken || selected?.versionId !== versionId) return;
    setBusy(true);
    try {
      const response = await fetch("/api/admin/intelligence/knowledge", { method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionToken}` },
        body: JSON.stringify({ versionId, expectedActiveVersionId: selected.activeVersionId }) });
      if (!response.ok) {
        const result = await response.json() as { error?: string };
        throw new Error(result.error || "Rollback was rejected; active knowledge was not changed");
      }
      setSelected(null); await load();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Rollback failed"); }
    finally { setBusy(false); }
  }
  return <section className="mt-6 rounded-xl border border-slate-300 bg-white p-5 text-slate-900">
    <h3 className="text-lg font-semibold">Approved learning versions</h3>
    <p className="mt-2 text-sm">Rollback restores an already human-approved, regression-checked concept for its own workspace only.</p>
    <button type="button" disabled={busy || loading || !sessionToken} className="my-3 rounded border px-3 py-2" onClick={() => { setSelected(null); setError(""); load(); }}>Refresh versions</button>
    {!sessionToken && <p>Sign in to review this workspace’s learning versions.</p>}
    {loading && sessionToken && <p role="status">Loading learning versions…</p>}
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {!loading && sessionToken && !versions.length && !error && <p>No approved runtime knowledge.</p>}
    {versions.map(version => <article key={version.id} className="mb-3 rounded border p-3">
      <p className="font-medium">{version.concept_key} · Version {version.id} · {version.active ? "Active" : "Inactive"}</p>
      <p className="text-sm">Workspace: {version.tenant_id} · Approved by: {version.approved_by}</p>
      <details className="mt-2"><summary>Concept and regression evidence</summary><pre className="overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify({ concept: version.concept, regressions: version.regression_report }, null, 2)}</pre></details>
      {!version.active && <button type="button" disabled={busy || !sessionToken} className="mt-2 rounded border px-3 py-2" onClick={() => setSelected({ versionId: version.id, activeVersionId: version.active_version_id })}>Restore this version</button>}
      {selected?.versionId === version.id && <div className="mt-3 rounded bg-amber-50 p-3" role="group" aria-label="Confirm knowledge rollback">
        <p>This replaces active version {selected.activeVersionId ?? "none"} of this concept in this workspace. Confirm after reviewing its evidence.</p>
        <button type="button" disabled={busy} className="mr-3 mt-2 rounded bg-slate-900 px-3 py-2 text-white" onClick={() => void rollback(version.id)}>Confirm rollback</button>
        <button type="button" disabled={busy} className="rounded border px-3 py-2" onClick={() => setSelected(null)}>Cancel</button>
      </div>}
    </article>)}
    <details><summary>Activation and rollback audit trail</summary>{events.map(event => <p key={event.id} className="mt-1 text-xs">{event.created_at}: {event.action} version {event.version_id} by {event.actor_user_id}</p>)}</details>
  </section>;
}
