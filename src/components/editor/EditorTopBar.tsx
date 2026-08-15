"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Sparkles,
  Laptop,
  Tablet,
  Smartphone,
  Undo2,
  Redo2,
  Eye,
  EyeOff,
  Globe,
  Edit3,
} from "lucide-react";
import { useGeneratedWebsiteStore, type ViewportMode } from "@/store/generatedWebsiteStore";
import { useBuilderStore } from "@/store/builderStore";
import { dashboardRoute } from "@/lib/editorRoutes";
import { publishProject, updateProject } from "@/lib/projects";
import { toast } from "@/store/toastStore";
import ThemeToggle from "@/components/theme/ThemeToggle";

export default function EditorTopBar({ onOpenPublishModal }: { onOpenPublishModal: () => void }) {
  const {
    undo,
    redo,
    history,
    historyIndex,
    viewportMode,
    setViewportMode,
    isPreviewMode,
    setIsPreviewMode,
  } = useGeneratedWebsiteStore();

  const {
    projectId,
    businessName,
    setBusinessName,
    isPublished,
    publicSlug,
    setIsPublished,
    setPublicSlug,
  } = useBuilderStore();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(businessName);
  const [isPublishing, setIsPublishing] = useState(false);

  async function handleTitleSubmit() {
    setIsEditingTitle(false);
    if (!titleValue.trim() || titleValue.trim() === businessName) return;
    setBusinessName(titleValue.trim());
    try {
      await updateProject(projectId, { business_name: titleValue.trim(), name: titleValue.trim() });
      toast.success("Project renamed", `New name: ${titleValue.trim()}`);
    } catch {
      // Ignore error
    }
  }

  async function handleQuickPublish() {
    setIsPublishing(true);
    try {
      let baseSlug = businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      if (!baseSlug) baseSlug = "website";
      const slug = publicSlug || `${baseSlug}-${Math.floor(Math.random() * 10000)}`;
      const { error } = await publishProject(projectId, slug);
      if (error) throw error;
      setIsPublished(true);
      setPublicSlug(slug);
      toast.success("Website Published!", `Your site is live at /p/${slug}`);
      onOpenPublishModal();
    } catch (err) {
      toast.error("Publish failed", err instanceof Error ? err.message : "Unable to publish website.");
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <header className="h-16 border-b border-zinc-200/80 bg-white/90 px-4 sm:px-6 flex items-center justify-between z-40 backdrop-blur-xl dark:border-white/10 dark:bg-[#09090B]/90 select-none">
      {/* Left: Back & Editable Project Title */}
      <div className="flex items-center gap-3 min-w-0">
        <Link
          href={dashboardRoute()}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white transition"
          title="Back to Dashboard"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>

        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-blue-600 via-violet-600 to-indigo-600 text-white shadow-xs">
            <Sparkles className="h-4 w-4" />
          </div>

          {isEditingTitle ? (
            <input
              type="text"
              autoFocus
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={() => void handleTitleSubmit()}
              onKeyDown={(e) => e.key === "Enter" && void handleTitleSubmit()}
              className="rounded-md border border-violet-500 bg-zinc-50 px-2 py-0.5 text-sm font-bold text-zinc-900 outline-none ring-2 ring-violet-500/20 dark:bg-zinc-800 dark:text-white max-w-[200px]"
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setTitleValue(businessName);
                setIsEditingTitle(true);
              }}
              className="group flex items-center gap-1.5 text-sm font-bold text-zinc-900 dark:text-white truncate hover:text-violet-600 transition"
              title="Click to rename project"
            >
              <span className="truncate max-w-[160px] sm:max-w-[220px]">
                {businessName || "Untitled Website"}
              </span>
              <Edit3 className="h-3 w-3 text-zinc-400 opacity-0 group-hover:opacity-100 transition" />
            </button>
          )}

          {isPublished && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              LIVE
            </span>
          )}
        </div>
      </div>

      {/* Center: Viewport Controls */}
      <div className="hidden md:flex items-center rounded-xl border border-zinc-200 bg-zinc-100/80 p-1 dark:border-white/10 dark:bg-zinc-900">
        {[
          { mode: "desktop" as ViewportMode, icon: Laptop, label: "Desktop" },
          { mode: "tablet" as ViewportMode, icon: Tablet, label: "Tablet (768px)" },
          { mode: "mobile" as ViewportMode, icon: Smartphone, label: "Mobile (375px)" },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = viewportMode === item.mode;
          return (
            <button
              key={item.mode}
              type="button"
              onClick={() => setViewportMode(item.mode)}
              title={item.label}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                isActive
                  ? "bg-white text-zinc-900 shadow-2xs dark:bg-zinc-800 dark:text-white"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">{item.mode.charAt(0).toUpperCase() + item.mode.slice(1)}</span>
            </button>
          );
        })}
      </div>

      {/* Right Action Stack */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Undo / Redo */}
        <div className="hidden sm:flex items-center rounded-xl border border-zinc-200 bg-zinc-50 dark:border-white/10 dark:bg-zinc-900 p-0.5">
          <button
            type="button"
            onClick={undo}
            disabled={historyIndex <= 0}
            title="Undo (Ctrl+Z)"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 disabled:opacity-40 disabled:hover:bg-transparent dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white transition"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            title="Redo (Ctrl+Y)"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 disabled:opacity-40 disabled:hover:bg-transparent dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white transition"
          >
            <Redo2 className="h-4 w-4" />
          </button>
        </div>

        <ThemeToggle />

        {/* Preview Mode Toggle */}
        <button
          type="button"
          onClick={() => setIsPreviewMode(!isPreviewMode)}
          className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
            isPreviewMode
              ? "border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300"
              : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          }`}
        >
          {isPreviewMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          <span className="hidden sm:inline">{isPreviewMode ? "Edit Studio" : "Preview"}</span>
        </button>

        {/* Primary CTA: Publish */}
        <button
          type="button"
          onClick={() => {
            if (isPublished) {
              onOpenPublishModal();
            } else {
              void handleQuickPublish();
            }
          }}
          disabled={isPublishing}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-violet-600 to-indigo-600 px-4 sm:px-5 py-2 text-xs sm:text-sm font-bold text-white shadow-md shadow-violet-600/25 transition hover:opacity-95 active:scale-95 disabled:opacity-50"
        >
          {isPublishing ? (
            <>
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>Publishing...</span>
            </>
          ) : isPublished ? (
            <>
              <Globe className="h-4 w-4" />
              <span>Publish Settings</span>
            </>
          ) : (
            <>
              <Globe className="h-4 w-4" />
              <span>Publish Website</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}
