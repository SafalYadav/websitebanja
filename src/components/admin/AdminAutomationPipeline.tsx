"use client";

// src/app/admin/automation/page.tsx
// Phase 13 — Autonomous Lead Pipeline Dashboard & Control Center

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type {
  PipelineRun,
  PipelineStatus,
  PipelineStage,
  LeadPipelineProgress,
} from "@/lib/automation/pipelineTypes";

export interface AdminAutomationPipelineProps {
  sessionToken?: string;
  onNavigateTab?: (tab: string) => void;
}

export default function AdminAutomationPipeline({ sessionToken, onNavigateTab }: AdminAutomationPipelineProps = {}) {
  const [runs, setRuns] = useState<PipelineRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Helper to obtain fresh Bearer token
  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    let token = sessionToken;
    if (!token) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        token = session?.access_token;
      } catch {
        // Fallback
      }
    }
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  };

  // Run creation modal state
  const [showRunModal, setShowRunModal] = useState(false);
  const [industry, setIndustry] = useState("fine dining restaurant");
  const [city, setCity] = useState("Jaipur");
  const [limit, setLimit] = useState(3);
  const [channel, setChannel] = useState<"email" | "whatsapp" | "instagram">("email");
  const [autoApprove, setAutoApprove] = useState(false);

  // Reply simulation modal state
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyLeadId, setReplyLeadId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("Hi! We saw the preview you built for us. How much does the full website cost?");

  // Clock advancement state
  const [clockDays, setClockDays] = useState(3);

  const fetchRuns = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/automation/pipeline", { headers });
      const data = await res.json();
      if (data.success) {
        setRuns(data.runs || []);
        if (data.runs && data.runs.length > 0 && !selectedRunId) {
          setSelectedRunId(data.runs[0].id);
        }
      } else {
        setErrorMessage(data.error?.message || "Failed to load runs");
      }
    } catch (err) {
      setErrorMessage("Network error fetching pipeline runs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const selectedRun = runs.find((r) => r.id === selectedRunId) || (runs.length > 0 ? runs[0] : null);

  const handleStartRun = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/automation/pipeline/run", {
        method: "POST",
        headers,
        body: JSON.stringify({
          criteria: {
            industry,
            city,
            limit: Number(limit),
            channel,
            autoApproveOutreach: autoApprove,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage(`Pipeline run '${data.run.id}' started successfully!`);
        setShowRunModal(false);
        await fetchRuns();
        if (data.run?.id) {
          setSelectedRunId(data.run.id);
        }
      } else {
        setErrorMessage(data.error?.message || "Failed to start pipeline run");
      }
    } catch {
      setErrorMessage("Network error triggering pipeline run");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePauseRun = async (runId: string) => {
    setActionLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/automation/pipeline/pause", {
        method: "POST",
        headers,
        body: JSON.stringify({ runId }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage(`Run ${runId} paused.`);
        fetchRuns();
      } else {
        setErrorMessage(data.error?.message || "Failed to pause run");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleResumeRun = async (runId: string) => {
    setActionLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/automation/pipeline/resume", {
        method: "POST",
        headers,
        body: JSON.stringify({ runId }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage(`Run ${runId} resumed.`);
        fetchRuns();
      } else {
        setErrorMessage(data.error?.message || "Failed to resume run");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelRun = async (runId: string) => {
    setActionLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/automation/pipeline/cancel", {
        method: "POST",
        headers,
        body: JSON.stringify({ runId, reason: "Cancelled via admin dashboard" }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage(`Run ${runId} cancelled.`);
        fetchRuns();
      } else {
        setErrorMessage(data.error?.message || "Failed to cancel run");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetryRun = async (runId: string) => {
    setActionLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/automation/pipeline/${runId}/retry`, {
        method: "POST",
        headers,
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage(`Retrying failed jobs for run ${runId}`);
        fetchRuns();
      } else {
        setErrorMessage(data.error?.message || "Failed to retry run");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleAdvanceClock = async () => {
    setActionLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/automation/pipeline/advance-clock", {
        method: "POST",
        headers,
        body: JSON.stringify({ days: clockDays }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage(
          `Advanced clock by ${clockDays} days. Executed ${data.processed?.executed?.length || 0} follow-up(s).`
        );
        fetchRuns();
      } else {
        setErrorMessage(data.error?.message || "Failed to advance clock");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleSimulateReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRunId || !replyLeadId) return;
    setActionLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/automation/pipeline/${selectedRunId}/simulate-reply`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          leadId: replyLeadId,
          messageText: replyText,
          channel,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage(`Inbound reply simulated: Intent '${data.analysis?.intent || "ANALYZED"}'`);
        setShowReplyModal(false);
        fetchRuns();
      } else {
        setErrorMessage(data.error?.message || "Failed to simulate reply");
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Aggregated totals
  const totalDiscovered = runs.reduce((acc, r) => acc + (r.stats?.discovered || 0), 0);
  const totalQualified = runs.reduce((acc, r) => acc + (r.stats?.qualified || 0), 0);
  const totalPreviews = runs.reduce((acc, r) => acc + (r.stats?.previewsGenerated || 0), 0);
  const totalOutreach = runs.reduce((acc, r) => acc + (r.stats?.outreachDispatched || 0), 0);
  const totalReplies = runs.reduce((acc, r) => acc + (r.stats?.repliesReceived || 0), 0);
  const totalInterested = runs.reduce((acc, r) => acc + (r.stats?.interested || 0), 0);

  const getStatusColor = (status: PipelineStatus) => {
    switch (status) {
      case "COMPLETED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "RUNNING":
        return "bg-blue-50 text-blue-700 border-blue-200 animate-pulse";
      case "PARTIAL_SUCCESS":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "PAUSED":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "CANCELLED":
        return "bg-zinc-100 text-zinc-600 border-zinc-200";
      case "FAILED":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-zinc-50 text-zinc-700 border-zinc-200";
    }
  };

  const getStageColor = (stage: PipelineStage) => {
    switch (stage) {
      case "DISCOVERY":
      case "QUALIFICATION":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "RESEARCH_AUDIT":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "PREVIEW_GENERATION":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "OUTREACH_DRAFT":
      case "SIMULATED_DISPATCH":
        return "bg-cyan-50 text-cyan-700 border-cyan-200";
      case "WAITING_FOR_REPLY":
      case "FOLLOW_UP_QUEUE":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "REPLY_INTELLIGENCE":
        return "bg-teal-50 text-teal-700 border-teal-200";
      case "COMPLETED":
        return "bg-green-50 text-green-700 border-green-200";
      default:
        return "bg-zinc-100 text-zinc-700 border-zinc-200";
    }
  };

  return (
    <div className="space-y-6 text-zinc-900 dark:text-zinc-100">
      {/* Top Status Banner */}
      <div className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 px-4 py-2 text-xs font-semibold rounded-2xl text-center tracking-wide flex flex-wrap items-center justify-center gap-2 shadow-xs">
        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span className="font-bold">Controlled Live Mode</span>
        <span className="text-zinc-400 dark:text-zinc-500">•</span>
        <span>Real discovery, audits, previews and Gmail are enabled. Outbound communication requires explicit approval.</span>
        <span className="text-zinc-400 dark:text-zinc-500">•</span>
        <span className="text-amber-600 dark:text-amber-400 font-medium">WhatsApp: Disabled — Manual contact required</span>
      </div>

      {/* Toolbar */}
      <div className="rounded-3xl border border-zinc-200/80 bg-white p-5 shadow-xs dark:border-white/10 dark:bg-zinc-900/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap justify-between items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                WebsiteBanja
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800">
                Autonomous Lead Pipeline
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              End-to-End Orchestrator: Discovery → Audit → Preview → Outreach → CRM → Follow-Up
            </p>
          </div>

          <div className="flex items-center gap-3">
            {onNavigateTab ? (
              <>
                <button
                  type="button"
                  onClick={() => onNavigateTab("leads")}
                  className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg shadow-sm transition"
                >
                  Lead Command Center →
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateTab("crm")}
                  className="text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-white/10 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  CRM Inbox →
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateTab("outreach")}
                  className="text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-white/10 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  Outreach Queue →
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateTab("analytics")}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/40 hover:bg-indigo-50"
                >
                  Analytics & Cost →
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/admin?tab=leads"
                  className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg shadow-sm transition"
                >
                  Lead Command Center →
                </Link>
                <Link
                  href="/admin?tab=crm"
                  className="text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-white/10 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  CRM Inbox →
                </Link>
                <Link
                  href="/admin?tab=outreach"
                  className="text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-white/10 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  Outreach Queue →
                </Link>
                <Link
                  href="/admin?tab=analytics"
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/40 hover:bg-indigo-50"
                >
                  Analytics & Cost →
                </Link>
              </>
            )}
            <button
              onClick={() => setShowRunModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Start Autonomous Run
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
        {errorMessage && (
          <div className="mb-4 p-3 text-sm bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center justify-between">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-rose-600 text-base">&times;</button>
          </div>
        )}
        {successMessage && (
          <div className="mb-4 p-3 text-sm bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg flex items-center justify-between">
            <span>{successMessage}</span>
            <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-600 text-base">&times;</button>
          </div>
        )}
      </div>

      {/* Metrics Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
            <p className="text-xs text-zinc-500 font-medium">Total Runs</p>
            <p className="text-xl font-bold text-zinc-900 mt-1">{runs.length}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
            <p className="text-xs text-zinc-500 font-medium">Qualified Leads</p>
            <p className="text-xl font-bold text-indigo-600 mt-1">{totalQualified}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
            <p className="text-xs text-zinc-500 font-medium">Previews Created</p>
            <p className="text-xl font-bold text-purple-600 mt-1">{totalPreviews}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
            <p className="text-xs text-zinc-500 font-medium">Outreach Dispatched</p>
            <p className="text-xl font-bold text-blue-600 mt-1">{totalOutreach}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
            <p className="text-xs text-zinc-500 font-medium">Replies Ingested</p>
            <p className="text-xl font-bold text-teal-600 mt-1">{totalReplies}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
            <p className="text-xs text-zinc-500 font-medium">Interested Leads</p>
            <p className="text-xl font-bold text-emerald-600 mt-1">{totalInterested}</p>
          </div>
        </div>
      </div>

      {/* Interactive Flow Stepper */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wide">
              Autonomous Pipeline Execution Stages
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">Advance Clock:</span>
              <button
                onClick={() => { setClockDays(3); handleAdvanceClock(); }}
                disabled={actionLoading}
                className="text-xs px-2 py-1 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-mono transition-colors"
              >
                +3 Days
              </button>
              <button
                onClick={() => { setClockDays(7); handleAdvanceClock(); }}
                disabled={actionLoading}
                className="text-xs px-2 py-1 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-mono transition-colors"
              >
                +7 Days
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-7 gap-2 text-center text-xs">
            <div className="p-3 rounded-lg border border-indigo-200 bg-indigo-50/50 dark:bg-indigo-950/20 dark:border-indigo-800/40">
              <div className="font-bold text-indigo-700 dark:text-indigo-400">1. Discovery</div>
              <p className="text-[10px] text-zinc-500 mt-1">Lead Crawl</p>
            </div>
            <div className="p-3 rounded-lg border border-purple-200 bg-purple-50/50 dark:bg-purple-950/20 dark:border-purple-800/40">
              <div className="font-bold text-purple-700 dark:text-purple-400">2. Research/Audit</div>
              <p className="text-[10px] text-zinc-500 mt-1">Scoring & Audit</p>
            </div>
            <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-800/40">
              <div className="font-bold text-emerald-700 dark:text-emerald-400">3. Personalized Preview</div>
              <p className="text-[10px] text-zinc-500 mt-1">Live Mockup</p>
            </div>
            <div className="p-3 rounded-lg border border-cyan-200 bg-cyan-50/50 dark:bg-cyan-950/20 dark:border-cyan-800/40">
              <div className="font-bold text-cyan-700 dark:text-cyan-400">4. Outreach Draft</div>
              <p className="text-[10px] text-zinc-500 mt-1">Pitch Generation</p>
            </div>
            <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800/40">
              <div className="font-bold text-blue-700 dark:text-blue-400">5. Review & Approval</div>
              <p className="text-[10px] text-zinc-500 mt-1">Controlled Live Dispatch</p>
            </div>
            <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800/40">
              <div className="font-bold text-amber-700 dark:text-amber-400">6. Follow-Up (Max 2)</div>
              <p className="text-[10px] text-zinc-500 mt-1">Automated Cadence</p>
            </div>
            <div className="p-3 rounded-lg border border-teal-200 bg-teal-50/50 dark:bg-teal-950/20 dark:border-teal-800/40">
              <div className="font-bold text-teal-700 dark:text-teal-400">7. Reply Intelligence</div>
              <p className="text-[10px] text-zinc-500 mt-1">CRM Triage</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main 2-Column Split: Runs List & Run Details */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Pipeline Runs List */}
          <div className="lg:col-span-1 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-white/10 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-zinc-100 dark:border-white/5 flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50">
              <h3 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                Pipeline Runs ({runs.length})
              </h3>
              <button
                onClick={fetchRuns}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium"
              >
                Refresh
              </button>
            </div>

            <div className="divide-y divide-zinc-100 dark:divide-white/5 overflow-y-auto max-h-[600px]">
              {loading && runs.length === 0 ? (
                <div className="p-6 text-center text-xs text-zinc-400">Loading pipeline runs...</div>
              ) : runs.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">No pipeline runs yet</p>
                  <p className="text-[11px] text-zinc-500 mt-1 mb-3">Launch an automated pipeline run to discover and engage new leads.</p>
                  <button
                    type="button"
                    onClick={() => setShowRunModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition"
                  >
                    Start New Pipeline Run
                  </button>
                </div>
              ) : (
                runs.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => setSelectedRunId(r.id)}
                    className={`p-3.5 cursor-pointer transition-colors text-xs ${
                      selectedRunId === r.id
                        ? "bg-indigo-50/60 border-l-4 border-indigo-600"
                        : "hover:bg-zinc-50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-zinc-600 font-bold">{r.id.substring(0, 18)}...</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getStatusColor(r.status)}`}>
                        {r.status}
                      </span>
                    </div>
                    <div className="text-zinc-800 font-medium">
                      {r.criteria?.industry} in {r.criteria?.city}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-1.5">
                      <span>{Object.keys(r.leads || {}).length} leads</span>
                      <span>{new Date(r.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Column: Run Detail & Lead Progress */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col">
            {selectedRun ? (
              <div>
                {/* Header & Controls */}
                <div className="p-5 border-b border-zinc-100 bg-zinc-50/50 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-zinc-900 font-mono">{selectedRun.id}</h3>
                      <span className={`px-2.5 py-0.5 rounded text-xs font-semibold border ${getStatusColor(selectedRun.status)}`}>
                        {selectedRun.status}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getStageColor(selectedRun.currentStage)}`}>
                        {selectedRun.currentStage}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">
                      Criteria: {selectedRun.criteria?.industry} • {selectedRun.criteria?.city} • Limit: {selectedRun.criteria?.limit || 5}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedRun.status === "RUNNING" && (
                      <button
                        onClick={() => handlePauseRun(selectedRun.id)}
                        disabled={actionLoading}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-yellow-300 bg-yellow-50 text-yellow-800 hover:bg-yellow-100"
                      >
                        Pause
                      </button>
                    )}
                    {selectedRun.status === "PAUSED" && (
                      <button
                        onClick={() => handleResumeRun(selectedRun.id)}
                        disabled={actionLoading}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                      >
                        Resume
                      </button>
                    )}
                    {(selectedRun.status === "RUNNING" || selectedRun.status === "PAUSED") && (
                      <button
                        onClick={() => handleCancelRun(selectedRun.id)}
                        disabled={actionLoading}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-zinc-300 bg-zinc-50 text-zinc-700 hover:bg-zinc-100"
                      >
                        Cancel
                      </button>
                    )}
                    {(selectedRun.status === "PARTIAL_SUCCESS" || selectedRun.status === "FAILED") && (
                      <button
                        onClick={() => handleRetryRun(selectedRun.id)}
                        disabled={actionLoading}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                      >
                        Retry Failed
                      </button>
                    )}
                  </div>
                </div>

                {/* Stats Breakdown */}
                <div className="grid grid-cols-4 gap-2 p-4 border-b border-zinc-100 bg-white text-center text-xs">
                  <div className="p-2 rounded bg-zinc-50">
                    <span className="text-zinc-500 block text-[10px]">Audited</span>
                    <span className="font-bold text-zinc-800 text-sm">{selectedRun.stats?.audited || 0}</span>
                  </div>
                  <div className="p-2 rounded bg-zinc-50">
                    <span className="text-zinc-500 block text-[10px]">Previews</span>
                    <span className="font-bold text-purple-700 text-sm">{selectedRun.stats?.previewsGenerated || 0}</span>
                  </div>
                  <div className="p-2 rounded bg-zinc-50">
                    <span className="text-zinc-500 block text-[10px]">Outreach</span>
                    <span className="font-bold text-blue-700 text-sm">{selectedRun.stats?.outreachDispatched || 0}</span>
                  </div>
                  <div className="p-2 rounded bg-zinc-50">
                    <span className="text-zinc-500 block text-[10px]">Replies</span>
                    <span className="font-bold text-emerald-700 text-sm">{selectedRun.stats?.repliesReceived || 0}</span>
                  </div>
                </div>

                {/* Lead Pipeline Progress Table */}
                <div className="p-4">
                  <h4 className="text-xs font-bold text-zinc-700 uppercase tracking-wider mb-3">
                    Lead Pipeline Progress ({Object.keys(selectedRun.leads || {}).length})
                  </h4>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-zinc-200 text-left text-xs">
                      <thead>
                        <tr className="text-zinc-500 bg-zinc-50">
                          <th className="py-2 px-3 font-medium">Business</th>
                          <th className="py-2 px-3 font-medium">Current Stage</th>
                          <th className="py-2 px-3 font-medium">Status</th>
                          <th className="py-2 px-3 font-medium">Retries</th>
                          <th className="py-2 px-3 font-medium">Artifacts</th>
                          <th className="py-2 px-3 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 bg-white">
                        {Object.values(selectedRun.leads || {}).map((lead: LeadPipelineProgress) => (
                          <tr key={lead.leadId} className="hover:bg-zinc-50/50">
                            <td className="py-2.5 px-3">
                              <div className="font-medium text-zinc-900">{lead.businessName}</div>
                              <span className="text-[10px] text-zinc-400 font-mono">{lead.leadId}</span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getStageColor(lead.currentStage)}`}>
                                {lead.currentStage}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                                lead.status === "completed" ? "bg-emerald-50 text-emerald-700" :
                                lead.status === "failed" ? "bg-rose-50 text-rose-700" :
                                lead.status === "running" ? "bg-blue-50 text-blue-700 animate-pulse" :
                                "bg-zinc-100 text-zinc-600"
                              }`}>
                                {lead.status}
                              </span>
                              {lead.lastError && (
                                <p className="text-[10px] text-rose-600 mt-1 max-w-xs truncate" title={lead.lastError}>
                                  {lead.lastError}
                                </p>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-zinc-600">
                              {lead.retryCount} / {lead.maxAttempts}
                            </td>
                            <td className="py-2.5 px-3 space-y-1">
                              {lead.previewUrl ? (
                                <a
                                  href={lead.previewUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-indigo-600 hover:underline block text-[11px] font-medium"
                                >
                                  Preview ↗
                                </a>
                              ) : (
                                <span className="text-zinc-400 text-[10px]">—</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                onClick={() => {
                                  setReplyLeadId(lead.leadId);
                                  setShowReplyModal(true);
                                }}
                                className="text-[11px] font-medium text-teal-700 bg-teal-50 border border-teal-200 px-2 py-1 rounded hover:bg-teal-100"
                              >
                                Simulate Reply
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-xs text-zinc-400">
                Select a pipeline run on the left to inspect its real-time stage progress and lead records.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Start Run Modal */}
      {showRunModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 text-xs">
            <h3 className="text-base font-bold text-zinc-900 mb-1">Trigger Autonomous Pipeline Run</h3>
            <p className="text-zinc-500 mb-4">
              Executes Discovery → Research & Audit → Personalized Preview → Outreach Drafting → Human Review & Approval.
            </p>

            <form onSubmit={handleStartRun} className="space-y-3">
              <div>
                <label className="font-medium text-zinc-700 block mb-1">Target Industry / Query</label>
                <input
                  type="text"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full border border-zinc-200 rounded-lg p-2 text-xs"
                  required
                />
              </div>

              <div>
                <label className="font-medium text-zinc-700 block mb-1">City / Region</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full border border-zinc-200 rounded-lg p-2 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-zinc-700 block mb-1">Lead Limit</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value))}
                    className="w-full border border-zinc-200 rounded-lg p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="font-medium text-zinc-700 block mb-1">Channel</label>
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value as any)}
                    className="w-full border border-zinc-200 rounded-lg p-2 text-xs bg-white"
                  >
                    <option value="email">Email (Gmail API)</option>
                    <option value="whatsapp" disabled>WhatsApp (Disabled — Manual contact required)</option>
                    <option value="instagram" disabled>Instagram DM (Planned)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoApprove}
                    onChange={(e) => setAutoApprove(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span className="font-medium text-zinc-800">Auto-Approve Drafts into Follow-Up Queue</span>
                </label>
                <p className="text-[10px] text-zinc-500 ml-5">
                  Controlled Live Mode: Drafts remain staged in HUMAN_APPROVAL until explicitly approved for live sending.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowRunModal(false)}
                  className="px-4 py-2 border border-zinc-200 rounded-lg text-zinc-600 hover:bg-zinc-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-sm transition-colors"
                >
                  {actionLoading ? "Executing Run..." : "Launch Autonomous Run"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Simulate Reply Modal */}
      {showReplyModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 text-xs">
            <h3 className="text-base font-bold text-zinc-900 mb-1">Simulate Inbound Reply</h3>
            <p className="text-zinc-500 mb-4">
              Simulates a response from lead <span className="font-mono font-bold text-zinc-800">{replyLeadId}</span> to test Reply Intelligence & Follow-up cancellation.
            </p>

            <form onSubmit={handleSimulateReply} className="space-y-3">
              <div>
                <label className="font-medium text-zinc-700 block mb-1">Message Text</label>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={4}
                  className="w-full border border-zinc-200 rounded-lg p-2 text-xs"
                  required
                />
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setReplyText("How much does the website design cost? What is included?")}
                  className="text-[10px] bg-zinc-100 hover:bg-zinc-200 px-2 py-0.5 rounded text-zinc-700"
                >
                  Price Inquiry
                </button>
                <button
                  type="button"
                  onClick={() => setReplyText("This preview is impressive. Can we jump on a quick call this week?")}
                  className="text-[10px] bg-zinc-100 hover:bg-zinc-200 px-2 py-0.5 rounded text-zinc-700"
                >
                  Call Request
                </button>
                <button
                  type="button"
                  onClick={() => setReplyText("Please remove our business from your list. Do not contact us again.")}
                  className="text-[10px] bg-zinc-100 hover:bg-zinc-200 px-2 py-0.5 rounded text-zinc-700"
                >
                  Opt Out (Do Not Contact)
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowReplyModal(false)}
                  className="px-4 py-2 border border-zinc-200 rounded-lg text-zinc-600 hover:bg-zinc-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold shadow-sm transition-colors"
                >
                  {actionLoading ? "Submitting..." : "Send Simulated Reply"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
