// src/components/admin/AdminBossResearchPanel.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Compass,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Filter,
  ShieldCheck,
  Search,
  ChevronDown,
  ChevronUp,
  Cpu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  BossResearchReport,
  DiscoveredPatternItem,
  DiscoveryClassification,
  AdminDecisionState,
} from "@/lib/agents/boss/research/types";

interface AdminBossResearchPanelProps {
  sessionToken?: string;
}

export default function AdminBossResearchPanel({ sessionToken }: AdminBossResearchPanelProps) {
  const [report, setReport] = useState<BossResearchReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterClassification, setFilterClassification] = useState<string>("ALL");
  const [filterDecision, setFilterDecision] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Local admin approval override simulation (in memory for live dashboard control)
  const [adminDecisions, setAdminDecisions] = useState<Record<string, AdminDecisionState>>({});

  const fetchResearch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = {};
      if (sessionToken) {
        headers["Authorization"] = `Bearer ${sessionToken}`;
      }
      const res = await fetch("/api/admin/boss/research", {
        headers,
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to fetch research report.");
      }
      setReport(json.data);
    } catch (err: any) {
      setError(err.message || "Error loading research.");
    } finally {
      setIsLoading(false);
    }
  }, [sessionToken]);

  useEffect(() => {
    fetchResearch();
  }, [fetchResearch]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-zinc-500">
        <RefreshCw className="h-8 w-8 animate-spin text-violet-600 mb-3" />
        <p className="text-sm font-semibold">Running Boss Internet Research & Skill Discovery Engine...</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="p-8 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400">
        <div className="flex items-center gap-2 font-bold mb-2">
          <AlertTriangle className="h-5 w-5" />
          <span>Research Engine Error</span>
        </div>
        <p className="text-xs mb-4">{error || "No report available."}</p>
        <button
          onClick={() => fetchResearch()}
          className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  // Filter discoveries
  const filtered = report.discoveries.filter((d) => {
    const currentDecision = adminDecisions[d.id] || d.adminDecision;
    if (filterClassification !== "ALL" && d.classification !== filterClassification) return false;
    if (filterDecision !== "ALL" && currentDecision !== filterDecision) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        d.techniqueName.toLowerCase().includes(q) ||
        d.topicTitle.toLowerCase().includes(q) ||
        d.sourceName.toLowerCase().includes(q) ||
        d.whatItIs.toLowerCase().includes(q) ||
        (d.equivalentExistingSkillName && d.equivalentExistingSkillName.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  const handleToggleDecision = (id: string, currentDecision: AdminDecisionState) => {
    const nextDecision = currentDecision === "YES" ? "NO" : "YES";
    setAdminDecisions((prev) => ({ ...prev, [id]: nextDecision }));
  };

  return (
    <div className="space-y-6">
      {/* Header & KPI Summary */}
      <div className="p-6 rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 text-xs font-bold">
              <Compass className="h-3.5 w-3.5" />
              <span>Boss Agent Internet Research & Skill Discovery</span>
            </div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
              Continuous Intelligence & 21-Skill Delta Analysis
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-2xl leading-relaxed">
              Boss continuously audits 24 modern web design topics across verified web standards, open-source frameworks, and commercial asset repositories. Boss recommends candidates, but strictly requires explicit Admin Approval (YES=ADD / NO=DROP) before production skill integration.
            </p>
          </div>
          <button
            onClick={() => fetchResearch()}
            className="self-start md:self-auto flex items-center gap-1.5 px-4 py-2 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 rounded-xl text-xs font-bold hover:opacity-90 transition shadow-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Re-Sync Research</span>
          </button>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5">
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-white/5">
            <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Topics Audited</div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">{report.totalTopicsCovered} / 24</div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">100% Core Web Coverage</div>
          </div>
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-white/5">
            <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Total Discoveries</div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">{report.totalDiscoveries}</div>
            <div className="text-[11px] text-zinc-500 mt-1 font-medium">{report.classificationCounts.NEW} New Candidates</div>
          </div>
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-white/5">
            <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Existing 21-Skill Overlap</div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">{report.classificationCounts.DUPLICATE}</div>
            <div className="text-[11px] text-violet-600 dark:text-violet-400 mt-1 font-medium">Verified Protected Skills</div>
          </div>
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-white/5">
            <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Admin Decision Status</div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">
              <span className="text-emerald-600 dark:text-emerald-400">{report.adminDecisionCounts.YES_ADD} YES</span>
              <span className="text-zinc-400 mx-1.5 font-normal">/</span>
              <span className="text-zinc-500">{report.adminDecisionCounts.NO_DROP} NO</span>
            </div>
            <div className="text-[11px] text-zinc-500 mt-1 font-medium">Human Approval Gated</div>
          </div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search discovered techniques, sources, industries, or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-600"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-semibold px-1">
            <Filter className="h-3.5 w-3.5" />
            <span>Classification:</span>
          </div>
          <select
            value={filterClassification}
            onChange={(e) => setFilterClassification(e.target.value)}
            className="text-xs py-1.5 px-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 font-medium"
          >
            <option value="ALL">All Classifications ({report.totalDiscoveries})</option>
            <option value="NEW">NEW ({report.classificationCounts.NEW})</option>
            <option value="IMPROVEMENT">IMPROVEMENT ({report.classificationCounts.IMPROVEMENT})</option>
            <option value="DUPLICATE">DUPLICATE ({report.classificationCounts.DUPLICATE})</option>
            <option value="EXPERIMENTAL">EXPERIMENTAL ({report.classificationCounts.EXPERIMENTAL})</option>
          </select>

          <select
            value={filterDecision}
            onChange={(e) => setFilterDecision(e.target.value)}
            className="text-xs py-1.5 px-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 font-medium"
          >
            <option value="ALL">All Decisions</option>
            <option value="YES">YES = ADD</option>
            <option value="NO">NO = DROP</option>
          </select>
        </div>
      </div>

      {/* Discovery Table */}
      <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-white/10 text-zinc-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Research Topic & Pattern</th>
                <th className="py-3 px-4">Source & Reference</th>
                <th className="py-3 px-4">Classification</th>
                <th className="py-3 px-4">Existing Skill Overlap</th>
                <th className="py-3 px-4 text-center">Confidence</th>
                <th className="py-3 px-4 text-center">Admin Decision</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-zinc-800 dark:text-zinc-200">
              {filtered.map((item) => {
                const isExpanded = expandedId === item.id;
                const currentDecision = adminDecisions[item.id] || item.adminDecision;

                return (
                  <React.Fragment key={item.id}>
                    <tr className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition">
                      <td className="py-3.5 px-4 font-medium">
                        <div className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                          <span>{item.techniqueName}</span>
                        </div>
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                          {item.topicTitle}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <a
                          href={item.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-violet-600 dark:text-violet-400 hover:underline font-medium"
                        >
                          <span className="truncate max-w-[140px]">{item.sourceName}</span>
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={cn(
                            "px-2.5 py-0.5 rounded-full font-bold text-[10px]",
                            item.classification === "NEW" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30",
                            item.classification === "IMPROVEMENT" && "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30",
                            item.classification === "DUPLICATE" && "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700",
                            item.classification === "EXPERIMENTAL" && "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                          )}
                        >
                          {item.classification}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {item.equivalentExistingSkillName ? (
                          <div className="text-[11px]">
                            <span className="font-semibold text-zinc-900 dark:text-white">
                              {item.equivalentExistingSkillName}
                            </span>
                            <span className="block text-[10px] text-zinc-500 font-mono">
                              ({item.equivalentExistingSkillId})
                            </span>
                          </div>
                        ) : (
                          <span className="text-zinc-400 italic text-[11px]">None (New Area)</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center font-mono font-bold text-[11px]">
                        {Math.round(item.confidence * 100)}%
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleDecision(item.id, currentDecision)}
                          title="Click to toggle Admin Approval"
                          className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition shadow-2xs cursor-pointer",
                            currentDecision === "YES"
                              ? "bg-emerald-600 text-white hover:bg-emerald-700"
                              : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700"
                          )}
                        >
                          {currentDecision === "YES" ? (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>YES = ADD</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3.5 w-3.5" />
                              <span>NO = DROP</span>
                            </>
                          )}
                        </button>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : item.id)}
                          className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="bg-zinc-50/50 dark:bg-zinc-800/20">
                        <td colSpan={7} className="p-5 border-t border-zinc-100 dark:border-zinc-800">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                            <div className="space-y-2.5">
                              <div>
                                <span className="font-bold text-zinc-900 dark:text-white uppercase tracking-wider text-[10px]">What It Is:</span>
                                <p className="text-zinc-600 dark:text-zinc-300 mt-0.5">{item.whatItIs}</p>
                              </div>
                              <div>
                                <span className="font-bold text-zinc-900 dark:text-white uppercase tracking-wider text-[10px]">Why It Matters:</span>
                                <p className="text-zinc-600 dark:text-zinc-300 mt-0.5">{item.whyItMatters}</p>
                              </div>
                              <div>
                                <span className="font-bold text-zinc-900 dark:text-white uppercase tracking-wider text-[10px]">Where Useful & Industries:</span>
                                <p className="text-zinc-600 dark:text-zinc-300 mt-0.5">
                                  {item.whereUseful} &bull; <span className="font-medium">{item.suitableIndustries.join(", ")}</span>
                                </p>
                              </div>
                              <div>
                                <span className="font-bold text-zinc-900 dark:text-white uppercase tracking-wider text-[10px]">Admin Decision Rationale:</span>
                                <p className="text-zinc-600 dark:text-zinc-300 mt-0.5 italic">{item.decisionReason}</p>
                              </div>
                            </div>

                            <div className="space-y-2.5">
                              <div>
                                <span className="font-bold text-zinc-900 dark:text-white uppercase tracking-wider text-[10px]">Performance & Accessibility:</span>
                                <p className="text-zinc-600 dark:text-zinc-300 mt-0.5">
                                  <strong>Perf:</strong> {item.performanceImplications}
                                </p>
                                <p className="text-zinc-600 dark:text-zinc-300 mt-0.5">
                                  <strong>A11y:</strong> {item.accessibilityImplications}
                                </p>
                              </div>
                              <div>
                                <span className="font-bold text-zinc-900 dark:text-white uppercase tracking-wider text-[10px]">Licensing & Safety:</span>
                                <p className="text-zinc-600 dark:text-zinc-300 mt-0.5">
                                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 uppercase text-[10px] mr-1.5">[{item.licensingCategory}]</span>
                                  {item.licensingNotes}
                                </p>
                              </div>
                              {item.proposedCandidate && (
                                <div className="p-3 rounded-xl bg-violet-500/5 border border-violet-500/20 text-violet-900 dark:text-violet-200">
                                  <div className="font-bold text-[11px] mb-1">Proposed Candidate: {item.proposedCandidate.skillName}</div>
                                  <div><strong>Integration:</strong> {item.proposedCandidate.generationStageIntegrationPoint}</div>
                                  <div><strong>Benefit:</strong> {item.proposedCandidate.expectedBenefit}</div>
                                  <div><strong>Inputs:</strong> {item.proposedCandidate.inputs.join(", ")}</div>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
