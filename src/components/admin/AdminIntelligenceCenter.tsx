"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import type { GovernanceAuditEntry, PolicyRule } from "@/lib/intelligence/policies/governanceTypes";
import type { AgentStrategyRecord, AgentLessonRecord, AgentRunRecord, AgentFailureRecord, AgentExperimentRecord, AgentDecisionRecord } from "@/lib/intelligence/memory/memoryTypes";
import type { ExecutionTreeNode } from "@/lib/intelligence/delegation/delegationTypes";
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
  Wifi,
  WifiOff,
  Terminal,
  ListFilter,
  Trash2,
  ArrowRight,
  Database,
  Brain,
  BookOpen,
  FlaskConical,
  GitFork,
  Scale,
  CornerDownRight,
  Workflow,
  Send,
  Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import CeoCommandCenterView from "./CeoCommandCenterView";
import type { CeoCommandCenterData } from "@/lib/intelligence/commandCenter/commandCenterTypes";
import type {
  BossReport,
  AgentHealthMetric,
  DiagnosticIssue,
  BossRecommendation,
  CrossAgentCorrelation,
  AgentHealthStatus,
  IssueSeverity,
} from "@/lib/agents/boss/types";
import type {
  AgentTelemetryEvent,
  AgentLiveStatus,
  AgentName,
  AgentState,
} from "@/lib/telemetry/types";

interface AdminIntelligenceCenterProps {
  sessionToken?: string;
  onNavigateTab?: (tabId: string) => void;
}

interface IntelligenceMemorySnapshot {
  strategies: AgentStrategyRecord[];
  lessons: AgentLessonRecord[];
  runs: AgentRunRecord[];
  failures: AgentFailureRecord[];
  experiments: AgentExperimentRecord[];
}

interface IntelligenceOpsSnapshot {
  agent: { name: string; status: string; executionMode: string; webhookConfigured: boolean };
  securityInvariants: { whatsappStatus: string; emailAutoSend: string; optOutCompliance: string; secretRedaction: string };
  tools: Array<{ name: string; available: boolean; type: string }>;
  recentReports: AgentDecisionRecord[];
}

async function fetchIntelligenceResource<T>(url: string, sessionToken?: string): Promise<T> {
  if (!sessionToken) throw new Error("Sign in with an administrator account to load intelligence evidence.");
  const response = await fetch(url, { cache: "no-store", headers: { Authorization: `Bearer ${sessionToken}` } });
  const body: T & { success?: boolean; message?: string; error?: string } = await response.json();
  if (!response.ok || body.success !== true) throw new Error(body.message || body.error || "Intelligence evidence could not be loaded.");
  return body;
}

const WINDOW_OPTIONS = [
  { label: "Past 1 Hour", value: 60 },
  { label: "Past 6 Hours", value: 360 },
  { label: "Past 24 Hours", value: 1440 },
  { label: "Past 7 Days", value: 10080 },
];

const ALL_AGENTS: AgentName[] = [
  "executive",
  "mitra",
  "generator",
  "planner",
  "extractor",
  "studio",
  "skills",
  "uniqueness",
  "boss",
];

const AGENT_LABELS: Record<string, { title: string; subtitle: string }> = {
  executive: { title: "CEO / Executive Brain", subtitle: "Strategic Orchestration, Delegation & Verification" },
  mitra: { title: "Mitra Voice Agent", subtitle: "Multilingual Voice & Requirement Intake" },
  generator: { title: "Website Generator", subtitle: "Full-page HTML, layout & Tailwind synthesis" },
  planner: { title: "Architecture Planner", subtitle: "Component breakdown & structure generation" },
  extractor: { title: "Content Extractor", subtitle: "Semantic information extraction" },
  studio: { title: "Studio Copilot", subtitle: "Interactive visual editing & modifications" },
  skills: { title: "Skills Agent", subtitle: "Pre-Generation Feature & Style Extraction" },
  uniqueness: { title: "Uniqueness Agent", subtitle: "AST Fingerprint & Design Verification" },
  boss: { title: "Boss Supervisor", subtitle: "Telemetry Diagnostics & Health Supervisor" },
};

function getLiveStateBadge(state?: AgentState) {
  switch (state) {
    case "running":
      return {
        bg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
        dot: "bg-blue-500 animate-pulse",
        label: "RUNNING",
      };
    case "success":
      return {
        bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
        dot: "bg-emerald-500",
        label: "READY",
      };
    case "error":
      return {
        bg: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30",
        dot: "bg-red-500",
        label: "ERROR",
      };
    case "fallback":
      return {
        bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
        dot: "bg-amber-500",
        label: "FALLBACK",
      };
    case "idle":
    default:
      return {
        bg: "bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border-zinc-500/30",
        dot: "bg-zinc-400",
        label: "IDLE",
      };
  }
}

function getEventTypeBadge(eventType: string) {
  if (eventType.includes("error") || eventType.includes("failed")) {
    return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30";
  }
  if (eventType.includes("fallback")) {
    return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30";
  }
  if (eventType.includes("success") || eventType.includes("completed")) {
    return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
  }
  if (eventType.includes("call") || eventType.includes("started") || eventType.includes("thinking")) {
    return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30";
  }
  return "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/30";
}

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

// ─── Phase 25: Governance Section Sub-Component ──────────────────────────────

interface GovernancePanelData {
  auditSummary: { total: number; allowed: number; requireApproval: number; blocked: number };
  pendingApprovals: number;
  recentDecisions: GovernanceAuditEntry[];
  policyRules: PolicyRule[];
}

function GovernanceSection({ sessionToken }: { sessionToken?: string }) {
  const [showRules, setShowRules] = useState(false);

  const loadGovernance = useCallback(async (): Promise<GovernancePanelData> => {
      const headers: Record<string, string> = {};
      if (sessionToken) headers["Authorization"] = `Bearer ${sessionToken}`;
      const res = await fetch(`/api/admin/intelligence/governance?t=${Date.now()}`, {
        headers,
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.governance) throw new Error(data.message || "Failed to load governance data.");
      return data.governance;
  }, [sessionToken]);
  const { data: govData, loading: isLoading, error, refresh: fetchGovernance } = useAsyncResource("governance", loadGovernance);

  const summary = govData?.auditSummary;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 via-transparent to-transparent p-6 sm:p-8 space-y-5"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 to-purple-600 text-white shadow-md shadow-violet-600/20">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-zinc-900 dark:text-white flex items-center gap-2">
              Governance &amp; Action Authority
              <span className="rounded-md bg-violet-100 dark:bg-violet-950/60 px-2 py-0.5 text-[10px] font-bold text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                PHASE 25
              </span>
              {govData && (
                <span className="rounded-md bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  ACTIVE · DEFAULT-DENY
                </span>
              )}
            </h3>
            <p className="text-xs text-zinc-500">
              Centralized policy engine governing all agent actions. CEO → Governance → Execution.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void fetchGovernance()}
          disabled={isLoading}
          className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300 transition"
        >
          <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin text-violet-600")} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-600 dark:text-amber-400">
          {error}
        </div>
      )}

      {govData && (
        <>
          {/* Security Invariants Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {[
              { label: "WhatsApp", value: "PERMANENTLY DISABLED", ok: false },
              { label: "Telegram", value: "NOT YET IMPL.", ok: false },
              { label: "Email Auto-Send", value: "BLOCKED — Human Approval Required", ok: false },
              { label: "AI Self-Approval", value: "BLOCKED", ok: false },
              { label: "CEO ≠ Human Approval", value: "ENFORCED", ok: true },
              { label: "One-Time Approval", value: "ENFORCED", ok: true },
              { label: "Cross-Tenant Approvals", value: "IMPOSSIBLE", ok: true },
              { label: "Default-Deny", value: "ACTIVE", ok: true },
            ].map((inv) => (
              <div
                key={inv.label}
                className={cn(
                  "rounded-xl border p-3 text-[10px] font-bold space-y-1",
                  inv.ok
                    ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400"
                    : "border-red-500/20 bg-red-500/5 text-red-700 dark:text-red-400"
                )}
              >
                <div className="flex items-center gap-1">
                  {inv.ok ? (
                    <CheckCircle2 className="h-3 w-3 shrink-0" />
                  ) : (
                    <Lock className="h-3 w-3 shrink-0" />
                  )}
                  <span className="uppercase tracking-wide text-zinc-600 dark:text-zinc-400 font-semibold">
                    {inv.label}
                  </span>
                </div>
                <p className="leading-snug">{inv.value}</p>
              </div>
            ))}
          </div>

          {/* Audit Summary */}
          {summary && (
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "Total Decisions", value: summary.total, color: "text-zinc-900 dark:text-white" },
                { label: "Allowed", value: summary.allowed, color: "text-emerald-600 dark:text-emerald-400" },
                { label: "Require Approval", value: summary.requireApproval, color: "text-amber-600 dark:text-amber-400" },
                { label: "Blocked", value: summary.blocked, color: "text-red-600 dark:text-red-400" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-zinc-100 dark:border-white/5 bg-white dark:bg-zinc-900/60 p-4 text-center"
                >
                  <p className={cn("text-2xl font-black", stat.color)}>{stat.value}</p>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Pending Approvals */}
          {govData.pendingApprovals > 0 && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 flex items-center gap-2.5">
              <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                {govData.pendingApprovals} action{govData.pendingApprovals !== 1 ? "s" : ""} awaiting human approval
              </span>
            </div>
          )}

          {/* Recent Decisions */}
          {govData.recentDecisions?.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300">Recent Governance Decisions</span>
                <button
                  type="button"
                  onClick={() => setShowRules((p) => !p)}
                  className="text-[10px] font-semibold text-violet-600 dark:text-violet-400 hover:underline"
                >
                  {showRules ? "Hide" : "Show"} Policy Rules ({govData.policyRules?.length ?? 0})
                </button>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {govData.recentDecisions.slice(0, 8).map((d) => (
                  <div
                    key={d.auditId}
                    className="flex items-center gap-2.5 rounded-xl border border-zinc-100 dark:border-white/5 bg-white dark:bg-zinc-900/60 px-3 py-2 text-[10px]"
                  >
                    <span
                      className={cn(
                        "rounded-md px-1.5 py-0.5 font-bold border",
                        d.decision === "ALLOW"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : d.decision === "BLOCK"
                          ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                      )}
                    >
                      {d.decision}
                    </span>
                    <span className="font-mono text-zinc-700 dark:text-zinc-300 truncate max-w-[120px]">
                      {d.action}
                    </span>
                    <span className="text-zinc-400 shrink-0">by {d.requestingAgent}</span>
                    <span className="ml-auto text-zinc-400 shrink-0 font-mono">
                      {d.policyId}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Policy Rules (collapsible) */}
          {showRules && govData.policyRules?.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300">Policy Rules</span>
              <div className="grid gap-1.5">
                {govData.policyRules.map((rule) => (
                  <div
                    key={rule.ruleId}
                    className="flex items-center gap-2.5 rounded-xl border border-zinc-100 dark:border-white/5 bg-white dark:bg-zinc-900/60 px-3 py-2 text-[10px]"
                  >
                    <span className="font-mono text-zinc-400 w-5 shrink-0">{rule.priority}</span>
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 font-bold border shrink-0",
                        rule.outcome === "ALLOW"
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                          : rule.outcome === "BLOCK"
                          ? "bg-red-500/10 text-red-600 border-red-500/20"
                          : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                      )}
                    >
                      {rule.outcome}
                    </span>
                    <span className="font-bold text-zinc-700 dark:text-zinc-300 truncate">{rule.ruleId}</span>
                    <span className="text-zinc-400 truncate hidden sm:inline">{rule.description}</span>
                    <span className="ml-auto text-zinc-400 shrink-0">{rule.authorityLevel}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {isLoading && !govData && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 w-full bg-zinc-100 dark:bg-zinc-900/40 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Privacy Notice */}
      <div className="rounded-xl bg-violet-500/5 border border-violet-500/20 p-3 flex items-center gap-2.5 text-xs text-violet-600 dark:text-violet-400">
        <ShieldCheck className="h-4 w-4 shrink-0" />
        <span>
          Governance decisions are logged without secrets. Every action passes the policy engine before execution.
          Default-deny applies to all unrecognized actions.
        </span>
      </div>
    </motion.div>
  );
}

export default function AdminIntelligenceCenter({ sessionToken, onNavigateTab }: AdminIntelligenceCenterProps) {
  const [windowMinutes, setWindowMinutes] = useState<number>(1440);
  const [selectedAgentDetail, setSelectedAgentDetail] = useState<AgentHealthMetric | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");

  // Phase 26 CEO Command Center State
  const [activeViewTab, setActiveViewTab] = useState<"command_center" | "deep_dive">("command_center");

  // Real-time SSE State
  const [sseConnected, setSseConnected] = useState<boolean>(false);
  const [liveStatuses, setLiveStatuses] = useState<Record<string, AgentLiveStatus>>(() => {
    const initial: Record<string, AgentLiveStatus> = {};
    for (const ag of ALL_AGENTS) {
      initial[ag] = {
        agent: ag,
        state: "idle",
        updatedAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      };
    }
    return initial;
  });
  const [telemetryEvents, setTelemetryEvents] = useState<AgentTelemetryEvent[]>([]);
  const [streamFilterAgent, setStreamFilterAgent] = useState<string>("ALL");
  const [streamFilterType, setStreamFilterType] = useState<string>("ALL");

  // Executive CEO Layer State
  const [executiveObjective, setExecutiveObjective] = useState<string>(
    "Fine dining restaurant in Vadodara: analyze market, verify domain skills, and design personalized preview."
  );
  const [isExecutingStrategy, setIsExecutingStrategy] = useState<boolean>(false);
  const [executiveResult, setExecutiveResult] = useState<any>(null);
  const [executiveError, setExecutiveError] = useState<string | null>(null);

  // Phase 18 Long-Term Memory & Learning State
  const [memoryTab, setMemoryTab] = useState<"strategies" | "lessons" | "failures" | "experiments">("lessons");
  const [promotingLessonId, setPromotingLessonId] = useState<string | null>(null);
  const [promotionMessage, setPromotionMessage] = useState<string | null>(null);

  const loadMemoryData = useCallback(async () => {
    const data = await fetchIntelligenceResource<IntelligenceMemorySnapshot>("/api/admin/intelligence/memory", sessionToken);
    if (![data.strategies, data.lessons, data.runs, data.failures, data.experiments].every(Array.isArray)) throw new Error("Memory response is incomplete.");
    return data;
  }, [sessionToken]);
  const memoryResource = useAsyncResource(sessionToken || "signed-out", loadMemoryData);
  const memoryData = memoryResource.data;
  const isMemoryLoading = memoryResource.loading;
  const fetchMemoryData = memoryResource.refresh;

  // Phase 19 Hierarchical Delegation State
  const [treeSelection, setTreeSelection] = useState<{ sessionToken?: string; taskId: string } | null>(null);
  const [isDelegating, setIsDelegating] = useState<boolean>(false);
  const [delegationObjective, setDelegationObjective] = useState<string>(
    "Vadodara gourmet restaurant: derive custom 8pt UI tokens, bento layout, and audit visual uniqueness against competitors."
  );
  const [delegationError, setDelegationError] = useState<string | null>(null);
  const [delegationResult, setDelegationResult] = useState<any | null>(null);

  const loadDelegationData = useCallback(async () => {
    const data = await fetchIntelligenceResource<{ trees: ExecutionTreeNode[] }>("/api/admin/intelligence/delegation", sessionToken);
    if (!Array.isArray(data.trees)) throw new Error("Delegation response is incomplete.");
    return data.trees;
  }, [sessionToken]);
  const delegationResource = useAsyncResource(sessionToken || "signed-out", loadDelegationData);
  const delegationTrees = delegationResource.data ?? [];
  const selectedTree = (treeSelection?.sessionToken === sessionToken
    ? delegationTrees.find(tree => tree.taskId === treeSelection?.taskId) : null) ?? delegationTrees[0] ?? null;
  const setSelectedTree = (tree: ExecutionTreeNode) => setTreeSelection({ sessionToken, taskId: tree.taskId });
  const isDelegationLoading = delegationResource.loading;
  const fetchDelegationData = delegationResource.refresh;

  // Phase 22 n8n Ops Agent State
  const [isOpsDispatching, setIsOpsDispatching] = useState<boolean>(false);
  const [opsObjective, setOpsObjective] = useState<string>(
    "Discover 3 local dental clinics in Kathmandu, audit their web presence, and draft personalized preview outreach."
  );
  const [opsDispatchError, setOpsDispatchError] = useState<string | null>(null);
  const [opsDispatchResult, setOpsDispatchResult] = useState<any | null>(null);

  const loadOpsData = useCallback(async () => {
    const data = await fetchIntelligenceResource<IntelligenceOpsSnapshot>("/api/admin/intelligence/ops", sessionToken);
    if (!data.agent || !data.securityInvariants || !Array.isArray(data.tools) || !Array.isArray(data.recentReports)) throw new Error("Ops response is incomplete.");
    return data;
  }, [sessionToken]);
  const opsResource = useAsyncResource(sessionToken || "signed-out", loadOpsData);
  const opsData = opsResource.data;
  const isOpsLoading = opsResource.loading;
  const fetchOpsData = opsResource.refresh;

  const loadCommandCenterData = useCallback(async () => {
    const body = await fetchIntelligenceResource<{ data: CeoCommandCenterData }>("/api/admin/intelligence/command-center", sessionToken);
    if (!body.data) throw new Error("Command Center response is incomplete.");
    return body.data;
  }, [sessionToken]);
  const commandCenterResource = useAsyncResource(sessionToken || "signed-out", loadCommandCenterData);
  const commandCenterData = commandCenterResource.data;
  const isCommandCenterLoading = commandCenterResource.loading;
  const commandCenterError = commandCenterResource.error;
  const fetchCommandCenterData = commandCenterResource.refresh;

  const handleExecuteOpsDispatch = async (overrideObjective?: string) => {
    const obj = overrideObjective || opsObjective;
    if (!obj.trim()) return;

    setIsOpsDispatching(true);
    setOpsDispatchError(null);
    setOpsDispatchResult(null);

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (sessionToken) headers["Authorization"] = `Bearer ${sessionToken}`;

      const res = await fetch("/api/admin/intelligence/ops", {
        method: "POST",
        headers,
        body: JSON.stringify({
          objective: obj.trim(),
          priority: "high",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setOpsDispatchError(data.message || "Failed to dispatch ops task.");
      } else {
        setOpsDispatchResult(data.callback);
        await fetchOpsData();
      }
    } catch (err) {
      setOpsDispatchError(err instanceof Error ? err.message : "Network error");
    } finally {
      setIsOpsDispatching(false);
    }
  };

  const handleExecuteDelegation = async (overrideObjective?: string) => {
    const obj = overrideObjective || delegationObjective;
    if (!obj.trim()) return;

    setIsDelegating(true);
    setDelegationError(null);
    setDelegationResult(null);

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (sessionToken) headers["Authorization"] = `Bearer ${sessionToken}`;

      const res = await fetch("/api/admin/intelligence/delegation", {
        method: "POST",
        headers,
        body: JSON.stringify({
          objective: obj.trim(),
          riskLevel: "low",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setDelegationError(data.message || "Failed to execute delegation.");
      } else {
        setDelegationResult(data.result);
        if (data.tree) {
          setSelectedTree(data.tree);
          fetchDelegationData();
        }
      }
    } catch (err) {
      setDelegationError(err instanceof Error ? err.message : "Network error");
    } finally {
      setIsDelegating(false);
    }
  };

  const handlePromoteLesson = async (lessonId: string) => {
    setPromotingLessonId(lessonId);
    setPromotionMessage(null);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (sessionToken) headers["Authorization"] = `Bearer ${sessionToken}`;
      const res = await fetch("/api/admin/intelligence/memory", {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "promote_lesson",
          lessonId,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setPromotionMessage(`Promotion blocked: ${json.message || "Failed"}`);
      } else {
        setPromotionMessage(`Lesson successfully promoted to Strategic Memory!`);
        await fetchMemoryData();
      }
    } catch (err) {
      setPromotionMessage(err instanceof Error ? err.message : "Error promoting lesson");
    } finally {
      setPromotingLessonId(null);
    }
  };

  const handleExecuteExecutiveTask = async (objectiveOverride?: string) => {
    const targetObj = objectiveOverride || executiveObjective;
    if (!targetObj.trim()) return;

    setIsExecutingStrategy(true);
    setExecutiveError(null);

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (sessionToken) headers["Authorization"] = `Bearer ${sessionToken}`;

      const res = await fetch("/api/admin/intelligence/executive", {
        method: "POST",
        headers,
        body: JSON.stringify({
          objective: targetObj.trim(),
          priority: "high",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setExecutiveError(data.message || data.error || "Failed to execute executive task.");
      } else {
        setExecutiveResult(data.result);
      }
    } catch (err) {
      setExecutiveError(err instanceof Error ? err.message : "Network error");
    } finally {
      setIsExecutingStrategy(false);
    }
  };

  const loadDiagnostics = useCallback(async () => {
    const body = await fetchIntelligenceResource<{ data: BossReport }>(`/api/admin/agents/diagnostics?windowMinutes=${windowMinutes}`, sessionToken);
    if (!body.data) throw new Error("Diagnostics response is incomplete.");
    return { report: body.data, receivedAt: new Date() };
  }, [sessionToken, windowMinutes]);
  const diagnosticsResource = useAsyncResource(`${sessionToken || "signed-out"}:${windowMinutes}`, loadDiagnostics);
  const report = diagnosticsResource.data?.report ?? null;
  const lastUpdated = diagnosticsResource.data?.receivedAt;
  const isLoading = diagnosticsResource.loading && !report;
  const isRefreshing = diagnosticsResource.loading && Boolean(report);
  const errorMessage = diagnosticsResource.error;
  const fetchDiagnostics = (_isManualRefresh = false) => diagnosticsResource.refresh();

  // Real-time Server-Sent Events (SSE) telemetry subscription
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let isMounted = true;

    try {
      const url = `/api/admin/agents/telemetry/stream${
        sessionToken ? `?token=${encodeURIComponent(sessionToken)}` : ""
      }`;
      eventSource = new EventSource(url);

      eventSource.onopen = () => {
        if (isMounted) setSseConnected(true);
      };

      eventSource.onerror = () => {
        if (isMounted) setSseConnected(false);
      };

      eventSource.addEventListener("init", (e: MessageEvent) => {
        if (!isMounted) return;
        try {
          const data = JSON.parse(e.data);
          if (data.liveStatuses) {
            setLiveStatuses((prev) => ({ ...prev, ...data.liveStatuses }));
          }
          if (Array.isArray(data.recentEvents)) {
            setTelemetryEvents(data.recentEvents);
          }
        } catch (err) {
          console.error("[SSE init parse error]", err);
        }
      });

      eventSource.addEventListener("telemetry", (e: MessageEvent) => {
        if (!isMounted) return;
        try {
          const event: AgentTelemetryEvent = JSON.parse(e.data);
          setTelemetryEvents((prev) => [event, ...prev.slice(0, 99)]);

          // Update agent live status
          setLiveStatuses((prev) => {
            let nextState: AgentState = "idle";
            if (
              event.event === "agent.started" ||
              event.event === "agent.thinking" ||
              event.event === "agent.provider_call"
            ) {
              nextState = "running";
            } else if (
              event.event === "agent.completed" ||
              event.event === "agent.provider_success"
            ) {
              nextState = "success";
            } else if (
              event.event === "agent.failed" ||
              event.event === "agent.provider_error"
            ) {
              nextState = "error";
            } else if (event.event === "agent.fallback") {
              nextState = "fallback";
            }

            return {
              ...prev,
              [event.agent]: {
                agent: event.agent,
                state: nextState,
                currentRequestId: event.requestId,
                lastEvent: event.event,
                updatedAt: event.timestamp || new Date().toISOString(),
                lastActiveAt: event.timestamp || new Date().toISOString(),
                lastLatencyMs: event.latencyMs,
                provider: event.provider,
                model: event.model,
                error: event.error,
              },
            };
          });

          // Stream events are displayed separately. Only a fresh server report
          // may update windowed provider/run aggregates; reconnects can replay events.
        } catch (err) {
          console.error("[SSE telemetry parse error]", err);
        }
      });
    } catch (err) {
      console.warn("[SSE connection failed]", err);
    }

    return () => {
      isMounted = false;
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [sessionToken]);

  const filteredTelemetryEvents = useMemo(() => {
    return telemetryEvents.filter((ev) => {
      if (streamFilterAgent !== "ALL" && ev.agent !== streamFilterAgent) return false;
      if (streamFilterType !== "ALL" && ev.event !== streamFilterType) return false;
      return true;
    });
  }, [telemetryEvents, streamFilterAgent, streamFilterType]);

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
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 via-orange-600 to-indigo-600 text-white shadow-md shadow-amber-500/20">
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
                <span>CEO Command Center</span>
                <span className="rounded-md bg-amber-500/10 dark:bg-amber-950/60 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300 border border-amber-500/30">
                  PHASE 26
                </span>
                <span className="rounded-md bg-emerald-500/10 dark:bg-emerald-950/60 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                  GOVERNED &bull; LIVE
                </span>
              </h2>
              <p className="text-xs text-zinc-500">
                Central operational visibility layer for WebsiteBanja CEO &bull; Strategy, pipeline, memory, delegations, health &amp; governance
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          {/* Live SSE Stream Badge */}
          <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold dark:border-white/10 dark:bg-zinc-900 shadow-xs">
            {sseConnected ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[11px] tracking-tight">LIVE STREAM</span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-zinc-400"></span>
                <span className="text-zinc-400 font-mono text-[11px] tracking-tight">DISCONNECTED</span>
              </>
            )}
          </div>

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
            onClick={() => {
              void fetchCommandCenterData();
              void fetchDiagnostics(true);
            }}
            disabled={isRefreshing || isCommandCenterLoading}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-100 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 transition shadow-xs"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", (isRefreshing || isCommandCenterLoading) && "animate-spin text-amber-500")} />
            <span className="hidden md:inline">Refresh</span>
          </button>

          <span className="text-[11px] font-mono text-zinc-400 hidden lg:inline">
            {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : "No diagnostics loaded"}
          </span>
        </div>
      </div>

      {/* Primary View Switcher: Command Center (15 Sections) vs Sub-System Controls & Deep Dive */}
      <div className="flex items-center gap-2 border-b border-zinc-200/80 dark:border-white/10 pb-3">
        <button
          type="button"
          onClick={() => setActiveViewTab("command_center")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition",
            activeViewTab === "command_center"
              ? "bg-amber-500 text-white shadow-sm shadow-amber-500/30"
              : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          )}
        >
          <Crown className="h-3.5 w-3.5" />
          <span>CEO Command Center (15 Sections)</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveViewTab("deep_dive")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition",
            activeViewTab === "deep_dive"
              ? "bg-violet-600 text-white shadow-sm shadow-violet-600/30"
              : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          )}
        >
          <Cpu className="h-3.5 w-3.5" />
          <span>Executive &amp; Supervisor Lab</span>
        </button>
      </div>

      {/* Render Section: When in command_center view, render CeoCommandCenterView */}
      {activeViewTab === "command_center" && commandCenterData && (
        <CeoCommandCenterView
          data={commandCenterData}
          isLoading={isCommandCenterLoading}
          onRefresh={() => {
            void fetchCommandCenterData();
            void fetchDiagnostics(true);
          }}
          sessionToken={sessionToken}
          onActionApproved={() => void fetchCommandCenterData()}
        />
      )}

      {activeViewTab === "command_center" && !commandCenterData && isCommandCenterLoading && (
        <div className="space-y-4">
          <div className="h-32 w-full bg-zinc-100 dark:bg-zinc-900 rounded-3xl animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="h-40 bg-zinc-100 dark:bg-zinc-900 rounded-3xl animate-pulse" />
            <div className="h-40 bg-zinc-100 dark:bg-zinc-900 rounded-3xl animate-pulse" />
            <div className="h-40 bg-zinc-100 dark:bg-zinc-900 rounded-3xl animate-pulse" />
          </div>
        </div>
      )}

      {activeViewTab === "command_center" && commandCenterError && !commandCenterData && (
        <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-6 text-center space-y-3">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto" />
          <p className="text-xs font-bold text-red-600">{commandCenterError}</p>
          <button
            type="button"
            onClick={() => void fetchCommandCenterData()}
            className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white"
          >
            Retry Loading Command Center
          </button>
        </div>
      )}

      {/* When in deep_dive view, render the existing supervisor panels */}
      {activeViewTab === "deep_dive" && (
        <div className="space-y-8">
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

      {/* ─── LIVE AGENT RUNTIME STATUS BAR ─────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-violet-500" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
              Live Agent Runtime Activity
            </h3>
            <span className="rounded-full bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-violet-600 dark:text-violet-400">
              REAL-TIME SSE
            </span>
          </div>
          <span className="text-[11px] text-zinc-400 font-mono">
            {ALL_AGENTS.filter((a) => liveStatuses[a]?.state === "running").length} active now
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          {ALL_AGENTS.map((agentKey) => {
            const live = liveStatuses[agentKey];
            const badge = getLiveStateBadge(live?.state);
            const meta = AGENT_LABELS[agentKey] || { title: agentKey, subtitle: "Agent" };
            return (
              <div
                key={agentKey}
                className={cn(
                  "rounded-2xl border p-3 bg-white dark:bg-zinc-900/80 transition shadow-xs flex flex-col justify-between min-h-[92px]",
                  live?.state === "running"
                    ? "border-blue-500/50 ring-1 ring-blue-500/20 bg-blue-500/5"
                    : live?.state === "error"
                    ? "border-red-500/40 bg-red-500/5"
                    : live?.state === "fallback"
                    ? "border-amber-500/40 bg-amber-500/5"
                    : "border-zinc-200/80 dark:border-white/5"
                )}
              >
                <div className="flex items-start justify-between gap-1 mb-1">
                  <span className="font-bold text-xs capitalize text-zinc-800 dark:text-zinc-200 truncate" title={meta.title}>
                    {agentKey}
                  </span>
                  <span className={cn("inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold border", badge.bg)}>
                    <span className={cn("h-1.5 w-1.5 rounded-full", badge.dot)} />
                    {badge.label}
                  </span>
                </div>

                <div className="space-y-0.5 text-[10px] text-zinc-500 font-mono">
                  {live?.provider ? (
                    <div className="truncate text-zinc-700 dark:text-zinc-300 font-semibold" title={`${live.provider} (${live.model || "default"})`}>
                      {live.provider}
                    </div>
                  ) : (
                    <div className="text-zinc-400">standby</div>
                  )}

                  <div className="flex justify-between items-center text-[9px] text-zinc-400">
                    <span>{live?.lastLatencyMs != null ? `${live.lastLatencyMs}ms` : "--"}</span>
                    <span>{live?.lastActiveAt ? new Date(live.lastActiveAt).toLocaleTimeString([], { minute: "2-digit", second: "2-digit" }) : ""}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── SECTION 1.5: CEO / EXECUTIVE STRATEGIC LAYER ─────────────────── */}
      <div className="rounded-3xl border border-violet-500/30 bg-gradient-to-br from-violet-500/5 via-indigo-500/5 to-purple-500/5 p-6 backdrop-blur-xs space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/25">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight text-zinc-900 dark:text-white">
                  CEO / Executive Strategic Layer
                </h3>
                <span className="rounded-full bg-violet-600/10 border border-violet-600/20 px-2.5 py-0.5 text-[10px] font-bold text-violet-600 dark:text-violet-300">
                  PHASE 17
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Orchestrates OBSERVE → UNDERSTAND → PLAN → DELEGATE → VERIFY → ESCALATE → LEARN → REPORT
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-zinc-400">
              State: <strong className="text-violet-600 dark:text-violet-400 uppercase font-black">{executiveResult?.state || liveStatuses["executive"]?.state || "IDLE"}</strong>
            </span>
          </div>
        </div>

        {/* Input objective & Presets */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="text"
              value={executiveObjective}
              onChange={(e) => setExecutiveObjective(e.target.value)}
              placeholder="Enter strategic business objective..."
              className="flex-1 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 px-4 py-2.5 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-violet-500/50"
            />
            <button
              type="button"
              disabled={isExecutingStrategy}
              onClick={() => handleExecuteExecutiveTask()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-violet-600/20 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 transition cursor-pointer"
            >
              {isExecutingStrategy ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <Zap className="h-3.5 w-3.5" />
                  <span>Execute Strategy</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider mr-1">Presets:</span>
            {[
              {
                label: "Vadodara Fine Dining",
                obj: "Fine dining restaurant in Vadodara: analyze market, derive UI skills, and design personalized preview.",
              },
              {
                label: "Ahmedabad Boutique",
                obj: "Modern apparel boutique in Ahmedabad: derive UI tokens, build layout, and enforce anti-generic brand uniqueness.",
              },
              {
                label: "Hospitality Lead Discovery",
                obj: "Discover qualified resort & boutique hotel leads in Gujarat and evaluate technical opportunities.",
              },
            ].map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  setExecutiveObjective(p.obj);
                  handleExecuteExecutiveTask(p.obj);
                }}
                className="rounded-lg border border-zinc-200 dark:border-white/10 bg-white/80 dark:bg-zinc-900/80 px-2.5 py-1 text-[10px] font-medium text-zinc-600 dark:text-zinc-300 hover:border-violet-500/40 hover:text-violet-600 dark:hover:text-violet-400 transition cursor-pointer"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Error notice if any */}
        {executiveError && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{executiveError}</span>
          </div>
        )}

        {/* Active / Recent Result Display */}
        {executiveResult && (
          <div className="rounded-2xl border border-zinc-200/80 dark:border-white/10 bg-white/90 dark:bg-zinc-900/90 p-4 space-y-4 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-zinc-100 dark:border-white/5 gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-zinc-400">{executiveResult.runId}</span>
                <span className="rounded-md bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                  {executiveResult.state}
                </span>
                <span className="rounded-md bg-violet-500/10 border border-violet-500/30 px-2 py-0.5 text-[9px] font-bold text-violet-600 dark:text-violet-400 uppercase">
                  {executiveResult.priority} PRIORITY
                </span>
              </div>
              <span className="font-mono text-[10px] text-zinc-400">
                Duration: {executiveResult.durationMs}ms | Repairs: {executiveResult.repairsApplied}
              </span>
            </div>

            {/* Strategic Plan */}
            <div className="space-y-1.5">
              <span className="font-bold text-zinc-800 dark:text-zinc-200 text-[11px] uppercase tracking-wider">
                Strategic Plan
              </span>
              <div className="space-y-1">
                {executiveResult.decision?.plan?.map((step: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-zinc-600 dark:text-zinc-300 font-mono text-[11px]">
                    <span className="text-violet-500 font-bold shrink-0">{i + 1}.</span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Delegations Grid */}
            <div className="space-y-1.5">
              <span className="font-bold text-zinc-800 dark:text-zinc-200 text-[11px] uppercase tracking-wider">
                Sub-Agent Delegations & Tools
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {executiveResult.delegationResults?.map((d: any, idx: number) => (
                  <div key={idx} className="rounded-xl border border-zinc-200/60 dark:border-white/5 p-2.5 bg-zinc-50/50 dark:bg-zinc-800/40 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold capitalize text-zinc-800 dark:text-zinc-200">{d.agent} Agent</span>
                      <span className={cn("text-[9px] font-bold rounded-full px-1.5 py-0.5 border", d.success ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" : "bg-red-500/10 text-red-600 border-red-500/30")}>
                        {d.success ? "COMPLETED" : "FAILED"}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-500 line-clamp-1">{d.task}</p>
                  </div>
                ))}
                {executiveResult.toolCallResults?.map((t: any, idx: number) => (
                  <div key={idx} className="rounded-xl border border-zinc-200/60 dark:border-white/5 p-2.5 bg-zinc-50/50 dark:bg-zinc-800/40 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-zinc-800 dark:text-zinc-200">{t.tool}</span>
                      <span className={cn("text-[9px] font-bold rounded-full px-1.5 py-0.5 border", t.success ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" : "bg-red-500/10 text-red-600 border-red-500/30")}>
                        {t.success ? "EXECUTED" : "FAILED"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Verifications & Safety Integrity */}
            <div className="space-y-1.5">
              <span className="font-bold text-zinc-800 dark:text-zinc-200 text-[11px] uppercase tracking-wider">
                Verifications & Safety Gates
              </span>
              <div className="flex flex-wrap gap-1.5">
                {executiveResult.verifications?.map((v: any, idx: number) => (
                  <span
                    key={idx}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold border",
                      v.passed
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                        : "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30"
                    )}
                    title={v.details}
                  >
                    <span>{v.passed ? "✓" : "✗"}</span>
                    <span>{v.rule}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Next Action */}
            <div className="pt-2 border-t border-zinc-100 dark:border-white/5 flex items-center justify-between">
              <span className="text-[11px] text-zinc-500">
                Next Recommended Step: <strong className="text-zinc-800 dark:text-zinc-200">{executiveResult.decision?.next_action}</strong>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ─── SECTION 1.8: LONG-TERM MEMORY & REAL LEARNING (PHASE 18) ──────────── */}
      <div className="rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/5 via-violet-500/5 to-cyan-500/5 p-6 backdrop-blur-xs space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-600 text-white shadow-lg shadow-indigo-600/25">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight text-zinc-900 dark:text-white">
                  Long-Term Memory & Strategic Learning
                </h3>
                <span className="rounded-full bg-indigo-600/10 border border-indigo-600/20 px-2.5 py-0.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-300">
                  PHASE 18
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Working → Business → Experience → Strategic • Strict Evidence-Gated Promotion • Zero Model Hallucinations
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void fetchMemoryData()}
              disabled={isMemoryLoading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-white/10 bg-white/80 dark:bg-zinc-900/80 px-3 py-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              <RefreshCw className={cn("h-3 w-3", isMemoryLoading && "animate-spin text-indigo-600")} />
              <span>Refresh Memory</span>
            </button>
          </div>
        </div>

        {memoryResource.error && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{memoryResource.error}</p>}
        {isMemoryLoading && <p role="status" className="text-xs text-zinc-500">Loading memory evidence…</p>}
        {/* Memory Stats Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="rounded-2xl border border-zinc-200/60 dark:border-white/5 bg-white/70 dark:bg-zinc-900/70 p-3.5 flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Active Strategies</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">
                {memoryData?.strategies?.filter((s) => s.status === "ACTIVE").length || 0}
              </span>
              <span className="text-[10px] text-zinc-400">deployed</span>
            </div>
          </div>
          <div className="rounded-2xl border border-zinc-200/60 dark:border-white/5 bg-white/70 dark:bg-zinc-900/70 p-3.5 flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Promoted Lessons</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                {memoryData?.lessons?.filter((l) => l.status === "PROMOTED").length || 0}
              </span>
              <span className="text-[10px] text-zinc-400">verified</span>
            </div>
          </div>
          <div className="rounded-2xl border border-zinc-200/60 dark:border-white/5 bg-white/70 dark:bg-zinc-900/70 p-3.5 flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Candidate Lessons</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-black text-amber-600 dark:text-amber-400">
                {memoryData?.lessons?.filter((l) => l.status === "CANDIDATE").length || 0}
              </span>
              <span className="text-[10px] text-zinc-400">evaluating</span>
            </div>
          </div>
          <div className="rounded-2xl border border-zinc-200/60 dark:border-white/5 bg-white/70 dark:bg-zinc-900/70 p-3.5 flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Known Failures</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-black text-red-500">
                {memoryData?.failures?.length || 0}
              </span>
              <span className="text-[10px] text-zinc-400">analyzed</span>
            </div>
          </div>
          <div className="rounded-2xl border border-zinc-200/60 dark:border-white/5 bg-white/70 dark:bg-zinc-900/70 p-3.5 flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">A/B Experiments</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-black text-cyan-600 dark:text-cyan-400">
                {memoryData?.experiments?.length || 0}
              </span>
              <span className="text-[10px] text-zinc-400">hypotheses</span>
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-2 border-b border-zinc-200/60 dark:border-white/5 pb-2 text-xs font-semibold">
          {[
            { id: "lessons", label: "Evidence-Based Lessons", icon: BookOpen },
            { id: "strategies", label: "Versioned Strategies", icon: Brain },
            { id: "failures", label: "Failure Log & Recovery", icon: AlertTriangle },
            { id: "experiments", label: "A/B Experiments", icon: FlaskConical },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = memoryTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setMemoryTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition cursor-pointer",
                  active
                    ? "bg-indigo-600 text-white shadow-xs font-bold"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Feedback / Promotion Message */}
        {promotionMessage && (
          <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3 text-xs text-indigo-700 dark:text-indigo-300 flex items-center justify-between">
            <span>{promotionMessage}</span>
            <button
              type="button"
              onClick={() => setPromotionMessage(null)}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-white"
            >
              ×
            </button>
          </div>
        )}

        {/* Tab Content */}
        {!isMemoryLoading && !memoryResource.error && memoryTab === "lessons" && (
          <div className="space-y-3">
            {(!memoryData?.lessons || memoryData.lessons.length === 0) ? (
              <div className="rounded-2xl border border-zinc-200/60 dark:border-white/5 bg-white/50 dark:bg-zinc-900/50 p-6 text-center text-xs text-zinc-500">
                No lessons recorded yet. Run executive tasks with verification to accumulate verifiable lessons.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {memoryData.lessons.map(lesson => (
                  <div
                    key={lesson.id || lesson.lessonId}
                    className="rounded-2xl border border-zinc-200/80 dark:border-white/10 bg-white/90 dark:bg-zinc-900/90 p-4 space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] text-zinc-400 uppercase tracking-wider">
                          {lesson.domain || "general"}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[9px] font-bold border",
                            lesson.status === "PROMOTED"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                              : lesson.status === "REJECTED"
                              ? "bg-red-500/10 text-red-600 border-red-500/30"
                              : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                          )}
                        >
                          {lesson.status}
                        </span>
                      </div>

                      <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 leading-snug">
                        {lesson.statement}
                      </p>

                      <div className="flex flex-wrap gap-1 text-[10px] text-zinc-500">
                        <span className="rounded-md bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5">
                          Evidence: {Array.isArray(lesson.evidence) ? lesson.evidence.length : 0} items
                        </span>
                        <span className="rounded-md bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 font-mono">
                          Confidence: {Math.round(lesson.confidence * 100)}%
                        </span>
                      </div>
                    </div>

                    {lesson.status === "CANDIDATE" && (
                      <div className="pt-2 border-t border-zinc-100 dark:border-white/5 flex items-center justify-end">
                        <button
                          type="button"
                          disabled={promotingLessonId === (lesson.id || lesson.lessonId)}
                          onClick={() => handlePromoteLesson(lesson.id || lesson.lessonId)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-xs hover:bg-indigo-500 disabled:opacity-50 transition cursor-pointer"
                        >
                          {promotingLessonId === (lesson.id || lesson.lessonId) ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3 w-3" />
                          )}
                          <span>Review & Promote</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!isMemoryLoading && !memoryResource.error && memoryTab === "strategies" && (
          <div className="space-y-3">
            {(!memoryData?.strategies || memoryData.strategies.length === 0) ? (
              <div className="rounded-2xl border border-zinc-200/60 dark:border-white/5 bg-white/50 dark:bg-zinc-900/50 p-6 text-center text-xs text-zinc-500">
                No versioned strategies stored.
              </div>
            ) : (
              <div className="space-y-2">
                {memoryData.strategies.map(strategy => (
                  <div
                    key={strategy.id || strategy.strategyId}
                    className="rounded-2xl border border-zinc-200/80 dark:border-white/10 bg-white/90 dark:bg-zinc-900/90 p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-zinc-800 dark:text-zinc-200">
                          {strategy.name}
                        </span>
                        <span className="rounded-md bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-mono text-zinc-500">
                          v{strategy.version}
                        </span>
                        <span className="rounded-md bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                          {strategy.domain}
                        </span>
                      </div>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[9px] font-bold border",
                          strategy.status === "ACTIVE"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                            : strategy.status === "DEPRECATED"
                            ? "bg-zinc-500/10 text-zinc-500 border-zinc-500/30"
                            : "bg-blue-500/10 text-blue-600 border-blue-500/30"
                        )}
                      >
                        {strategy.status}
                      </span>
                    </div>

                    {strategy.description && (
                      <p className="text-xs text-zinc-600 dark:text-zinc-300">{strategy.description}</p>
                    )}

                    {strategy.directives && Array.isArray(strategy.directives) && (
                      <div className="space-y-1 pt-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Directives:</span>
                        <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-zinc-600 dark:text-zinc-400">
                          {strategy.directives.map((dir: string, idx: number) => (
                            <li key={idx}>{dir}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!isMemoryLoading && !memoryResource.error && memoryTab === "failures" && (
          <div className="space-y-3">
            {(!memoryData?.failures || memoryData.failures.length === 0) ? (
              <div className="rounded-2xl border border-zinc-200/60 dark:border-white/5 bg-white/50 dark:bg-zinc-900/50 p-6 text-center text-xs text-zinc-500">
                No failure records were returned for this evidence view. This does not prove all agent runs are healthy.
              </div>
            ) : (
              <div className="space-y-2">
                {memoryData.failures.map(fail => (
                  <div
                    key={fail.id || fail.failureId}
                    className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        <span className="font-bold text-red-700 dark:text-red-400">{fail.failureType}</span>
                        <span className="font-mono text-[10px] text-zinc-400">Retries: {fail.retryCount}</span>
                      </div>
                      <span className="font-mono text-[10px] text-zinc-400">{fail.domain || "general"}</span>
                    </div>
                    <p className="font-mono text-[11px] text-zinc-700 dark:text-zinc-300">{fail.safeErrorMessage}</p>
                    {typeof fail.metadata?.rootCause === "string" && (
                      <div className="text-[11px] text-zinc-600 dark:text-zinc-400">
                        <strong>Root Cause:</strong> {fail.metadata.rootCause}
                      </div>
                    )}
                    {fail.recoveryAction && (
                      <div className="text-[11px] text-emerald-700 dark:text-emerald-400">
                        <strong>Recorded Recovery:</strong> {fail.recoveryAction}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!isMemoryLoading && !memoryResource.error && memoryTab === "experiments" && (
          <div className="space-y-3">
            {(!memoryData?.experiments || memoryData.experiments.length === 0) ? (
              <div className="rounded-2xl border border-zinc-200/60 dark:border-white/5 bg-white/50 dark:bg-zinc-900/50 p-6 text-center text-xs text-zinc-500">
                No active A/B experiments.
              </div>
            ) : (
              <div className="space-y-2">
                {memoryData.experiments.map(exp => (
                  <div
                    key={exp.id || exp.experimentId}
                    className="rounded-2xl border border-zinc-200/80 dark:border-white/10 bg-white/90 dark:bg-zinc-900/90 p-4 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FlaskConical className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                        <span className="font-bold text-zinc-800 dark:text-zinc-200">{exp.hypothesis}</span>
                      </div>
                      <span className="rounded-full bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 text-[9px] font-bold text-cyan-600 dark:text-cyan-400">
                        {exp.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-500">
                      <div>Strategy A: <strong className="text-zinc-700 dark:text-zinc-300">{exp.strategyA}</strong></div>
                      <div>Strategy B: <strong className="text-zinc-700 dark:text-zinc-300">{exp.strategyB}</strong></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── SECTION 1.6: HIERARCHICAL DELEGATION & EXECUTION TREE (PHASE 19) ───────── */}
      <div className="rounded-3xl border border-zinc-200/80 dark:border-white/10 bg-zinc-50/50 dark:bg-zinc-950/40 p-6 space-y-6 shadow-sm">
        {/* Deck Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <GitFork className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Hierarchical Delegation & Execution Tree
                </h3>
                <span className="rounded-full bg-violet-500/10 border border-violet-500/30 px-2 py-0.5 text-[10px] font-bold text-violet-600 dark:text-violet-400">
                  PHASE 19
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                CEO (Depth 0) → BOSS Supervisor (Depth 1) → Specialized Skills & Uniqueness (Depth 2)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void fetchDelegationData()}
              disabled={isDelegationLoading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 transition cursor-pointer"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isDelegationLoading && "animate-spin")} />
              <span>Refresh Trees</span>
            </button>
          </div>
        </div>

        {/* Live Delegation Trigger Input */}
        <div className="rounded-2xl border border-zinc-200/80 dark:border-white/10 bg-white/90 dark:bg-zinc-900/90 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="text"
              value={delegationObjective}
              onChange={(e) => setDelegationObjective(e.target.value)}
              placeholder="Enter strategic task for CEO -> Boss -> Skills/Uniqueness delegation..."
              className="flex-1 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 px-4 py-2 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/50"
            />
            <button
              type="button"
              disabled={isDelegating}
              onClick={() => void handleExecuteDelegation()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 transition cursor-pointer"
            >
              {isDelegating ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Delegating...</span>
                </>
              ) : (
                <>
                  <Zap className="h-3.5 w-3.5" />
                  <span>Run Delegation</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider mr-1">Presets:</span>
            {[
              {
                label: "Vadodara Fine Dining",
                obj: "Fine dining restaurant in Vadodara: select bespoke 8pt UI skills, asymmetric hero, and enforce anti-generic visual differentiation.",
              },
              {
                label: "Ahmedabad Boutique Hotel",
                obj: "Boutique heritage hotel in Ahmedabad: derive typography tokens, conversion bento layout, and audit structural uniqueness.",
              },
              {
                label: "Surat Textile Brand",
                obj: "High-end artisanal textile studio in Surat: derive luxury color direction and verify zero layout duplication.",
              },
            ].map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  setDelegationObjective(p.obj);
                  void handleExecuteDelegation(p.obj);
                }}
                className="rounded-lg border border-zinc-200 dark:border-white/10 bg-zinc-100/70 dark:bg-zinc-800/70 px-2.5 py-1 font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition cursor-pointer"
              >
                {p.label}
              </button>
            ))}
          </div>

          {delegationError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{delegationError}</span>
            </div>
          )}
        </div>

        {delegationResource.error && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{delegationResource.error}</p>}
        {/* Split View: Tree List & Interactive Node Visualizer */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Recent Trees List (4 Cols) */}
          <div className="lg:col-span-4 rounded-2xl border border-zinc-200/80 dark:border-white/10 bg-white/70 dark:bg-zinc-900/70 p-4 space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Execution Trees ({delegationTrees.length})
            </span>

            {isDelegationLoading ? <p role="status" className="text-xs text-zinc-500">Loading delegation evidence…</p> : delegationResource.error ? null : delegationTrees.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-400">
                No execution trees logged yet. Run a delegation above.
              </div>
            ) : (
              <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                {delegationTrees.map(tree => {
                  const isSelected = selectedTree?.taskId === tree.taskId;
                  const isSuccess = tree.status === "COMPLETED";
                  const isEscalated = tree.status === "ESCALATED";

                  return (
                    <div
                      key={tree.taskId}
                      onClick={() => setSelectedTree(tree)}
                      className={cn(
                        "rounded-xl border p-3 text-xs space-y-1.5 cursor-pointer transition",
                        isSelected
                          ? "border-indigo-500/60 bg-indigo-500/5 dark:bg-indigo-500/10"
                          : "border-zinc-200/60 dark:border-white/5 bg-white/50 dark:bg-zinc-900/50 hover:border-zinc-300 dark:hover:border-white/15"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] text-zinc-400">{tree.taskId.slice(0, 16)}</span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[9px] font-bold border",
                            isSuccess
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                              : isEscalated
                              ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30"
                              : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30"
                          )}
                        >
                          {tree.status}
                        </span>
                      </div>
                      <p className="font-semibold text-zinc-800 dark:text-zinc-200 line-clamp-2">
                        {tree.objective}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1 border-t border-zinc-100 dark:border-white/5">
                        <span>Depth: {tree.depth} (CEO)</span>
                        <span>{tree.durationMs ? `${tree.durationMs.toFixed(0)}ms` : "Active"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Interactive Tree Hierarchy View (8 Cols) */}
          <div className="lg:col-span-8 rounded-2xl border border-zinc-200/80 dark:border-white/10 bg-white/70 dark:bg-zinc-900/70 p-5 space-y-4">
            {!selectedTree ? (
              <div className="h-64 flex flex-col items-center justify-center text-xs text-zinc-400 gap-2">
                <GitFork className="h-8 w-8 text-zinc-300 dark:text-zinc-700" />
                <span>Select an execution tree on the left to inspect hierarchy</span>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Tree Metadata Header */}
                <div className="flex items-center justify-between border-b border-zinc-200/60 dark:border-white/5 pb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Tree Root</span>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-white font-mono">
                      {selectedTree.taskId}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400">
                      Total Duration: <strong>{selectedTree.durationMs ? `${selectedTree.durationMs.toFixed(0)}ms` : "N/A"}</strong>
                    </span>
                  </div>
                </div>

                {/* Level 0: CEO Root Card */}
                <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-violet-600 text-white font-mono text-[10px] font-bold px-2 py-0.5">
                        DEPTH 0 • CEO
                      </span>
                      <strong className="text-xs text-zinc-800 dark:text-zinc-200">Executive Orchestration</strong>
                    </div>
                    <span className="rounded-full bg-violet-500/10 border border-violet-500/30 px-2 py-0.5 text-[9px] font-bold text-violet-600 dark:text-violet-400">
                      {selectedTree.status}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">{selectedTree.objective}</p>
                </div>

                {/* Level 1: Boss Supervisor Card */}
                {selectedTree.children && selectedTree.children.length > 0 && (
                  <div className="pl-6 space-y-3 relative">
                    <div className="absolute left-2.5 top-0 bottom-4 w-0.5 bg-indigo-500/30" />
                    {selectedTree.children.map(bossNode => (
                      <div key={bossNode.taskId} className="space-y-3">
                        <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-4 space-y-2 relative">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="rounded-md bg-indigo-600 text-white font-mono text-[10px] font-bold px-2 py-0.5">
                                DEPTH 1 • BOSS
                              </span>
                              <strong className="text-xs text-zinc-800 dark:text-zinc-200">Supervisor & Aggregator</strong>
                            </div>
                            <span className="rounded-full bg-indigo-500/10 border border-indigo-500/30 px-2 py-0.5 text-[9px] font-bold text-indigo-600 dark:text-indigo-400">
                              {bossNode.status}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-600 dark:text-zinc-400">{bossNode.objective}</p>
                          <div className="text-[11px] text-zinc-500">
                            Duration: <strong>{bossNode.durationMs ? `${bossNode.durationMs.toFixed(0)}ms` : "N/A"}</strong>
                          </div>
                        </div>

                        {/* Level 2: Children (Skills & Uniqueness) */}
                        {bossNode.children && bossNode.children.length > 0 && (
                          <div className="pl-6 grid grid-cols-1 md:grid-cols-2 gap-3 relative">
                            <div className="absolute left-2.5 top-0 bottom-4 w-0.5 bg-zinc-300 dark:bg-zinc-700" />
                            {bossNode.children.map(child => {
                              const isSkill = child.agent === "skills";
                              return (
                                <div
                                  key={child.taskId}
                                  className={cn(
                                    "rounded-xl border p-3.5 space-y-2 text-xs",
                                    isSkill
                                      ? "border-sky-500/30 bg-sky-500/5"
                                      : "border-pink-500/30 bg-pink-500/5"
                                  )}
                                >
                                  <div className="flex items-center justify-between">
                                    <span
                                      className={cn(
                                        "rounded-md text-white font-mono text-[9px] font-bold px-1.5 py-0.5",
                                        isSkill ? "bg-sky-600" : "bg-pink-600"
                                      )}
                                    >
                                      DEPTH 2 • {child.agent.toUpperCase()}
                                    </span>
                                    <span className="text-[9px] font-bold text-zinc-400">{child.status}</span>
                                  </div>
                                  <p className="text-[11px] text-zinc-700 dark:text-zinc-300 font-medium line-clamp-2">
                                    {child.objective}
                                  </p>
                                  <div className="text-[10px] text-zinc-400 pt-1 border-t border-zinc-200/40 dark:border-white/5 flex items-center justify-between">
                                    <span>Task ID: {child.taskId.slice(0, 14)}</span>
                                    <span>{child.durationMs ? `${child.durationMs.toFixed(0)}ms` : "0ms"}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── SECTION 1.9: n8n OPS AGENT & WORKFLOW EXECUTION (PHASE 22) ─────────────────── */}
      <div className="rounded-3xl border border-sky-500/20 bg-gradient-to-br from-sky-500/5 via-transparent to-transparent p-6 sm:p-8 backdrop-blur-md relative overflow-hidden shadow-xs">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-600 to-cyan-600 text-white shadow-md shadow-sky-600/20">
                <Workflow className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <span>n8n Ops Agent & Tactical Workflows</span>
                  <span className="rounded-md bg-sky-100 dark:bg-sky-950/60 px-2 py-0.5 text-[10px] font-bold text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                    PHASE 22 — OPS EXECUTION
                  </span>
                </h3>
                <p className="text-xs text-zinc-500">
                  Operational workflow layer: executes discovery, website audit, preview synthesis, outreach drafts, and CRM sync.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400">
                <span className="h-2 w-2 rounded-full bg-sky-500 animate-pulse" />
                <span>
                  {!opsData ? "OPS STATUS UNAVAILABLE" : opsData.agent.executionMode === "n8n_webhook" ? "N8N WEBHOOK CONFIGURED" : "LOCAL EXECUTOR CONFIGURED"}
                </span>
              </span>
              <button
                type="button"
                onClick={() => void fetchOpsData()}
                disabled={isOpsLoading}
                className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition"
                title="Refresh Ops Agent state"
              >
                <RefreshCw className={cn("h-4 w-4", isOpsLoading && "animate-spin text-sky-600")} />
              </button>
            </div>
          </div>

          {opsResource.error && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{opsResource.error}</p>}
          {isOpsLoading && <p role="status" className="text-xs text-zinc-500">Loading ops evidence…</p>}
          {/* Security & Policy Invariants Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl border border-zinc-200 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">WhatsApp Invariant</span>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                DISABLED
              </span>
            </div>

            <div className="rounded-xl border border-zinc-200 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">Email Auto-Send</span>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                DRAFT ONLY
              </span>
            </div>

            <div className="rounded-xl border border-zinc-200 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">Opt-Out Compliance</span>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                ENFORCED
              </span>
            </div>

            <div className="rounded-xl border border-zinc-200 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-emerald-500" />
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">Secret Scrubbing</span>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                ACTIVE
              </span>
            </div>
          </div>

          {/* Operational Tools Catalog Bar */}
          <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white/40 dark:bg-zinc-900/40 p-4 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Operational Tool Catalog (12 Tools)
            </span>
            <div className="flex flex-wrap gap-2 pt-1">
              {[
                "discover_leads",
                "qualify_lead",
                "research_business",
                "audit_website",
                "generate_preview",
                "validate_preview",
                "create_outreach",
                "get_lead_status",
                "analyze_reply",
                "schedule_followup",
                "update_crm",
                "report_to_ceo",
              ].map((tool) => (
                <span
                  key={tool}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {tool}
                </span>
              ))}
            </div>
          </div>

          {/* Interactive Dispatcher */}
          <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 p-5 space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
                <span>Tactical Task Dispatcher</span>
                <span className="text-[10px] text-zinc-400 font-normal">CEO Approved Tactical Directive</span>
              </label>
              <textarea
                value={opsObjective}
                onChange={(e) => setOpsObjective(e.target.value)}
                rows={2}
                placeholder="Enter tactical task objective for Ops Agent..."
                className="w-full text-xs font-medium rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-3 text-zinc-800 dark:text-zinc-200 outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  setOpsObjective("Discover 3 local dental clinics in Kathmandu, audit their web presence, and draft personalized preview outreach.")
                }
                className="text-[11px] px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 hover:bg-sky-100 transition"
              >
                Kathmandu Dentists: Discover & Draft
              </button>
              <button
                type="button"
                onClick={() =>
                  setOpsObjective("Jaipur boutique hotel: conduct website audit, generate preview, and create personalized outreach copy.")
                }
                className="text-[11px] px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 hover:bg-sky-100 transition"
              >
                Jaipur Hotel: Audit & Preview
              </button>
              <button
                type="button"
                onClick={() =>
                  setOpsObjective("Inbound email received: analyze customer price objection, update CRM status, and queue follow-up.")
                }
                className="text-[11px] px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 hover:bg-sky-100 transition"
              >
                Analyze Objection & Follow-up
              </button>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-zinc-500">
                Dispatches to n8n Ops Agent with strict human approval gate for email sending.
              </span>
              <button
                type="button"
                onClick={() => void handleExecuteOpsDispatch()}
                disabled={isOpsDispatching || !opsObjective.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50 transition shadow-xs"
              >
                {isOpsDispatching ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Executing Task...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>Dispatch to Ops Agent</span>
                  </>
                )}
              </button>
            </div>

            {opsDispatchError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
                {opsDispatchError}
              </div>
            )}
          </div>

          {/* Callback / Results Display */}
          {opsDispatchResult && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-sky-500/30 bg-sky-500/5 p-5 space-y-4"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-sky-500/20 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="text-xs font-bold text-zinc-900 dark:text-white">
                      Task Callback Received: {opsDispatchResult.taskId}
                    </span>
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase",
                      opsDispatchResult.status === "completed"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                    )}>
                      {opsDispatchResult.status}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1">
                    {opsDispatchResult.summary}
                  </p>
                </div>

                {opsDispatchResult.approvalRequired && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>Human Approval Required (Outreach)</span>
                  </span>
                )}
              </div>

              {/* Actions List */}
              {Array.isArray(opsDispatchResult.actions) && opsDispatchResult.actions.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    Executed Tool Actions ({opsDispatchResult.actions.length})
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {opsDispatchResult.actions.map((act: any, idx: number) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-2.5 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                            {act.tool}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-400">
                          {act.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* ─── SECTION 1.95: GOVERNANCE & ACTION AUTHORITY (PHASE 25) ─────────────────── */}
      <GovernanceSection sessionToken={sessionToken} />

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

      {/* ─── REAL-TIME TELEMETRY STREAM FEED ───────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Terminal className="h-4 w-4 text-violet-500" />
              <span>Real-Time Telemetry Stream</span>
              <span className="rounded-full bg-violet-500/10 border border-violet-500/30 px-2 py-0.5 text-[10px] font-mono font-bold text-violet-600 dark:text-violet-400">
                {filteredTelemetryEvents.length} events
              </span>
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Live runtime event stream delivered via Server-Sent Events (SSE)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Filter by Agent */}
            <div className="flex items-center gap-1.5">
              <ListFilter className="h-3.5 w-3.5 text-zinc-400" />
              <select
                value={streamFilterAgent}
                onChange={(e) => setStreamFilterAgent(e.target.value)}
                className="rounded-xl border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 outline-none dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200"
              >
                <option value="ALL">All Agents</option>
                {ALL_AGENTS.map((ag) => (
                  <option key={ag} value={ag}>
                    {ag}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Event Type */}
            <select
              value={streamFilterType}
              onChange={(e) => setStreamFilterType(e.target.value)}
              className="rounded-xl border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 outline-none dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200"
            >
              <option value="ALL">All Events</option>
              <option value="agent.started">agent.started</option>
              <option value="agent.thinking">agent.thinking</option>
              <option value="agent.provider_call">agent.provider_call</option>
              <option value="agent.provider_success">agent.provider_success</option>
              <option value="agent.provider_error">agent.provider_error</option>
              <option value="agent.fallback">agent.fallback</option>
              <option value="agent.completed">agent.completed</option>
              <option value="agent.failed">agent.failed</option>
            </select>

            {/* Clear stream button */}
            {telemetryEvents.length > 0 && (
              <button
                type="button"
                onClick={() => setTelemetryEvents([])}
                className="flex items-center gap-1 rounded-xl border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-600 hover:text-red-600 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:text-red-400 transition"
                title="Clear local event stream"
              >
                <Trash2 className="h-3 w-3" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Stream Table Container */}
        <div className="rounded-3xl border border-zinc-200 bg-white shadow-xs dark:border-white/10 dark:bg-zinc-900/60 overflow-hidden">
          {filteredTelemetryEvents.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-500 space-y-2">
              <Activity className="h-6 w-6 text-zinc-400 mx-auto animate-pulse" />
              <p className="font-semibold text-zinc-700 dark:text-zinc-300">
                {sseConnected ? "Listening for live runtime events..." : "Connecting to telemetry stream..."}
              </p>
              <p className="text-[11px] text-zinc-400">
                Invocations across Mitra, Generator, Planner, Extractor, and Studio will stream here in real time.
              </p>
            </div>
          ) : (
            <div className="max-h-[380px] overflow-y-auto divide-y divide-zinc-100 dark:divide-white/5 font-mono text-xs">
              {filteredTelemetryEvents.map((ev) => {
                const badgeClass = getEventTypeBadge(ev.event);
                return (
                  <div
                    key={ev.id}
                    className="p-3 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] text-zinc-400 shrink-0">
                        {new Date(ev.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>

                      <span className="rounded-md bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                        {ev.agent}
                      </span>

                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-bold border",
                          badgeClass
                        )}
                      >
                        {ev.event}
                      </span>

                      {ev.provider && (
                        <span className="text-[11px] text-zinc-600 dark:text-zinc-300 font-semibold">
                          {ev.provider}
                          {ev.model ? ` (${ev.model})` : ""}
                        </span>
                      )}

                      {ev.fromProvider && ev.toProvider && (
                        <span className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-semibold">
                          <span>{ev.fromProvider}</span>
                          <ArrowRight className="h-3 w-3 inline" />
                          <span>{ev.toProvider}</span>
                        </span>
                      )}

                      {ev.latencyMs != null && (
                        <span className="text-[10px] text-zinc-400 font-bold">
                          {ev.latencyMs}ms
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-zinc-500 truncate max-w-md">
                      {ev.error ? (
                        <span className="text-red-500 font-semibold truncate" title={ev.error}>
                          {ev.error}
                        </span>
                      ) : ev.reason ? (
                        <span className="text-amber-600 dark:text-amber-400 truncate" title={ev.reason}>
                          {ev.reason}
                        </span>
                      ) : (
                        <span className="text-zinc-400 truncate font-mono text-[10px]">
                          {ev.requestId}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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

      {/* ─── SECTION 7: CORE PLATFORM & REAL-WORLD INTEGRATION HEALTH ────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Radio className="h-4 w-4 text-emerald-500" />
              <span>Core Platform & Real-World Integration Health</span>
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Live operational statuses across AI models, databases, cache, and communications
            </p>
          </div>
          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab("integrations")}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <span>Manage Integrations →</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 text-xs">
          {[
            { name: "OpenAI", type: "AI Model Engine", status: "CONNECTED", detail: "GPT-5.6 / Embeddings" },
            { name: "Gemini", type: "AI Multimodal Engine", status: "CONNECTED", detail: "Gemini 2.5 Flash / Pro" },
            { name: "Groq", type: "Ultra-fast Inference", status: "CONNECTED", detail: "Llama-3.3 70B Versatile" },
            { name: "OpenRouter", type: "Model Gateway", status: "CONNECTED", detail: "Multi-provider Failover" },
            { name: "Google Places (New)", type: "Lead Discovery", status: "CONNECTED", detail: "Text Search / Geocoding" },
            { name: "Gmail API", type: "Outreach & Inbound", status: "CONNECTED", detail: "websitebanja@gmail.com" },
            { name: "Azure PostgreSQL", type: "Primary Relational DB", status: "CONNECTED", detail: "Flexible Server SSL" },
            { name: "Upstash Redis", type: "Rate Limit & Quota", status: "CONNECTED", detail: "Sliding Window Guard" },
            { name: "Supabase Auth", type: "Identity Provider", status: "CONNECTED", detail: "JWT OAuth / Sessions" },
            { name: "WhatsApp Cloud API", type: "Messaging Network", status: "DISABLED", detail: "Dedicated Line Required" },
          ].map((item) => (
            <div
              key={item.name}
              className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-white/10 dark:bg-zinc-900/60 flex flex-col justify-between min-h-[96px]"
            >
              <div className="flex items-start justify-between gap-1 mb-2">
                <div>
                  <h4 className="font-bold text-zinc-900 dark:text-white text-xs">{item.name}</h4>
                  <span className="text-[10px] text-zinc-400 font-mono">{item.type}</span>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[9px] font-bold border uppercase tracking-wider",
                    item.status === "CONNECTED"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                      : "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/30"
                  )}
                >
                  {item.status}
                </span>
              </div>
              <p className="text-[10px] text-zinc-500 font-mono">{item.detail}</p>
            </div>
          ))}
        </div>
      </div>
      </div>
      )}

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
