"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useBuilderStore } from "@/store/builderStore";
import { publishProject, unpublishProject } from "@/lib/projects";
import { toast } from "@/store/toastStore";
import { detectBackendRequirement } from "@/lib/backendDetection";
import { getDnsInstructions, normalizeDomain, isValidDomain } from "@/lib/domains";
import { supabase } from "@/lib/supabase";
import {
  X,
  Check,
  Copy,
  ExternalLink,
  Globe,
  Sparkles,
  Link2,
  Server,
  RefreshCw,
  AlertCircle,
  Database,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = "wb_url" | "custom_domain" | "backend";

export default function PublishModal({ isOpen, onClose }: PublishModalProps) {
  const {
    projectId,
    businessName,
    category,
    isPublished,
    publicSlug,
    setIsPublished,
    setPublicSlug,
  } = useBuilderStore();

  const [activeTab, setActiveTab] = useState<TabType>("wb_url");
  const [copied, setCopied] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Custom Domain State
  const [inputDomain, setInputDomain] = useState("");
  const [isVerifyingDomain, setIsVerifyingDomain] = useState(false);
  const [domainStatus, setDomainStatus] = useState<"none" | "pending_verification" | "verified" | "failed">("none");
  const [domainMessage, setDomainMessage] = useState<string | null>(null);
  const [verifiedDomain, setVerifiedDomain] = useState<string | null>(null);

  // Backend Option State
  const backendAnalysis = detectBackendRequirement(category);
  const [selectedBackendMode, setSelectedBackendMode] = useState<"managed" | "custom">("managed");

  if (!isOpen) return null;

  const publicUrl = publicSlug ? `${window.location.origin}/p/${publicSlug}` : "";

  function handleCopy() {
    if (!publicUrl) return;
    void navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast.success("Link copied!", "Public URL copied to clipboard.");
    setTimeout(() => setCopied(false), 2000);
  }

  async function handlePublish() {
    setIsPublishing(true);
    try {
      let baseSlug = businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      if (!baseSlug) baseSlug = "website";
      const slug = publicSlug || `${baseSlug}-${Math.floor(Math.random() * 10000)}`;
      const { error } = await publishProject(projectId, slug);
      if (error) throw error;
      setIsPublished(true);
      setPublicSlug(slug);
      toast.success("Website Published!", "Your site is live.");
    } catch (err) {
      toast.error("Publish failed", err instanceof Error ? err.message : "Unable to publish.");
    } finally {
      setIsPublishing(false);
    }
  }

  async function handleUnpublish() {
    setIsPublishing(true);
    try {
      const { error } = await unpublishProject(projectId);
      if (error) throw error;
      setIsPublished(false);
      setPublicSlug(null);
      toast.info("Website Unpublished", "Your site is no longer publicly accessible.");
    } catch (err) {
      toast.error("Unpublish failed", err instanceof Error ? err.message : "Unable to unpublish.");
    } finally {
      setIsPublishing(false);
    }
  }

  async function handleVerifyDomain() {
    const cleanDomain = normalizeDomain(inputDomain);
    if (!isValidDomain(cleanDomain)) {
      setDomainMessage("Please enter a valid domain name (e.g. auracafe.com or shop.auracafe.com).");
      setDomainStatus("failed");
      return;
    }

    setIsVerifyingDomain(true);
    setDomainMessage(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch("/api/domains/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token ?? ""}`,
        },
        body: JSON.stringify({
          projectId,
          domain: cleanDomain,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Domain verification failed.");
      }

      setDomainStatus(json.data.status);
      setDomainMessage(json.data.message);
      if (json.data.verified) {
        setVerifiedDomain(cleanDomain);
        toast.success("Domain Verified!", `Traffic routing active for ${cleanDomain}`);
      } else {
        toast.info("DNS Records Pending", "Please configure your DNS records and check again.");
      }
    } catch (err) {
      setDomainStatus("failed");
      const msg = err instanceof Error ? err.message : "Verification request failed.";
      setDomainMessage(msg);
      toast.error("Verification Error", msg);
    } finally {
      setIsVerifyingDomain(false);
    }
  }

  const dnsInstructions = inputDomain ? getDnsInstructions(normalizeDomain(inputDomain)) : [];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-xl rounded-3xl border border-zinc-200 bg-white p-6 sm:p-8 shadow-2xl dark:border-white/10 dark:bg-zinc-900 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400 shadow-xs">
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                  Publishing & Infrastructure
                </h3>
                <p className="text-xs text-zinc-500">
                  Manage live URLs, custom domains, and backend connections
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-white transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex rounded-xl bg-zinc-100 dark:bg-zinc-800/80 p-1 mb-6 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab("wb_url")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg transition",
                activeTab === "wb_url"
                  ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-900 dark:text-white"
                  : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400"
              )}
            >
              <Globe className="h-3.5 w-3.5 text-violet-500" />
              <span>WebsiteBanja URL</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("custom_domain")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg transition",
                activeTab === "custom_domain"
                  ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-900 dark:text-white"
                  : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400"
              )}
            >
              <Link2 className="h-3.5 w-3.5 text-violet-500" />
              <span>Custom Domain</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("backend")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg transition",
                activeTab === "backend"
                  ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-900 dark:text-white"
                  : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400"
              )}
            >
              <Server className="h-3.5 w-3.5 text-violet-500" />
              <span>Backend & APIs</span>
            </button>
          </div>

          {/* Tab 1: WebsiteBanja URL */}
          {activeTab === "wb_url" && (
            <div>
              {isPublished && publicSlug ? (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-50 p-4 text-center dark:bg-emerald-950/20">
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 mb-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      LIVE ON GLOBAL EDGE CDN
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-300">
                      Auto-provisioned with SSL certificate and ultra-fast caching.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
                      Public Website URL
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={publicUrl}
                        className="w-full truncate rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 font-mono text-xs text-zinc-900 outline-none dark:border-white/10 dark:bg-black/40 dark:text-zinc-200"
                      />
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-bold text-zinc-800 shadow-2xs hover:bg-zinc-100 dark:border-white/10 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700 transition"
                      >
                        {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                        <span>{copied ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row gap-3">
                    <a
                      href={`/p/${publicSlug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-violet-600 to-indigo-600 py-3 px-4 text-xs font-bold text-white shadow-md shadow-violet-600/25 transition hover:opacity-95 active:scale-95"
                    >
                      <span>Visit Live Website</span>
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    <button
                      type="button"
                      onClick={() => void handleUnpublish()}
                      disabled={isPublishing}
                      className="rounded-xl border border-red-200 bg-red-50 py-3 px-4 text-xs font-semibold text-red-600 hover:bg-red-100 dark:border-red-900/30 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-900/40 transition disabled:opacity-50"
                    >
                      Unpublish
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-5 text-center py-3">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-zinc-900 dark:text-white">
                      Publish to WebsiteBanja Edge URL
                    </h4>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-sm mx-auto mt-1 leading-relaxed">
                      Generates a high-speed `/p/slug` website link available globally across 300+ CDN edge points.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handlePublish()}
                    disabled={isPublishing}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-violet-600 to-indigo-600 py-3.5 px-4 text-sm font-bold text-white shadow-lg shadow-violet-600/25 transition hover:opacity-95 active:scale-95 disabled:opacity-50"
                  >
                    {isPublishing ? "Publishing..." : "Publish Website Now 🚀"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Custom Domain */}
          {activeTab === "custom_domain" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
                  Enter Your Custom Domain
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. auracafe.com or www.auracafe.com"
                    value={inputDomain}
                    onChange={(e) => setInputDomain(e.target.value)}
                    className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-xs text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-violet-500 dark:border-white/10 dark:bg-black/40 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => void handleVerifyDomain()}
                    disabled={isVerifyingDomain || !inputDomain.trim()}
                    className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-violet-700 disabled:opacity-50 shadow-xs"
                  >
                    {isVerifyingDomain ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                    <span>Verify DNS</span>
                  </button>
                </div>
              </div>

              {/* Status Banner */}
              {domainMessage && (
                <div
                  className={cn(
                    "rounded-xl p-3 text-xs flex items-start gap-2 border",
                    domainStatus === "verified"
                      ? "bg-emerald-50 border-emerald-500/30 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                      : domainStatus === "pending_verification"
                      ? "bg-amber-50 border-amber-500/30 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
                      : "bg-red-50 border-red-500/30 text-red-700 dark:bg-red-950/30 dark:text-red-300"
                  )}
                >
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{domainMessage}</span>
                </div>
              )}

              {/* DNS Configuration Instructions */}
              {inputDomain.trim() && (
                <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50 p-4 dark:border-white/10 dark:bg-zinc-950/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      Required DNS Records
                    </span>
                    <span className="text-[10px] font-mono text-violet-600 dark:text-violet-400">
                      Configure at Domain Registrar
                    </span>
                  </div>

                  <div className="space-y-2">
                    {dnsInstructions.map((rec, i) => (
                      <div
                        key={i}
                        className="grid grid-cols-12 gap-2 text-[11px] font-mono bg-white dark:bg-zinc-900 p-2.5 rounded-xl border border-zinc-200 dark:border-white/5"
                      >
                        <div className="col-span-3 text-zinc-500">Type: <strong className="text-violet-600 dark:text-violet-400">{rec.type}</strong></div>
                        <div className="col-span-3 text-zinc-500 truncate">Host: <strong>{rec.host}</strong></div>
                        <div className="col-span-6 text-zinc-500 truncate">Target: <strong>{rec.value}</strong></div>
                      </div>
                    ))}
                  </div>

                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    Add these DNS records at your domain provider (GoDaddy, Namecheap, Cloudflare, etc.). Once propagated, click &quot;Verify DNS&quot;.
                  </p>
                </div>
              )}

              {verifiedDomain && (
                <div className="pt-2 flex items-center justify-between p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 text-xs">
                  <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                    Active Custom Domain: {verifiedDomain}
                  </span>
                  <a
                    href={`https://${verifiedDomain}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-violet-600 hover:underline flex items-center gap-1"
                  >
                    <span>Test Domain</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Backend Infrastructure */}
          {activeTab === "backend" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-violet-500/30 bg-violet-50/50 p-4 dark:bg-violet-950/20">
                <div className="flex items-center gap-2 mb-1">
                  <Database className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  <span className="text-xs font-bold text-violet-900 dark:text-violet-300 uppercase tracking-wider">
                    {backendAnalysis.title}
                  </span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {backendAnalysis.description}
                </p>
              </div>

              {/* Two Architecture Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Option A: Managed */}
                <div
                  onClick={() => setSelectedBackendMode("managed")}
                  className={cn(
                    "p-4 rounded-2xl border cursor-pointer transition-all space-y-2 flex flex-col justify-between",
                    selectedBackendMode === "managed"
                      ? "border-violet-500 bg-violet-50/40 dark:bg-violet-950/30 ring-1 ring-violet-500"
                      : "border-zinc-200 bg-zinc-50 dark:border-white/10 dark:bg-zinc-900"
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-zinc-900 dark:text-white">
                        {backendAnalysis.options.managed.title}
                      </span>
                      {selectedBackendMode === "managed" && (
                        <Check className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-500 leading-relaxed mb-3">
                      {backendAnalysis.options.managed.description}
                    </p>
                    <ul className="space-y-1">
                      {backendAnalysis.options.managed.features.map((f, i) => (
                        <li key={i} className="text-[10px] text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                          <span className="h-1 w-1 rounded-full bg-violet-500" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 block pt-2">
                    Managed Cloud Setup • Zero Devops
                  </span>
                </div>

                {/* Option B: Custom / BYO Backend */}
                <div
                  onClick={() => setSelectedBackendMode("custom")}
                  className={cn(
                    "p-4 rounded-2xl border cursor-pointer transition-all space-y-2 flex flex-col justify-between",
                    selectedBackendMode === "custom"
                      ? "border-violet-500 bg-violet-50/40 dark:bg-violet-950/30 ring-1 ring-violet-500"
                      : "border-zinc-200 bg-zinc-50 dark:border-white/10 dark:bg-zinc-900"
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-zinc-900 dark:text-white">
                        {backendAnalysis.options.custom.title}
                      </span>
                      {selectedBackendMode === "custom" && (
                        <Check className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-500 leading-relaxed mb-3">
                      {backendAnalysis.options.custom.description}
                    </p>
                    <ul className="space-y-1">
                      {backendAnalysis.options.custom.features.map((f, i) => (
                        <li key={i} className="text-[10px] text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                          <span className="h-1 w-1 rounded-full bg-violet-500" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <span className="text-[10px] font-bold text-zinc-500 block pt-2">
                    Webhook / REST / Supabase BYO
                  </span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    toast.success("Backend Architecture Saved", `Configured for ${selectedBackendMode === "managed" ? "WebsiteBanja Managed Pipeline" : "Custom Webhook Endpoint"}`);
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white px-4 py-2.5 text-xs font-bold transition hover:opacity-90 active:scale-95"
                >
                  <span>Apply Backend Configuration</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
