"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Mail,
  MapPin,
  MessageSquare,
  ArrowRight,
  Send,
  Inbox,
  Lock,
} from "lucide-react";

interface IntegrationStatusData {
  googlePlaces: {
    status: "CONNECTED" | "NOT_CONFIGURED" | "INVALID";
    provider: "google_places";
    isConfigured: boolean;
    apiKeyPresent: boolean;
    redactedKey?: string;
    lastRequestAt?: string | null;
    lastSuccessAt?: string | null;
    lastError?: string | null;
  };
  gmail: {
    status: "CONNECTED" | "NOT_AUTHORIZED" | "NOT_CONFIGURED" | "INVALID";
    provider: "gmail";
    account: "websitebanja@gmail.com";
    isConfigured: boolean;
    clientIdPresent: boolean;
    clientSecretPresent: boolean;
    refreshTokenPresent: boolean;
    sendingEnabled: boolean;
    receivingEnabled: boolean;
    lastSyncAt?: string | null;
    lastSendAt?: string | null;
    lastError?: string | null;
  };
  whatsapp: {
    status: "DISABLED";
    provider: "whatsapp";
    isEnabled: false;
    reason: string;
  };
  environment: string;
  checkedAt: string;
}

export interface AdminIntegrationsCenterProps {
  sessionToken?: string;
  onNavigateTab?: (tab: string) => void;
}

export default function AdminIntegrationsCenter({ sessionToken, onNavigateTab }: AdminIntegrationsCenterProps = {}) {
  const [data, setData] = useState<IntegrationStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

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

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/integrations/status", { headers });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load integrations status", err);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleSyncReplies = async () => {
    setSyncing(true);
    setSyncFeedback(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/integrations/gmail/sync", { method: "POST", headers });
      const json = await res.json();
      if (json.success) {
        setSyncFeedback(
          `Sync complete: ${json.messagesChecked} checked, ${json.repliesIngested} ingested, ${json.optOutCount} opt-outs.`
        );
        fetchStatus();
      } else {
        setSyncFeedback(`Sync failed: ${json.error || "Unknown error"}`);
      }
    } catch (err: any) {
      setSyncFeedback(`Sync error: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const [connectingGmail, setConnectingGmail] = useState(false);

  const handleConnectGmail = async () => {
    setConnectingGmail(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/integrations/gmail/connect?json=true", { headers });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Failed to generate authorization URL");
      }
    } catch (err: any) {
      alert("Error initiating OAuth: " + err.message);
    } finally {
      setConnectingGmail(false);
    }
  };

  return (
    <div className="space-y-6 text-slate-100 font-sans">
      {/* Top Toolbar */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-lg">
              WB
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold tracking-tight text-white">External Integrations Hub</h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
                  LIVE INTEGRATIONS
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Official Google Places (New) • Gmail OAuth • Inbound Reply Intelligence
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {onNavigateTab ? (
              <>
                <button
                  type="button"
                  onClick={() => onNavigateTab("leads")}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors"
                >
                  ← Lead Command Center
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateTab("automation")}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors"
                >
                  Pipeline Hub
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateTab("analytics")}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors"
                >
                  Analytics
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/admin?tab=leads"
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors"
                >
                  ← Lead Command Center
                </Link>
                <Link
                  href="/admin?tab=automation"
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors"
                >
                  Pipeline Hub
                </Link>
                <Link
                  href="/admin?tab=analytics"
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors"
                >
                  Analytics
                </Link>
              </>
            )}
            <button
              onClick={fetchStatus}
              disabled={loading}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              title="Refresh status"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        {/* Security Banner */}
        <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex items-start space-x-4">
          <ShieldCheck className="w-6 h-6 text-indigo-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <h2 className="font-semibold text-white text-sm">Strict Security & Confidentiality Architecture</h2>
            <p className="text-slate-300 leading-relaxed">
              All credentials remain strictly server-side and environment-isolated. No API keys, client secrets, or
              OAuth tokens are ever exposed to client bundles or browser interfaces. External sends require mandatory
              human approval by default (<code className="text-indigo-300">AUTO_SEND_ENABLED=false</code>).
            </p>
          </div>
        </div>

        {/* 3 Main Integration Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 1. Google Places API (New) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Google Places</h3>
                    <p className="text-[11px] text-slate-400 font-mono">Places API (New)</p>
                  </div>
                </div>
                {data?.googlePlaces.status === "CONNECTED" ? (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> CONNECTED
                  </span>
                ) : data?.googlePlaces.status === "INVALID" ? (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 font-semibold flex items-center space-x-1">
                    <XCircle className="w-3 h-3 mr-1" /> INVALID
                  </span>
                ) : (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold flex items-center space-x-1">
                    <AlertTriangle className="w-3 h-3 mr-1" /> NOT CONFIGURED
                  </span>
                )}
              </div>

              <div className="space-y-2 text-xs border-t border-slate-800 pt-3">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">API Key Configured:</span>
                  <span className="font-mono text-slate-200">
                    {data?.googlePlaces.apiKeyPresent ? (
                      <span className="text-emerald-400">{data.googlePlaces.redactedKey}</span>
                    ) : (
                      <span className="text-slate-500">None</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Provider Interface:</span>
                  <span className="font-mono text-slate-200">google_places</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Last Request:</span>
                  <span className="text-slate-300">
                    {data?.googlePlaces.lastRequestAt ? new Date(data.googlePlaces.lastRequestAt).toLocaleTimeString() : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Last Error:</span>
                  <span className="text-rose-400 truncate max-w-[180px]" title={data?.googlePlaces.lastError || "None"}>
                    {data?.googlePlaces.lastError || "None"}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 mt-4">
              <a
                href="https://console.cloud.google.com/google/maps-apis/overview"
                target="_blank"
                rel="noreferrer"
                className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 flex items-center justify-center space-x-1.5 transition-colors"
              >
                <span>Google Cloud Console</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* 2. Gmail API (OAuth 2.0) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Gmail API</h3>
                    <p className="text-[11px] text-slate-400 font-mono">OAuth 2.0 Official</p>
                  </div>
                </div>
                {data?.gmail.status === "CONNECTED" ? (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> CONNECTED
                  </span>
                ) : data?.gmail.status === "NOT_AUTHORIZED" ? (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold flex items-center space-x-1">
                    <AlertTriangle className="w-3 h-3 mr-1" /> NOT AUTHORIZED
                  </span>
                ) : (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 border border-slate-600 font-semibold">
                    NOT CONFIGURED
                  </span>
                )}
              </div>

              <div className="space-y-2 text-xs border-t border-slate-800 pt-3">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Account Identity:</span>
                  <span className="font-mono text-indigo-300 font-semibold">{data?.gmail.account}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Client ID / Secret:</span>
                  <span className="text-slate-200">
                    {data?.gmail.clientIdPresent && data?.gmail.clientSecretPresent ? (
                      <span className="text-emerald-400">Configured</span>
                    ) : (
                      <span className="text-slate-500">Missing in .env.local</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Refresh Token:</span>
                  <span className="text-slate-200">
                    {data?.gmail.refreshTokenPresent ? (
                      <span className="text-emerald-400">Authorized & Stored</span>
                    ) : (
                      <span className="text-amber-400">Pending User Auth</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Sending Gated:</span>
                  <span className="text-slate-200">
                    {data?.gmail.sendingEnabled ? (
                      <span className="text-emerald-400">Auto-Send Enabled</span>
                    ) : (
                      <span className="text-indigo-400">Human Approval Required</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Inbound Sync:</span>
                  <span className="text-slate-300">
                    {data?.gmail.lastSyncAt ? new Date(data.gmail.lastSyncAt).toLocaleTimeString() : "Never"}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 mt-4 space-y-2">
              <button
                type="button"
                onClick={handleConnectGmail}
                disabled={connectingGmail}
                className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-xs font-semibold text-white flex items-center justify-center space-x-1.5 shadow-lg transition-all disabled:opacity-50"
              >
                <span>{connectingGmail ? "Initiating Google Auth..." : "Connect websitebanja@gmail.com"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleSyncReplies}
                disabled={syncing}
                className="w-full py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 border border-slate-700 flex items-center justify-center space-x-1.5 transition-colors"
              >
                <Inbox className={`w-3.5 h-3.5 ${syncing ? "animate-pulse" : ""}`} />
                <span>{syncing ? "Syncing Inbox..." : "Sync Inbound Replies Now"}</span>
              </button>
              {syncFeedback && (
                <p className="text-[11px] text-center font-mono text-emerald-400 pt-1">{syncFeedback}</p>
              )}
            </div>
          </div>

          {/* 3. WhatsApp Integration (DISABLED) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-xl opacity-85">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">WhatsApp</h3>
                    <p className="text-[11px] text-slate-400 font-mono">Meta Cloud API</p>
                  </div>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-semibold flex items-center space-x-1">
                  <Lock className="w-3 h-3 mr-1" /> DISABLED
                </span>
              </div>

              <div className="space-y-3 text-xs border-t border-slate-800 pt-3">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 space-y-1">
                  <span className="text-amber-400 font-semibold block">Business Number Required</span>
                  <p className="text-[11px] leading-relaxed">
                    WhatsApp integration is strictly disabled until a dedicated WebsiteBanja business phone number is
                    verified with Meta.
                  </p>
                </div>
                <div className="space-y-1 text-slate-400 text-[11px]">
                  <div className="flex items-center space-x-2 text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>Zero personal phone numbers used</span>
                  </div>
                  <div className="flex items-center space-x-2 text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>No unofficial WhatsApp Web automation</span>
                  </div>
                  <div className="flex items-center space-x-2 text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>Meta Cloud API contracts prepared</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 mt-4">
              <button
                disabled
                className="w-full py-2 px-3 rounded-xl bg-slate-800 text-xs font-semibold text-slate-500 cursor-not-allowed border border-slate-800"
              >
                Requires Dedicated Business Number
              </button>
            </div>
          </div>
        </div>

        {/* Local Environment Setup Checklist */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-white text-base">Configuration & Credentials Checklist (.env.local)</h2>
              <p className="text-xs text-slate-400">
                To connect real Google Places and Gmail services, set these variables in your local{" "}
                <code className="text-indigo-300">.env.local</code> file:
              </p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
              GIT-IGNORED SECURE
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px]">
                <tr>
                  <th className="p-3">Variable Name</th>
                  <th className="p-3">Required Value / Format</th>
                  <th className="p-3">Current Status</th>
                  <th className="p-3">Instructions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono">
                <tr>
                  <td className="p-3 text-indigo-300 font-semibold">GOOGLE_PLACES_API_KEY</td>
                  <td className="p-3 text-slate-400">AIzaSy... (Restricted to Places API New)</td>
                  <td className="p-3">
                    {data?.googlePlaces.apiKeyPresent ? (
                      <span className="text-emerald-400">Present</span>
                    ) : (
                      <span className="text-amber-400">Missing</span>
                    )}
                  </td>
                  <td className="p-3 text-slate-300 font-sans">Google Cloud Console → APIs & Services → Credentials</td>
                </tr>
                <tr>
                  <td className="p-3 text-indigo-300 font-semibold">GOOGLE_CLIENT_ID</td>
                  <td className="p-3 text-slate-400">xxxx.apps.googleusercontent.com</td>
                  <td className="p-3">
                    {data?.gmail.clientIdPresent ? (
                      <span className="text-emerald-400">Present</span>
                    ) : (
                      <span className="text-amber-400">Missing</span>
                    )}
                  </td>
                  <td className="p-3 text-slate-300 font-sans">OAuth 2.0 Web Client in Google Cloud</td>
                </tr>
                <tr>
                  <td className="p-3 text-indigo-300 font-semibold">GOOGLE_CLIENT_SECRET</td>
                  <td className="p-3 text-slate-400">GOCSPX-...</td>
                  <td className="p-3">
                    {data?.gmail.clientSecretPresent ? (
                      <span className="text-emerald-400">Present</span>
                    ) : (
                      <span className="text-amber-400">Missing</span>
                    )}
                  </td>
                  <td className="p-3 text-slate-300 font-sans">OAuth 2.0 Web Client Secret</td>
                </tr>
                <tr>
                  <td className="p-3 text-indigo-300 font-semibold">GOOGLE_REDIRECT_URI</td>
                  <td className="p-3 text-slate-400">https://websitebanja.com/api/integrations/gmail/callback</td>
                  <td className="p-3 text-emerald-400">Production Configured</td>
                  <td className="p-3 text-slate-300 font-sans">Authorized redirect URI in Google OAuth settings</td>
                </tr>
                <tr>
                  <td className="p-3 text-indigo-300 font-semibold">GMAIL_USER</td>
                  <td className="p-3 text-slate-400">websitebanja@gmail.com</td>
                  <td className="p-3 text-emerald-400">Locked Identity</td>
                  <td className="p-3 text-slate-300 font-sans">Sole designated sender for WebsiteBanja</td>
                </tr>
                <tr>
                  <td className="p-3 text-indigo-300 font-semibold">GMAIL_REFRESH_TOKEN</td>
                  <td className="p-3 text-slate-400">Auto-saved to scratch/config/gmail_auth.json</td>
                  <td className="p-3">
                    {data?.gmail.refreshTokenPresent ? (
                      <span className="text-emerald-400">Authorized</span>
                    ) : (
                      <span className="text-amber-400">Requires OAuth Connect</span>
                    )}
                  </td>
                  <td className="p-3 text-slate-300 font-sans">Obtained automatically via 'Connect Gmail' button above</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
