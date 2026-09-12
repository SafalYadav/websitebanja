"use client";

import React, { createContext, useContext, useState } from "react";
import type { ImageFitMode, ImageFocalPoint } from "@/components/ui/ImageWithFallback";

export interface ActiveImageTarget {
  elementPath: string;
  currentUrl: string;
  originalUrl?: string;
  fit?: ImageFitMode;
  focalPoint?: ImageFocalPoint;
  title?: string;
}

interface ImageEditorContextValue {
  isInteractive: boolean;
  setIsInteractive: (val: boolean) => void;
  activeTarget: ActiveImageTarget | null;
  openImageModal: (target: ActiveImageTarget) => void;
  closeImageModal: () => void;
}

const ImageEditorContext = createContext<ImageEditorContextValue | null>(null);

export function ImageEditorProvider({
  children,
  initialInteractive = true,
}: {
  children: React.ReactNode;
  initialInteractive?: boolean;
}) {
  const [isInteractive, setIsInteractive] = useState(initialInteractive);
  const [activeTarget, setActiveTarget] = useState<ActiveImageTarget | null>(null);

  const openImageModal = (target: ActiveImageTarget) => {
    setActiveTarget(target);
  };

  const closeImageModal = () => {
    setActiveTarget(null);
  };

  return (
    <ImageEditorContext.Provider
      value={{
        isInteractive,
        setIsInteractive,
        activeTarget,
        openImageModal,
        closeImageModal,
      }}
    >
      {children}
    </ImageEditorContext.Provider>
  );
}

export function useImageEditor() {
  return useContext(ImageEditorContext);
}
