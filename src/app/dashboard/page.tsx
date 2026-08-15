"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { signOut } from "@/lib/auth";
import { editorRoute, homeRoute, loginRoute } from "@/lib/editorRoutes";
import {
  createProject,
  getProjects,
  deleteProjectWithStorage,
  duplicateProject,
  updateProject,
} from "@/lib/projects";
import { supabase } from "@/lib/supabase";
import type { Project } from "@/types/project";
import { toast } from "@/store/toastStore";
import ThemeToggle from "@/components/theme/ThemeToggle";
import Logo from "@/components/brand/Logo";
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

  const [projects, setProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isOperatingId, setIsOperatingId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const { data, error: projectsError } = await getProjects();
    if (projectsError) {
      setError(projectsError.message);
      toast.error("Failed to load projects", projectsError.message);
    } else {
      setProjects(data);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    async function initialize() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.replace(loginRoute());
        return;
      }
      await loadProjects();
    }
    void initialize();
  }, [loadProjects, router]);

  async function handleCreateProject() {
    setIsCreating(true);
    setError(null);
    try {
      const { data, error: createError } = await createProject("Untitled Business Website");
      if (createError || !data) throw createError ?? new Error("Unable to create project");
      toast.success("Project created", "Let's build your website with AI.");
      router.push(editorRoute(data.id));
    } catch (caughtError) {
      const msg = caughtError instanceof Error ? caughtError.message : "Unable to create project.";
      setError(msg);
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
      setProjects((prev) => prev.filter((p) => p.id !== id));
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
      setProjects((prev) => [data, ...prev]);
      toast.success("Project duplicated", `Created a copy of your website.`);
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
      setProjects((prev) =>
        prev.map((p) => (p.id === id ? { ...p, name: data.name, business_name: data.business_name || data.name } : p))
      );
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

  const filteredProjects = projects.filter((p) => {
    const displayName = getProjectDisplayName(p);
    return (
      displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  const publishedCount = projects.filter((p) => p.is_published).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#09090B] dark:text-zinc-100 transition-colors duration-200">
      {/* Top Studio Navbar */}
      <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-[#09090B]/80">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-3 group">
            <Logo imageSize={40} subtitleClassName="text-[10px]" />
            <span className="rounded-md bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-700 dark:bg-violet-950/60 dark:text-violet-300">
              STUDIO
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-600 hover:text-red-600 hover:border-red-200 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-red-400 transition"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        {/* Hero Banner with Quick Stats */}
        <motion.div
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="relative rounded-3xl border border-violet-500/30 bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 p-8 sm:p-10 text-white shadow-xl overflow-hidden"
        >
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/15 blur-3xl" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide">
                <Sparkles className="h-3.5 w-3.5" />
                AI Generation Engine Active
              </span>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
                Your AI Website Workspace
              </h1>
              <p className="text-sm text-white/85 leading-relaxed">
                Describe any business, review the curated architecture, and customize your live site in the visual studio.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void handleCreateProject()}
              disabled={isCreating}
              className="flex items-center justify-center gap-2 rounded-2xl bg-white px-7 py-4 text-sm font-bold text-zinc-900 shadow-xl transition hover:bg-zinc-100 active:scale-[0.98] disabled:opacity-60 flex-shrink-0"
            >
              {isCreating ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent" />
                  <span>Creating Studio...</span>
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5 text-violet-600" />
                  <span>Create New Website</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Stat Pills */}
          <div className="mt-8 pt-6 border-t border-white/15 flex flex-wrap items-center gap-6 text-xs font-semibold">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-white/80" />
              <span>{projects.length} Total Websites</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-emerald-300" />
              <span>{publishedCount} Published Live</span>
            </div>
          </div>
        </motion.div>

        {/* Project Section */}
        <section className="mt-12">
          {/* Filter & Title Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                All Websites
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Manage, edit, duplicate, and publish your AI projects
              </p>
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
                  className="w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-4 py-2 text-xs text-zinc-800 placeholder-zinc-400 shadow-2xs transition focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200"
                />
              </div>
            )}
          </div>

          {error && (
            <div
              role="alert"
              className="mb-6 flex items-center justify-between rounded-2xl border border-red-500/40 bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
            >
              <span>{error}</span>
              <button
                type="button"
                onClick={() => void loadProjects()}
                className="underline font-semibold"
              >
                Retry
              </button>
            </div>
          )}

          {isLoading ? (
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
                className="mt-3 text-xs font-bold text-violet-600 hover:underline"
              >
                Clear Search
              </button>
            </div>
          ) : projects.length === 0 ? (
            /* Empty State */
            <div className="rounded-3xl border border-dashed border-zinc-300 bg-white/50 p-16 text-center dark:border-white/10 dark:bg-zinc-900/20">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400 mb-4">
                <Sparkles className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                No websites created yet
              </h3>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
                Describe your business idea, pick your preferred brand style, and watch AI build your entire website in under 60 seconds.
              </p>
              <button
                type="button"
                onClick={() => void handleCreateProject()}
                disabled={isCreating}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-violet-600 to-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-600/25 transition hover:opacity-95 active:scale-95 disabled:opacity-60"
              >
                <Plus className="h-4 w-4" />
                Create Your First Website
              </button>
            </div>
          ) : (
            /* Project Grid */
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProjects.map((project, index) => {
                const hasData = project.json_data && Object.keys(project.json_data).length > 0;
                const route = hasData
                  ? editorRoute(project.id, "workspace")
                  : editorRoute(project.id);
                const isOperating = isOperatingId === project.id;
                const isLive = project.is_published && project.public_slug;

                return (
                  <motion.article
                    key={project.id}
                    initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: index * 0.04 }}
                    whileHover={shouldReduceMotion ? {} : { y: -3 }}
                    className="rounded-3xl border border-zinc-200/90 bg-white p-6 shadow-xs backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/60 transition-all hover:shadow-lg flex flex-col justify-between group"
                  >
                    <div>
                      {/* Header Badge Row */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/60 px-2.5 py-0.5 rounded-md border border-violet-200/60 dark:border-violet-800/40">
                          {project.category || "General Business"}
                        </span>

                        {isLive && (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              LIVE
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyLiveUrl(project.public_slug!, project.id)}
                              title="Copy Live URL"
                              className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white transition p-1"
                            >
                              {copiedId === project.id ? (
                                <Check className="h-3.5 w-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
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
                        <h3 className="mt-1 text-lg font-bold text-zinc-900 dark:text-white flex items-center justify-between group/title">
                          <span className="truncate">{getProjectDisplayName(project)}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setRenamingId(project.id);
                              setRenameValue(getProjectDisplayName(project));
                            }}
                            className="opacity-0 group-hover/title:opacity-100 text-zinc-400 hover:text-zinc-700 dark:hover:text-white transition p-1"
                            title="Rename Project"
                            disabled={isOperating}
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                        </h3>
                      )}

                      {/* Metadata Details */}
                      <dl className="mt-4 space-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                        <div className="flex justify-between">
                          <span>Updated</span>
                          <span className="font-mono text-zinc-700 dark:text-zinc-300">
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
                              className="font-mono text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1"
                            >
                              /p/{project.public_slug}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        )}
                      </dl>
                    </div>

                    {/* Actions Row */}
                    <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-white/5 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => router.push(route)}
                        disabled={isOperating}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-zinc-900 py-2.5 px-4 text-xs font-bold text-white transition hover:bg-zinc-800 active:scale-[0.98] dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 disabled:opacity-50"
                      >
                        <span>Open Studio</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleDuplicate(project.id)}
                        disabled={isOperating}
                        title="Duplicate Website"
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition active:scale-95 disabled:opacity-50"
                      >
                        <Copy className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleDelete(project.id, project.name)}
                        disabled={isOperating}
                        title="Delete Website"
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-900/30 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-900/50 transition active:scale-95 disabled:opacity-50"
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
    </div>
  );
}
