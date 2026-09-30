"use client";

// src/app/admin/leads/page.tsx
// Phase 15 — WebsiteBanja Lead Command Center

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  RefreshCw,
  SlidersHorizontal,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  X,
  Play,
  Pause,
  RotateCcw,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  MessageSquare,
  Sparkles,
  Shield,
  Layers,
  Building,
  Globe,
  Phone,
  Mail,
  ArrowUpDown,
  Filter,
  Users,
  Send,
  Calendar,
} from "lucide-react";
import type {
  CommandCenterLead,
  CommandCenterKPIs,
  FilterPreset,
  LeadDetailView,
  LeadReviewItem,
} from "@/lib/leads/types";
import type { PipelineStage } from "@/lib/automation/pipelineTypes";

const CANONICAL_STAGES: PipelineStage[] = [
  "DISCOVERY",
  "QUALIFICATION",
  "RESEARCH_AUDIT",
  "PREVIEW_GENERATION",
  "OUTREACH_DRAFT",
  "HUMAN_APPROVAL",
  "SIMULATED_DISPATCH",
  "WAITING_FOR_REPLY",
  "REPLY_INTELLIGENCE",
  "FOLLOW_UP_QUEUE",
  "COMPLETED",
  "PAUSED",
  "CANCELLED",
  "FAILED",
];

const PRESETS: Array<{ id: FilterPreset; label: string }> = [
  { id: "all", label: "All Leads" },
  { id: "new", label: "New Leads" },
  { id: "qualified", label: "Qualified" },
  { id: "preview_ready", label: "Preview Ready" },
  { id: "outreach_ready", label: "Outreach Ready" },
  { id: "awaiting_reply", label: "Awaiting Reply" },
  { id: "interested", label: "Interested" },
  { id: "followup_due", label: "Follow-up Due" },
  { id: "meetings_requested", label: "Meetings" },
  { id: "won", label: "Won" },
  { id: "failed", label: "Failed" },
  { id: "paused", label: "Paused" },
  { id: "needs_review", label: "Needs Review" },
  { id: "high_opportunity", label: "High Opportunity" },
];

export interface AdminLeadCommandCenterProps {
  onNavigateTab?: (tab: string) => void;
}

export default function AdminLeadCommandCenter({ onNavigateTab }: AdminLeadCommandCenterProps = {}) {
  // State
  const [leads, setLeads] = useState<CommandCenterLead[]>([]);
  const [kpis, setKpis] = useState<CommandCenterKPIs | null>(null);
  const [facets, setFacets] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters & Search
  const [activePreset, setActivePreset] = useState<FilterPreset>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStage, setSelectedStage] = useState<PipelineStage | "ALL">("ALL");
  const [selectedIndustry, setSelectedIndustry] = useState<string>("ALL");
  const [sortField, setSortField] = useState<string>("lastActivityAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [density, setDensity] = useState<"compact" | "comfortable">("compact");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Selection
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());

  // Detail Drawer
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);
  const [leadDetail, setLeadDetail] = useState<LeadDetailView | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [drawerTab, setDrawerTab] = useState<
    "profile" | "qualification" | "audit" | "preview" | "outreach" | "crm" | "pipeline" | "timeline"
  >("profile");

  // Modals
  const [showReviewQueueModal, setShowReviewQueueModal] = useState(false);
  const [reviewItems, setReviewItems] = useState<LeadReviewItem[]>([]);
  const [loadingReview, setLoadingReview] = useState(false);

  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [followUpsList, setFollowUpsList] = useState<any[]>([]);
  const [loadingFollowUps, setLoadingFollowUps] = useState(false);

  const [showNewRunModal, setShowNewRunModal] = useState(false);
  const [runIndustry, setRunIndustry] = useState("restaurant");
  const [runCity, setRunCity] = useState("Vadodara");
  const [runLimit, setRunLimit] = useState(3);
  const [actionLoading, setActionLoading] = useState(false);

  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyText, setReplyText] = useState("We loved the preview website you generated! What are your commercial terms and pricing?");

  const [clockDays, setClockDays] = useState(3);
  const [integrationStatuses, setIntegrationStatuses] = useState<any>(null);

  useEffect(() => {
    fetch("/api/integrations/status", {
      headers: { "x-automation-secret": "wb-auto-secret-local-dev-2026" },
    })
      .then((r) => r.json())
      .then((d) => setIntegrationStatuses(d))
      .catch(() => null);
  }, []);

  // 1. Fetch Leads List
  const fetchLeads = useCallback(
    async (isManual = false) => {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      setErrorMessage(null);

      try {
        const params = new URLSearchParams();
        if (activePreset !== "all") params.set("preset", activePreset);
        if (searchQuery.trim()) params.set("search", searchQuery.trim());
        if (selectedStage !== "ALL") params.set("stage", selectedStage);
        if (selectedIndustry !== "ALL") params.set("industry", selectedIndustry);
        params.set("page", String(currentPage));
        params.set("limit", "25");
        params.set("sortField", sortField);
        params.set("sortDir", sortDir);

        const res = await fetch(`/api/automation/leads?${params.toString()}`, {
          headers: {
            "x-automation-secret": "wb-auto-secret-local-dev-2026",
          },
        });
        const data = await res.json();

        if (data.success) {
          setLeads(data.leads || []);
          setTotalCount(data.totalCount || 0);
          setTotalPages(data.totalPages || 1);
          setKpis(data.kpis || null);
          setFacets(data.facets || null);
        } else {
          setErrorMessage(data.error || "Failed to load leads");
        }
      } catch {
        setErrorMessage("Network error fetching lead records");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activePreset, searchQuery, selectedStage, selectedIndustry, currentPage, sortField, sortDir]
  );

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // 2. Fetch Single Lead Detail
  const openLeadDetail = async (leadId: string) => {
    setActiveLeadId(leadId);
    setLoadingDetail(true);
    setDrawerTab("profile");
    try {
      const res = await fetch(`/api/automation/leads/${leadId}`, {
        headers: { "x-automation-secret": "wb-auto-secret-local-dev-2026" },
      });
      const data = await res.json();
      if (data.success && data.lead) {
        setLeadDetail(data.lead);
      } else {
        setErrorMessage(data.error || "Failed to load lead details");
      }
    } catch {
      setErrorMessage("Network error fetching lead details");
    } finally {
      setLoadingDetail(false);
    }
  };

  // 3. Fetch Review Queue
  const fetchReviewQueue = async () => {
    setLoadingReview(true);
    try {
      const res = await fetch("/api/automation/leads/review-queue", {
        headers: { "x-automation-secret": "wb-auto-secret-local-dev-2026" },
      });
      const data = await res.json();
      if (data.success) {
        setReviewItems(data.reviewQueue || []);
        setShowReviewQueueModal(true);
      }
    } catch {
      setErrorMessage("Network error loading review queue");
    } finally {
      setLoadingReview(false);
    }
  };

  // 4. Fetch Follow-Ups
  const fetchFollowUps = async () => {
    setLoadingFollowUps(true);
    try {
      const res = await fetch("/api/automation/leads/follow-ups", {
        headers: { "x-automation-secret": "wb-auto-secret-local-dev-2026" },
      });
      const data = await res.json();
      if (data.success) {
        setFollowUpsList(data.followUps || []);
        setShowFollowUpModal(true);
      }
    } catch {
      setErrorMessage("Network error loading follow-ups");
    } finally {
      setLoadingFollowUps(false);
    }
  };

  // Actions
  const handleTriggerRun = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch("/api/automation/pipeline/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          criteria: {
            industry: runIndustry,
            city: runCity,
            limit: runLimit,
            autoApproveOutreach: true,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage(`Started autonomous pipeline run: ${data.run?.id}`);
        setShowNewRunModal(false);
        fetchLeads(true);
      } else {
        setErrorMessage(data.error?.message || "Failed to trigger run");
      }
    } catch {
      setErrorMessage("Network error starting pipeline run");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAdvanceClock = async () => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/automation/pipeline/advance-clock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: clockDays }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage(
          `Simulated clock advanced by ${clockDays} days. Executed ${data.processed?.executed?.length || 0} follow-up(s).`
        );
        fetchLeads(true);
      } else {
        setErrorMessage(data.error?.message || "Failed to advance clock");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleSimulateReply = async (leadId: string) => {
    if (!leadId) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/automation/simulate-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          messageText: replyText,
          channel: "email",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage(`Inbound reply analyzed: Intent '${data.analysis?.intent || "INTERESTED"}'`);
        setShowReplyModal(false);
        fetchLeads(true);
        if (activeLeadId === leadId) {
          openLeadDetail(leadId);
        }
      } else {
        setErrorMessage(data.error?.message || "Failed to simulate reply");
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Bulk Operations
  const toggleSelectAll = () => {
    if (selectedLeadIds.size === leads.length) {
      setSelectedLeadIds(new Set());
    } else {
      setSelectedLeadIds(new Set(leads.map((l) => l.leadId)));
    }
  };

  const toggleSelectLead = (id: string) => {
    const next = new Set(selectedLeadIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedLeadIds(next);
  };

  const getStageColor = (stage: PipelineStage) => {
    switch (stage) {
      case "DISCOVERY":
      case "QUALIFICATION":
        return "bg-sky-500/10 text-sky-400 border-sky-500/30";
      case "RESEARCH_AUDIT":
        return "bg-cyan-500/10 text-cyan-400 border-cyan-500/30";
      case "PREVIEW_GENERATION":
        return "bg-indigo-500/10 text-indigo-400 border-indigo-500/30";
      case "OUTREACH_DRAFT":
      case "HUMAN_APPROVAL":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "SIMULATED_DISPATCH":
      case "WAITING_FOR_REPLY":
        return "bg-purple-500/10 text-purple-400 border-purple-500/30";
      case "REPLY_INTELLIGENCE":
      case "COMPLETED":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "FAILED":
        return "bg-rose-500/10 text-rose-400 border-rose-500/30";
      case "PAUSED":
      case "CANCELLED":
        return "bg-slate-700/50 text-slate-300 border-slate-600";
      default:
        return "bg-slate-800 text-slate-400 border-slate-700";
    }
  };

  return (
    <div className="space-y-6 text-slate-100 font-sans">
      {/* 1. Header Toolbar */}
      <div className="rounded-3xl border border-zinc-200/80 bg-slate-900/95 p-5 shadow-xs backdrop-blur-md dark:border-white/10">
        <div className="max-w-[1700px] mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <span className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 font-bold text-lg shadow-sm">
              WB
            </span>
            <div>
              <div className="flex items-center space-x-2.5 flex-wrap">
                <h1 className="text-xl font-bold tracking-tight text-white">Lead Command Center</h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                  Phase 15
                </span>
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  LOCAL SIMULATION MODE
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Unified Sales Operations • Autonomous Discovery → Audit → Preview → Outreach → CRM
              </p>
            </div>
          </div>

          {/* Header Action Menu */}
          <div className="flex items-center flex-wrap gap-2.5">
            <button
              onClick={() => setShowNewRunModal(true)}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition flex items-center space-x-1.5"
            >
              <Play className="w-3.5 h-3.5" />
              <span>New Pipeline Run</span>
            </button>

            <button
              onClick={fetchReviewQueue}
              disabled={loadingReview}
              className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-medium border border-amber-500/30 transition flex items-center space-x-1.5"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Review Queue</span>
              {facets?.presets?.needs_review > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px]">
                  {facets.presets.needs_review}
                </span>
              )}
            </button>

            <button
              onClick={fetchFollowUps}
              disabled={loadingFollowUps}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition flex items-center space-x-1.5"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Follow-ups</span>
              {kpis?.followUpsDue && kpis.followUpsDue > 0 ? (
                <span className="px-1.5 py-0.2 rounded-full bg-indigo-500 text-white font-bold text-[10px]">
                  {kpis.followUpsDue}
                </span>
              ) : null}
            </button>

            <button
              onClick={() => fetchLeads(true)}
              disabled={refreshing || loading}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition flex items-center space-x-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
            </button>

            <div className="h-5 w-px bg-slate-800 mx-1 hidden sm:block"></div>

            {onNavigateTab ? (
              <>
                <button
                  type="button"
                  onClick={() => onNavigateTab("automation")}
                  className="px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs transition"
                >
                  Pipeline Queue →
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateTab("crm")}
                  className="px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs transition"
                >
                  CRM Inbox →
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateTab("analytics")}
                  className="px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs transition"
                >
                  Analytics →
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateTab("integrations")}
                  className="px-2.5 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition"
                >
                  Integrations Hub →
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/admin?tab=automation"
                  className="px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs transition"
                >
                  Pipeline Queue →
                </Link>
                <Link
                  href="/admin?tab=crm"
                  className="px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs transition"
                >
                  CRM Inbox →
                </Link>
                <Link
                  href="/admin?tab=analytics"
                  className="px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs transition"
                >
                  Analytics →
                </Link>
                <Link
                  href="/admin?tab=integrations"
                  className="px-2.5 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition"
                >
                  Integrations Hub →
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="space-y-6">
        {/* Alerts */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
            <span className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </span>
            <button onClick={() => setErrorMessage(null)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {successMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </span>
            <button onClick={() => setSuccessMessage(null)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 2. KPI Strip (Non-Fabricated Metrics) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-10 gap-3">
          {[
            { label: "Total Leads", value: kpis?.totalLeads ?? "N/A", color: "text-white" },
            { label: "Qualified", value: kpis?.qualifiedLeads ?? "N/A", color: "text-sky-400" },
            { label: "Preview Ready", value: kpis?.previewReady ?? "N/A", color: "text-indigo-400" },
            { label: "Outreach Ready", value: kpis?.outreachReady ?? "N/A", color: "text-amber-400" },
            { label: "Awaiting Reply", value: kpis?.awaitingReply ?? "N/A", color: "text-purple-400" },
            { label: "Interested", value: kpis?.interested ?? "N/A", color: "text-emerald-400" },
            { label: "Meetings", value: kpis?.meetingsRequested ?? "N/A", color: "text-teal-400" },
            { label: "Follow-up Due", value: kpis?.followUpsDue ?? "N/A", color: "text-yellow-400" },
            { label: "Conversion Rate", value: kpis?.conversionRate !== null && kpis?.conversionRate !== undefined ? `${kpis.conversionRate}%` : "N/A", color: "text-emerald-400" },
            { label: "Known AI Cost", value: kpis?.knownEstimatedCostUsd !== null && kpis?.knownEstimatedCostUsd !== undefined ? `$${kpis.knownEstimatedCostUsd.toFixed(4)}` : "N/A", color: "text-indigo-300" },
          ].map((item, idx) => (
            <div key={idx} className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider truncate">
                {item.label}
              </span>
              <span className={`text-xl font-bold font-mono mt-1 ${item.color}`}>{item.value}</span>
            </div>
          ))}
        </div>

        {/* 3. 14-Stage Visual Pipeline Funnel (Filterable) */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Autonomous Pipeline Stages
              </span>
              <span className="text-[11px] text-slate-400">(Click stage to filter table)</span>
            </div>
            {selectedStage !== "ALL" && (
              <button
                onClick={() => setSelectedStage("ALL")}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 underline"
              >
                Clear Stage Filter
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 xl:grid-cols-14 gap-2">
            {CANONICAL_STAGES.map((st) => {
              const stageCount = facets?.stages?.find((s: any) => s.stage === st)?.count || 0;
              const isSelected = selectedStage === st;

              return (
                <button
                  key={st}
                  onClick={() => setSelectedStage(isSelected ? "ALL" : st)}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between h-16 ${
                    isSelected
                      ? "bg-indigo-600/30 border-indigo-500 shadow-sm"
                      : "bg-slate-950/60 border-slate-800/80 hover:bg-slate-850"
                  }`}
                >
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter truncate block w-full">
                    {st.replace(/_/g, " ")}
                  </span>
                  <div className="flex items-center justify-between w-full mt-1">
                    <span className="text-sm font-bold font-mono text-white">{stageCount}</span>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        st === "FAILED"
                          ? "bg-rose-500"
                          : st === "COMPLETED"
                          ? "bg-emerald-500"
                          : "bg-indigo-400"
                      }`}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Filter Presets Toolbar & Search */}
        <div className="space-y-3">
          {/* Preset Pills */}
          <div className="flex items-center overflow-x-auto pb-1 gap-1.5 scrollbar-thin">
            {PRESETS.map((p) => {
              const count = facets?.presets?.[p.id];
              const isActive = activePreset === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setActivePreset(p.id);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition flex items-center space-x-1.5 border ${
                    isActive
                      ? "bg-indigo-600 text-white border-indigo-500 shadow-sm"
                      : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-850"
                  }`}
                >
                  <span>{p.label}</span>
                  {count !== undefined && count > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                        isActive ? "bg-indigo-800 text-white" : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search & Secondary Filter Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search business, website, city, industry, lead ID..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Industry Select */}
              <select
                value={selectedIndustry}
                onChange={(e) => {
                  setSelectedIndustry(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Industries</option>
                {facets?.industries?.map((ind: any) => (
                  <option key={ind.industry} value={ind.industry}>
                    {ind.industry} ({ind.count})
                  </option>
                ))}
              </select>

              {/* Density Toggle */}
              <button
                onClick={() => setDensity(density === "compact" ? "comfortable" : "compact")}
                className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 hover:text-white flex items-center space-x-1"
                title="Toggle Table Density"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="capitalize">{density}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 5. Bulk Actions Toolbar (Conditional) */}
        {selectedLeadIds.size > 0 && (
          <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/40 flex items-center justify-between gap-4">
            <div className="flex items-center space-x-3 text-xs text-indigo-200">
              <span className="font-bold">{selectedLeadIds.size} lead(s) selected</span>
              <button onClick={() => setSelectedLeadIds(new Set())} className="text-slate-400 hover:text-white underline">
                Clear Selection
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => alert(`Local simulation: Batch retry initiated for ${selectedLeadIds.size} leads.`)}
                className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700"
              >
                Retry Selected
              </button>
              <button
                onClick={() => alert(`Local simulation: Batch paused for ${selectedLeadIds.size} leads.`)}
                className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700"
              >
                Pause Selected
              </button>
            </div>
          </div>
        )}

        {/* 6. Main Lead Table */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-850/80 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-3 w-8">
                    <input
                      type="checkbox"
                      checked={leads.length > 0 && selectedLeadIds.size === leads.length}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0"
                    />
                  </th>
                  <th className="py-3 px-3">Business</th>
                  <th className="py-3 px-3">Location</th>
                  <th className="py-3 px-3">Industry</th>
                  <th className="py-3 px-3 text-center">Score</th>
                  <th className="py-3 px-3">Pipeline Stage</th>
                  <th className="py-3 px-3 text-center">Preview</th>
                  <th className="py-3 px-3 text-center">Outreach</th>
                  <th className="py-3 px-3">CRM Status</th>
                  <th className="py-3 px-3">Last Activity</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800/60 font-sans">
                {loading ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400">
                      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      Loading leads...
                    </td>
                  </tr>
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-500">
                      No leads match current filter criteria.
                    </td>
                  </tr>
                ) : (
                  leads.map((l) => {
                    const isSelected = selectedLeadIds.has(l.leadId);
                    const padClass = density === "compact" ? "py-2 px-3" : "py-3.5 px-3";

                    return (
                      <tr
                        key={l.leadId}
                        className={`hover:bg-slate-800/40 cursor-pointer transition ${
                          isSelected ? "bg-indigo-950/20" : ""
                        }`}
                        onClick={() => openLeadDetail(l.leadId)}
                      >
                        <td className={padClass} onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectLead(l.leadId)}
                            className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0"
                          />
                        </td>

                        <td className={padClass}>
                          <div className="font-semibold text-white truncate max-w-[200px]">{l.businessName}</div>
                          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                            <span>{l.leadId}</span>
                            {l.hasError && (
                              <span className="text-rose-400 font-bold" title={l.errorMessage}>
                                ⚠️ FAILED
                              </span>
                            )}
                          </div>
                        </td>

                        <td className={padClass}>
                          <span className="text-slate-300 truncate max-w-[140px] block">{l.location}</span>
                        </td>

                        <td className={padClass}>
                          <span className="text-slate-400 truncate max-w-[120px] block">{l.industry}</span>
                        </td>

                        <td className={`${padClass} text-center font-mono font-bold`}>
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] ${
                              l.opportunityScore >= 80
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : l.opportunityScore >= 60
                                ? "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                                : "bg-slate-800 text-slate-400 border border-slate-700"
                            }`}
                          >
                            {l.opportunityScore}
                          </span>
                        </td>

                        <td className={padClass}>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border font-mono ${getStageColor(
                              l.pipelineStage
                            )}`}
                          >
                            {l.pipelineStage}
                          </span>
                        </td>

                        <td className={`${padClass} text-center`} onClick={(e) => e.stopPropagation()}>
                          {l.previewUrl ? (
                            <a
                              href={l.previewUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 underline font-mono"
                            >
                              <span>Ready</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-[11px] text-slate-500 font-mono">None</span>
                          )}
                        </td>

                        <td className={`${padClass} text-center`}>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                              l.outreachStatus === "simulated_sent"
                                ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                : l.outreachStatus === "approved"
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : l.outreachStatus === "review"
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                : "text-slate-500"
                            }`}
                          >
                            {l.outreachStatus}
                          </span>
                        </td>

                        <td className={padClass}>
                          <span className="text-[11px] text-slate-300 font-mono font-medium">{l.crmStatus}</span>
                        </td>

                        <td className={`${padClass} text-slate-400 font-mono text-[10px]`}>
                          {new Date(l.lastActivityAt).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>

                        <td className={`${padClass} text-right`} onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => openLeadDetail(l.leadId)}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
                          >
                            View →
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Bar */}
          <div className="p-3 border-t border-slate-800 bg-slate-900 flex items-center justify-between text-xs text-slate-400">
            <span>
              Showing {(currentPage - 1) * 25 + 1} to {Math.min(currentPage * 25, totalCount)} of {totalCount} leads
            </span>
            <div className="flex items-center space-x-2">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1 rounded bg-slate-800 border border-slate-700 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-mono text-slate-200">
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1 rounded bg-slate-800 border border-slate-700 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 7. Phase 16 External Integrations Status Strip */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Phase 16 External Integrations Status
              </span>
              <span className="text-[11px] text-slate-400">• Official Google Places & Gmail</span>
            </div>
            {onNavigateTab ? (
              <button
                type="button"
                onClick={() => onNavigateTab("integrations")}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
              >
                <span>Manage & Setup Integrations →</span>
              </button>
            ) : (
              <Link
                href="/admin?tab=integrations"
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
              >
                <span>Manage & Setup Integrations →</span>
              </Link>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-semibold text-white block">Google Places (New)</span>
                <span className="text-[10px] text-slate-400 font-mono">Discovery Provider</span>
              </div>
              {integrationStatuses?.googlePlaces?.status === "CONNECTED" ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
                  CONNECTED
                </span>
              ) : integrationStatuses?.googlePlaces?.status === "INVALID" ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30 font-semibold">
                  INVALID KEY
                </span>
              ) : (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold">
                  NOT CONFIGURED
                </span>
              )}
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-semibold text-white block">Gmail API</span>
                <span className="text-[10px] text-slate-400 font-mono">websitebanja@gmail.com</span>
              </div>
              {integrationStatuses?.gmail?.status === "CONNECTED" ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
                  CONNECTED
                </span>
              ) : integrationStatuses?.gmail?.status === "NOT_AUTHORIZED" ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold">
                  NOT AUTHORIZED
                </span>
              ) : (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-semibold">
                  NOT CONFIGURED
                </span>
              )}
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-semibold text-white block">WhatsApp Cloud API</span>
                <span className="text-[10px] text-slate-400 font-mono">Dedicated Business Number</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-semibold">
                DISABLED
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 8. Sliding Lead Detail Drawer */}
      {activeLeadId && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-800 flex items-start justify-between bg-slate-850">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-bold text-white">
                    {leadDetail?.profile.businessName || "Loading lead..."}
                  </h3>
                  {leadDetail?.pipeline.currentStage && (
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold ${getStageColor(
                        leadDetail.pipeline.currentStage
                      )}`}
                    >
                      {leadDetail.pipeline.currentStage}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {leadDetail?.profile.industry} • {leadDetail?.profile.location} • ID: {activeLeadId}
                </p>
              </div>

              <button
                onClick={() => {
                  setActiveLeadId(null);
                  setLeadDetail(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Tabs */}
            <div className="flex items-center overflow-x-auto border-b border-slate-800 px-4 bg-slate-900 text-xs">
              {[
                { id: "profile", label: "Profile" },
                { id: "qualification", label: "Qualification" },
                { id: "audit", label: "Audit" },
                { id: "preview", label: "Preview" },
                { id: "outreach", label: "Outreach" },
                { id: "crm", label: "CRM" },
                { id: "pipeline", label: "Pipeline" },
                { id: "timeline", label: "Timeline" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setDrawerTab(t.id as any)}
                  className={`px-3 py-3 border-b-2 font-medium whitespace-nowrap transition ${
                    drawerTab === t.id
                      ? "border-indigo-500 text-white"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {loadingDetail && !leadDetail ? (
                <div className="text-center py-16 text-slate-400">Loading details...</div>
              ) : leadDetail ? (
                <>
                  {/* TAB: PROFILE */}
                  {drawerTab === "profile" && (
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                        <div className="flex justify-between py-1 border-b border-slate-900">
                          <span className="text-slate-400">Business Name</span>
                          <span className="text-white font-medium">{leadDetail.profile.businessName}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-900">
                          <span className="text-slate-400">Industry</span>
                          <span className="text-white">{leadDetail.profile.industry}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-900">
                          <span className="text-slate-400">Website</span>
                          <span className="text-white font-mono">
                            {leadDetail.profile.website || "None (Missing website)"}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-900">
                          <span className="text-slate-400">Phone</span>
                          <span className="text-white font-mono">{leadDetail.profile.phone || "Not recorded"}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-900">
                          <span className="text-slate-400">Location</span>
                          <span className="text-white">{leadDetail.profile.location}</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-slate-400">Discovered At</span>
                          <span className="text-slate-300 font-mono">
                            {new Date(leadDetail.profile.discoveredAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB: QUALIFICATION */}
                  {drawerTab === "qualification" && (
                    <div className="space-y-4 text-xs">
                      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Qualification Status</span>
                          <span className="font-bold text-sky-400">{leadDetail.qualification.status}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Qualification Score</span>
                          <span className="font-bold text-lg font-mono text-white">
                            {leadDetail.qualification.score}/100
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Opportunity Score</span>
                          <span className="font-bold text-lg font-mono text-emerald-400">
                            {leadDetail.qualification.opportunityScore}/100
                          </span>
                        </div>
                        {leadDetail.qualification.reasonCodes.length > 0 && (
                          <div className="pt-2 border-t border-slate-900">
                            <span className="text-slate-400 block mb-1.5 font-semibold">Reason Codes</span>
                            <div className="flex flex-wrap gap-1">
                              {leadDetail.qualification.reasonCodes.map((r, i) => (
                                <span key={i} className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono">
                                  {r}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB: AUDIT */}
                  {drawerTab === "audit" && (
                    <div className="space-y-4 text-xs">
                      {leadDetail.audit.status === "completed" ? (
                        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Audit Status</span>
                            <span className="text-emerald-400 font-bold">COMPLETED</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Audit Opportunity Score</span>
                            <span className="text-xl font-bold font-mono text-emerald-400">
                              {leadDetail.audit.opportunityScore}/100
                            </span>
                          </div>
                          {leadDetail.audit.recommendations && leadDetail.audit.recommendations.length > 0 && (
                            <div className="pt-2 border-t border-slate-900 space-y-1.5">
                              <span className="text-slate-400 font-semibold block">Key Recommendations</span>
                              {leadDetail.audit.recommendations.map((rec, i) => (
                                <div key={i} className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-300">
                                  • {rec}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-8 text-center text-slate-500 rounded-xl bg-slate-950 border border-slate-800">
                          No audit record generated for this lead.
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB: PREVIEW */}
                  {drawerTab === "preview" && (
                    <div className="space-y-4 text-xs">
                      {leadDetail.preview.status === "ready" ? (
                        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Preview Quality Score</span>
                            <span className="text-xl font-bold font-mono text-indigo-400">
                              {leadDetail.preview.qualityScore}/100
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Design Archetype</span>
                            <span className="text-slate-200 capitalize font-medium">
                              {leadDetail.preview.designArchetype?.replace(/_/g, " ") || "Bespoke Modern"}
                            </span>
                          </div>
                          <div className="pt-3 border-t border-slate-900">
                            {leadDetail.preview.url && (
                              <a
                                href={leadDetail.preview.url}
                                target="_blank"
                                rel="noreferrer"
                                className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-center flex items-center justify-center space-x-1.5 transition"
                              >
                                <span>Open Live Preview Site</span>
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="p-8 text-center text-slate-500 rounded-xl bg-slate-950 border border-slate-800">
                          Preview not generated yet.
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB: OUTREACH */}
                  {drawerTab === "outreach" && (
                    <div className="space-y-4 text-xs">
                      {leadDetail.outreach.status !== "none" ? (
                        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Channel</span>
                            <span className="font-bold uppercase text-purple-400">
                              {leadDetail.outreach.channel || "email"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Status</span>
                            <span className="font-bold text-white">{leadDetail.outreach.status}</span>
                          </div>
                          {leadDetail.outreach.subject && (
                            <div>
                              <span className="text-slate-400 block mb-1">Subject</span>
                              <div className="p-2 rounded bg-slate-900 text-slate-200 font-medium">
                                {leadDetail.outreach.subject}
                              </div>
                            </div>
                          )}
                          <div>
                            <span className="text-slate-400 block mb-1">Message Body</span>
                            <div className="p-3 rounded bg-slate-900 text-slate-200 whitespace-pre-wrap leading-relaxed font-sans">
                              {leadDetail.outreach.message}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-8 text-center text-slate-500 rounded-xl bg-slate-950 border border-slate-800">
                          No outreach drafted yet.
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB: CRM */}
                  {drawerTab === "crm" && (
                    <div className="space-y-4 text-xs">
                      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Lifecycle Status</span>
                          <span className="font-bold text-emerald-400">{leadDetail.crm.status}</span>
                        </div>
                        {leadDetail.crm.replyIntent && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Detected Intent</span>
                            <span className="font-bold text-indigo-400">{leadDetail.crm.replyIntent}</span>
                          </div>
                        )}
                        {leadDetail.crm.sentiment && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Sentiment</span>
                            <span className="font-medium text-slate-200">{leadDetail.crm.sentiment}</span>
                          </div>
                        )}
                        {leadDetail.crm.recommendedNextAction && (
                          <div className="p-2.5 rounded bg-indigo-950/30 border border-indigo-500/20 text-indigo-300">
                            <strong>Recommended Action:</strong> {leadDetail.crm.recommendedNextAction}
                          </div>
                        )}

                        <div className="pt-2 border-t border-slate-900">
                          <button
                            onClick={() => setShowReplyModal(true)}
                            className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium flex items-center justify-center space-x-1.5 transition"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Simulate Inbound Reply</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB: PIPELINE */}
                  {drawerTab === "pipeline" && (
                    <div className="space-y-4 text-xs">
                      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Run ID</span>
                          <span className="text-slate-300 font-mono">{leadDetail.pipeline.runId || "None"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Current Stage</span>
                          <span className="font-bold text-white font-mono">{leadDetail.pipeline.currentStage}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Retries</span>
                          <span className="font-mono text-slate-300">
                            {leadDetail.pipeline.retryCount} / {leadDetail.pipeline.maxAttempts}
                          </span>
                        </div>
                        {leadDetail.pipeline.errorHistory && leadDetail.pipeline.errorHistory.length > 0 && (
                          <div className="pt-2 border-t border-slate-900 text-rose-300">
                            <span className="font-semibold block mb-1">Error History</span>
                            {leadDetail.pipeline.errorHistory.map((err, i) => (
                              <div key={i} className="p-2 rounded bg-rose-950/20 border border-rose-500/20 mb-1">
                                {err}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB: TIMELINE */}
                  {drawerTab === "timeline" && (
                    <div className="space-y-3 text-xs">
                      {leadDetail.timeline.length === 0 ? (
                        <div className="text-slate-500 text-center py-8">No timeline events recorded.</div>
                      ) : (
                        <div className="relative pl-4 border-l border-slate-800 space-y-4">
                          {leadDetail.timeline.map((evt) => (
                            <div key={evt.id} className="relative group">
                              <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-500 border-2 border-slate-900"></div>
                              <div>
                                <span className="font-semibold text-white block">{evt.title}</span>
                                <span className="text-slate-400 text-[11px] block mt-0.5">{evt.description}</span>
                                <span className="text-[10px] text-slate-500 font-mono block mt-1">
                                  {new Date(evt.timestamp).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* 9. Human Review Queue Modal */}
      {showReviewQueueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl max-h-[85vh] flex flex-col shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">Human Attention & Review Queue</h3>
              </div>
              <button onClick={() => setShowReviewQueueModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3 text-xs">
              {reviewItems.length === 0 ? (
                <div className="p-8 text-center text-slate-500">All pipeline leads are operating smoothly.</div>
              ) : (
                reviewItems.map((item) => (
                  <div key={item.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm">{item.businessName}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 uppercase">
                        {item.severity}
                      </span>
                    </div>
                    <p className="text-slate-300">{item.reason}</p>
                    <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-slate-400">
                      <span>💡 {item.recommendedAction}</span>
                      <button
                        onClick={() => {
                          setShowReviewQueueModal(false);
                          openLeadDetail(item.leadId);
                        }}
                        className="text-indigo-400 hover:text-indigo-300 font-semibold underline"
                      >
                        Inspect Lead →
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 10. Follow-ups Queue Modal */}
      {showFollowUpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl max-h-[85vh] flex flex-col shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-white text-base">Follow-Up Queue & Clock Controller</h3>
              </div>
              <button onClick={() => setShowFollowUpModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-4 text-xs">
              <div className="flex items-center space-x-2">
                <span className="text-slate-300">Advance Clock:</span>
                <input
                  type="number"
                  min="1"
                  max="14"
                  value={clockDays}
                  onChange={(e) => setClockDays(Number(e.target.value))}
                  className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono text-center"
                />
                <span className="text-slate-400">days</span>
              </div>
              <button
                onClick={handleAdvanceClock}
                disabled={actionLoading}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
              >
                Advance & Process Due
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3 text-xs">
              {followUpsList.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No scheduled follow-up jobs.</div>
              ) : (
                followUpsList.map((fu) => (
                  <div key={fu.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">{fu.businessName}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        Follow-up #{fu.followUpNumber}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-400 text-[11px]">
                      <span>Channel: {fu.channel}</span>
                      <span>Due: {new Date(fu.dueAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 11. New Run Modal */}
      {showNewRunModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <form
            onSubmit={handleTriggerRun}
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">New Autonomous Pipeline Run</h3>
              <button type="button" onClick={() => setShowNewRunModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block mb-1">Target Industry</label>
                <input
                  type="text"
                  value={runIndustry}
                  onChange={(e) => setRunIndustry(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  placeholder="e.g. restaurant, cafe, dental clinic"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">City / Region</label>
                <input
                  type="text"
                  value={runCity}
                  onChange={(e) => setRunCity(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  placeholder="e.g. Vadodara, Pune, Jaipur"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Lead Count Limit</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={runLimit}
                  onChange={(e) => setRunLimit(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono"
                  required
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowNewRunModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                {actionLoading ? "Starting..." : "Start Pipeline"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 12. Simulate Inbound Reply Modal */}
      {showReplyModal && activeLeadId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">Simulate Inbound Prospect Reply</h3>
              <button onClick={() => setShowReplyModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-slate-300 block mb-1">Inbound Reply Message</label>
                <textarea
                  rows={4}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white placeholder-slate-500"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowReplyModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSimulateReply(activeLeadId)}
                disabled={actionLoading}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
              >
                {actionLoading ? "Processing..." : "Submit Simulated Reply"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
