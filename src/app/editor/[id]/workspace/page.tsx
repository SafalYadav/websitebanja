"use client";

import React, { useEffect, useState, useCallback } from "react";
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
import { normalizeWebsiteData } from "@/lib/normalizeWebsite";
import { ImageEditorProvider, useImageEditor } from "@/contexts/ImageEditorContext";
import ImageMediaModal from "@/components/editor/ImageMediaModal";
import ProUpgradeModal from "@/components/billing/ProUpgradeModal";
import { toast } from "@/store/toastStore";
import type { WebsiteData } from "@/types/website";
import type { StudioQuotaStatus } from "@/types/plans";

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
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

function StudioImageEditorOverlay({ projectId }: { projectId: string }) {
  const imageEditor = useImageEditor();
  const activeTarget = imageEditor?.activeTarget;

  const handleSelectImage = useCallback(
    (url: string, metadata?: { fit?: "cover" | "contain" | "natural"; focalPoint?: string }) => {
      if (!activeTarget) return;

      const fit = metadata?.fit || "cover";
      const focalPoint = metadata?.focalPoint || "50% 50%";

      const currentWs = useGeneratedWebsiteStore.getState().website;
      if (!currentWs) return;

      const copy = JSON.parse(JSON.stringify(currentWs)) as WebsiteData;

      // 1. Deep replace exact matching URL across all properties
      const deepReplace = (obj: any) => {
        if (!obj || typeof obj !== "object") return;
        for (const key of Object.keys(obj)) {
          if (typeof obj[key] === "string" && activeTarget.currentUrl && obj[key] === activeTarget.currentUrl) {
            obj[key] = url;
          } else if (typeof obj[key] === "object") {
            deepReplace(obj[key]);
          }
        }
      };
      deepReplace(copy);

      // 2. Targeted element path update if available
      if (activeTarget.elementPath && activeTarget.elementPath.includes(".")) {
        const parts = activeTarget.elementPath.split(".");
        let curr: any = copy;
        for (let i = 0; i < parts.length - 1; i++) {
          if (!curr[parts[i]]) curr[parts[i]] = {};
          curr = curr[parts[i]];
        }
        const lastKey = parts[parts.length - 1];
        if (curr && typeof curr === "object") {
          curr[lastKey] = url;
          curr[`${lastKey}Fit`] = fit;
          curr[`${lastKey}FocalPoint`] = focalPoint;
          curr.imageFit = fit;
          curr.imageFocalPoint = focalPoint;
        }
      }

      if (projectId) {
        useGeneratedWebsiteStore.getState().setWebsiteForProject(projectId, copy);
      }
      imageEditor?.closeImageModal();
      toast.success("Image Updated", "Image customized and saved to website.");
    },
    [activeTarget, projectId, imageEditor]
  );

  if (!activeTarget) return null;

  return (
    <ImageMediaModal
      isOpen={Boolean(activeTarget)}
      currentUrl={activeTarget.currentUrl}
      originalUrl={activeTarget.originalUrl || activeTarget.currentUrl}
      initialFit={activeTarget.fit || "cover"}
      initialFocalPoint={activeTarget.focalPoint || "50% 50%"}
      title={activeTarget.title || "Customize Image"}
      onClose={() => imageEditor?.closeImageModal()}
      onSelectImage={handleSelectImage}
    />
  );
}

export default function WorkspacePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const projectId = useBuilderStore((state) => state.projectId);
  const effectiveProjectId = params?.id || projectId;

  // useBuilderStore is hydrated atomically via hydrateFromProject

  const {
    currentProjectId,
    website,
    setWebsiteForProject,
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isProUpgradeModalOpen, setIsProUpgradeModalOpen] = useState(false);
  const [quotaStatus, setQuotaStatus] = useState<StudioQuotaStatus | null>(null);
  const [quotaRefreshTrigger, setQuotaRefreshTrigger] = useState(0);
  const [mobileTab, setMobileTab] = useState<"canvas" | "layers" | "edit">("canvas");
  const [isResizing, setIsResizing] = useState(false);

  // Auto-save only when workspace is fully loaded and matches the active project ID
  const isAutosaveEnabled = !isLoading && !loadError && currentProjectId === effectiveProjectId && Boolean(website);
  const { isSaving, isError, saveNow } = useProjectAutosave(
    effectiveProjectId,
    {
      json_data: website || undefined,
    },
    isAutosaveEnabled,
    {
      onQuotaUpdated: (q) => setQuotaStatus(q),
      onQuotaExceeded: (err) => {
        setIsProUpgradeModalOpen(true);
        if (err.quota) setQuotaStatus(err.quota);
        toast.error(
          err.message || "Studio change limit reached.",
          err.subMessage || "Upgrade to Pro to continue editing your website."
        );
      },
    }
  );


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
    let isCancelled = false;

    async function loadWorkspace() {
      if (!effectiveProjectId) return;
      useBuilderStore.getState().setProjectId(effectiveProjectId);

      // If store already has this exact project loaded, we are ready
      if (currentProjectId === effectiveProjectId && website) {
        setIsLoading(false);
        setLoadError(null);
        return;
      }

      if (effectiveProjectId.startsWith("demo") || effectiveProjectId === "preview" || effectiveProjectId.startsWith("test")) {
        setIsLoading(false);
        setLoadError(null);
        return;
      }

      setIsLoading(true);
      setLoadError(null);

      try {
        const { data, error } = await getProject(effectiveProjectId);
        if (isCancelled) return;

        if (error || !data) {
          setLoadError(
            error?.message || "Unable to load website workspace. The project could not be found or network timed out."
          );
          setIsLoading(false);
          return;
        }

        // Atomically hydrate all project metadata into builder store
        useBuilderStore.getState().hydrateFromProject(data);

        if (data.json_data && Object.keys(data.json_data).length > 0) {
          setWebsiteForProject(effectiveProjectId, data.json_data as WebsiteData);
        } else {
          // If project exists in DB but json_data is not yet generated, synthesize baseline layout
          // so user stays right inside Studio and can customize immediately without being kicked out.
          const baseline = normalizeWebsiteData(
            {},
            data.category || "General Business",
            data.business_name || data.name || "My Website"
          );
          setWebsiteForProject(effectiveProjectId, baseline);
        }

        setIsLoading(false);
      } catch (caughtErr: any) {
        if (!isCancelled) {
          setLoadError(caughtErr?.message || "Connection error while loading website workspace.");
          setIsLoading(false);
        }
      }
    }

    void loadWorkspace();

    return () => {
      isCancelled = true;
    };
  }, [
    effectiveProjectId,
    currentProjectId,
    website,
    setWebsiteForProject,
    retryTrigger,
  ]);

  if (loadError) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-50 p-6 text-center dark:bg-[#09090B]">
        <div className="mx-auto max-w-md space-y-4 rounded-3xl border border-red-200/80 bg-white p-6 shadow-xl dark:border-red-900/30 dark:bg-zinc-900">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Workspace Load Error</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{loadError}</p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setLoadError(null);
                setRetryTrigger((p) => p + 1);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-violet-700 active:scale-95 cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Retry</span>
            </button>
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-100 px-4 py-2.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-200 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 cursor-pointer"
            >
              <span>Back to Dashboard</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

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
      ? "w-full lg:max-w-[375px] my-0 lg:my-6 rounded-none lg:rounded-3xl border-0 lg:border-8 border-zinc-900 shadow-2xl shadow-black/80 overflow-hidden ring-1 ring-white/10"
      : viewportMode === "tablet"
      ? "w-full lg:max-w-[768px] my-0 lg:my-6 rounded-none lg:rounded-3xl border-0 lg:border-8 border-zinc-900 shadow-2xl shadow-black/80 overflow-hidden ring-1 ring-white/10"
      : "w-full min-h-full";

  return (
    <ImageEditorProvider initialInteractive={!isPreviewMode}>
      <div className="flex h-screen w-full flex-col bg-slate-100 dark:bg-[#07090e] overflow-hidden">
        {/* Top Studio Toolbar */}
      {!isPreviewMode && (
        <EditorTopBar
          onOpenPublishModal={() => setIsPublishModalOpen(true)}
          onOpenUpgradeModal={() => setIsProUpgradeModalOpen(true)}
          quota={quotaStatus}
          refreshTrigger={quotaRefreshTrigger}
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
              "bg-white dark:bg-[#0a0d14] overflow-y-auto z-20 transition-all",
              // Desktop layout:
              "hidden lg:block lg:w-80 lg:flex-shrink-0 lg:border-r lg:border-zinc-200/80 lg:dark:border-white/[0.08]",
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
            "flex-1 relative overflow-y-auto bg-slate-200/70 dark:bg-[#05070b] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] dark:[background-size:24px_24px] flex flex-col items-center transition-all scroll-smooth pb-16 lg:pb-0",
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
              "relative bg-white dark:bg-[#0a0d14] overflow-y-auto z-20 flex flex-col flex-shrink-0 border-l border-zinc-200/80 dark:border-white/[0.08] transition-all",
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
              className="hidden lg:flex absolute left-0 top-0 bottom-0 w-2 -translate-x-1 cursor-col-resize items-center justify-center group hover:bg-cyan-500/20 active:bg-cyan-500/40 z-30 transition"
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
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 dark:bg-[#0a0d14]/95 border-t border-zinc-200 dark:border-white/[0.08] backdrop-blur-xl z-40 flex items-center justify-around px-2">
          <button
            type="button"
            onClick={() => setMobileTab("canvas")}
            className={cn(
              "flex flex-col items-center justify-center gap-1 flex-1 py-1.5 rounded-xl transition text-[11px] font-bold",
              mobileTab === "canvas"
                ? "text-cyan-600 dark:text-cyan-400"
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
                ? "text-cyan-600 dark:text-cyan-400"
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
                ? "text-cyan-600 dark:text-cyan-400"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            )}
          >
            <Sliders className="h-4 w-4" />
            <span>Inspector</span>
            {selectedSection && (
              <span className="absolute top-1 right-5 h-2 w-2 rounded-full bg-cyan-400" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsPublishModalOpen(true)}
            className="flex flex-col items-center justify-center gap-1 flex-1 py-1.5 rounded-xl transition text-[11px] font-bold text-cyan-600 dark:text-cyan-400"
          >
            <Globe className="h-4 w-4" />
            <span>Publish</span>
          </button>
        </nav>
      )}

      {/* Floating Exit Preview Toolbar */}
      {isPreviewMode && (
        <div className="fixed top-4 sm:top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 sm:gap-3 rounded-2xl border border-zinc-200/80 bg-white/95 px-3 sm:px-4 py-1.5 sm:py-2 shadow-2xl backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#0a0d14]/95 max-w-[95vw]">
          <div className="hidden sm:flex items-center gap-1 border-r border-zinc-200 pr-2 sm:pr-3 dark:border-white/[0.08]">
            <button
              type="button"
              onClick={() => setViewportMode("desktop")}
              className={cn(
                "p-1.5 rounded-lg text-xs font-semibold transition",
                viewportMode === "desktop"
                  ? "bg-cyan-500/20 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border dark:border-cyan-500/30"
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
                  ? "bg-cyan-500/20 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border dark:border-cyan-500/30"
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
                  ? "bg-cyan-500/20 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border dark:border-cyan-500/30"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400"
              )}
            >
              <Smartphone className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsPreviewMode(false)}
            className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-white hover:text-cyan-600 dark:hover:text-cyan-400 transition"
          >
            <EyeOff className="h-4 w-4" />
            <span>Exit Preview</span>
          </button>
        </div>
      )}

      {/* Floating Product Catalog Workspace Modal */}
      <CatalogManager projectId={effectiveProjectId} />

      {/* Full-Screen E-Commerce Product Workspace Editor */}
      <ProductFullScreenEditor projectId={effectiveProjectId} />

      {/* Publish Modal */}
      <PublishModal
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        projectId={effectiveProjectId}
      />

      {/* Pro Upgrade Modal */}
      <ProUpgradeModal
        isOpen={isProUpgradeModalOpen}
        onClose={() => setIsProUpgradeModalOpen(false)}
        onUpgradeSuccess={() => {
          setQuotaRefreshTrigger((prev) => prev + 1);
          // Retry pending save now that user is on Pro
          void saveNow();
        }}
      />

      {/* Studio-Only Image Editor Overlay */}
      <StudioImageEditorOverlay projectId={effectiveProjectId} />
      </div>
    </ImageEditorProvider>
  );
}

