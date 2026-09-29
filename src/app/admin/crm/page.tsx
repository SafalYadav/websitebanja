// src/app/admin/crm/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  RefreshCw,
  ShieldAlert,
  Search,
  MessageSquare,
  Sparkles,
  Send,
  AlertTriangle,
  CheckCircle2,
  Clock,
  User,
  Building,
  Mail,
  Smartphone,
  Phone,
  Calendar,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  XCircle,
  AlertCircle,
  Eye,
} from "lucide-react";
import type {
  LeadCRMState,
  CRMLeadStatus,
  ReplyAnalysis,
  NextAction,
  CRMMessage,
  CRMEvent,
} from "@/lib/crm/types";
import type { OutreachChannel } from "@/lib/outreach/types";

const STATUS_OPTIONS: CRMLeadStatus[] = [
  "DISCOVERED",
  "QUALIFIED",
  "AUDITED",
  "PREVIEW_READY",
  "OUTREACH_DRAFTED",
  "OUTREACH_APPROVED",
  "OUTREACH_SENT",
  "REPLIED",
  "INTERESTED",
  "NOT_INTERESTED",
  "FOLLOW_UP",
  "MEETING_REQUESTED",
  "WON",
  "LOST",
  "DO_NOT_CONTACT",
];

const PRESET_REPLIES = [
  {
    label: "Price Inquiry",
    channel: "email" as OutreachChannel,
    text: "Hi, I explored the interactive preview. The concept looks very clean! What would something like this cost to launch for our business?",
  },
  {
    label: "Call / Consultation",
    channel: "email" as OutreachChannel,
    text: "Can we schedule a 15-minute phone call tomorrow afternoon to discuss this further? My number is +91 98250 11223.",
  },
  {
    label: "Demo Request",
    channel: "whatsapp" as OutreachChannel,
    text: "Can you send a demo of other live websites you have created in our industry?",
  },
  {
    label: "Needs Time",
    channel: "email" as OutreachChannel,
    text: "We are currently in the middle of a seasonal launch. Please follow up with us next month when we can review this properly.",
  },
  {
    label: "Already Has Website",
    channel: "email" as OutreachChannel,
    text: "Thanks for sharing, but our in-house marketing team already launched our new website recently.",
  },
  {
    label: "Do Not Contact",
    channel: "email" as OutreachChannel,
    text: "Please remove our business from your mailing list and do not contact us again.",
  },
  {
    label: "Ambiguous (Low Conf)",
    channel: "sms" as OutreachChannel,
    text: "k",
  },
];

export default function AdminCRMPage() {
  const [leads, setLeads] = useState<LeadCRMState[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [activeLead, setActiveLead] = useState<LeadCRMState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Simulation modal
  const [isSimModalOpen, setIsSimModalOpen] = useState(false);
  const [simText, setSimText] = useState(PRESET_REPLIES[0].text);
  const [simChannel, setSimChannel] = useState<OutreachChannel>("email");
  const [simulating, setSimulating] = useState(false);
  const [simSuccess, setSimSuccess] = useState<string | null>(null);

  // Status update
  const [newStatus, setNewStatus] = useState<CRMLeadStatus>("INTERESTED");
  const [statusReason, setStatusReason] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Fetch list of leads
  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/automation/crm");
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch CRM leads`);
      const data = await res.json();
      const list: LeadCRMState[] = data.leads || [];
      setLeads(list);

      // Auto-select first lead if none selected
      if (!selectedLeadId && list.length > 0) {
        setSelectedLeadId(list[0].leadId);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load CRM data");
    } finally {
      setLoading(false);
    }
  }, [selectedLeadId]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Fetch active lead details
  const fetchActiveLead = useCallback(async (leadId: string) => {
    try {
      const res = await fetch(`/api/automation/crm/${leadId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setActiveLead(data.leadState);
      if (data.leadState) {
        setNewStatus(data.leadState.status);
      }
    } catch (err: unknown) {
      console.error("Error loading active lead details:", err);
    }
  }, []);

  useEffect(() => {
    if (selectedLeadId) {
      fetchActiveLead(selectedLeadId);
    }
  }, [selectedLeadId, fetchActiveLead]);

  // Handle Simulate Reply
  const handleSimulateReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadId || !simText.trim()) return;

    setSimulating(true);
    setSimSuccess(null);
    setError(null);

    try {
      const res = await fetch("/api/automation/simulate-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: selectedLeadId,
          channel: simChannel,
          messageText: simText.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to simulate reply");
      }

      setSimSuccess(`Inbound reply simulated: ${data.analysis?.intent} (Lead status: ${data.leadStatus})`);
      setIsSimModalOpen(false);

      // Refresh lead details and list
      await fetchActiveLead(selectedLeadId);
      await fetchLeads();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Simulation failed");
    } finally {
      setSimulating(false);
    }
  };

  // Handle Manual Status Change
  const handleUpdateStatus = async () => {
    if (!selectedLeadId || !statusReason.trim()) return;

    setUpdatingStatus(true);
    setError(null);

    try {
      const res = await fetch(`/api/automation/crm/${selectedLeadId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newStatus,
          reason: statusReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to update status");
      }

      setStatusReason("");
      await fetchActiveLead(selectedLeadId);
      await fetchLeads();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Filtered Leads
  const filteredLeads = leads.filter((l) => {
    if (statusFilter !== "ALL" && l.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        l.businessName.toLowerCase().includes(q) ||
        l.industry.toLowerCase().includes(q) ||
        l.city?.toLowerCase().includes(q) ||
        l.leadId.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getStatusBadge = (status: CRMLeadStatus) => {
    switch (status) {
      case "INTERESTED":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-700">Interested</span>;
      case "MEETING_REQUESTED":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-950/80 text-blue-300 border border-blue-700">Meeting Requested</span>;
      case "FOLLOW_UP":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-300 border border-amber-700">Follow-up Due</span>;
      case "REPLIED":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-950/80 text-purple-300 border border-purple-700">Replied</span>;
      case "OUTREACH_SENT":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-950/80 text-sky-300 border border-sky-700">Outreach Sent</span>;
      case "NOT_INTERESTED":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-800 text-neutral-400 border border-neutral-700">Not Interested</span>;
      case "DO_NOT_CONTACT":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-950/80 text-rose-300 border border-rose-800">Do Not Contact</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-800 text-neutral-300 border border-neutral-700">{status}</span>;
    }
  };

  const getSentimentBadge = (sentiment?: string) => {
    switch (sentiment) {
      case "POSITIVE":
        return <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-medium">Positive</span>;
      case "NEGATIVE":
        return <span className="text-xs px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 font-medium">Negative</span>;
      case "NEUTRAL":
        return <span className="text-xs px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700 font-medium">Neutral</span>;
      default:
        return <span className="text-xs px-2 py-0.5 rounded bg-neutral-800 text-neutral-400">{sentiment || "Unknown"}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-6 md:p-8 font-sans">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-neutral-800 pb-5">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Admin
              </Link>
              <span className="text-neutral-600">/</span>
              <Link
                href="/admin/outreach"
                className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
              >
                Outreach Console
              </Link>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent">
              Reply Intelligence & CRM Console
            </h1>
            <p className="text-xs md:text-sm text-neutral-400 mt-1">
              Phase 12 Inbound Reply Classification, Deterministic Next Actions & Lead Timeline
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSimModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-lg shadow-emerald-950/40"
            >
              <Sparkles className="w-4 h-4" />
              Simulate Incoming Reply
            </button>
            <button
              onClick={() => fetchLeads()}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Local Hard Lock Banner */}
        <div className="bg-amber-950/30 border border-amber-800/60 rounded-xl p-3.5 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-semibold text-amber-200">Strict Local-Only Simulation Active:</span>{" "}
            <span className="text-amber-300/90">
              External messaging networks are completely disabled in Phase 12. Incoming customer responses and status changes are simulated locally via deterministic heuristics and sandboxed AI models. Zero live customer contacts are ever made.
            </span>
          </div>
        </div>

        {/* Error / Success Notifications */}
        {error && (
          <div className="bg-rose-950/40 border border-rose-800/80 rounded-lg p-3 text-xs text-rose-300 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-rose-400 hover:text-white">✕</button>
          </div>
        )}
        {simSuccess && (
          <div className="bg-emerald-950/40 border border-emerald-800/80 rounded-lg p-3 text-xs text-emerald-300 flex items-center justify-between">
            <span>{simSuccess}</span>
            <button onClick={() => setSimSuccess(null)} className="text-emerald-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Main 3-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[700px]">
          {/* ============================================================== */}
          {/* COLUMN 1: LEAD DIRECTORY & SEARCH (3 cols) */}
          {/* ============================================================== */}
          <div className="lg:col-span-3 bg-neutral-900/60 border border-neutral-800 rounded-xl flex flex-col overflow-hidden">
            <div className="p-3.5 border-b border-neutral-800 space-y-2.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter leads..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-neutral-950 border border-neutral-800 rounded-lg focus:outline-none focus:border-neutral-600 text-neutral-200"
                />
              </div>

              {/* Status filter tabs */}
              <div className="flex gap-1 overflow-x-auto pb-1 text-[11px] scrollbar-none">
                {["ALL", "INTERESTED", "MEETING_REQUESTED", "FOLLOW_UP", "REPLIED"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2 py-1 rounded shrink-0 transition-colors ${
                      statusFilter === st
                        ? "bg-neutral-800 text-white font-semibold"
                        : "text-neutral-400 hover:text-neutral-200"
                    }`}
                  >
                    {st === "ALL" ? "All" : st.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            {/* Lead list */}
            <div className="flex-1 overflow-y-auto divide-y divide-neutral-800/60">
              {filteredLeads.length === 0 ? (
                <div className="p-8 text-center text-xs text-neutral-500">
                  No leads found matching criteria.
                </div>
              ) : (
                filteredLeads.map((lead) => {
                  const isSelected = selectedLeadId === lead.leadId;
                  return (
                    <button
                      key={lead.leadId}
                      onClick={() => setSelectedLeadId(lead.leadId)}
                      className={`w-full text-left p-3.5 transition-colors flex flex-col gap-1.5 ${
                        isSelected
                          ? "bg-neutral-800/70 border-l-2 border-emerald-500"
                          : "hover:bg-neutral-900/80"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-xs text-neutral-200 truncate">
                          {lead.businessName}
                        </span>
                        {getStatusBadge(lead.status)}
                      </div>
                      <div className="text-[11px] text-neutral-400 flex items-center gap-2">
                        <span className="capitalize">{lead.industry}</span>
                        <span>•</span>
                        <span>{lead.city || "Vadodara"}</span>
                      </div>
                      {lead.latestAnalysis && (
                        <div className="text-[10px] text-emerald-400/90 truncate flex items-center gap-1">
                          <Sparkles className="w-3 h-3 shrink-0" />
                          <span>Intent: {lead.latestAnalysis.intent}</span>
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* ============================================================== */}
          {/* COLUMN 2: CONVERSATION TIMELINE & CHAT (5 cols) */}
          {/* ============================================================== */}
          <div className="lg:col-span-5 bg-neutral-900/60 border border-neutral-800 rounded-xl flex flex-col overflow-hidden">
            {activeLead ? (
              <>
                {/* Header */}
                <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-sm text-neutral-200">
                      {activeLead.businessName}
                    </h2>
                    <p className="text-xs text-neutral-400 flex items-center gap-2 mt-0.5">
                      <span>Channel: {activeLead.activeConversation?.channel || "email"}</span>
                      <span>•</span>
                      <span>{activeLead.messages.length} messages</span>
                    </p>
                  </div>
                  <button
                    onClick={() => setIsSimModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                    Simulate Reply
                  </button>
                </div>

                {/* Messages & Event Stream */}
                <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-neutral-950/40">
                  {/* Phase 11 Outbound & Inbound Messages */}
                  {activeLead.messages.length === 0 ? (
                    <div className="p-12 text-center text-xs text-neutral-500">
                      No communication records found for this lead.
                    </div>
                  ) : (
                    activeLead.messages.map((msg) => {
                      const isOutbound = msg.direction === "outbound";
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isOutbound ? "items-end" : "items-start"}`}
                        >
                          <div className="text-[10px] text-neutral-500 mb-1 px-1 flex items-center gap-1">
                            <span>{isOutbound ? "WebsiteBanja Outreach (Simulated)" : "Client Response"}</span>
                            <span>•</span>
                            <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                          </div>

                          <div
                            className={`max-w-[85%] rounded-xl p-3.5 text-xs leading-relaxed ${
                              isOutbound
                                ? "bg-neutral-800 text-neutral-200 border border-neutral-700"
                                : "bg-emerald-950/40 text-emerald-100 border border-emerald-800/80 shadow-md"
                            }`}
                          >
                            {msg.metadata?.subject && (
                              <div className="font-semibold text-neutral-300 pb-1.5 mb-1.5 border-b border-neutral-700">
                                Subject: {msg.metadata.subject}
                              </div>
                            )}
                            <div className="whitespace-pre-wrap">{msg.messageText}</div>

                            {msg.metadata?.previewUrl && (
                              <div className="mt-2.5 pt-2 border-t border-neutral-700/60 flex items-center justify-between">
                                <span className="text-[10px] text-neutral-400">Attached Concept:</span>
                                <a
                                  href={msg.metadata.previewUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-blue-400 hover:underline inline-flex items-center gap-1"
                                >
                                  Open Preview <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* CRM Timeline Events */}
                  {activeLead.timeline.length > 0 && (
                    <div className="pt-4 border-t border-neutral-800/80">
                      <div className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider mb-2.5">
                        Audit & Status Timeline
                      </div>
                      <div className="space-y-2">
                        {activeLead.timeline.map((evt) => (
                          <div
                            key={evt.id}
                            className="text-[11px] bg-neutral-900/40 border border-neutral-800/60 rounded-lg p-2.5 flex items-start gap-2 text-neutral-400"
                          >
                            <Clock className="w-3.5 h-3.5 text-neutral-500 shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <span className="text-neutral-300 font-medium">{evt.description}</span>
                              <div className="text-[10px] text-neutral-500 mt-0.5">
                                {new Date(evt.timestamp).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer status changer */}
                <div className="p-3 bg-neutral-900 border-t border-neutral-800 flex items-center gap-2">
                  <span className="text-xs text-neutral-400 whitespace-nowrap">Transition:</span>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as CRMLeadStatus)}
                    className="bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1 text-xs text-neutral-200"
                  >
                    {STATUS_OPTIONS.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Reason for change..."
                    value={statusReason}
                    onChange={(e) => setStatusReason(e.target.value)}
                    className="flex-1 bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1 text-xs text-neutral-200 focus:outline-none focus:border-neutral-700"
                  />
                  <button
                    onClick={handleUpdateStatus}
                    disabled={updatingStatus || !statusReason.trim()}
                    className="px-3 py-1 text-xs font-semibold rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 disabled:opacity-40 transition-colors"
                  >
                    {updatingStatus ? "Saving..." : "Update"}
                  </button>
                </div>
              </>
            ) : (
              <div className="p-12 text-center text-xs text-neutral-500">
                Select a lead to inspect conversation.
              </div>
            )}
          </div>

          {/* ============================================================== */}
          {/* COLUMN 3: AI REPLY INTELLIGENCE & NEXT ACTIONS (4 cols) */}
          {/* ============================================================== */}
          <div className="lg:col-span-4 space-y-4">
            {activeLead ? (
              <>
                {/* Reply Intelligence Card */}
                <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <h3 className="font-bold text-sm text-neutral-200">
                        AI Reply Intelligence
                      </h3>
                    </div>
                    {activeLead.latestAnalysis && (
                      <span className="text-[10px] text-neutral-500 uppercase tracking-wider">
                        {activeLead.latestAnalysis.provider}
                      </span>
                    )}
                  </div>

                  {activeLead.latestAnalysis ? (
                    <div className="space-y-3.5">
                      {/* Intent & Sentiment */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-lg p-3">
                          <div className="text-[10px] text-neutral-500 uppercase font-semibold">Intent</div>
                          <div className="text-xs font-bold text-neutral-200 mt-1">
                            {activeLead.latestAnalysis.intent}
                          </div>
                        </div>

                        <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-lg p-3">
                          <div className="text-[10px] text-neutral-500 uppercase font-semibold">Sentiment</div>
                          <div className="mt-1">
                            {getSentimentBadge(activeLead.latestAnalysis.sentiment)}
                          </div>
                        </div>
                      </div>

                      {/* Confidence Meter */}
                      <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-lg p-3 space-y-1.5">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-neutral-400">Classification Confidence</span>
                          <span className="font-semibold text-neutral-200">
                            {(activeLead.latestAnalysis.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              activeLead.latestAnalysis.confidence >= 0.8
                                ? "bg-emerald-500"
                                : activeLead.latestAnalysis.confidence >= 0.65
                                ? "bg-amber-500"
                                : "bg-rose-500"
                            }`}
                            style={{ width: `${activeLead.latestAnalysis.confidence * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* Human Review Banner if required */}
                      {activeLead.latestAnalysis.requiresHumanReview && (
                        <div className="bg-amber-950/40 border border-amber-800/80 rounded-lg p-3 flex items-start gap-2.5 text-xs text-amber-300">
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <span>
                            Human Operator Review Flagged: Low confidence or ambiguous reply detected. Operator inspection required.
                          </span>
                        </div>
                      )}

                      {/* Summary */}
                      <div>
                        <div className="text-[10px] uppercase font-semibold text-neutral-400 mb-1">
                          Intelligence Summary
                        </div>
                        <p className="text-xs text-neutral-300 bg-neutral-950/60 border border-neutral-800/80 rounded-lg p-2.5">
                          {activeLead.latestAnalysis.summary}
                        </p>
                      </div>

                      {/* Key Signals */}
                      {activeLead.latestAnalysis.keySignals?.length > 0 && (
                        <div>
                          <div className="text-[10px] uppercase font-semibold text-neutral-400 mb-1">
                            Key Factual Signals
                          </div>
                          <ul className="text-xs text-neutral-300 space-y-1 bg-neutral-950/60 border border-neutral-800/80 rounded-lg p-2.5">
                            {activeLead.latestAnalysis.keySignals.map((sig, i) => (
                              <li key={i} className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                <span>{sig}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-xs text-neutral-500">
                      No inbound reply analyzed yet. Use &quot;Simulate Incoming Reply&quot; to test classification.
                    </div>
                  )}
                </div>

                {/* Next Action Recommendation Card */}
                <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 border-b border-neutral-800 pb-3">
                    <TrendingUp className="w-4 h-4 text-blue-400" />
                    <h3 className="font-bold text-sm text-neutral-200">
                      Recommended Next Action
                    </h3>
                  </div>

                  {activeLead.nextAction ? (
                    <div className="space-y-3">
                      <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-lg p-3">
                        <div className="text-[10px] text-neutral-500 uppercase font-semibold">Action</div>
                        <div className="text-sm font-bold text-blue-300 mt-1">
                          {activeLead.nextAction.recommendedAction}
                        </div>
                      </div>

                      <div className="text-xs text-neutral-300">
                        <span className="text-neutral-500">Rationale: </span>
                        {activeLead.nextAction.reason}
                      </div>

                      {activeLead.nextAction.suggestedFollowUpDate && (
                        <div className="text-[11px] text-neutral-400 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                          <span>
                            Target Follow-up: {new Date(activeLead.nextAction.suggestedFollowUpDate).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-xs text-neutral-500">
                      Pending inbound reply classification.
                    </div>
                  )}
                </div>

                {/* Lead Profile Metadata Card */}
                <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 space-y-2 text-xs">
                  <div className="font-bold text-neutral-300 border-b border-neutral-800 pb-2 flex items-center gap-2">
                    <Building className="w-3.5 h-3.5 text-neutral-400" />
                    Lead Metadata
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-neutral-400 pt-1">
                    <div>
                      <span className="block text-[10px] text-neutral-500">Lead ID</span>
                      <span className="font-mono text-neutral-300">{activeLead.leadId}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-neutral-500">Location</span>
                      <span className="text-neutral-300">{activeLead.city || "Vadodara"}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-neutral-500">Phone</span>
                      <span className="text-neutral-300">{activeLead.phone || "—"}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-neutral-500">Email</span>
                      <span className="text-neutral-300 truncate block">{activeLead.email || "—"}</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-xs text-neutral-500 bg-neutral-900/30 border border-neutral-800 rounded-xl">
                Select a lead to inspect intelligence data.
              </div>
            )}
          </div>
        </div>

        {/* ============================================================== */}
        {/* SIMULATE REPLY MODAL */}
        {/* ============================================================== */}
        {isSimModalOpen && activeLead && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
                <div>
                  <h3 className="font-bold text-base text-neutral-100 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    Simulate Incoming Client Reply
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Target: {activeLead.businessName} ({activeLead.leadId})
                  </p>
                </div>
                <button
                  onClick={() => setIsSimModalOpen(false)}
                  className="text-neutral-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {/* Safety notice in modal */}
              <div className="bg-amber-950/40 border border-amber-800/80 rounded-lg p-3 text-xs text-amber-300">
                <span className="font-semibold">Local Simulation Only:</span> Ingestion will run reply intelligence, classify intent/sentiment, update lead status, and log to CRM timeline. No live message is ever sent.
              </div>

              {/* Presets */}
              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-2">
                  Select Quick Preset Scenario:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_REPLIES.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSimText(p.text);
                        setSimChannel(p.channel);
                      }}
                      className="text-[11px] px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleSimulateReply} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1.5">
                    Inbound Channel:
                  </label>
                  <select
                    value={simChannel}
                    onChange={(e) => setSimChannel(e.target.value as OutreachChannel)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-neutral-200"
                  >
                    <option value="email">Email</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="instagram">Instagram DM</option>
                    <option value="sms">SMS</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1.5">
                    Inbound Message Text:
                  </label>
                  <textarea
                    rows={4}
                    value={simText}
                    onChange={(e) => setSimText(e.target.value)}
                    required
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-xs text-neutral-200 focus:outline-none focus:border-neutral-600 font-sans"
                    placeholder="Enter custom customer reply..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsSimModalOpen(false)}
                    className="px-4 py-2 text-xs font-medium rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={simulating || !simText.trim()}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50"
                  >
                    {simulating ? "Simulating & Classifying..." : "Simulate Incoming Reply (Local)"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
