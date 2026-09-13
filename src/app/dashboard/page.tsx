"use client";

import { useEffect, useState, useCallback } from "react";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { signOut } from "@/lib/auth";
import { authCallbackRoute, editorRoute, homeRoute, loginRoute } from "@/lib/editorRoutes";
import {
  createProject,
  deleteProjectWithStorage,
  duplicateProject,
  updateProject,
} from "@/lib/projects";
import { useProjectsStore } from "@/store/projectsStore";
import { supabase } from "@/lib/supabase";
import type { Project } from "@/types/project";
import { toast } from "@/store/toastStore";
import ThemeToggle from "@/components/theme/ThemeToggle";
import Logo from "@/components/brand/Logo";
import ProUpgradeModal from "@/components/billing/ProUpgradeModal";
import {
  Sparkles,
  Plus,
  LogOut,
  ExternalLink,
  Copy,
  Trash2,
  Edit3,
  Search,
  Check,
  Globe,
  Layers,
  ArrowRight,
  Clock,
  ShieldCheck,
  X,
  AlertCircle,
} from "lucide-react";

function formatDate(value?: string) {
  return value
    ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(
        new Date(value)
      )
    : "—";
}

export default function Dashboard() {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();

  const {
    projects,
    isLoading: storeLoading,
    isInitialLoaded,
    error: storeError,
    loadProjects,
    addProject,
    updateProjectInList,
    removeProjectFromList,
  } = useProjectsStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "published" | "drafts">("all");
  const [isCreating, setIsCreating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [isOperatingId, setIsOperatingId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [subscription, setSubscription] = useState<{
    planId: string;
    isPro: boolean;
    status: string;
    expiresAt?: string | null;
    isExpiringSoon?: boolean;
    formattedExpiryDate?: string;
  }>({ planId: "free", isPro: false, status: "free" });
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isRenewalModalOpen, setIsRenewalModalOpen] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);

  // Show full loading skeleton on true initial cold-start before initial load completes
  const isInitialLoading = !isInitialLoaded || (storeLoading && projects.length === 0);

  const loadUserSubscription = useCallback(async (token: string) => {
    try {
      const subRes = await fetch("/api/subscription", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (subRes.ok) {
        const subJson = await subRes.json();
        if (subJson.success && subJson.data) {
          setSubscription({
            planId: subJson.data.planId,
            isPro: subJson.data.isPro,
            status: subJson.data.status,
            expiresAt: subJson.data.expiresAt,
            isExpiringSoon: subJson.data.isExpiringSoon,
            formattedExpiryDate: subJson.data.formattedExpiryDate,
          });
        }
      }
    } catch (subErr) {
      console.warn("Failed to load subscription status:", subErr);
    }
  }, []);

  useEffect(() => {
    // Fallback: If code is present in query parameters, forward to dedicated auth callback
    if (typeof window !== "undefined" && window.location.search.includes("code=")) {
      router.replace(`${authCallbackRoute()}${window.location.search}`);
      return;
    }

    let isMounted = true;

    // 1. Check existing session immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      if (!session) {
        router.replace(loginRoute());
        return;
      }
      void loadProjects();
      void loadUserSubscription(session.access_token);
    });


    // 2. Listen to ongoing auth state transitions (login, logout, token refresh)
    const {
      data: { subscription: authListener },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      if (event === "SIGNED_OUT") {
        router.replace(loginRoute());
      } else if (session?.user) {
        void loadProjects();
        void loadUserSubscription(session.access_token);
      }
    });

    return () => {
      isMounted = false;
      authListener?.unsubscribe();
    };
  }, [loadProjects, router]);

  async function handleTogglePlan(targetPlan: "paid_pro" | "free") {
    setIsUpgrading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch("/api/subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token ?? ""}`,
        },
        body: JSON.stringify({ planId: targetPlan }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to update subscription.");
      }
      setSubscription({
        planId: json.data.planId,
        isPro: json.data.isPro,
        status: json.data.status,
      });
      if (json.data.isPro) {
        toast.success("Paid Pro Activated!", "50 AI requests per 7 days & custom domains are now enabled.");
      } else {
        toast.info("Plan Updated", "Switched back to Free Starter tier.");
      }
      setIsPlanModalOpen(false);
    } catch (err) {
      toast.error("Plan update failed", err instanceof Error ? err.message : "Unable to change plan.");
    } finally {
      setIsUpgrading(false);
    }
  }

  async function handleCreateProject() {
    setIsCreating(true);
    setActionError(null);
    try {
      const { data, error: createError } = await createProject("Untitled Business Website");
      if (createError || !data) throw createError ?? new Error("Unable to create project");
      addProject(data);
      toast.success("Project created", "Let's build your website with AI.");
      router.push(editorRoute(data.id));
    } catch (caughtError) {
      const msg = caughtError instanceof Error ? caughtError.message : "Unable to create project.";
      setActionError(msg);
      toast.error("Error creating project", msg);
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) {
      return;
    }
    setIsOperatingId(id);
    try {
      const { error: deleteError } = await deleteProjectWithStorage(id);
      if (deleteError) throw deleteError;
      removeProjectFromList(id);
      toast.success("Project deleted", `"${name}" was permanently removed.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete project.";
      toast.error("Deletion failed", msg);
    } finally {
      setIsOperatingId(null);
    }
  }

  async function handleDuplicate(id: string) {
    setIsOperatingId(id);
    try {
      const { data, error: dupError } = await duplicateProject(id);
      if (dupError || !data) throw dupError ?? new Error("Failed to duplicate");
      addProject(data);
      toast.success("Project duplicated", "Created a copy of your website.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to duplicate project.";
      toast.error("Duplication failed", msg);
    } finally {
      setIsOperatingId(null);
    }
  }

  async function handleRenameSubmit(id: string) {
    if (!renameValue.trim()) {
      setRenamingId(null);
      return;
    }
    setIsOperatingId(id);
    try {
      const { data, error: updateErr } = await updateProject(id, {
        name: renameValue.trim(),
        business_name: renameValue.trim(),
      });
      if (updateErr || !data) throw updateErr ?? new Error("Failed to rename");
      updateProjectInList(id, {
        name: data.name,
        business_name: data.business_name || data.name,
      });
      toast.success("Project renamed", `New name: ${data.name}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to rename project.";
      toast.error("Rename failed", msg);
    } finally {
      setRenamingId(null);
      setIsOperatingId(null);
    }
  }

  function handleCopyLiveUrl(slug: string, projectId: string) {
    const url = `${window.location.origin}/p/${slug}`;
    void navigator.clipboard.writeText(url);
    setCopiedId(projectId);
    toast.success("Link copied!", "Public website URL copied to clipboard.");
    setTimeout(() => setCopiedId(null), 2500);
  }

  async function handleLogout() {
    await signOut();
    router.push(homeRoute());
  }

  function getProjectDisplayName(p: Project): string {
    const rawBusinessName = p.business_name?.trim();
    const rawName = p.name?.trim();

    if (rawBusinessName && rawBusinessName.length > 0) {
      return rawBusinessName;
    }
    if (rawName && !rawName.toLowerCase().includes("untitled")) {
      return rawName;
    }
    if (rawName && rawName.length > 0) {
      return rawName;
    }
    return "Untitled Website";
  }

  const publishedCount = projects.filter((p) => p.is_published).length;
  const draftsCount = projects.length - publishedCount;

  const filteredProjects = projects.filter((p) => {
    const displayName = getProjectDisplayName(p);
    const matchesSearch =
      displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterTab === "published") return p.is_published;
    if (filterTab === "drafts") return !p.is_published;
    return true;
  });

  const displayError = actionError || storeError;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#09090B] dark:text-zinc-100 transition-colors duration-200">
      {/* Top Studio Executive Navbar */}
      <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-[#09090B]/80">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded-lg">
            <Logo imageSize={40} subtitleClassName="text-[10px]" />
            <span className="rounded-md bg-violet-100 px-2 py-0.5 text-[10px] font-mono font-bold text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 border border-violet-200/60 dark:border-violet-800/40">
              STUDIO
            </span>
          </Link>

          <div className="flex items-center gap-3">
            {/* Pro Plan Indicator & Upgrade Trigger */}

            {subscription.isPro ? (
              subscription.isExpiringSoon ? (
                <button
                  type="button"
                  onClick={() => setIsRenewalModalOpen(true)}
                  className="flex items-center gap-1.5 rounded-xl border border-amber-500/60 bg-amber-50/90 px-3 py-1.5 text-xs font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700 shadow-xs hover:scale-105 transition cursor-pointer animate-pulse"
                  title="Your Pro plan expires tomorrow. Click to renew for ₹500."
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  <span>Pro expires tomorrow</span>
                  <span className="rounded-lg bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-900 dark:text-amber-200">
                    Renew Pro — ₹500
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsPlanModalOpen(true)}
                  className="flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-50/80 px-3 py-1.5 text-xs font-bold text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800/60 shadow-xs hover:scale-105 transition cursor-pointer"
                  title={`Pro plan active until ${subscription.formattedExpiryDate || "30 days"}`}
                >
                  <Sparkles className="h-3.5 w-3.5 text-cyan-500" />
                  <span>Pro • Active until {subscription.formattedExpiryDate || "30 days"}</span>
                </button>
              )
            ) : (
              <button
                type="button"
                onClick={() => setIsUpgradeModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:opacity-95 hover:scale-105 transition cursor-pointer"
                title="Upgrade to Paid Pro"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Free Plan • Upgrade to Pro — ₹500/month</span>
              </button>
            )}

            <ThemeToggle />
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-600 hover:text-red-600 hover:border-red-200 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-red-400 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10 space-y-10">
        {/* 24-Hour Expiry Notification Banner */}
        {subscription.isPro && subscription.isExpiringSoon && (
          <motion.div
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-amber-500/40 bg-amber-50/90 dark:bg-amber-950/40 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md backdrop-blur-sm"
          >
            <div className="flex items-start sm:items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-amber-950 dark:text-amber-200">
                  Your Pro plan expires tomorrow.
                </h4>
                <p className="text-xs text-amber-800/90 dark:text-amber-300/90 mt-0.5 leading-relaxed">
                  Your Pro access will expire in 1 day. Renew Pro to continue enjoying Unlimited Studio Changes and Pro features.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsRenewalModalOpen(true)}
              className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-md hover:opacity-95 active:scale-[0.98] transition cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Renew Pro — ₹500</span>
            </button>
          </motion.div>
        )}

        {/* Executive Studio Header with Tactile Surface & Primary Action */}
        <motion.div
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="relative rounded-3xl border border-zinc-200/90 bg-white p-8 sm:p-10 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/60 overflow-hidden"
        >
          <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-violet-600/10 blur-3xl" />
          <div className="pointer-events-none absolute -left-24 -bottom-24 h-80 w-80 rounded-full bg-blue-600/10 blur-3xl" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 border border-violet-200/60 px-3.5 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-950/60 dark:border-violet-800/40 dark:text-violet-300">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Mitra AI Architect • Connected</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-zinc-950 dark:text-white">
                Studio Workspace
              </h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
                Manage, customize, and publish your autonomous AI websites. Everything is rendered live and synchronized across global edge servers.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void handleCreateProject()}
              disabled={isCreating}
              className="flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 px-7 py-4 text-sm font-bold text-white shadow-lg shadow-violet-600/25 transition-all hover:shadow-xl hover:shadow-violet-600/35 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 flex-shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-500/30"
            >
              {isCreating ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Synthesizing Studio...</span>
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5" />
                  <span>Create New Website</span>
                </>
              )}
            </button>
          </div>

          {/* Tactile Workspace Metrics Row */}
          <div className="mt-8 pt-6 border-t border-zinc-100 dark:border-white/5 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-zinc-200/70 bg-zinc-50/70 p-4 dark:border-white/5 dark:bg-zinc-950/40">
              <span className="text-[11px] font-mono uppercase text-zinc-500 font-bold block mb-1">
                Total Sites
              </span>
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                <span className="text-2xl font-black text-zinc-900 dark:text-white">
                  {projects.length}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200/70 bg-zinc-50/70 p-4 dark:border-white/5 dark:bg-zinc-950/40">
              <span className="text-[11px] font-mono uppercase text-zinc-500 font-bold block mb-1">
                Published Live
              </span>
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-emerald-500" />
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {publishedCount}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200/70 bg-zinc-50/70 p-4 dark:border-white/5 dark:bg-zinc-950/40">
              <span className="text-[11px] font-mono uppercase text-zinc-500 font-bold block mb-1">
                Draft Workspaces
              </span>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                <span className="text-2xl font-black text-zinc-900 dark:text-white">
                  {draftsCount}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200/70 bg-zinc-50/70 p-4 dark:border-white/5 dark:bg-zinc-950/40">
              <span className="text-[11px] font-mono uppercase text-zinc-500 font-bold block mb-1">
                Global Edge CDN
              </span>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-blue-500" />
                <span className="text-2xl font-black text-zinc-900 dark:text-white">
                  Active
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Project Section & Filter Toolbar */}
        <section aria-label="All Websites" className="space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Filter Tabs */}
            <div className="flex items-center gap-2 p-1 rounded-2xl border border-zinc-200/80 bg-white/80 dark:border-white/10 dark:bg-zinc-900/60 shadow-xs">
              <button
                type="button"
                onClick={() => setFilterTab("all")}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
                  filterTab === "all"
                    ? "bg-zinc-900 text-white shadow-xs dark:bg-white dark:text-zinc-900"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                }`}
              >
                All Projects ({projects.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("published")}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  filterTab === "published"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>Live ({publishedCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("drafts")}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
                  filterTab === "drafts"
                    ? "bg-zinc-900 text-white shadow-xs dark:bg-white dark:text-zinc-900"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                }`}
              >
                Drafts ({draftsCount})
              </button>
            </div>

            {/* Search Input */}
            {projects.length > 0 && (
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search websites..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-8 py-2 text-xs text-zinc-800 placeholder-zinc-400 shadow-2xs transition focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          {displayError && (
            <div
              role="alert"
              className="flex items-center justify-between rounded-2xl border border-red-500/40 bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
            >
              <span>{displayError}</span>
              <button
                type="button"
                onClick={() => void loadProjects(true)}
                className="underline font-semibold cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {isInitialLoading ? (
            <div className="rounded-3xl border border-zinc-200 bg-white/70 p-16 text-center shadow-xs dark:border-white/10 dark:bg-zinc-900/40">
              <span className="inline-block h-7 w-7 animate-spin rounded-full border-2 border-violet-600 border-t-transparent mb-3" />
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Loading your AI workspace...
              </p>
            </div>
          ) : filteredProjects.length === 0 && searchQuery ? (
            <div className="rounded-3xl border border-zinc-200 bg-white/70 p-12 text-center shadow-xs dark:border-white/10 dark:bg-zinc-900/40">
              <p className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
                No websites match &quot;{searchQuery}&quot;
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="mt-3 text-xs font-bold text-violet-600 hover:underline cursor-pointer"
              >
                Clear Search
              </button>
            </div>
          ) : isInitialLoaded && projects.length === 0 ? (
            /* Empty State */
            <div className="rounded-3xl border border-dashed border-zinc-300 bg-white/50 p-16 text-center dark:border-white/10 dark:bg-zinc-900/20">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400 mb-4">
                <Sparkles className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold text-zinc-950 dark:text-white">
                No websites created yet
              </h3>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
                Describe your business idea, pick your preferred brand style, and watch AI build your entire website in under 60 seconds.
              </p>
              <button
                type="button"
                onClick={() => void handleCreateProject()}
                disabled={isCreating}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-violet-600 to-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-600/25 transition hover:opacity-95 active:scale-95 disabled:opacity-60 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Create Your First Website
              </button>
            </div>
          ) : (
            /* Studio Project Cards Grid with Viewport Thumbnails */
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProjects.map((project, index) => {
                const route = editorRoute(project.id, "workspace");
                const isOperating = isOperatingId === project.id;
                const isLive = project.is_published && project.public_slug;
                const displayName = getProjectDisplayName(project);

                return (
                  <motion.article
                    key={project.id}
                    initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: index * 0.04 }}
                    whileHover={shouldReduceMotion ? {} : { y: -3 }}
                    className="rounded-3xl border border-zinc-200/90 bg-white p-5 shadow-xs backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/70 transition-all hover:shadow-xl flex flex-col justify-between group overflow-hidden"
                  >
                    <div>
                      {/* Simulated Browser Viewport Thumbnail Preview */}
                      <div className="mb-4 rounded-2xl border border-zinc-200/80 bg-zinc-950 p-3 shadow-inner text-white overflow-hidden relative">
                        {/* Mini browser chrome */}
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-2.5 text-[10px] text-zinc-400">
                          <div className="flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500/80" />
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500/80" />
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/80" />
                          </div>
                          <span className="font-mono text-[9px] text-zinc-500 truncate max-w-[140px]">
                            {isLive ? `${project.public_slug}.websitebanja.live` : "preview-canvas"}
                          </span>
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        </div>

                        {/* Simulated Page Content Sketch */}
                        <div className="space-y-2 py-2 text-center">
                          <span className="inline-block h-1 w-8 rounded-full bg-violet-400/60 mx-auto" />
                          <div className="h-3 w-3/4 mx-auto rounded-md bg-zinc-800" />
                          <div className="h-2 w-1/2 mx-auto rounded-md bg-zinc-800/60" />
                          <div className="pt-2 flex justify-center gap-1.5">
                            <span className="h-3 w-12 rounded-md bg-violet-600/80 inline-block" />
                            <span className="h-3 w-10 rounded-md bg-zinc-800 inline-block" />
                          </div>
                        </div>

                        {/* Hover Overlay "Open in Studio" */}
                        <div className="absolute inset-0 bg-zinc-950/70 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center backdrop-blur-xs">
                          <button
                            type="button"
                            onClick={() => router.push(route)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-1.5 text-xs font-bold text-zinc-900 shadow-md transition hover:scale-105"
                          >
                            <span>Open Studio</span>
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      {/* Header Badge & Status Row */}
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/60 px-2.5 py-0.5 rounded-md border border-violet-200/60 dark:border-violet-800/40">
                          {project.category || "General Business"}
                        </span>

                        {isLive ? (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              LIVE
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyLiveUrl(project.public_slug!, project.id)}
                              aria-label="Copy Live URL"
                              title="Copy Live URL"
                              className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white transition p-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded"
                            >
                              {copiedId === project.id ? (
                                <Check className="h-3.5 w-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="rounded-md bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-mono text-zinc-500">
                            DRAFT
                          </span>
                        )}
                      </div>

                      {/* Project Title */}
                      {renamingId === project.id ? (
                        <input
                          type="text"
                          autoFocus
                          className="mt-1 w-full rounded-lg border border-violet-500 bg-zinc-50 px-2.5 py-1 text-base font-bold text-zinc-900 outline-none ring-2 ring-violet-500/20 dark:bg-zinc-800 dark:text-white"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={() => void handleRenameSubmit(project.id)}
                          onKeyDown={(e) => e.key === "Enter" && handleRenameSubmit(project.id)}
                          maxLength={100}
                          disabled={isOperating}
                        />
                      ) : (
                        <h3 className="mt-1 text-base font-bold text-zinc-950 dark:text-white flex items-center justify-between group/title">
                          <span className="truncate">{displayName}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setRenamingId(project.id);
                              setRenameValue(displayName);
                            }}
                            className="opacity-0 group-hover/title:opacity-100 text-zinc-400 hover:text-zinc-700 dark:hover:text-white transition p-1 cursor-pointer focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded"
                            aria-label="Rename Project"
                            title="Rename Project"
                            disabled={isOperating}
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                        </h3>
                      )}

                      {/* Metadata Details */}
                      <dl className="mt-3 space-y-1 text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                        <div className="flex justify-between">
                          <span>Updated</span>
                          <span className="text-zinc-700 dark:text-zinc-300">
                            {formatDate(project.updated_at ?? project.created_at)}
                          </span>
                        </div>
                        {isLive && (
                          <div className="flex justify-between items-center pt-1 text-[11px]">
                            <span>Public Link</span>
                            <a
                              href={`/p/${project.public_slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded"
                            >
                              /p/{project.public_slug}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        )}
                      </dl>
                    </div>

                    {/* Actions Row */}
                    <div className="mt-5 pt-3.5 border-t border-zinc-100 dark:border-white/5 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => router.push(route)}
                        disabled={isOperating}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-zinc-900 py-2.5 px-4 text-xs font-bold text-white transition hover:bg-zinc-800 active:scale-[0.98] dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                      >
                        <span>Open Studio</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleDuplicate(project.id)}
                        disabled={isOperating}
                        aria-label="Duplicate Website"
                        title="Duplicate Website"
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition active:scale-95 disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                      >
                        <Copy className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleDelete(project.id, project.name)}
                        disabled={isOperating}
                        aria-label="Delete Website"
                        title="Delete Website"
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-900/30 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-900/50 transition active:scale-95 disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Plan Management / Upgrade Modal */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <motion.div
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-6 sm:p-8 shadow-2xl dark:border-white/10 dark:bg-zinc-900 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-600 dark:bg-cyan-950/60 dark:text-cyan-400">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                    Subscription & Plans
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Transparent pricing with zero hidden fees
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPlanModalOpen(false)}
                className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-white transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {/* Free Tier Card */}
              <div className={`rounded-2xl border p-4 flex flex-col justify-between ${
                !subscription.isPro
                  ? "border-zinc-900 bg-zinc-50 dark:border-white dark:bg-zinc-800/60"
                  : "border-zinc-200 bg-white dark:border-white/5 dark:bg-zinc-950/40"
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase text-zinc-500">Free Starter</span>
                    {!subscription.isPro && (
                      <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-bold text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="text-2xl font-black text-zinc-900 dark:text-white">₹0</div>
                  <span className="text-[11px] text-zinc-500">forever free</span>
                  <ul className="mt-3 space-y-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                    <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500" /> 3 AI requests/7d</li>
                    <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500" /> WebsiteBanja URL</li>
                    <li className="flex items-center gap-1.5 text-zinc-400 line-through"><X className="h-3 w-3" /> Custom domain</li>
                  </ul>
                </div>
                {subscription.isPro && (
                  <button
                    type="button"
                    onClick={() => void handleTogglePlan("free")}
                    disabled={isUpgrading}
                    className="mt-4 w-full rounded-xl border border-zinc-300 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-white/10 dark:text-zinc-300 transition cursor-pointer"
                  >
                    Switch to Free
                  </button>
                )}
              </div>

              {/* Paid Pro Card */}
              <div className={`rounded-2xl border-2 p-4 flex flex-col justify-between ${
                subscription.isPro
                  ? "border-cyan-500 bg-cyan-50/40 dark:bg-cyan-950/20 shadow-md"
                  : "border-cyan-500/60 bg-gradient-to-b from-cyan-50/60 to-white dark:from-cyan-950/30 dark:to-zinc-900 shadow-md"
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase text-cyan-600 dark:text-cyan-400">Paid Pro</span>
                    {subscription.isPro && (
                      <span className="rounded-full bg-cyan-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="text-2xl font-black text-zinc-900 dark:text-white">₹500</div>
                  <span className="text-[11px] text-zinc-500">/ month</span>
                  <ul className="mt-3 space-y-1.5 text-xs text-zinc-700 dark:text-zinc-300">
                    <li className="flex items-center gap-1.5 font-semibold text-cyan-700 dark:text-cyan-300"><Check className="h-3 w-3 text-emerald-500" /> 50 AI requests/7d</li>
                    <li className="flex items-center gap-1.5 font-semibold text-cyan-700 dark:text-cyan-300"><Check className="h-3 w-3 text-emerald-500" /> Custom domains</li>
                    <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500" /> Remove footer badge</li>
                    <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500" /> Priority edge CDN</li>
                  </ul>
                </div>
                {!subscription.isPro && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsPlanModalOpen(false);
                      setIsUpgradeModalOpen(true);
                    }}
                    className="mt-4 w-full rounded-xl bg-cyan-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-cyan-700 transition cursor-pointer"
                  >
                    Upgrade to Pro — ₹500/month
                  </button>
                )}
              </div>
            </div>

            <p className="text-[11px] text-center text-zinc-500 dark:text-zinc-400">
              Payments are billed in Indian Rupees (₹). You can change or cancel your subscription at any time.
            </p>
          </motion.div>
        </div>
      )}

      {/* Pro Upgrade Modal */}
      <ProUpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        title="Upgrade to Pro"
        subtitle="Get 30 days of Unlimited Studio Changes, custom domains, and premium features."
        ctaText="Upgrade to Pro — ₹500/month"
        onUpgradeSuccess={() => {
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.access_token) void loadUserSubscription(session.access_token);
          });
        }}
      />

      {/* Pro Renewal Modal */}
      <ProUpgradeModal
        isOpen={isRenewalModalOpen}
        onClose={() => setIsRenewalModalOpen(false)}
        isRenewal={true}
        title="Your Pro plan expires tomorrow."
        subtitle="Your Pro access will expire in 1 day. Renew Pro to continue enjoying Unlimited Studio Changes and Pro features."
        ctaText="Renew Pro — ₹500"
        onUpgradeSuccess={() => {
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.access_token) void loadUserSubscription(session.access_token);
          });
        }}
      />
    </div>
  );
}

