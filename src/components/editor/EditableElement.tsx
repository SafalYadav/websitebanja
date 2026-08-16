"use client";

import React, { useState, useRef, useEffect } from "react";
import { useGeneratedWebsiteStore } from "@/store/generatedWebsiteStore";
import { cn } from "@/lib/utils";
import type { ElementType } from "@/types/website";
import { Edit3, Image as ImageIcon, Sparkles, Check, X } from "lucide-react";

interface EditableElementProps {
  sectionKey: string;
  elementPath: string; // e.g. "hero.title" or "services[0].title"
  elementType: ElementType;
  label?: string;
  className?: string;
  children: React.ReactNode;
  allowInlineEdit?: boolean;
  onImageClick?: () => void;
}

export default function EditableElement({
  sectionKey,
  elementPath,
  elementType,
  label,
  className,
  children,
  allowInlineEdit = true,
  onImageClick,
}: EditableElementProps) {
  const isPreviewMode = useGeneratedWebsiteStore((state) => state.isPreviewMode);
  const selectedElement = useGeneratedWebsiteStore((state) => state.selectedElement);
  const setSelectedElement = useGeneratedWebsiteStore((state) => state.setSelectedElement);
  const updateElementValue = useGeneratedWebsiteStore((state) => state.updateElementValue);

  const isSelected =
    !isPreviewMode &&
    selectedElement?.sectionKey === sectionKey &&
    selectedElement?.elementPath === elementPath;

  const [isEditingInline, setIsEditingInline] = useState(false);
  const [inlineValue, setInlineValue] = useState("");
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Extract raw text if children is string
  const currentText = typeof children === "string" ? children : "";

  useEffect(() => {
    if (isEditingInline && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingInline]);

  // If in pure preview mode, render child without editor wrappers
  if (isPreviewMode) {
    return <>{children}</>;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedElement({
      sectionKey,
      elementPath,
      elementType,
      label: label || elementType,
      value: currentText,
    });

    if (elementType === "image" && onImageClick) {
      onImageClick();
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!allowInlineEdit || elementType === "image") return;
    e.stopPropagation();
    setInlineValue(currentText);
    setIsEditingInline(true);
  };

  const handleSaveInline = () => {
    if (inlineValue.trim()) {
      updateElementValue(elementPath, inlineValue.trim());
    }
    setIsEditingInline(false);
  };

  const handleCancelInline = () => {
    setIsEditingInline(false);
  };

  if (isEditingInline) {
    const isMultiline = elementType === "paragraph" || currentText.length > 60;

    return (
      <div
        className="relative z-50 inline-block w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {isMultiline ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={inlineValue}
            onChange={(e) => setInlineValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSaveInline();
              if (e.key === "Escape") handleCancelInline();
            }}
            rows={4}
            className="w-full rounded-xl border-2 border-violet-500 bg-white/95 dark:bg-zinc-900/95 p-3 text-sm font-medium text-zinc-900 dark:text-white shadow-2xl outline-none ring-4 ring-violet-500/20 backdrop-blur-xl"
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={inlineValue}
            onChange={(e) => setInlineValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveInline();
              if (e.key === "Escape") handleCancelInline();
            }}
            className="w-full rounded-xl border-2 border-violet-500 bg-white/95 dark:bg-zinc-900/95 px-3 py-1.5 text-inherit font-inherit text-zinc-900 dark:text-white shadow-2xl outline-none ring-4 ring-violet-500/20 backdrop-blur-xl"
          />
        )}

        {/* Floating Mini Action Bar */}
        <div className="absolute -bottom-10 right-0 z-50 flex items-center gap-1 rounded-xl border border-zinc-200 bg-white p-1 shadow-xl dark:border-white/15 dark:bg-zinc-900">
          <button
            type="button"
            onClick={handleSaveInline}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition shadow-xs"
            title="Save (Enter)"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleCancelInline}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white transition"
            title="Cancel (Esc)"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClickCapture={(e) => {
        if (!isPreviewMode) {
          e.preventDefault();
          e.stopPropagation();
          handleClick(e);
        }
      }}
      onClick={isPreviewMode ? handleClick : undefined}
      onDoubleClick={handleDoubleClick}
      className={cn(
        "group/element relative cursor-pointer transition-all duration-150 rounded-lg",
        isSelected
          ? "ring-2 ring-violet-500 ring-offset-2 ring-offset-black/50 shadow-md"
          : "hover:outline-dashed hover:outline-1 hover:outline-violet-400/80",
        className
      )}
    >
      {/* Floating Type Pill on Selection / Hover */}
      <div
        className={cn(
          "pointer-events-none absolute -top-5 left-1 z-40 flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider shadow-md transition-all duration-150 select-none",
          isSelected
            ? "bg-violet-600 text-white opacity-100 scale-100"
            : "bg-zinc-900/90 text-zinc-300 border border-white/10 opacity-0 group-hover/element:opacity-100 scale-95 group-hover/element:scale-100"
        )}
      >
        {elementType === "image" ? (
          <ImageIcon className="h-2.5 w-2.5" />
        ) : elementType === "button" ? (
          <Sparkles className="h-2.5 w-2.5" />
        ) : (
          <Edit3 className="h-2.5 w-2.5" />
        )}
        <span>{label || elementType}</span>
      </div>

      {children}
    </div>
  );
}
