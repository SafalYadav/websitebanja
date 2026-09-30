"use client";

// src/app/admin/analytics/page.tsx
// Phase 14 — Autonomous Lead Pipeline Analytics, Cost & Optimization Intelligence Dashboard

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type {
  PipelineAnalyticsDashboard,
  TimeFilter,
  FunnelStageMetric,
  OptimizationFinding,
} from "@/lib/analytics/types";

export interface AdminAnalyticsCenterProps {
  sessionToken?: string;
  onNavigateTab?: (tab: string) => void;
}

export default function AdminAnalyticsCenter({ sessionToken, onNavigateTab }: AdminAnalyticsCenterProps = {}) {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [data, setData] = useState<PipelineAnalyticsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "funnel" | "performance" | "cost" | "optimization">("overview");

  // Helper to obtain fresh Bearer token
  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
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
  }, [sessionToken]);

  const fetchAnalytics = useCallback(async (filter: TimeFilter, isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setErrorMessage(null);

    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/automation/analytics?timeRange=${filter}`, { headers });
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      } else {
        setErrorMessage(json.error || "Failed to load analytics");
      }
    } catch (err) {
      setErrorMessage("Network error fetching analytics data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchAnalytics(timeFilter);
  }, [timeFilter, fetchAnalytics]);

  const getHealthBadge = (score: number) => {
    if (score >= 85) return { label: "OPTIMAL", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" };
    if (score >= 65) return { label: "GOOD", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" };
    if (score >= 45) return { label: "NEEDS ATTENTION", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" };
    return { label: "CRITICAL", color: "bg-rose-500/20 text-rose-400 border-rose-500/30" };
  };

  const getSeverityBadge = (severity: OptimizationFinding["severity"]) => {
    switch (severity) {
      case "critical":
        return "bg-rose-500/20 text-rose-300 border-rose-500/40";
      case "high":
        return "bg-amber-500/20 text-amber-300 border-amber-500/40";
      case "medium":
        return "bg-yellow-500/20 text-yellow-300 border-yellow-500/40";
      case "low":
      default:
        return "bg-sky-500/20 text-sky-300 border-sky-500/40";
    }
  };

  return (
    <div className="space-y-6 text-slate-100 font-sans">
      {/* Toolbar */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <span className="p-2 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 font-bold text-lg">
              WB
            </span>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold tracking-tight text-white">
                  Pipeline Analytics & Optimization
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold font-mono">
                  ACTIVE TELEMETRY
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Conversion Funnel • Pipeline Latency • AI Cost Tracking • Optimization Diagnostics
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Time Filter Pills */}
            <div className="flex items-center bg-slate-800/80 p-1 rounded-lg border border-slate-700/60 text-xs font-medium">
              {(["24h", "7d", "30d", "all"] as TimeFilter[]).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setTimeFilter(filter)}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    timeFilter === filter
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {filter === "24h"
                    ? "Last 24h"
                    : filter === "7d"
                    ? "Last 7d"
                    : filter === "30d"
                    ? "Last 30d"
                    : "All Time"}
                </button>
              ))}
            </div>

            <button
              onClick={() => fetchAnalytics(timeFilter, true)}
              disabled={refreshing || loading}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition flex items-center space-x-1.5 disabled:opacity-50"
            >
              <span className={refreshing ? "animate-spin" : ""}>🔄</span>
              <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
            </button>

            {onNavigateTab ? (
              <>
                <button
                  type="button"
                  onClick={() => onNavigateTab("leads")}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition"
                >
                  Lead Command Center →
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateTab("automation")}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
                >
                  ← Pipeline Queue
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/admin?tab=leads"
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition"
                >
                  Lead Command Center →
                </Link>
                <Link
                  href="/admin?tab=automation"
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
                >
                  ← Pipeline Queue
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center justify-between">
            <span>⚠️ {errorMessage}</span>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-xs px-2 py-1 rounded bg-rose-500/20 hover:bg-rose-500/40"
            >
              Dismiss
            </button>
          </div>
        )}

        {loading && !data ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-slate-400">Loading pipeline analytics and intelligence...</p>
          </div>
        ) : !data ? (
          <div className="text-center py-16 text-slate-400">
            No pipeline analytics data available.
          </div>
        ) : (
          <>
            {/* Top KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Health Score */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Pipeline Health
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      getHealthBadge(data.optimization.healthScore).color
                    }`}
                  >
                    {getHealthBadge(data.optimization.healthScore).label}
                  </span>
                </div>
                <div className="mt-3">
                  <span className="text-3xl font-extrabold text-white">
                    {data.optimization.healthScore}
                  </span>
                  <span className="text-xs text-slate-400 ml-1">/ 100</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  {data.optimization.findingsCount === 0
                    ? "All pipeline components optimal"
                    : `${data.optimization.findingsCount} recommendations detected`}
                </p>
              </div>

              {/* Conversion Rate */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Overall Conversion
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                    DISC → INTEREST
                  </span>
                </div>
                <div className="mt-3">
                  <span className="text-3xl font-extrabold text-white">
                    {data.funnel.overallConversionRate}%
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  {data.funnel.totalLeadsConverted} converted from {data.funnel.totalLeadsStarted} discovered
                </p>
              </div>

              {/* AI Cost Tracking */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Known AI Cost
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      data.cost.hasUnknownCosts
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                        : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    }`}
                  >
                    {data.cost.hasUnknownCosts ? "PARTIAL UNKNOWN" : "PRICED"}
                  </span>
                </div>
                <div className="mt-3">
                  <span className="text-3xl font-extrabold text-emerald-400">
                    ${data.cost.knownEstimatedCostUsd.toFixed(4)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  {data.cost.totalOperations} operations ({data.cost.unknownModelsCount} unpriced models)
                </p>
              </div>

              {/* Pipeline Runs */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Total Runs
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {data.performance.completedRuns} COMPLETED
                  </span>
                </div>
                <div className="mt-3">
                  <span className="text-3xl font-extrabold text-white">
                    {data.performance.totalRuns}
                  </span>
                  <span className="text-xs text-rose-400 ml-2">
                    ({data.performance.failedRuns} failed)
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  Avg duration: {(data.performance.avgPipelineDurationMs / 1000).toFixed(1)}s
                </p>
              </div>

              {/* Cache Efficiency */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Cache Hit Rate
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    IDEMPOTENCY
                  </span>
                </div>
                <div className="mt-3">
                  <span className="text-3xl font-extrabold text-indigo-400">
                    {data.cache.hitRate}%
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  Saved ~{(data.cache.estimatedTimeSavedMs / 1000).toFixed(1)}s & {data.cache.estimatedTokensSaved.toLocaleString()} tokens
                </p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
              {[
                { id: "overview", label: "Overview & Funnel" },
                { id: "performance", label: "Pipeline Latency" },
                { id: "cost", label: "AI Usage & Economics" },
                { id: "optimization", label: `Optimization (${data.optimization.findingsCount})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
                    activeTab === tab.id
                      ? "bg-indigo-600 text-white"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* TAB 1: OVERVIEW & FUNNEL */}
            {(activeTab === "overview" || activeTab === "funnel") && (
              <div className="space-y-6">
                {/* Biggest Drop-Off Alert */}
                {data.funnel.biggestDropOffStage && (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start space-x-3">
                    <span className="text-xl">⚠️</span>
                    <div>
                      <h4 className="text-sm font-semibold text-amber-300">
                        Primary Bottleneck Stage: {data.funnel.biggestDropOffStage.label}
                      </h4>
                      <p className="text-xs text-amber-200/80 mt-1">
                        Loss of {data.funnel.biggestDropOffStage.dropOffCount} leads (
                        {data.funnel.biggestDropOffStage.dropOffRate}% drop-off from preceding stage).
                        Review criteria thresholds or enhance outreach hook personalization.
                      </p>
                    </div>
                  </div>
                )}

                {/* Funnel Visualizer */}
                <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-white">Lead Generation Funnel</h3>
                      <p className="text-xs text-slate-400">
                        Drop-off analysis from Discovery through Positive Conversion
                      </p>
                    </div>
                    <span className="text-xs text-slate-400">
                      Total Started: <strong className="text-white">{data.funnel.totalLeadsStarted}</strong>
                    </span>
                  </div>

                  <div className="space-y-3 pt-2">
                    {data.funnel.stages.map((stage: FunnelStageMetric, idx: number) => {
                      const maxCount = Math.max(1, data.funnel.totalLeadsStarted);
                      const barWidth = Math.max(6, Math.min(100, (stage.count / maxCount) * 100));

                      return (
                        <div key={stage.stageId} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-slate-300 flex items-center space-x-2">
                              <span className="w-5 text-slate-500 font-mono text-[11px]">{idx + 1}.</span>
                              <span>{stage.label}</span>
                            </span>
                            <div className="flex items-center space-x-4 font-mono text-[11px]">
                              <span className="text-white font-bold">{stage.count} leads</span>
                              <span className="text-indigo-400 w-16 text-right">
                                {stage.conversionRateFromPrevious}% step
                              </span>
                              <span className="text-slate-400 w-16 text-right">
                                {stage.conversionRateFromStart}% total
                              </span>
                              {stage.dropOffCount > 0 ? (
                                <span className="text-rose-400 w-24 text-right">
                                  -{stage.dropOffCount} ({stage.dropOffRate}%)
                                </span>
                              ) : (
                                <span className="text-emerald-400 w-24 text-right">0 drop</span>
                              )}
                            </div>
                          </div>

                          {/* Bar */}
                          <div className="w-full bg-slate-800/80 rounded-full h-3 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                stage.stageId === "interested"
                                  ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                                  : "bg-gradient-to-r from-indigo-500 to-purple-500"
                              }`}
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: PIPELINE PERFORMANCE & LATENCY */}
            {activeTab === "performance" && (
              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-white">Stage Latency & Reliability</h3>
                      <p className="text-xs text-slate-400">
                        Execution durations, retry distributions, and failure isolation
                      </p>
                    </div>
                    {data.performance.slowestStage && (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        Slowest: <strong>{data.performance.slowestStage.stage}</strong> (~
                        {(data.performance.slowestStage.avgDurationMs / 1000).toFixed(2)}s)
                      </span>
                    )}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-800/60 text-slate-400 font-semibold border-b border-slate-700/60 uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-2.5 px-3">Stage</th>
                          <th className="py-2.5 px-3 text-right">Executions</th>
                          <th className="py-2.5 px-3 text-right">Success</th>
                          <th className="py-2.5 px-3 text-right">Failed</th>
                          <th className="py-2.5 px-3 text-right">Retries</th>
                          <th className="py-2.5 px-3 text-right">Min Latency</th>
                          <th className="py-2.5 px-3 text-right">Avg Latency</th>
                          <th className="py-2.5 px-3 text-right">Max Latency</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80 font-mono">
                        {Object.keys(data.performance.stages).length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-6 text-center text-slate-500">
                              No stage performance records logged yet.
                            </td>
                          </tr>
                        ) : (
                          Object.values(data.performance.stages).map((st) => (
                            <tr key={st.stage} className="hover:bg-slate-800/40">
                              <td className="py-2.5 px-3 font-sans font-medium text-slate-200">
                                {st.stage}
                              </td>
                              <td className="py-2.5 px-3 text-right">{st.totalExecutions}</td>
                              <td className="py-2.5 px-3 text-right text-emerald-400">
                                {st.successExecutions}
                              </td>
                              <td className="py-2.5 px-3 text-right text-rose-400">
                                {st.failedExecutions}
                              </td>
                              <td className="py-2.5 px-3 text-right text-amber-400">
                                {st.retryCount}
                              </td>
                              <td className="py-2.5 px-3 text-right text-slate-400">
                                {st.minDurationMs}ms
                              </td>
                              <td className="py-2.5 px-3 text-right text-white font-bold">
                                {st.avgDurationMs}ms
                              </td>
                              <td className="py-2.5 px-3 text-right text-slate-400">
                                {st.maxDurationMs}ms
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: AI USAGE & UNIT ECONOMICS */}
            {activeTab === "cost" && (
              <div className="space-y-6">
                {/* Unit Economics Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                  {[
                    { label: "Discovered Lead", cost: data.cost.unitEconomics.costPerDiscoveredLeadUsd },
                    { label: "Qualified Lead", cost: data.cost.unitEconomics.costPerQualifiedLeadUsd },
                    { label: "Audited Lead", cost: data.cost.unitEconomics.costPerAuditedLeadUsd },
                    { label: "Preview Generated", cost: data.cost.unitEconomics.costPerPreviewGeneratedUsd },
                    { label: "Outreach Drafted", cost: data.cost.unitEconomics.costPerOutreachDraftedUsd },
                    { label: "Converted Lead", cost: data.cost.unitEconomics.costPerConvertedLeadUsd },
                  ].map((unit, i) => (
                    <div key={i} className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block truncate">
                        {unit.label}
                      </span>
                      <span className="text-lg font-bold text-white block mt-1">
                        {unit.cost !== null ? `$${unit.cost.toFixed(4)}` : "—"}
                      </span>
                    </div>
                  ))}
                </div>

                {/* AI Models Table */}
                <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-white">AI Models Usage & Pricing</h3>
                      <p className="text-xs text-slate-400">
                        Detailed token consumption and estimated spend per model
                      </p>
                    </div>
                    <span className="text-xs text-slate-400">
                      Strict Pricing: Unconfigured models return <strong className="text-amber-400">UNKNOWN</strong> (never fabricated)
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-800/60 text-slate-400 font-semibold border-b border-slate-700/60 uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-2.5 px-3">Model</th>
                          <th className="py-2.5 px-3">Provider</th>
                          <th className="py-2.5 px-3 text-right">Operations</th>
                          <th className="py-2.5 px-3 text-right">Input Tokens</th>
                          <th className="py-2.5 px-3 text-right">Output Tokens</th>
                          <th className="py-2.5 px-3 text-right">Avg Latency</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                          <th className="py-2.5 px-3 text-right">Est. Cost (USD)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80 font-mono">
                        {Object.keys(data.usage.byModel).length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-6 text-center text-slate-500">
                              No model operations logged yet.
                            </td>
                          </tr>
                        ) : (
                          Object.values(data.usage.byModel).map((m) => (
                            <tr key={m.model} className="hover:bg-slate-800/40">
                              <td className="py-2.5 px-3 font-sans font-medium text-slate-200">
                                {m.model}
                              </td>
                              <td className="py-2.5 px-3 text-slate-400">{m.provider}</td>
                              <td className="py-2.5 px-3 text-right">{m.operations}</td>
                              <td className="py-2.5 px-3 text-right">{m.inputTokens.toLocaleString()}</td>
                              <td className="py-2.5 px-3 text-right">{m.outputTokens.toLocaleString()}</td>
                              <td className="py-2.5 px-3 text-right text-slate-400">{m.avgLatencyMs}ms</td>
                              <td className="py-2.5 px-3 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    m.pricingStatus === "KNOWN"
                                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                      : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                  }`}
                                >
                                  {m.pricingStatus}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-white">
                                {m.estimatedCostUsd !== null ? `$${m.estimatedCostUsd.toFixed(4)}` : "UNKNOWN"}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: OPTIMIZATION ENGINE FINDINGS */}
            {activeTab === "optimization" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white">Actionable Pipeline Optimizations</h3>
                    <p className="text-xs text-slate-400">
                      Rule-based diagnostics on retries, bottlenecks, model mismatch, and drop-offs
                    </p>
                  </div>
                  <span className="text-xs text-slate-400">
                    Health Score: <strong className="text-white">{data.optimization.healthScore}/100</strong>
                  </span>
                </div>

                {data.optimization.findings.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center text-emerald-300">
                    <span className="text-2xl block mb-2">🎉</span>
                    <h4 className="font-bold text-base">Pipeline is Running Optimally!</h4>
                    <p className="text-xs text-emerald-200/80 mt-1">
                      No critical bottlenecks, excessive retries, or expensive model mismatches detected.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.optimization.findings.map((finding) => (
                      <div
                        key={finding.id}
                        className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${getSeverityBadge(
                                finding.severity
                              )}`}
                            >
                              {finding.severity}
                            </span>
                            {finding.potentialSavingsUsd && (
                              <span className="text-xs font-mono text-emerald-400 font-bold">
                                Est. Savings: ~${finding.potentialSavingsUsd.toFixed(4)}
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm font-bold text-slate-100">{finding.title}</h4>
                          <p className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 font-mono">
                            📊 {finding.evidence}
                          </p>
                          <p className="text-xs text-slate-400">
                            <strong>Impact:</strong> {finding.impact}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-slate-800 text-xs text-indigo-300 bg-indigo-950/20 p-2.5 rounded-lg border border-indigo-500/20">
                          <strong>💡 Recommendation:</strong> {finding.recommendation}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Provider Integration Readiness Card */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold font-mono">
                    Provider Ecosystem
                  </span>
                  <h4 className="text-sm font-semibold text-slate-200">
                    Real-World Provider Interfaces Readiness
                  </h4>
                </div>
                <span className="text-xs text-slate-400">Contracts Active for Lead Command Center</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-200 block">Discovery Provider</span>
                    <span className="text-[11px] text-slate-400">Google Places / Scraper</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-mono">
                    INTERFACE READY
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-200 block">Email Provider</span>
                    <span className="text-[11px] text-slate-400">Gmail API / Resend</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-mono">
                    INTERFACE READY
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-200 block">WhatsApp Provider</span>
                    <span className="text-[11px] text-slate-400">Cloud API / Twilio</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-mono">
                    INTERFACE READY
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
