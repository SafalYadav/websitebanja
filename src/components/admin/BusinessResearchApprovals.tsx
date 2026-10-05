"use client";
import { useCallback, useState } from "react";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import SemanticKnowledgeVersions from "./SemanticKnowledgeVersions";

interface ResearchRecord {
  id: string;
  status: string;
  tenant_id: string;
  dossier: unknown;
  agent_trace: unknown;
  review_hash: string;
}

export default function BusinessResearchApprovals({ sessionToken }: { sessionToken?: string }) {
  const [actionError, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const loadQueue = useCallback(async (): Promise<ResearchRecord[]> => {
      if (!sessionToken) return [];
      const response = await fetch("/api/admin/intelligence/research", { headers: { Authorization: `Bearer ${sessionToken}` } });
      if (!response.ok) throw new Error("Business research queue could not be loaded");
      const result = await response.json() as {research: ResearchRecord[]};
      if (!Array.isArray(result.research)) throw new Error("Research queue response is incomplete");
      return result.research;
  }, [sessionToken]);
  const { data, loading, error: loadError, refresh: load } = useAsyncResource("research-approvals", loadQueue);
  const records = data ?? [];
  const error = actionError || loadError;
  async function review(record: ResearchRecord, action: "approve" | "reject") {
    if (!sessionToken || !/^[a-f0-9]{64}$/.test(record.review_hash)) {
      setError("Refresh the authenticated queue before reviewing this research.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/admin/intelligence/research", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionToken}` },
        body: JSON.stringify({ id: record.id, action, expectedReviewHash: record.review_hash }),
      });
      if (!response.ok) {
        const result = await response.json() as { error?: string };
        throw new Error(result.error || "Research decision could not be saved");
      }
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Review failed"); }
    finally { setBusy(false); }
  }
  return <section className="rounded-xl border border-slate-300 bg-white p-5 text-slate-900">
    <h2 className="text-xl font-semibold">Business research approvals</h2>
    <p className="mt-2 text-sm">Review CEO evidence and the independent Boss report before activating business knowledge.</p>
    <button disabled={busy || loading || !sessionToken} className="my-3 rounded border px-3 py-2" onClick={() => { setError(""); load(); }}>Refresh queue</button>
    {!sessionToken && <p>Sign in as the workspace administrator to review research.</p>}
    {loading && sessionToken && <p role="status">Loading research queue…</p>}
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {!loading && sessionToken && !records.length && !error && <p>No business research requests.</p>}
    {records.map(record => <article key={record.id} className="my-4 rounded border p-4">
      <p className="font-semibold">{record.status.replaceAll("_", " ")}</p>
      <p className="text-sm">Workspace: {record.tenant_id}</p>
      <details><summary>Research evidence and agent reviews</summary><pre className="overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify({dossier:record.dossier, reviews:record.agent_trace}, null, 2)}</pre></details>
      {record.status === "WAITING_HUMAN_APPROVAL" && <div className="mt-3 flex gap-3">
        <button disabled={busy || !sessionToken} className="rounded bg-slate-900 px-4 py-2 text-white" onClick={() => void review(record,"approve")}>Approve knowledge</button>
        <button disabled={busy || !sessionToken} className="rounded border px-4 py-2" onClick={() => void review(record,"reject")}>Reject</button>
      </div>}
    </article>)}
    <SemanticKnowledgeVersions sessionToken={sessionToken} />
  </section>;
}
