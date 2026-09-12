"use client";

import React, { useState, useCallback } from "react";
import WebsiteRenderer from "@/components/editor/WebsiteRenderer";
import ImageMediaModal, { type ImageSelectedPayload } from "@/components/editor/ImageMediaModal";
import { ImageEditorProvider, useImageEditor } from "@/contexts/ImageEditorContext";
import type { WebsiteData } from "@/types/website";
import type { CatalogItem } from "@/types/catalog";
import { Sparkles, ImageIcon, Check, RefreshCw } from "lucide-react";
import { toast } from "@/store/toastStore";

interface PreviewInteractiveWrapperProps {
  previewId: string;
  initialData: WebsiteData;
  catalogItems?: CatalogItem[];
  pColor?: string | null;
  sColor?: string | null;
  brandStyle?: string | null;
  category?: string | null;
  businessName?: string | null;
  whatsappNumber?: string;
  phone?: string;
  whatsappMessage?: string;
  whatsappEnabled?: boolean;
}

function PreviewInnerRenderer({
  previewId,
  initialData,
  catalogItems,
  pColor,
  sColor,
  brandStyle,
  category,
  businessName,
  whatsappNumber,
  phone,
  whatsappMessage,
  whatsappEnabled,
}: PreviewInteractiveWrapperProps) {
  const [websiteData, setWebsiteData] = useState<WebsiteData>(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [showNotification, setShowNotification] = useState(true);

  const imageEditor = useImageEditor();
  const activeTarget = imageEditor?.activeTarget;

  const handleSelectImage = useCallback(
    async (url: string, metadata?: { fit?: "cover" | "contain" | "natural"; focalPoint?: string }) => {
      if (!activeTarget) return;

      const fit = metadata?.fit || "cover";
      const focalPoint = metadata?.focalPoint || "50% 50%";

      // 1. Immediately update client state for instantaneous feedback
      setWebsiteData((prev) => {
        const copy = JSON.parse(JSON.stringify(prev));

        // Deep URL replacer for exact matches
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

        if (activeTarget.currentUrl) {
          deepReplace(copy);
        }

        // Direct path update if provided
        if (activeTarget.elementPath && !activeTarget.elementPath.startsWith("media.")) {
          const parts = activeTarget.elementPath.split(".");
          let curr: any = copy;
          let valid = true;
          for (let i = 0; i < parts.length - 1; i++) {
            if (!curr[parts[i]]) curr[parts[i]] = {};
            curr = curr[parts[i]];
          }
          if (valid && curr) {
            curr[parts[parts.length - 1]] = url;
          }
        }

        // Store framing metadata
        if (!copy._imageMeta) copy._imageMeta = {};
        const metaKey = activeTarget.elementPath || url;
        copy._imageMeta[metaKey] = { fit, focalPoint };

        return copy;
      });

      // 2. Persist to server / scratch/previews/{id}.json
      setIsSaving(true);
      try {
        const res = await fetch(`/api/preview/${previewId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            elementPath: activeTarget.elementPath,
            oldUrl: activeTarget.currentUrl,
            url,
            fit,
            focalPoint,
          }),
        });

        if (res.ok) {
          toast.success("Image Updated", "Saved image and framing adjustments.");
        }
      } catch (err) {
        console.error("Failed to persist preview image update:", err);
      } finally {
        setIsSaving(false);
        imageEditor?.closeImageModal();
      }
    },
    [activeTarget, previewId, imageEditor]
  );

  return (
    <div className="relative min-h-screen w-full">
      {/* Visual Floating Pill */}
      {showNotification && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-zinc-900/90 text-white border border-white/15 px-4 py-2.5 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-violet-600/30 text-violet-400">
            <ImageIcon className="h-4 w-4" />
          </div>
          <div className="text-xs">
            <span className="font-bold block">Interactive Image Controls</span>
            <span className="text-zinc-400 text-[11px]">Hover or click any image to customize / adjust crop</span>
          </div>
          {isSaving && (
            <div className="ml-2 flex items-center gap-1 text-[11px] text-violet-400 font-mono">
              <RefreshCw className="h-3 w-3 animate-spin" />
              <span>Saving...</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowNotification(false)}
            className="ml-2 rounded-lg p-1 text-zinc-400 hover:text-white hover:bg-white/10 text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Website Renderer */}
      <WebsiteRenderer
        data={websiteData}
        catalogItems={catalogItems}
        isPublic={false}
        activePageSlug=""
        pColor={pColor}
        sColor={sColor}
        brandStyle={brandStyle}
        category={category}
        businessName={businessName}
        whatsappNumber={whatsappNumber}
        phone={phone}
        whatsappMessage={whatsappMessage}
        whatsappEnabled={whatsappEnabled}
      />

      {/* Universal Image Replacement & Focal Point Modal */}
      {activeTarget && (
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
      )}
    </div>
  );
}

export default function PreviewInteractiveWrapper(props: PreviewInteractiveWrapperProps) {
  return (
    <ImageEditorProvider initialInteractive={true}>
      <PreviewInnerRenderer {...props} />
    </ImageEditorProvider>
  );
}
