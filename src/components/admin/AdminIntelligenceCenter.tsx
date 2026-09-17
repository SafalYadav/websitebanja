"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Cpu,
  ShieldCheck,
  Zap,
  Info,
  Layers,
  HelpCircle,
  Radio,
  ExternalLink,
  ChevronRight,
  Filter,
  Eye,
  AlertCircle,
  Server,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  BossReport,
  AgentHealthMetric,
  DiagnosticIssue,
  BossRecommendation,
  CrossAgentCorrelation,
  AgentHealthStatus,
  IssueSeverity,
} from "@/lib/agents/boss/types";

interface AdminIntelligenceCenterProps {
  sessionToken?: string;
  onNavigateTab?: (tabId: string) => void;
}

const WINDOW_OPTIONS = [
  { label: "Past 1 Hour", value: 60 },
  { label: "Past 6 Hours", value: 360 },
  { label: "Past 24 Hours", value: 1440 },
  { label: "Past 7 Days", value: 10080 },
];

const AGENT_LABELS: Record<string, { title: string; subtitle: string }> = {
  mitra: { title: "Mitra Voice Agent", subtitle: "Multilingual Voice & Requirement Intake" },
  skills: { title: "Skills Agent", subtitle: "Pre-Generation Feature & Style Extraction" },
  uniqueness: { title: "Uniqueness Agent", subtitle: "AST Fingerprint & Design Verification" },
  boss: { title: "Boss Agent", subtitle: "Telemetry Diagnostics & Health Supervisor" },
};

function getStatusBadge(status: AgentHealthStatus) {
  switch (status) {
    case "HEALTHY":
      return {
        bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
        dot: "bg-emerald-500",
        label: "HEALTHY",
      };
    case "DEGRADED":
    case "WARNING":
      return {
        bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
        dot: "bg-amber-500",
        label: status,
      };
    case "CRITICAL":
      return {
        bg: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30",
        dot: "bg-red-500",
        label: "CRITICAL",
      };
    case "UNKNOWN":
    default:
      return {
        bg: "bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border-zinc-500/30",
        dot: "bg-zinc-400",
        label: "UNKNOWN",
      };
  }
}

function getSeverityBadge(severity: IssueSeverity) {
  switch (severity) {
    case "CRITICAL":
      return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30";
    case "HIGH":
      return "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30";
    case "MEDIUM":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30";
    case "LOW":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30";
    case "INFO":
    default:
      return "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/30";
  }
}

export default function AdminIntelligenceCenter({ sessionToken }: AdminIntelligenceCenterProps) {
  const [windowMinutes, setWindowMinutes] = useState<number>(1440);
  const [report, setReport] = useState<BossReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [selectedAgentDetail, setSelectedAgentDetail] = useState<AgentHealthMetric | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");

  const fetchDiagnostics = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setErrorMessage(null);

      try {
        const headers: Record<string, string> = {};
        if (sessionToken) {
          headers["Authorization"] = `Bearer ${sessionToken}`;
        }

        const res = await fetch(`/api/admin/agents/diagnostics?windowMinutes=${windowMinutes}&t=${Date.now()}`, {
          cache: "no-store",
          headers,
        });

        if (res.status === 401 || res.status === 403) {
          setErrorMessage("Unauthorized: Administrator clearance is required to view AI Diagnostics.");
          setIsLoading(false);
          setIsRefreshing(false);
          return;
        }

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.message || "Failed to retrieve AI diagnostics report.");
        }

        setReport(json.data);
        setLastUpdated(new Date());
      } catch (err) {
        console.error("[AdminIntelligenceCenter Fetch Error]:", err);
        setErrorMessage(err instanceof Error ? err.message : "Error connecting to AI Diagnostics service.");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [sessionToken, windowMinutes]
  );

  useEffect(() => {
    void fetchDiagnostics();
  }, [fetchDiagnostics]);

  // Aggregate stats from telemetrySummary
  const systemOverview = useMemo(() => {
    if (!report) return null;
    const summary = report.telemetrySummary;
    const totalRuns = summary?.totalRuns || 0;
    const totalErrors = summary?.totalErrors || 0;

    let totalSuccesses = 0;
    let totalFallbacks = 0;
    let weightedLatencySum = 0;

    if (summary?.agentBreakdown) {
      for (const agent of Object.values(summary.agentBreakdown)) {
        totalSuccesses += agent.successes || 0;
        totalFallbacks += agent.fallbacks || 0;
        weightedLatencySum += (agent.avgLatencyMs || 0) * (agent.runs || 0);
      }
    }

    const successRate = totalRuns > 0 ? ((totalSuccesses / totalRuns) * 100).toFixed(1) : "100.0";
    const fallbackRate = totalRuns > 0 ? ((totalFallbacks / totalRuns) * 100).toFixed(1) : "0.0";
    const errorRate = totalRuns > 0 ? ((totalErrors / totalRuns) * 100).toFixed(1) : "0.0";
    const avgLatency = totalRuns > 0 ? Math.round(weightedLatencySum / totalRuns) : 0;

    return {
      totalRuns,
      totalErrors,
      totalSuccesses,
      totalFallbacks,
      successRate,
      fallbackRate,
      errorRate,
      avgLatency,
    };
  }, [report]);

  // Filter issues
  const filteredIssues = useMemo(() => {
    if (!report?.issues) return [];
    if (severityFilter === "ALL") return report.issues;
    return report.issues.filter((i) => i.severity === severityFilter);
  }, [report, severityFilter]);

  // Provider health list
  const providerList = useMemo(() => {
    if (!report?.telemetrySummary?.providerBreakdown) return [];
    const providers = report.telemetrySummary.providerBreakdown;
    return Object.entries(providers).map(([name, data]) => ({
      name,
      calls: data.calls || 0,
      errors: data.errors || 0,
      successes: (data as any).successes ?? Math.max(0, (data.calls || 0) - (data.errors || 0)),
      fallbacks: (data as any).fallbacks ?? 0,
      avgLatencyMs: (data as any).avgLatencyMs ?? 0,
      recentErrors: (data as any).recentErrors ?? [],
    }));
  }, [report]);

  // Loading skeleton state
  if (isLoading && !report) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-6 w-48 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
            <div className="h-4 w-72 bg-zinc-100 dark:bg-zinc-900 rounded-lg animate-pulse" />
          </div>
          <div className="h-10 w-36 bg-zinc-200 dark:bg-zinc-800 rounded-xl animate-pulse" />
        </div>
        <div className="h-44 w-full bg-zinc-100 dark:bg-zinc-900/60 rounded-3xl animate-pulse border border-zinc-200 dark:border-white/5" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-28 bg-zinc-100 dark:bg-zinc-900/40 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (errorMessage && !report) {
    return (
      <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-8 text-center space-y-4">
        <AlertTriangle className="h-10 w-10 text-red-500 mx-auto" />
        <div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-white">AI Diagnostics Unavailable</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-md mx-auto">{errorMessage}</p>
        </div>
        <button
          type="button"
          onClick={() => void fetchDiagnostics(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-violet-700 transition"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Retry Diagnostics</span>
        </button>
      </div>
    );
  }

  const overallStatusBadge = report ? getStatusBadge(report.overallStatus) : getStatusBadge("UNKNOWN");

  return (
    <div className="space-y-8">
      {/* Top Controls & Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-600/20">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
                <span>AI Health & Agents</span>
                <span className="rounded-md bg-violet-100 dark:bg-violet-950/60 px-2 py-0.5 text-[10px] font-bold text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                  OBSERVABILITY
                </span>
              </h2>
              <p className="text-xs text-zinc-500">
                Supervisory diagnostics and telemetry synthesized by Boss Agent
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          {/* Window Selector */}
          <div className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white p-1 dark:border-white/10 dark:bg-zinc-900 text-xs">
            <Clock className="h-3.5 w-3.5 text-zinc-400 ml-2" />
            <select
              value={windowMinutes}
              onChange={(e) => setWindowMinutes(Number(e.target.value))}
              className="bg-transparent pr-3 py-1 font-semibold text-zinc-700 dark:text-zinc-200 outline-none cursor-pointer"
            >
              {WINDOW_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="dark:bg-zinc-900">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Manual Refresh Button */}
          <button
            type="button"
            onClick={() => void fetchDiagnostics(true)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-100 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 transition shadow-xs"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin text-violet-600")} />
            <span className="hidden md:inline">Refresh</span>
          </button>

          <span className="text-[11px] font-mono text-zinc-400 hidden lg:inline">
            Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </span>
        </div>
      </div>

      {/* ─── SECTION 1: OVERALL AI SYSTEM HEALTH BANNER ──────────────────────── */}
      {report && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "rounded-3xl border p-6 sm:p-8 backdrop-blur-md relative overflow-hidden shadow-xs",
            report.overallStatus === "HEALTHY"
              ? "border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent"
              : report.overallStatus === "CRITICAL"
              ? "border-red-500/30 bg-gradient-to-br from-red-500/10 via-transparent to-transparent"
              : "border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent"
          )}
        >
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex items-start sm:items-center gap-5">
              {/* Health Score Pill */}
              <div className="flex flex-col items-center justify-center h-24 w-24 rounded-2xl bg-white/80 dark:bg-zinc-900/80 border border-zinc-200 dark:border-white/10 shadow-xs">
                <span className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white">
                  {report.overallHealthScore}
                </span>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Score / 100</span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border",
                      overallStatusBadge.bg
                    )}
                  >
                    <span className={cn("h-2 w-2 rounded-full", overallStatusBadge.dot)} />
                    <span>{overallStatusBadge.label}</span>
                  </span>
                  <span className="text-xs font-medium text-zinc-500">
                    Window: {report.windowMinutes >= 1440 ? `${report.windowMinutes / 1440}d` : `${report.windowMinutes}m`}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white">
                  WebsiteBanja AI Pipeline State
                </h3>
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 max-w-2xl leading-relaxed">
                  {report.summary}
                </p>
              </div>
            </div>

            {/* Quick Agent Status Pills */}
            <div className="flex flex-wrap lg:flex-col gap-2 w-full lg:w-auto border-t lg:border-t-0 lg:border-l border-zinc-200/80 dark:border-white/10 pt-4 lg:pt-0 lg:pl-6">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 w-full mb-1">
                Monitored Agents
              </span>
              {report.agents.map((ag) => {
                const badge = getStatusBadge(ag.status);
                return (
                  <div
                    key={ag.agent}
                    className="flex items-center justify-between gap-3 text-xs bg-white/60 dark:bg-zinc-900/60 px-3 py-1.5 rounded-xl border border-zinc-200/60 dark:border-white/5"
                  >
                    <span className="font-semibold capitalize text-zinc-800 dark:text-zinc-200">
                      {ag.agent}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-zinc-500">{ag.healthScore}</span>
                      <span className={cn("h-2 w-2 rounded-full", badge.dot)} title={ag.status} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* ─── SECTION 2: SYSTEM OVERVIEW KPI METRICS ──────────────────────────── */}
      {systemOverview && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-white/10 dark:bg-zinc-900/60">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Total Agent Runs</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black text-zinc-900 dark:text-white">
                {systemOverview.totalRuns}
              </span>
              <span className="text-[10px] font-medium text-zinc-400">invocations</span>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-white/10 dark:bg-zinc-900/60">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Success Rate</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {systemOverview.successRate}%
              </span>
              <span className="text-[10px] font-medium text-zinc-400">{systemOverview.totalSuccesses} ok</span>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-white/10 dark:bg-zinc-900/60">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Fallback Rate</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
                {systemOverview.fallbackRate}%
              </span>
              <span className="text-[10px] font-medium text-zinc-400">{systemOverview.totalFallbacks} fb</span>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-white/10 dark:bg-zinc-900/60">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Average Latency</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black text-zinc-900 dark:text-white">
                {systemOverview.avgLatency}
              </span>
              <span className="text-[10px] font-medium text-zinc-400">ms</span>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-white/10 dark:bg-zinc-900/60">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Error Rate</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black text-red-600 dark:text-red-400">
                {systemOverview.errorRate}%
              </span>
              <span className="text-[10px] font-medium text-zinc-400">{systemOverview.totalErrors} err</span>
            </div>
          </div>
        </div>
      )}

      {/* ─── SECTION 3: AGENT HEALTH CARDS ───────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Radio className="h-4 w-4 text-violet-500" />
            <span>Autonomous Agent Fleet Health</span>
          </h3>
          <span className="text-[11px] text-zinc-400">Click any card for isolated diagnostics</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {report?.agents.map((ag) => {
            const badge = getStatusBadge(ag.status);
            const agentMeta = AGENT_LABELS[ag.agent] || { title: ag.agent, subtitle: "Agent" };
            return (
              <motion.div
                key={ag.agent}
                whileHover={{ scale: 1.01 }}
                onClick={() => setSelectedAgentDetail(ag)}
                className="cursor-pointer rounded-3xl border border-zinc-200 bg-white p-5 shadow-xs transition hover:border-violet-500/40 dark:border-white/10 dark:bg-zinc-900/60 relative group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-black text-zinc-900 dark:text-white group-hover:text-violet-600 transition">
                      {agentMeta.title}
                    </h4>
                    <p className="text-[11px] text-zinc-400 truncate max-w-[180px]">{agentMeta.subtitle}</p>
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border",
                      badge.bg
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full", badge.dot)} />
                    <span>{badge.label}</span>
                  </span>
                </div>

                <div className="flex items-baseline justify-between border-t border-zinc-100 dark:border-white/5 pt-3 mb-3">
                  <span className="text-xs text-zinc-500">Health Score</span>
                  <span className="text-xl font-black text-zinc-900 dark:text-white">{ag.healthScore}</span>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between text-zinc-500">
                    <span>Runs / Successes</span>
                    <strong className="text-zinc-800 dark:text-zinc-200 font-mono">
                      {ag.totalRuns} / {ag.successfulRuns}
                    </strong>
                  </div>
                  <div className="flex justify-between text-zinc-500">
                    <span>Avg Latency</span>
                    <strong className="text-zinc-800 dark:text-zinc-200 font-mono">{ag.avgLatencyMs}ms</strong>
                  </div>
                  <div className="flex justify-between text-zinc-500">
                    <span>Fallback Rate</span>
                    <strong className="text-zinc-800 dark:text-zinc-200 font-mono">
                      {(ag.fallbackRate * 100).toFixed(1)}%
                    </strong>
                  </div>
                  <div className="flex justify-between text-zinc-500">
                    <span>Error Rate</span>
                    <strong
                      className={cn(
                        "font-mono",
                        ag.errorRate > 0.1 ? "text-red-500 font-bold" : "text-zinc-800 dark:text-zinc-200"
                      )}
                    >
                      {(ag.errorRate * 100).toFixed(1)}%
                    </strong>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-white/5 flex items-center justify-between text-[11px] text-violet-600 dark:text-violet-400 font-semibold group-hover:underline">
                  <span>Inspect Agent</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ─── SECTION 4: ISSUES & ANOMALY ALERTS ──────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <span>Issues & Diagnostic Ledger</span>
              <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-mono font-bold text-zinc-600 dark:text-zinc-300">
                {filteredIssues.length}
              </span>
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Strictly distinguishes observed empirical facts from diagnostic hypotheses
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <Filter className="h-3.5 w-3.5 text-zinc-400" />
            <span className="text-zinc-500 text-[11px] font-semibold">Severity:</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 outline-none dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical Only</option>
              <option value="HIGH">High Only</option>
              <option value="MEDIUM">Medium Only</option>
              <option value="LOW">Low Only</option>
              <option value="INFO">Info Only</option>
            </select>
          </div>
        </div>

        {/* Cross-Agent Correlations */}
        {report?.crossAgentCorrelations && report.crossAgentCorrelations.length > 0 && (
          <div className="space-y-3">
            {report.crossAgentCorrelations.map((corr, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-violet-500/30 bg-violet-500/5 p-4 flex items-start gap-3.5 text-xs"
              >
                <Layers className="h-5 w-5 text-violet-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-zinc-900 dark:text-white">{corr.pattern}</span>
                    <span className="rounded-full bg-violet-100 dark:bg-violet-950/60 px-2 py-0.5 text-[10px] font-bold text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800 uppercase">
                      CROSS-AGENT CORRELATION
                    </span>
                    <span className="text-zinc-400 font-mono text-[10px]">
                      Affects: {corr.agents.join(", ")}
                    </span>
                  </div>
                  <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed">{corr.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Issue Cards */}
        {filteredIssues.length === 0 ? (
          <div className="rounded-3xl border border-zinc-200 bg-white p-8 text-center dark:border-white/10 dark:bg-zinc-900/40">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-zinc-900 dark:text-white">Zero Active Diagnostic Anomalies</h4>
            <p className="text-xs text-zinc-500 mt-1">
              No elevated errors, fallbacks, or performance degradation detected in this window.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredIssues.map((issue) => {
              const sevBadge = getSeverityBadge(issue.severity);
              return (
                <div
                  key={issue.id}
                  className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-white/10 dark:bg-zinc-900/60 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-[10px] font-bold border uppercase tracking-wider",
                          sevBadge
                        )}
                      >
                        {issue.severity}
                      </span>
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-white">{issue.title}</h4>
                      <span className="rounded-md bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-mono font-bold text-zinc-600 dark:text-zinc-300">
                        {issue.agent}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400">
                      <span>Confidence: {Math.round(issue.confidence * 100)}%</span>
                      {issue.timestamp && <span>• {new Date(issue.timestamp).toLocaleTimeString()}</span>}
                    </div>
                  </div>

                  {/* Fact vs Hypothesis Blocks */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    {/* Fact Box */}
                    <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-3.5 space-y-1">
                      <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase tracking-wider">
                        <Eye className="h-3 w-3" />
                        <span>Observed Evidence (Fact)</span>
                      </div>
                      <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-mono">
                        {issue.observation}
                      </p>
                    </div>

                    {/* Hypothesis Box */}
                    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3.5 space-y-1">
                      <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wider">
                        <HelpCircle className="h-3 w-3" />
                        <span>Likely Cause (Hypothesis)</span>
                      </div>
                      <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                        {issue.likelyCause}
                      </p>
                      {issue.possibleCauses && issue.possibleCauses.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-amber-500/10 text-[10px] text-zinc-500">
                          <span className="font-semibold">Secondary possibilities: </span>
                          <span>{issue.possibleCauses.join("; ")}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── SECTION 5: BOSS RECOMMENDATIONS ─────────────────────────────────── */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-500" />
            <span>Boss Agent Supervisory Recommendations</span>
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Actionable optimization steps formulated by the supervisor layer
          </p>
        </div>

        {/* Safety Rule Notice */}
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-zinc-950/40 flex items-center gap-3 text-xs text-zinc-600 dark:text-zinc-400">
          <ShieldCheck className="h-5 w-5 text-emerald-500 shrink-0" />
          <div className="space-y-0.5">
            <span className="font-bold text-zinc-900 dark:text-zinc-100">
              Recommendation only — no automatic action taken.
            </span>
            <p className="text-[11px] text-zinc-500">
              Boss Agent possesses strictly READ, ANALYZE, REPORT, and RECOMMEND permissions. Code, configurations,
              and schemas remain under exclusive human developer control.
            </p>
          </div>
        </div>

        {/* Recommendation Cards */}
        {report?.recommendations && report.recommendations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {report.recommendations.map((rec) => {
              const prioBadge = getSeverityBadge(rec.priority);
              return (
                <div
                  key={rec.id}
                  className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-white/10 dark:bg-zinc-900/60 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-[10px] font-bold border uppercase tracking-wider",
                        prioBadge
                      )}
                    >
                      {rec.priority}
                    </span>
                    <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      STATUS: {rec.status}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-white">{rec.title}</h4>
                    <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1 leading-relaxed">{rec.action}</p>
                  </div>

                  <div className="pt-2 border-t border-zinc-100 dark:border-white/5 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                    <span>Component: {rec.agent.toUpperCase()}</span>
                    <span>Confidence: {Math.round(rec.confidence * 100)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 text-center dark:border-white/10 dark:bg-zinc-900/40">
            <p className="text-xs text-zinc-500">No open recommendations. All agent operations nominal.</p>
          </div>
        )}
      </div>

      {/* ─── SECTION 6: PROVIDER & MODEL HEALTH ──────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Server className="h-4 w-4 text-blue-500" />
              <span>Downstream Model Provider Reliability</span>
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Empirical uptime and latency metrics across Gemini, OpenRouter, and Groq
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-mono">
            <Lock className="h-3 w-3" />
            <span className="hidden sm:inline">Credentials Sanitized</span>
          </div>
        </div>

        {providerList.length === 0 ? (
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 text-center dark:border-white/10 dark:bg-zinc-900/40">
            <p className="text-xs text-zinc-500">No provider invocations recorded in this time window.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {providerList.map((prov) => {
              const successRate = prov.calls > 0 ? ((prov.successes / prov.calls) * 100).toFixed(1) : "100.0";
              const isHealthy = prov.errors === 0 || prov.errors / prov.calls < 0.1;

              return (
                <div
                  key={prov.name}
                  className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-white/10 dark:bg-zinc-900/60 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black uppercase tracking-wider text-zinc-900 dark:text-white font-mono">
                      {prov.name}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-bold border",
                        isHealthy
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                      )}
                    >
                      {isHealthy ? "ONLINE" : "THROTTLED"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-zinc-400 uppercase font-semibold">Calls</span>
                      <p className="text-base font-bold text-zinc-900 dark:text-white font-mono">{prov.calls}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 uppercase font-semibold">Success</span>
                      <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        {successRate}%
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 uppercase font-semibold">Fallbacks</span>
                      <p className="text-base font-bold text-amber-600 dark:text-amber-400 font-mono">
                        {prov.fallbacks}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 uppercase font-semibold">Avg Latency</span>
                      <p className="text-base font-bold text-zinc-900 dark:text-white font-mono">
                        {prov.avgLatencyMs}ms
                      </p>
                    </div>
                  </div>

                  {prov.recentErrors.length > 0 && (
                    <div className="pt-3 border-t border-zinc-100 dark:border-white/5 space-y-1">
                      <span className="text-[10px] font-semibold text-zinc-400 uppercase">Recent Errors</span>
                      {prov.recentErrors.slice(0, 2).map((err: any, idx: number) => (
                        <p key={idx} className="text-[11px] font-mono text-red-500 truncate" title={err.message}>
                          {err.type}: {err.message}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── MODAL: AGENT DETAIL INSPECTION ──────────────────────────────────── */}
      <AnimatePresence>
        {selectedAgentDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-zinc-900 space-y-6"
            >
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-white">
                    <Radio className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-zinc-900 dark:text-white capitalize">
                      {selectedAgentDetail.agent} Agent Diagnostics
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Isolated performance metrics & telemetry breakdown
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedAgentDetail(null)}
                  className="rounded-xl border border-zinc-200 p-2 text-zinc-400 hover:text-zinc-600 dark:border-white/10 dark:hover:text-white"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              {/* Health & Status */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 p-3 border border-zinc-100 dark:border-white/5">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">Health Score</span>
                  <p className="text-xl font-black text-zinc-900 dark:text-white mt-1">
                    {selectedAgentDetail.healthScore}
                  </p>
                </div>
                <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 p-3 border border-zinc-100 dark:border-white/5">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">Status</span>
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    {selectedAgentDetail.status}
                  </p>
                </div>
                <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 p-3 border border-zinc-100 dark:border-white/5">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">Latency</span>
                  <p className="text-xl font-black text-zinc-900 dark:text-white mt-1 font-mono">
                    {selectedAgentDetail.avgLatencyMs}ms
                  </p>
                </div>
              </div>

              {/* Reasons / Health Explanations */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Health Assessment Reasons:</span>
                {selectedAgentDetail.reasons.length > 0 ? (
                  <ul className="space-y-1 text-xs text-zinc-600 dark:text-zinc-400 list-disc list-inside">
                    {selectedAgentDetail.reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-zinc-500">No negative health penalties assessed.</p>
                )}
              </div>

              {/* Privacy Notice */}
              <div className="rounded-xl bg-blue-500/5 border border-blue-500/20 p-3 flex items-center gap-2.5 text-xs text-blue-600 dark:text-blue-400">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <span>
                  User conversations and private prompt transcripts are strictly excluded to preserve confidentiality.
                </span>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedAgentDetail(null)}
                  className="rounded-xl bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white px-4 py-2 text-xs font-bold transition hover:opacity-90"
                >
                  Close Inspection
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
