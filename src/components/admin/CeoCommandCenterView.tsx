"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Crown,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  RefreshCw,
  Cpu,
  ShieldCheck,
  Zap,
  Layers,
  Radio,
  Eye,
  AlertCircle,
  Server,
  Lock,
  Terminal,
  ArrowRight,
  Database,
  Brain,
  BookOpen,
  FlaskConical,
  GitFork,
  Workflow,
  Send,
  Target,
  ChevronDown,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  CeoCommandCenterData,
  DelegationNodeItem,
} from "@/lib/intelligence/commandCenter/commandCenterTypes";

interface CeoCommandCenterViewProps {
  data: CeoCommandCenterData;
  isLoading?: boolean;
  onRefresh?: () => void;
  sessionToken?: string;
  onActionApproved?: () => void;
}

export default function CeoCommandCenterView({
  data,
  isLoading,
  onRefresh,
  sessionToken,
  onActionApproved,
}: CeoCommandCenterViewProps) {
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approvalFeedback, setApprovalFeedback] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (sec: string) => {
    setExpandedSection((prev) => (prev === sec ? null : sec));
  };

  const handleApprove = async (approvalId: string) => {
    setApprovingId(approvalId);
    setApprovalFeedback(null);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (sessionToken) headers["Authorization"] = `Bearer ${sessionToken}`;
      const res = await fetch("/api/admin/intelligence/governance", {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "approve",
          approvalId,
          approvedBy: "ceo_admin", // human admin credential
          tenantId: data.tenantId,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setApprovalFeedback(`Approval blocked by governance: ${json.message || "Failed"}`);
      } else {
        setApprovalFeedback(`Action ${approvalId} successfully approved.`);
        onActionApproved?.();
        onRefresh?.();
      }
    } catch (err) {
      setApprovalFeedback(err instanceof Error ? err.message : "Error approving action");
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (approvalId: string) => {
    setApprovingId(approvalId);
    setApprovalFeedback(null);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (sessionToken) headers["Authorization"] = `Bearer ${sessionToken}`;
      const res = await fetch("/api/admin/intelligence/governance", {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "reject",
          approvalId,
          rejectedBy: "ceo_admin",
          rejectionReason: "Rejected by CEO Command Center reviewer.",
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setApprovalFeedback(`Rejection failed: ${json.message || "Failed"}`);
      } else {
        setApprovalFeedback(`Action ${approvalId} rejected.`);
        onActionApproved?.();
        onRefresh?.();
      }
    } catch (err) {
      setApprovalFeedback(err instanceof Error ? err.message : "Error rejecting action");
    } finally {
      setApprovingId(null);
    }
  };

  const overview = data.executiveOverview;
  const currentObj = data.currentObjective;
  const currentPri = data.currentPriority;
  const nextAction = data.nextRecommendedAction;

  return (
    <div className="space-y-6">
      {/* ─── SECTION 1: EXECUTIVE OVERVIEW ─────────────────────────────────── */}
      <div className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/60 p-6 backdrop-blur-md shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 dark:border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            <h3 className="text-sm font-black uppercase tracking-wider text-zinc-900 dark:text-white">
              Executive Overview
            </h3>
            <span className="rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 text-[10px] font-bold">
              PHASE 26
            </span>
          </div>
          <span className="text-[11px] font-mono text-zinc-400">
            Snapshot: {new Date(data.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 p-3 border border-zinc-100 dark:border-white/5">
            <span className="text-[10px] font-bold uppercase text-zinc-400">Active Objectives</span>
            <p className="text-xl font-black text-zinc-900 dark:text-white mt-1">
              {overview.activeObjectivesCount}
            </p>
          </div>
          <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 p-3 border border-zinc-100 dark:border-white/5">
            <span className="text-[10px] font-bold uppercase text-zinc-400">Active Tasks</span>
            <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
              {overview.activeTasksCount}
            </p>
          </div>
          <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 p-3 border border-zinc-100 dark:border-white/5">
            <span className="text-[10px] font-bold uppercase text-zinc-400">Delegated Tasks</span>
            <p className="text-xl font-black text-violet-600 dark:text-violet-400 mt-1">
              {overview.delegatedTasksCount}
            </p>
          </div>
          <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 p-3 border border-zinc-100 dark:border-white/5">
            <span className="text-[10px] font-bold uppercase text-zinc-400">Pending Approvals</span>
            <p className={cn("text-xl font-black mt-1", overview.pendingApprovalsCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-zinc-500")}>
              {overview.pendingApprovalsCount}
            </p>
          </div>
          <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 p-3 border border-zinc-100 dark:border-white/5">
            <span className="text-[10px] font-bold uppercase text-zinc-400">Pipeline Runs</span>
            <p className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1">
              {overview.activePipelineRunsCount}
            </p>
          </div>
          <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 p-3 border border-zinc-100 dark:border-white/5">
            <span className="text-[10px] font-bold uppercase text-zinc-400">Recent Failures</span>
            <p className={cn("text-xl font-black mt-1", overview.recentFailuresCount > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400")}>
              {overview.recentFailuresCount}
            </p>
          </div>
          <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 p-3 border border-zinc-100 dark:border-white/5">
            <span className="text-[10px] font-bold uppercase text-zinc-400">System Health</span>
            <p className={cn("text-xs font-black mt-2 uppercase", overview.systemHealth === "HEALTHY" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>
              {overview.systemHealth}
            </p>
          </div>
          <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 p-3 border border-zinc-100 dark:border-white/5">
            <span className="text-[10px] font-bold uppercase text-zinc-400">CEO Decisions</span>
            <p className="text-xl font-black text-zinc-900 dark:text-white mt-1">
              {overview.recentCeoDecisionsCount}
            </p>
          </div>
        </div>
      </div>

      {/* ─── SECTIONS 2, 3, 15: OBJECTIVE, PRIORITY, NEXT RECOMMENDED ACTION ─ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Section 2: Current Objective */}
        <div className="lg:col-span-2 rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/60 p-6 backdrop-blur-md shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              <h4 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">
                Current Objective
              </h4>
            </div>
            <span className={cn(
              "rounded-md px-2 py-0.5 text-[10px] font-bold border",
              currentObj.status === "RUNNING" || currentObj.status === "PLANNING"
                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30"
                : "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/30"
            )}>
              {currentObj.status}
            </span>
          </div>
          <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 leading-relaxed">
            {currentObj.objective}
          </p>
          {currentObj.constraints.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {currentObj.constraints.map((c, i) => (
                <span
                  key={i}
                  className="rounded-lg bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-mono text-zinc-600 dark:text-zinc-400"
                >
                  {c}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Section 3: Current Priority & Section 15: Next Recommended Action */}
        <div className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/60 p-6 backdrop-blur-md shadow-xs space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Current Priority
              </span>
              <span className={cn(
                "rounded-md px-2 py-0.5 text-[10px] font-black uppercase border",
                currentPri.level === "critical"
                  ? "bg-red-500/10 text-red-600 border-red-500/30"
                  : currentPri.level === "high"
                  ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                  : "bg-blue-500/10 text-blue-600 border-blue-500/30"
              )}>
                {currentPri.level}
              </span>
            </div>
          </div>

          <div className="border-t border-zinc-100 dark:border-white/5 pt-3 space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-amber-500" />
              Next Recommended Action
            </span>
            <p className="text-xs font-bold text-zinc-900 dark:text-white leading-relaxed">
              {nextAction.action}
            </p>
            {nextAction.reason && (
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {nextAction.reason}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ─── REQUIREMENT #21: SELF-CORRECTION & VALIDATION QUALITY GATE ─────── */}
      {data.validationStatus && (
        <div className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/60 p-6 backdrop-blur-md shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 dark:border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
              <h3 className="text-sm font-black uppercase tracking-wider text-zinc-900 dark:text-white">
                Website Quality Gate & Validation Loop
              </h3>
              <span className="rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold">
                PHASE 21
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn(
                "rounded-md px-2.5 py-1 text-xs font-black uppercase border",
                data.validationStatus.validationStatus === "READY"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                  : data.validationStatus.validationStatus === "REPAIR_REQUIRED"
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                  : data.validationStatus.validationStatus === "FAILED"
                  ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30"
                  : "bg-zinc-500/10 text-zinc-500 border-zinc-500/20"
              )}>
                {data.validationStatus.validationStatus}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 p-3 border border-zinc-100 dark:border-white/5">
              <span className="text-[10px] font-bold uppercase text-zinc-400">Current Stage</span>
              <p className="text-xs font-black text-zinc-900 dark:text-white mt-1">
                {data.validationStatus.currentStage}
              </p>
            </div>
            <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 p-3 border border-zinc-100 dark:border-white/5">
              <span className="text-[10px] font-bold uppercase text-zinc-400">Gate Decision</span>
              <p className={cn(
                "text-xs font-black mt-1 uppercase",
                data.validationStatus.passFail === "PASS"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : data.validationStatus.passFail === "FAIL"
                  ? "text-red-600 dark:text-red-400"
                  : "text-zinc-500"
              )}>
                {data.validationStatus.passFail}
              </p>
            </div>
            <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 p-3 border border-zinc-100 dark:border-white/5">
              <span className="text-[10px] font-bold uppercase text-zinc-400">Blocking Failures</span>
              <p className={cn(
                "text-lg font-black mt-0.5",
                data.validationStatus.blockingFailuresCount > 0
                  ? "text-red-600 dark:text-red-400"
                  : "text-emerald-600 dark:text-emerald-400"
              )}>
                {data.validationStatus.blockingFailuresCount}
              </p>
            </div>
            <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 p-3 border border-zinc-100 dark:border-white/5">
              <span className="text-[10px] font-bold uppercase text-zinc-400">Retry Count</span>
              <p className="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                {data.validationStatus.retryCount}
              </p>
            </div>
            <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 p-3 border border-zinc-100 dark:border-white/5">
              <span className="text-[10px] font-bold uppercase text-zinc-400">Remaining Retries</span>
              <p className="text-lg font-black text-zinc-700 dark:text-zinc-300 mt-0.5">
                {data.validationStatus.remainingRetries}
              </p>
            </div>
            <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 p-3 border border-zinc-100 dark:border-white/5">
              <span className="text-[10px] font-bold uppercase text-zinc-400">Next Action</span>
              <p className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 mt-1 line-clamp-2">
                {data.validationStatus.nextAction}
              </p>
            </div>
          </div>
        </div>
      )}


      {/* ─── SECTION 10: APPROVAL QUEUE ─────────────────────────────────────── */}
      <div className="rounded-3xl border border-amber-500/30 bg-amber-500/5 p-6 backdrop-blur-md shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <h4 className="text-sm font-black uppercase tracking-wider text-zinc-900 dark:text-white">
              Approval Queue ({data.approvalQueue.totalPending})
            </h4>
            <span className="rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300 px-2 py-0.5 text-[10px] font-bold">
              HUMAN AUTHORIZATION REQUIRED
            </span>
          </div>
          <span className="text-xs text-zinc-500">
            AI &amp; CEO self-approval prohibited by Phase 25 Governance
          </span>
        </div>

        {approvalFeedback && (
          <div className="rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 px-4 py-2 text-xs font-bold">
            {approvalFeedback}
          </div>
        )}

        {data.approvalQueue.approvals.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200/60 dark:border-white/5 bg-white/70 dark:bg-zinc-900/40 p-6 text-center text-xs text-zinc-500">
            <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-2" />
            No actions awaiting approval. Operational pipeline and governance queue are clear.
          </div>
        ) : (
          <div className="space-y-2.5">
            {data.approvalQueue.approvals.map((item) => (
              <div
                key={item.approvalId}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-zinc-200/80 dark:border-white/10 bg-white dark:bg-zinc-900 p-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-red-500/10 text-red-600 dark:text-red-400 px-2 py-0.5 text-[10px] font-black uppercase border border-red-500/20">
                      {item.riskLevel} RISK
                    </span>
                    <span className="font-mono text-xs font-bold text-zinc-900 dark:text-white">
                      {item.action}
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      by {item.requestingAgent}
                    </span>
                  </div>
                  {item.details && (
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      {item.details.recipient ? `To: ${item.details.recipient}` : ""}
                      {item.details.subject ? ` — "${item.details.subject}"` : ""}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-[10px] text-zinc-400 font-mono">
                    <span>ID: {item.approvalId}</span>
                    <span>Requested: {new Date(item.createdAt).toLocaleTimeString()}</span>
                    {item.tenantId && <span>Tenant: {item.tenantId}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => handleReject(item.approvalId)}
                    disabled={approvingId === item.approvalId}
                    className="rounded-xl border border-zinc-200 bg-white hover:bg-zinc-100 dark:border-white/10 dark:bg-zinc-800 dark:hover:bg-zinc-700 px-3 py-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-300 transition"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApprove(item.approvalId)}
                    disabled={approvingId === item.approvalId}
                    className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white px-3.5 py-1.5 text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                  >
                    {approvingId === item.approvalId && <RefreshCw className="h-3 w-3 animate-spin" />}
                    <span>Approve Action</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── SECTION 11: PIPELINE STATUS ────────────────────────────────────── */}
      <div className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/60 p-6 backdrop-blur-md shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Workflow className="h-4 w-4 text-blue-500" />
            <h4 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">
              Autonomous Pipeline Status ({data.pipelineStatus.runs.length} Runs)
            </h4>
          </div>
          <span className="text-[11px] font-mono text-zinc-400">
            {data.pipelineStatus.activeRunsCount} Active Runs
          </span>
        </div>

        {/* 16-stage pipeline breadcrumb indicator */}
        <div className="overflow-x-auto no-scrollbar py-1">
          <div className="flex items-center gap-1 min-w-max text-[9px] font-mono font-bold">
            {data.pipelineStatus.stages.map((stage, idx) => (
              <React.Fragment key={stage}>
                <span className="rounded-md bg-zinc-100 dark:bg-zinc-800 px-2 py-1 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-white/5">
                  {stage}
                </span>
                {idx < data.pipelineStatus.stages.length - 1 && (
                  <ArrowRight className="h-2.5 w-2.5 text-zinc-400 shrink-0" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {data.pipelineStatus.runs.length === 0 ? (
          <div className="rounded-2xl border border-zinc-100 dark:border-white/5 bg-zinc-50 dark:bg-zinc-950/60 p-6 text-center text-xs text-zinc-400">
            No pipeline runs recorded. Trigger discovery to initialize autonomous pipeline.
          </div>
        ) : (
          <div className="space-y-3">
            {data.pipelineStatus.runs.map((run) => (
              <div
                key={run.pipelineRunId}
                className="rounded-2xl border border-zinc-100 dark:border-white/5 bg-zinc-50 dark:bg-zinc-950/60 p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-zinc-900 dark:text-white">
                      {run.pipelineRunId}
                    </span>
                    <span className="rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 px-2 py-0.5 text-[10px] font-black">
                      {run.currentStage}
                    </span>
                    <span className="rounded-md bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] font-mono text-zinc-600 dark:text-zinc-300">
                      {run.status}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400">
                    {run.leadCount} Leads Tracked
                  </span>
                </div>

                {run.leadsSummary.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                    {run.leadsSummary.map((lead) => (
                      <div
                        key={lead.leadId}
                        className="rounded-xl border border-zinc-200/60 dark:border-white/5 bg-white dark:bg-zinc-900 p-2 text-[10px]"
                      >
                        <p className="font-bold text-zinc-800 dark:text-zinc-200 truncate">
                          {lead.businessName}
                        </p>
                        <div className="flex items-center justify-between text-zinc-400 mt-1">
                          <span>Stage: {lead.stage}</span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {lead.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── SECTION 6: AGENT STATUS ────────────────────────────────────────── */}
      <div className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/60 p-6 backdrop-blur-md shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-indigo-500" />
            <h4 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">
              Agent Status ({data.agentStatus.length} Tracked Agents)
            </h4>
          </div>
          <span className="text-[10px] text-zinc-400 font-mono">Real state only &bull; No fake online</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {data.agentStatus.map((agent) => (
            <div
              key={agent.agent}
              className="rounded-2xl border border-zinc-100 dark:border-white/5 bg-zinc-50 dark:bg-zinc-950/60 p-3.5 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                  {agent.title}
                </span>
                <span
                  className={cn(
                    "rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase",
                    agent.state === "active"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                      : agent.state === "failed"
                      ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30"
                      : "bg-zinc-200/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                  )}
                >
                  {agent.state}
                </span>
              </div>
              <p className="text-[10px] text-zinc-500 line-clamp-1">{agent.role}</p>
              {agent.currentTask && (
                <p className="text-[10px] font-mono text-zinc-700 dark:text-zinc-300 truncate pt-1">
                  Task: {agent.currentTask}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ─── SECTION 4: ACTIVE TASKS & SECTION 5: DELEGATION TREE ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Section 4: Active Tasks */}
        <div className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/60 p-6 backdrop-blur-md shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-violet-500" />
              <h4 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">
                Active Tasks ({data.activeTasks.length})
              </h4>
            </div>
          </div>

          {data.activeTasks.length === 0 ? (
            <div className="rounded-2xl border border-zinc-100 dark:border-white/5 bg-zinc-50 dark:bg-zinc-950/60 p-6 text-center text-xs text-zinc-400">
              No active tasks currently executing.
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {data.activeTasks.map((t) => (
                <div
                  key={t.taskId}
                  className="rounded-xl border border-zinc-100 dark:border-white/5 bg-zinc-50 dark:bg-zinc-950/60 p-3 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-800 dark:text-zinc-200 truncate">
                      {t.objective}
                    </span>
                    <span className="rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 text-[9px] font-bold">
                      {t.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-zinc-400 font-mono">
                    <span>Owner: {t.agent}</span>
                    <span>Risk: {t.riskLevel}</span>
                    {t.progress && <span>{t.progress}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 5: Delegation Hierarchy */}
        <div className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/60 p-6 backdrop-blur-md shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitFork className="h-4 w-4 text-violet-500" />
              <h4 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">
                Delegations Hierarchy ({data.delegations.length} Root Trees)
              </h4>
            </div>
            <span className="text-[10px] text-zinc-400 font-mono">CEO &rarr; Boss &rarr; Skills/Uniqueness</span>
          </div>

          {data.delegations.length === 0 ? (
            <div className="rounded-2xl border border-zinc-100 dark:border-white/5 bg-zinc-50 dark:bg-zinc-950/60 p-6 text-center text-xs text-zinc-400">
              No delegation trees recorded yet.
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {data.delegations.map((tree) => (
                <DelegationTreeItem key={tree.taskId} node={tree} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── SECTION 7: TOOL ACTIVITY & SECTION 9: FAILURES ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Section 7: Tool Activity */}
        <div className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/60 p-6 backdrop-blur-md shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-emerald-500" />
              <h4 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">
                Tool Activity ({data.toolActivity.length} Recent Calls)
              </h4>
            </div>
            <span className="text-[10px] text-zinc-400 font-mono">Secrets strictly redacted</span>
          </div>

          {data.toolActivity.length === 0 ? (
            <div className="rounded-2xl border border-zinc-100 dark:border-white/5 bg-zinc-50 dark:bg-zinc-950/60 p-6 text-center text-xs text-zinc-400">
              No recent tool executions logged.
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {data.toolActivity.slice(0, 10).map((tool, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 rounded-xl border border-zinc-100 dark:border-white/5 bg-zinc-50 dark:bg-zinc-950/60 p-2.5 text-[11px]"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={cn(
                      "rounded px-1.5 py-0.5 text-[9px] font-black uppercase",
                      tool.status === "success"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-red-500/10 text-red-600 dark:text-red-400"
                    )}>
                      {tool.status}
                    </span>
                    <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200 truncate">
                      {tool.tool}
                    </span>
                    <span className="text-zinc-400 text-[10px]">by {tool.agent}</span>
                  </div>
                  <span className="text-zinc-400 text-[10px] font-mono shrink-0">
                    {tool.durationMs ? `${tool.durationMs}ms` : new Date(tool.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 9: Failures / Incidents */}
        <div className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/60 p-6 backdrop-blur-md shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <h4 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">
                Failures &amp; Incidents ({data.failures.length})
              </h4>
            </div>
            <span className="text-[10px] text-zinc-400 font-mono">Redacted incident ledger</span>
          </div>

          {data.failures.length === 0 ? (
            <div className="rounded-2xl border border-zinc-100 dark:border-white/5 bg-zinc-50 dark:bg-zinc-950/60 p-6 text-center text-xs text-emerald-600 dark:text-emerald-400 font-bold">
              Zero unhandled incidents. Operational system healthy.
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {data.failures.map((f) => (
                <div
                  key={f.id}
                  className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-red-600 dark:text-red-400 uppercase text-[10px]">
                      {f.failureType} &bull; {f.severity}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">
                      {f.recoveryStatus}
                    </span>
                  </div>
                  <p className="text-zinc-700 dark:text-zinc-300 text-[11px] font-mono line-clamp-2">
                    {f.errorSummary}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── SECTION 8: MEMORY INSIGHTS & SECTION 12: LEARNING STATUS ──────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Section 8: Memory Insights */}
        <div className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/60 p-6 backdrop-blur-md shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-indigo-500" />
              <h4 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">
                Memory Insights (Phase 18 Visibility)
              </h4>
            </div>
            <span className="text-[10px] text-zinc-400 font-mono">Read-only visibility</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-950/60 p-2.5 border border-zinc-100 dark:border-white/5">
              <span className="text-[10px] font-bold text-zinc-400 uppercase">Lessons</span>
              <p className="text-base font-black text-zinc-900 dark:text-white mt-0.5">
                {data.memoryInsights.recentLessons.length}
              </p>
            </div>
            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-950/60 p-2.5 border border-zinc-100 dark:border-white/5">
              <span className="text-[10px] font-bold text-zinc-400 uppercase">Strategies</span>
              <p className="text-base font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                {data.memoryInsights.recentStrategicMemory.length}
              </p>
            </div>
            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-950/60 p-2.5 border border-zinc-100 dark:border-white/5">
              <span className="text-[10px] font-bold text-zinc-400 uppercase">Experiences</span>
              <p className="text-base font-black text-violet-600 dark:text-violet-400 mt-0.5">
                {data.memoryInsights.relevantExperienceMemory.length}
              </p>
            </div>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 pt-1">
            {data.memoryInsights.recentLessons.slice(0, 5).map((l) => (
              <div
                key={l.id}
                className="rounded-xl border border-zinc-100 dark:border-white/5 bg-zinc-50 dark:bg-zinc-950/60 p-2.5 text-[11px]"
              >
                <div className="flex items-center justify-between text-[10px] text-zinc-400">
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 uppercase">{l.domain}</span>
                  <span>Confidence: {(l.confidence * 100).toFixed(0)}%</span>
                </div>
                <p className="text-zinc-700 dark:text-zinc-300 font-semibold mt-1">{l.rule}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Section 12: Learning Status */}
        <div className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/60 p-6 backdrop-blur-md shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-purple-500" />
              <h4 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">
                Learning Status (Phase 18 Metrics)
              </h4>
            </div>
            <span className="text-[10px] text-zinc-400 font-mono">No autonomous mutation</span>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-950/60 p-2.5 border border-zinc-100 dark:border-white/5">
              <span className="text-[9px] font-bold text-zinc-400 uppercase">Total</span>
              <p className="text-base font-black text-zinc-900 dark:text-white mt-0.5">
                {data.learningStatus.totalLessons}
              </p>
            </div>
            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-950/60 p-2.5 border border-zinc-100 dark:border-white/5">
              <span className="text-[9px] font-bold text-zinc-400 uppercase">Candidate</span>
              <p className="text-base font-black text-amber-600 dark:text-amber-400 mt-0.5">
                {data.learningStatus.candidateLessons}
              </p>
            </div>
            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-950/60 p-2.5 border border-zinc-100 dark:border-white/5">
              <span className="text-[9px] font-bold text-zinc-400 uppercase">Validated</span>
              <p className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                {data.learningStatus.validatedLessons}
              </p>
            </div>
            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-950/60 p-2.5 border border-zinc-100 dark:border-white/5">
              <span className="text-[9px] font-bold text-zinc-400 uppercase">Strategies</span>
              <p className="text-base font-black text-violet-600 dark:text-violet-400 mt-0.5">
                {data.learningStatus.promotedStrategies}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-100 dark:border-white/5 bg-zinc-50 dark:bg-zinc-950/60 p-3 text-xs space-y-1">
            <span className="text-[10px] font-bold uppercase text-zinc-400">Evaluation Activity</span>
            <p className="text-zinc-600 dark:text-zinc-400 text-[11px]">
              {data.learningStatus.evaluationActivity.length > 0
                ? `${data.learningStatus.evaluationActivity.length} recent evaluations performed with passing benchmark rate.`
                : "No recent evaluation activity recorded."}
            </p>
          </div>
        </div>
      </div>

      {/* ─── SECTION 13: SYSTEM HEALTH ──────────────────────────────────────── */}
      <div className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/60 p-6 backdrop-blur-md shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-emerald-500" />
            <h4 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">
              System Health &amp; Infrastructure (Phase 24)
            </h4>
          </div>
          <span className="text-[10px] font-mono text-zinc-400">
            Node: {data.systemHealth.readiness.environment} &bull; Uptime: {data.systemHealth.websiteBanja.uptimeSec}s
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-zinc-100 dark:border-white/5 bg-zinc-50 dark:bg-zinc-950/60 p-3.5 space-y-1">
            <span className="text-[10px] font-bold uppercase text-zinc-400">WebsiteBanja App</span>
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
              {data.systemHealth.websiteBanja.status}
            </p>
            <span className="text-[10px] text-zinc-400 font-mono">v{data.systemHealth.websiteBanja.version}</span>
          </div>

          <div className="rounded-2xl border border-zinc-100 dark:border-white/5 bg-zinc-50 dark:bg-zinc-950/60 p-3.5 space-y-1">
            <span className="text-[10px] font-bold uppercase text-zinc-400">Database</span>
            <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
              {data.systemHealth.database.status}
            </p>
            <span className="text-[10px] text-zinc-400 font-mono">
              {data.systemHealth.database.isAzureConfigured ? "Azure PostgreSQL" : "Local Memory"}
            </span>
          </div>

          <div className="rounded-2xl border border-zinc-100 dark:border-white/5 bg-zinc-50 dark:bg-zinc-950/60 p-3.5 space-y-1">
            <span className="text-[10px] font-bold uppercase text-zinc-400">Blob Storage</span>
            <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
              {data.systemHealth.storage.status}
            </p>
            <span className="text-[10px] text-zinc-400 font-mono">{data.systemHealth.storage.provider}</span>
          </div>

          <div className="rounded-2xl border border-zinc-100 dark:border-white/5 bg-zinc-50 dark:bg-zinc-950/60 p-3.5 space-y-1">
            <span className="text-[10px] font-bold uppercase text-zinc-400">n8n Ops Agent</span>
            <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
              {data.systemHealth.n8nOpsAgent.status}
            </p>
            <span className="text-[10px] text-zinc-400 font-mono">Mode: {data.systemHealth.n8nOpsAgent.mode}</span>
          </div>
        </div>
      </div>

      {/* ─── SECTION 14: RECENT CEO DECISIONS ───────────────────────────────── */}
      <div className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/60 p-6 backdrop-blur-md shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-amber-500" />
            <h4 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">
              Recent CEO Decisions ({data.recentCeoDecisions.length})
            </h4>
          </div>
          <span className="text-[10px] text-zinc-400 font-mono">Structured metadata &bull; No hidden CoT</span>
        </div>

        {data.recentCeoDecisions.length === 0 ? (
          <div className="rounded-2xl border border-zinc-100 dark:border-white/5 bg-zinc-50 dark:bg-zinc-950/60 p-6 text-center text-xs text-zinc-400">
            No recent executive runs recorded.
          </div>
        ) : (
          <div className="space-y-2.5">
            {data.recentCeoDecisions.map((dec) => (
              <div
                key={dec.runId}
                className="rounded-2xl border border-zinc-100 dark:border-white/5 bg-zinc-50 dark:bg-zinc-950/60 p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-900 dark:text-white">
                    {dec.objective}
                  </span>
                  <span className="rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 text-[10px] font-black uppercase">
                    {dec.priority}
                  </span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {dec.decisionSummary}
                </p>
                <div className="flex items-center gap-4 text-[10px] text-zinc-400 font-mono pt-1">
                  <span>Delegations: {dec.delegationsCount}</span>
                  <span>Tool Calls: {dec.toolCallsCount}</span>
                  <span>Next Action: {dec.nextAction}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-Component: Recursive Delegation Tree Item ────────────────────────────

function DelegationTreeItem({ node }: { node: DelegationNodeItem }) {
  const [open, setOpen] = useState(true);
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;

  return (
    <div className="rounded-xl border border-zinc-100 dark:border-white/5 bg-zinc-50 dark:bg-zinc-950/60 p-2.5 text-xs space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          {hasChildren && (
            <button
              type="button"
              onClick={() => setOpen((p) => !p)}
              className="text-zinc-400 hover:text-zinc-600"
            >
              {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>
          )}
          <span className="font-bold text-zinc-800 dark:text-zinc-200">
            {node.assignedAgent}
          </span>
          <span className="text-[10px] font-mono text-zinc-400">({node.taskId})</span>
        </div>
        <span className="rounded bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 text-[9px] font-mono font-bold">
          {node.status}
        </span>
      </div>

      {hasChildren && open && (
        <div className="pl-4 border-l border-zinc-200 dark:border-white/10 space-y-1 mt-1">
          {node.children.map((child) => (
            <DelegationTreeItem key={child.taskId} node={child} />
          ))}
        </div>
      )}
    </div>
  );
}
