"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { ImageIcon } from "lucide-react";
import { useImageEditor } from "@/contexts/ImageEditorContext";

export type ImageFitMode = "cover" | "contain" | "natural";
export type ImageFocalPoint = "center" | "top" | "bottom" | "left" | "right" | "upper-center" | string;
export type ImageRole =
  | "portrait"
  | "doctor"
  | "team"
  | "founder"
  | "product"
  | "ceramics"
  | "architecture"
  | "interior"
  | "food"
  | "editorial"
  | "hero"
  | "general";

export interface ImageWithFallbackProps {
  src?: string | null;
  alt: string;
  className?: string;
  wrapperClassName?: string;
  fallbackGradient?: string;
  fit?: ImageFitMode;
  focalPoint?: ImageFocalPoint;
  role?: ImageRole | string;
  aspectRatio?: string;
  style?: React.CSSProperties;
  editable?: boolean;
  onEditClick?: () => void;
  badgeLabel?: string;
}

/**
 * Derives optimal object-position CSS coordinate from role, alt text, or custom focalPoint.
 * Prevents cropped heads/faces in portraits and cut-off boundaries in products & architecture.
 */
export function resolveFocalPoint(
  focalPoint?: ImageFocalPoint,
  role?: string,
  altText = ""
): string {
  if (focalPoint) {
    if (focalPoint === "top") return "50% 18%";
    if (focalPoint === "center") return "50% 50%";
    if (focalPoint === "bottom") return "50% 82%";
    if (focalPoint === "left") return "20% 50%";
    if (focalPoint === "right") return "80% 50%";
    if (focalPoint === "upper-center") return "50% 35%";
    return focalPoint;
  }

  const roleLower = (role || "").toLowerCase();
  const altLower = altText.toLowerCase();

  // 1. Portrait / Doctor / Team / Founder: Focus on top 18-20% (faces, foreheads)
  if (
    roleLower.includes("portrait") ||
    roleLower.includes("doctor") ||
    roleLower.includes("team") ||
    roleLower.includes("founder") ||
    altLower.includes("doctor") ||
    altLower.includes("portrait") ||
    altLower.includes("dentist") ||
    altLower.includes("dr.") ||
    altLower.includes("founder") ||
    altLower.includes("chef")
  ) {
    return "50% 18%";
  }

  // 2. Architecture / Interior: Focus on upper center to capture ceiling, structure & lighting
  if (
    roleLower.includes("architect") ||
    roleLower.includes("interior") ||
    altLower.includes("architect") ||
    altLower.includes("facade") ||
    altLower.includes("interior") ||
    altLower.includes("pavilion") ||
    altLower.includes("studio")
  ) {
    return "50% 38%";
  }

  // 3. Food / Culinary Plating: Balanced center-top
  if (
    roleLower.includes("food") ||
    altLower.includes("dish") ||
    altLower.includes("menu") ||
    altLower.includes("food") ||
    altLower.includes("coffee") ||
    altLower.includes("cocktail")
  ) {
    return "50% 48%";
  }

  // 4. Products / Ceramics: Centered
  if (
    roleLower.includes("product") ||
    roleLower.includes("ceramic") ||
    altLower.includes("ceramic") ||
    altLower.includes("tableware") ||
    altLower.includes("vase") ||
    altLower.includes("stoneware")
  ) {
    return "50% 50%";
  }

  return "50% 50%";
}

export default function ImageWithFallback({
  src,
  alt,
  className = "",
  wrapperClassName = "",
  fallbackGradient = "linear-gradient(135deg, var(--wb-glow-primary), var(--wb-glow-secondary))",
  fit = "cover",
  focalPoint,
  role = "general",
  aspectRatio,
  style,
  editable = false,
  onEditClick,
  badgeLabel,
}: ImageWithFallbackProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = React.useRef<HTMLImageElement>(null);

  const resolvedPosition = resolveFocalPoint(focalPoint, role, alt);
  const resolvedFit = fit === "natural" ? "contain" : fit;

  const imageEditor = useImageEditor();
  const isEditable = editable || Boolean(imageEditor?.isInteractive);

  const handleEditClick = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (onEditClick) {
      onEditClick();
    } else if (imageEditor && src) {
      imageEditor.openImageModal({
        elementPath: `media.${encodeURIComponent(src).slice(-12)}`,
        currentUrl: src,
        originalUrl: src,
        fit,
        focalPoint,
        title: alt || "Customize Image",
      });
    }
  };

  /* eslint-disable react-hooks/set-state-in-effect */
  React.useEffect(() => {
    setHasError(false);
    setIsLoaded(false);
    if (imgRef.current?.complete) {
      setIsLoaded(true);
    }
  }, [src]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!src || hasError) {
    return (
      <div
        className={cn(
          "relative w-full h-full overflow-hidden rounded-2xl flex items-center justify-center group/empty-img",
          wrapperClassName
        )}
        style={{
          background: fallbackGradient,
          aspectRatio: aspectRatio,
        }}
        onClick={isEditable ? handleEditClick : undefined}
      >
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:16px_16px]" />
        {isEditable && (
          <button
            type="button"
            onClick={handleEditClick}
            className="relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 dark:bg-zinc-900/90 text-xs font-bold text-zinc-900 dark:text-white shadow-xl hover:scale-105 transition"
          >
            <ImageIcon className="h-3.5 w-3.5 text-violet-500" />
            <span>Select Image</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative w-full h-full overflow-hidden group/image-ctrl",
        isEditable && "cursor-pointer select-none",
        wrapperClassName
      )}
      style={{ aspectRatio }}
      onClick={isEditable ? handleEditClick : undefined}
    >
      {/* Loading Skeleton Placeholder */}
      {!isLoaded && (
        <div
          className="absolute inset-0 animate-pulse z-20"
          style={{ background: fallbackGradient }}
        />
      )}

      {/* Ambient Blurred Backdrop for Contain Mode (avoids ugly grey letterboxing) */}
      {resolvedFit === "contain" && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            className="w-full h-full object-cover blur-2xl scale-125 opacity-35 filter brightness-90"
          />
        </div>
      )}

      {/* Actual Image with Role-Aware Framing and Focal Positioning */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={src || "empty"}
        ref={imgRef}
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        style={{
          objectFit: resolvedFit as any,
          objectPosition: resolvedPosition,
          ...style,
        }}
        className={cn(
          "relative z-10 h-full w-full transition-opacity duration-500",
          !isLoaded ? "opacity-0" : "opacity-100",
          className
        )}
      />

      {/* Interactive Quick Replace Trigger in Editable Mode */}
      {isEditable && (
        <div
          className="absolute top-2.5 right-2.5 z-30 opacity-0 group-hover/image-ctrl:opacity-100 transition-opacity duration-200"
          onClick={handleEditClick}
        >
          <button
            type="button"
            data-testid="image-edit-trigger-btn"
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/75 hover:bg-black text-white text-[11px] font-semibold shadow-xl backdrop-blur-md transition-all hover:scale-105 border border-white/20 cursor-pointer"
            title="Change image or adjust focal framing"
          >
            <ImageIcon className="h-3 w-3 text-violet-400" />
            <span>{badgeLabel || "Change"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
