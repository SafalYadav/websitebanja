"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Mail,
  MessageSquare,
  Smartphone,
  CheckCircle2,
  XCircle,
  Eye,
  Send,
  RefreshCw,
  Search,
  ArrowLeft,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  AlertTriangle,
  Edit3,
  Clock,
  Check,
} from "lucide-react";
import type { OutreachRecord, OutreachChannel, OutreachStatus } from "@/lib/outreach/types";

const PIPELINE_STAGES = [
  "DISCOVERED",
  "QUALIFIED",
  "AUDITED",
  "PREVIEW READY",
  "OUTREACH DRAFT",
  "REVIEW",
  "APPROVED",
  "SIMULATED SENT",
  "REPLIED",
];

export default function AdminOutreachPage() {
  const [records, setRecords] = useState<OutreachRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Generator form
  const [genLeadId, setGenLeadId] = useState<string>("lead_cc4f59e3d5e5");
  const [genChannel, setGenChannel] = useState<OutreachChannel>("email");
  const [generating, setGenerating] = useState(false);

  // Selected for edit/view modal
  const [selectedRecord, setSelectedRecord] = useState<OutreachRecord | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editMessage, setEditMessage] = useState("");
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (channelFilter !== "all") params.set("channel", channelFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/automation/outreach?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to load outreach records`);
      const data = await res.json();
      setRecords(data.records || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load outreach records");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, channelFilter, searchQuery]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleGenerateDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!genLeadId.trim()) return;

    setGenerating(true);
    setActionSuccess(null);
    setError(null);

    try {
      const res = await fetch("/api/automation/generate-outreach-draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-automation-secret": "wb-auto-secret-local-dev-2026",
        },
        body: JSON.stringify({
          leadId: genLeadId.trim(),
          channel: genChannel,
          regenerate: true,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to generate draft");
      }

      setActionSuccess(`Generated personalized ${genChannel} draft for ${data.outreach.business.name}!`);
      fetchRecords();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Draft generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleUpdateStatus = async (outreachId: string, status: OutreachStatus) => {
    setActionSuccess(null);
    setError(null);
    try {
      const res = await fetch("/api/automation/outreach", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outreachId, status }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || `Failed to update status to ${status}`);
      }

      if (status === "simulated_sent") {
        setActionSuccess(`Simulated send recorded for ${data.outreach.business.name} (${data.receipt.recipient})!`);
      } else {
        setActionSuccess(`Updated outreach status to '${status}'`);
      }

      if (selectedRecord && selectedRecord.outreachId === outreachId) {
        setSelectedRecord(data.outreach);
      }

      fetchRecords();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Status update failed");
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedRecord) return;
    try {
      const res = await fetch("/api/automation/outreach", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outreachId: selectedRecord.outreachId,
          status: selectedRecord.status,
          editedSubject: editSubject,
          editedMessage: editMessage,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error?.message || "Save failed");

      setActionSuccess("Message edits saved successfully.");
      setSelectedRecord(data.outreach);
      fetchRecords();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save message edits");
    }
  };

  const openModal = (record: OutreachRecord) => {
    setSelectedRecord(record);
    setEditSubject(record.subject || "");
    setEditMessage(record.message || "");
  };

  const InstagramIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );

  const getChannelIcon = (channel: OutreachChannel) => {
    switch (channel) {
      case "email":
        return <Mail className="w-4 h-4 text-blue-400" />;
      case "whatsapp":
        return <MessageSquare className="w-4 h-4 text-emerald-400" />;
      case "instagram":
        return <InstagramIcon className="w-4 h-4 text-pink-400" />;
      case "sms":
        return <Smartphone className="w-4 h-4 text-amber-400" />;
    }
  };

  const getStatusBadge = (status: OutreachStatus) => {
    switch (status) {
      case "draft":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-800 text-neutral-300 border border-neutral-700">Draft</span>;
      case "review":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-950/60 text-amber-300 border border-amber-800">In Review</span>;
      case "approved":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-950/60 text-blue-300 border border-blue-800">Approved</span>;
      case "simulated_sent":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-950/60 text-emerald-300 border border-emerald-800">Simulated Sent</span>;
      case "rejected":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-950/60 text-rose-300 border border-rose-800">Rejected</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-800 text-neutral-400">{status}</span>;
    }
  };

  return (
    <div className="min-n-screen bg-neutral-950 text-neutral-100 p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Navigation & Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-neutral-800 pb-6">
          <div>
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-neutral-200 transition-colors mb-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Admin
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent">
              Personalized Outreach Foundation
            </h1>
            <p className="text-sm text-neutral-400 mt-1">
              Phase 11 Human-in-the-Loop Review, Approval & Local Simulation Outbox
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchRecords()}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Local Hard Lock Notice */}
        <div className="bg-amber-950/30 border border-amber-800/60 rounded-xl p-4 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <span className="font-semibold text-amber-200">Strict Local-Only Hard Lock Active:</span>{" "}
            <span className="text-amber-300/90">
              External sending is completely disabled in Phase 11. All approved messages are dispatched exclusively to the local simulation outbox (
              <code className="text-xs bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-800/80">scratch/outreach/</code>
              ). Zero real emails, WhatsApp messages, or DMs are ever sent.
            </span>
          </div>
        </div>

        {/* Lead Pipeline Tracker */}
        <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-xl p-5">
          <div className="text-xs uppercase tracking-wider font-semibold text-neutral-400 mb-3">
            End-to-End Autonomous Pipeline Stages
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2">
            {PIPELINE_STAGES.map((stage, idx) => {
              const isCurrent = stage === "OUTREACH DRAFT" || stage === "REVIEW" || stage === "APPROVED";
              return (
                <div
                  key={stage}
                  className={`text-center py-2 px-1 rounded-lg text-[10px] font-mono tracking-tight border transition-all ${
                    isCurrent
                      ? "bg-amber-500/10 border-amber-500/40 text-amber-300 font-semibold"
                      : idx < 4
                      ? "bg-neutral-800/40 border-neutral-700/40 text-neutral-300"
                      : "bg-neutral-900/40 border-neutral-800/40 text-neutral-500"
                  }`}
                >
                  <div className="text-[9px] opacity-60">0{idx + 8}</div>
                  {stage}
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Draft Generator */}
        <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-xl p-6">
          <h2 className="text-base font-semibold text-white flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-amber-400" /> Generate Personalized Draft
          </h2>
          <form onSubmit={handleGenerateDraft} className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex-1 w-full">
              <label className="block text-xs text-neutral-400 mb-1">Lead ID</label>
              <input
                type="text"
                value={genLeadId}
                onChange={(e) => setGenLeadId(e.target.value)}
                placeholder="e.g. lead_cc4f59e3d5e5"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-neutral-600"
                required
              />
            </div>
            <div className="w-full sm:w-48">
              <label className="block text-xs text-neutral-400 mb-1">Channel</label>
              <select
                value={genChannel}
                onChange={(e) => setGenChannel(e.target.value as OutreachChannel)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-neutral-600"
              >
                <option value="email">Email</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="instagram">Instagram DM</option>
                <option value="sms">SMS</option>
              </select>
            </div>
            <div className="w-full sm:w-auto self-end">
              <button
                type="submit"
                disabled={generating}
                className="w-full sm:w-auto px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-medium text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Generate Draft
              </button>
            </div>
          </form>
        </div>

        {/* Feedback alerts */}
        {actionSuccess && (
          <div className="p-3 bg-emerald-950/40 border border-emerald-800 rounded-lg text-emerald-300 text-sm flex items-center gap-2">
            <Check className="w-4 h-4" /> {actionSuccess}
          </div>
        )}
        {error && (
          <div className="p-3 bg-rose-950/40 border border-rose-800 rounded-lg text-rose-300 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> {error}
          </div>
        )}

        {/* Filters Bar */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-neutral-900/40 border border-neutral-800 rounded-xl p-4">
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {["all", "draft", "review", "approved", "simulated_sent", "rejected"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                  statusFilter === st
                    ? "bg-neutral-800 text-white border border-neutral-700"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                {st === "simulated_sent" ? "Simulated Sent" : st}
              </button>
            ))}
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-300 focus:outline-none"
            >
              <option value="all">All Channels</option>
              <option value="email">Email</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="instagram">Instagram</option>
              <option value="sms">SMS</option>
            </select>

            <div className="relative flex-1 md:w-60">
              <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search business or text..."
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-neutral-200 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Outreach Records Table */}
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-950/80 text-neutral-400 border-b border-neutral-800">
                <tr>
                  <th className="py-3 px-4 font-medium">Business / Location</th>
                  <th className="py-3 px-4 font-medium">Channel</th>
                  <th className="py-3 px-4 font-medium">Draft Message Preview</th>
                  <th className="py-3 px-4 font-medium">Preview URL</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-neutral-500">
                      {loading ? "Loading outreach records..." : "No outreach records found matching criteria."}
                    </td>
                  </tr>
                ) : (
                  records.map((r) => (
                    <tr key={r.outreachId} className="hover:bg-neutral-800/30 transition-colors">
                      <td className="py-3 px-4 font-medium">
                        <div className="text-neutral-200 font-semibold">{r.business.name}</div>
                        <div className="text-[11px] text-neutral-400 flex items-center gap-2 mt-0.5">
                          <span>{r.business.industry}</span> • <span>{r.business.location}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-neutral-950 border border-neutral-800 text-[11px] capitalize text-neutral-300">
                          {getChannelIcon(r.channel)}
                          {r.channel}
                        </div>
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate text-neutral-400">
                        {r.subject && <span className="font-semibold text-neutral-300">[{r.subject}] </span>}
                        {r.message.slice(0, 80)}...
                      </td>
                      <td className="py-3 px-4">
                        <a
                          href={r.previewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 hover:underline"
                        >
                          View Preview <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(r.status)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => openModal(r)}
                            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200"
                            title="View & Edit"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {r.status !== "approved" && r.status !== "simulated_sent" && (
                            <button
                              onClick={() => handleUpdateStatus(r.outreachId, "approved")}
                              className="px-2 py-1 rounded bg-blue-900/60 hover:bg-blue-800/80 text-blue-200 text-[11px] font-medium border border-blue-700"
                            >
                              Approve
                            </button>
                          )}

                          {r.status !== "rejected" && r.status !== "simulated_sent" && (
                            <button
                              onClick={() => handleUpdateStatus(r.outreachId, "rejected")}
                              className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800"
                              title="Reject"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {r.status === "approved" && (
                            <button
                              onClick={() => handleUpdateStatus(r.outreachId, "simulated_sent")}
                              className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-neutral-950 font-medium text-[11px] inline-flex items-center gap-1"
                              title="Simulate dispatch to local outbox"
                            >
                              <Send className="w-3 h-3" /> Simulate Send
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: View & Edit Draft */}
        {selectedRecord && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="p-5 border-b border-neutral-800 flex justify-between items-center bg-neutral-950">
                <div>
                  <h3 className="font-semibold text-lg text-white flex items-center gap-2">
                    {getChannelIcon(selectedRecord.channel)} {selectedRecord.business.name}
                  </h3>
                  <div className="text-xs text-neutral-400 mt-0.5">
                    Lead: <code className="text-neutral-300">{selectedRecord.leadId}</code> • Channel: <span className="capitalize">{selectedRecord.channel}</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="p-1 rounded-lg text-neutral-400 hover:text-white"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-5 text-xs text-neutral-300">
                {/* Personalization Context */}
                <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-2">
                  <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                    Audit Observations & Talking Points
                  </div>
                  <ul className="list-disc pl-4 space-y-1 text-neutral-300">
                    {selectedRecord.personalization.websiteProblems.map((p, idx) => (
                      <li key={idx}>{p}</li>
                    ))}
                  </ul>
                  <div className="pt-2 text-neutral-400">
                    Preview Link:{" "}
                    <a
                      href={selectedRecord.previewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-amber-400 hover:underline"
                    >
                      {selectedRecord.previewUrl}
                    </a>
                  </div>
                </div>

                {/* Edit Form */}
                {selectedRecord.channel === "email" && (
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1">Subject Line</label>
                    <input
                      type="text"
                      value={editSubject}
                      onChange={(e) => setEditSubject(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-xs text-neutral-200 focus:outline-none focus:border-neutral-600"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">Message Body</label>
                  <textarea
                    rows={8}
                    value={editMessage}
                    onChange={(e) => setEditMessage(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-xs text-neutral-200 focus:outline-none focus:border-neutral-600 font-mono leading-relaxed"
                  />
                </div>

                {/* Simulation Receipt if simulated */}
                {selectedRecord.simulationReceipt && (
                  <div className="bg-emerald-950/20 border border-emerald-800/60 rounded-xl p-4 space-y-1">
                    <div className="font-semibold text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> Local Simulation Receipt
                    </div>
                    <div className="text-[11px] text-emerald-400/80">
                      Simulated at: {selectedRecord.simulationReceipt.simulatedAt}
                    </div>
                    <div className="text-[11px] text-emerald-400/80">
                      Recipient: {selectedRecord.simulationReceipt.recipient}
                    </div>
                    <div className="text-[11px] text-emerald-400/80">
                      Provider: {selectedRecord.simulationReceipt.provider}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-neutral-800 bg-neutral-950 flex justify-between items-center">
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveEdit}
                    className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium inline-flex items-center gap-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Save Edits
                  </button>
                </div>

                <div className="flex gap-2">
                  {selectedRecord.status !== "approved" && selectedRecord.status !== "simulated_sent" && (
                    <button
                      onClick={() => handleUpdateStatus(selectedRecord.outreachId, "approved")}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium"
                    >
                      Approve Draft
                    </button>
                  )}

                  {selectedRecord.status === "approved" && (
                    <button
                      onClick={() => handleUpdateStatus(selectedRecord.outreachId, "simulated_sent")}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-medium inline-flex items-center gap-1"
                    >
                      <Send className="w-3.5 h-3.5" /> Simulate Send
                    </button>
                  )}

                  <button
                    onClick={() => setSelectedRecord(null)}
                    className="px-3 py-1.5 rounded-lg bg-neutral-800 text-neutral-400 text-xs"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
