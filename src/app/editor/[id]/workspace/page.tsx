"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { cn } from "@/lib/utils";

import EditorTopBar from "@/components/editor/EditorTopBar";
import EditorSidebar from "@/components/editor/EditorSidebar";
import WebsiteRenderer from "@/components/editor/WebsiteRenderer";
import SectionEditor from "@/components/editor/SectionEditor";
import PublishModal from "@/components/editor/PublishModal";
import ProductFullScreenEditor from "@/components/editor/ProductFullScreenEditor";
import CatalogManager from "@/components/editor/CatalogManager";

import { useBuilderStore } from "@/store/builderStore";
import { useGeneratedWebsiteStore } from "@/store/generatedWebsiteStore";
import { useProjectAutosave } from "@/hooks/useProjectAutosave";
import { getProject } from "@/lib/projects";
import type { WebsiteData } from "@/types/website";
import {
  EyeOff,
  Laptop,
  Tablet,
  Smartphone,
  Sparkles,
  Layers,
  Sliders,
  Eye,
  Globe,
} from "lucide-react";

export default function WorkspacePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const projectId = useBuilderStore((state) => state.projectId);
  const effectiveProjectId = params?.id || projectId;

  const setBusinessName = useBuilderStore((state) => state.setBusinessName);
  const setIsPublished = useBuilderStore((state) => state.setIsPublished);
  const setPublicSlug = useBuilderStore((state) => state.setPublicSlug);
  const setPrimaryColor = useBuilderStore((state) => state.setPrimaryColor);
  const setSecondaryColor = useBuilderStore((state) => state.setSecondaryColor);
  const setStyle = useBuilderStore((state) => state.setStyle);
  const setCategory = useBuilderStore((state) => state.setCategory);

  const {
    website,
    setWebsite,
    isPreviewMode,
    setIsPreviewMode,
    viewportMode,
    setViewportMode,
    selectedSection,
    isRightPanelOpen,
    setIsRightPanelOpen,
    rightPanelWidth,
    setRightPanelWidth,
    undo,
    redo,
  } = useGeneratedWebsiteStore();

  const [isLoading, setIsLoading] = useState(true);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<"canvas" | "layers" | "edit">("canvas");
  const [isResizing, setIsResizing] = useState(false);

  const hasFetchedRef = useRef(false);

  // Auto-save any changes to website data back to Supabase
  const { isSaving, isError } = useProjectAutosave(effectiveProjectId, {
    json_data: website || undefined,
  });

  // Global Keyboard Shortcuts for Undo & Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is actively typing in an input or textarea
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const isCmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      if (isCmdOrCtrl && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if (isCmdOrCtrl && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  // Resizable Right Panel Handlers
  const handleMouseDownResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      setRightPanelWidth(newWidth);
    },
    [isResizing, setRightPanelWidth]
  );

  const handleMouseUp = useCallback(() => {
    if (isResizing) {
      setIsResizing(false);
    }
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    async function loadWorkspace() {
      if (!effectiveProjectId) return;

      if (website && !hasFetchedRef.current) {
        setIsLoading(false);
        return;
      }

      if (hasFetchedRef.current) return;
      hasFetchedRef.current = true;

      const { data, error } = await getProject(effectiveProjectId);
      if (error || !data) {
        router.push("/dashboard");
        return;
      }

      // Populate builder store meta
      if (data.business_name || data.name) setBusinessName(data.business_name || data.name);
      if (data.category) setCategory(data.category);
      if (data.style) setStyle(data.style);
      if (data.is_published !== undefined) setIsPublished(data.is_published);
      if (data.public_slug) setPublicSlug(data.public_slug);
      if (data.primary_color) setPrimaryColor(data.primary_color);
      if (data.secondary_color) setSecondaryColor(data.secondary_color);

      if (data.json_data && Object.keys(data.json_data).length > 0) {
        setWebsite(data.json_data as WebsiteData);
      } else {
        router.push(`/editor/${projectId}`);
        return;
      }

      setIsLoading(false);
    }

    loadWorkspace();
  }, [
    projectId,
    effectiveProjectId,
    website,
    setWebsite,
    router,
    setBusinessName,
    setCategory,
    setStyle,
    setIsPublished,
    setPublicSlug,
    setPrimaryColor,
    setSecondaryColor,
  ]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 text-zinc-600 dark:bg-[#09090B] dark:text-zinc-400">
        <div className="text-center space-y-3">
          <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 via-violet-600 to-indigo-600 text-white shadow-lg animate-pulse">
            <Sparkles className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold">Opening AI Studio Workspace...</p>
        </div>
      </div>
    );
  }

  // Device width constraints for the canvas on desktop screens
  const canvasWidthClass =
    viewportMode === "mobile"
      ? "w-full lg:max-w-[375px] my-0 lg:my-6 rounded-none lg:rounded-3xl border-0 lg:border-8 border-zinc-800 shadow-2xl overflow-hidden"
      : viewportMode === "tablet"
      ? "w-full lg:max-w-[768px] my-0 lg:my-6 rounded-none lg:rounded-3xl border-0 lg:border-8 border-zinc-800 shadow-2xl overflow-hidden"
      : "w-full min-h-full";

  return (
    <div className="flex h-screen w-full flex-col bg-slate-100 dark:bg-[#09090B] overflow-hidden">
      {/* Top Studio Toolbar */}
      {!isPreviewMode && (
        <EditorTopBar
          onOpenPublishModal={() => setIsPublishModalOpen(true)}
          isSaving={isSaving}
          isError={isError}
        />
      )}

      {/* Main Studio Body */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Section Sidebar (Desktop permanent, Mobile switchable) */}
        {!isPreviewMode && (
          <aside
            data-lenis-prevent
            className={cn(
              "bg-white dark:bg-zinc-950 overflow-y-auto z-20 transition-all",
              // Desktop layout:
              "hidden lg:block lg:w-80 lg:flex-shrink-0 lg:border-r lg:border-zinc-200/80 lg:dark:border-white/10",
              // Mobile layout when layers tab active:
              mobileTab === "layers" && "fixed inset-x-0 top-16 bottom-16 block z-30 w-full"
            )}
          >
            <EditorSidebar />
          </aside>
        )}

        {/* Center Canvas Area */}
        <main
          id="canvas-scroll-container"
          data-lenis-prevent
          className={cn(
            "flex-1 relative overflow-y-auto bg-slate-200/70 dark:bg-black/60 flex flex-col items-center transition-all scroll-smooth pb-16 lg:pb-0",
            isPreviewMode ? "p-0" : "p-0 sm:p-4 lg:p-6",
            // Hide canvas on mobile if user is looking at Layers or Edit Inspector
            !isPreviewMode && mobileTab !== "canvas" && "hidden lg:flex"
          )}
        >
          <div className={cn("transition-all duration-300 min-h-full", canvasWidthClass)}>
            <WebsiteRenderer />
          </div>
        </main>

        {/* Right Contextual Inspector Panel (Closed by default, opens on element selection, smoothly resizable) */}
        {!isPreviewMode && (isRightPanelOpen || mobileTab === "edit") && (
          <aside
            data-lenis-prevent
            style={{ width: `${rightPanelWidth}px` }}
            className={cn(
              "relative bg-white dark:bg-zinc-950 overflow-y-auto z-20 flex flex-col flex-shrink-0 border-l border-zinc-200/80 dark:border-white/10 transition-all",
              // Resizing transition override
              isResizing ? "transition-none select-none" : "duration-200",
              // Desktop layout:
              "hidden lg:flex h-full",
              // Mobile layout when edit tab active:
              mobileTab === "edit" && "fixed inset-x-0 top-16 bottom-16 flex z-30 !w-full"
            )}
          >
            {/* Drag Handle on Left Border (Desktop only) */}
            <div
              onMouseDown={handleMouseDownResize}
              className="hidden lg:flex absolute left-0 top-0 bottom-0 w-2 -translate-x-1 cursor-col-resize items-center justify-center group hover:bg-violet-500/20 active:bg-violet-500/40 z-30 transition"
              title="Drag to resize inspector width"
            >
              <div className="h-8 w-1 rounded-full bg-zinc-300 dark:bg-zinc-700 opacity-0 group-hover:opacity-100 transition" />
            </div>

            <SectionEditor />
          </aside>
        )}
      </div>

      {/* Mobile Studio Bottom Navigation Bar */}
      {!isPreviewMode && (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 dark:bg-zinc-950/95 border-t border-zinc-200 dark:border-white/10 backdrop-blur-xl z-40 flex items-center justify-around px-2">
          <button
            type="button"
            onClick={() => setMobileTab("canvas")}
            className={cn(
              "flex flex-col items-center justify-center gap-1 flex-1 py-1.5 rounded-xl transition text-[11px] font-bold",
              mobileTab === "canvas"
                ? "text-violet-600 dark:text-violet-400"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            )}
          >
            <Eye className="h-4 w-4" />
            <span>Canvas</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileTab("layers")}
            className={cn(
              "flex flex-col items-center justify-center gap-1 flex-1 py-1.5 rounded-xl transition text-[11px] font-bold",
              mobileTab === "layers"
                ? "text-violet-600 dark:text-violet-400"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            )}
          >
            <Layers className="h-4 w-4" />
            <span>Sections</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMobileTab("edit");
              setIsRightPanelOpen(true);
            }}
            className={cn(
              "flex flex-col items-center justify-center gap-1 flex-1 py-1.5 rounded-xl transition text-[11px] font-bold relative",
              mobileTab === "edit"
                ? "text-violet-600 dark:text-violet-400"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            )}
          >
            <Sliders className="h-4 w-4" />
            <span>Inspector</span>
            {selectedSection && (
              <span className="absolute top-1 right-5 h-2 w-2 rounded-full bg-violet-500" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsPublishModalOpen(true)}
            className="flex flex-col items-center justify-center gap-1 flex-1 py-1.5 rounded-xl transition text-[11px] font-bold text-violet-600 dark:text-violet-400"
          >
            <Globe className="h-4 w-4" />
            <span>Publish</span>
          </button>
        </nav>
      )}

      {/* Floating Exit Preview Toolbar */}
      {isPreviewMode && (
        <div className="fixed top-4 sm:top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 sm:gap-3 rounded-2xl border border-zinc-200/80 bg-white/95 px-3 sm:px-4 py-1.5 sm:py-2 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/95 max-w-[95vw]">
          <div className="hidden sm:flex items-center gap-1 border-r border-zinc-200 pr-2 sm:pr-3 dark:border-white/10">
            <button
              type="button"
              onClick={() => setViewportMode("desktop")}
              className={cn(
                "p-1.5 rounded-lg text-xs font-semibold transition",
                viewportMode === "desktop"
                  ? "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400"
              )}
            >
              <Laptop className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewportMode("tablet")}
              className={cn(
                "p-1.5 rounded-lg text-xs font-semibold transition",
                viewportMode === "tablet"
                  ? "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400"
              )}
            >
              <Tablet className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewportMode("mobile")}
              className={cn(
                "p-1.5 rounded-lg text-xs font-semibold transition",
                viewportMode === "mobile"
                  ? "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400"
              )}
            >
              <Smartphone className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsPreviewMode(false)}
            className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-white hover:text-violet-600 dark:hover:text-violet-400 transition"
          >
            <EyeOff className="h-4 w-4" />
            <span>Exit Preview</span>
          </button>
        </div>
      )}

      {/* Floating Product Catalog Workspace Modal */}
      <CatalogManager />

      {/* Full-Screen E-Commerce Product Workspace Editor */}
      <ProductFullScreenEditor />

      {/* Publish Modal */}
      <PublishModal
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
      />
    </div>
  );
}
