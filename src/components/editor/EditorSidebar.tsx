"use client";

import { useState } from "react";
import { useGeneratedWebsiteStore } from "@/store/generatedWebsiteStore";
import {
  GripVertical,
  Copy,
  Trash2,
  Plus,
  Home,
  FileText,
  Wrench,
  Sparkles,
  HelpCircle,
  Phone,
  Layers,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<string, React.ElementType> = {
  hero: Home,
  about: FileText,
  services: Wrench,
  features: Sparkles,
  faq: HelpCircle,
  contact: Phone,
  footer: Layers,
};

const LABELS: Record<string, string> = {
  hero: "Hero Section",
  about: "About Section",
  services: "Services Section",
  features: "Features Grid",
  faq: "FAQ Accordion",
  contact: "Contact Details",
  footer: "Footer Section",
};

const AVAILABLE_SECTIONS = [
  { type: "hero", label: "Hero Header", icon: Home },
  { type: "about", label: "About Mission", icon: FileText },
  { type: "services", label: "Services Cards", icon: Wrench },
  { type: "features", label: "Feature Grid", icon: Sparkles },
  { type: "faq", label: "FAQ Accordion", icon: HelpCircle },
  { type: "contact", label: "Contact Form", icon: Phone },
  { type: "footer", label: "Footer", icon: Layers },
];

export default function EditorSidebar() {
  const {
    website,
    selectedSection,
    setSelectedSection,
    reorderSections,
    duplicateSection,
    deleteSection,
    addSection,
  } = useGeneratedWebsiteStore();

  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);

  if (!website || !website.sectionOrder) return null;

  // Auto-scroll center canvas to section DOM node
  const handleSectionClick = (sectionKey: string) => {
    setSelectedSection(sectionKey);

    setTimeout(() => {
      const targetElement = document.getElementById(`wb-section-${sectionKey}`);
      const container = document.getElementById("canvas-scroll-container");

      if (targetElement && container) {
        const containerRect = container.getBoundingClientRect();
        const targetRect = targetElement.getBoundingClientRect();

        // Check if section is already comfortably in view
        const isComfortablyVisible =
          targetRect.top >= containerRect.top + 20 &&
          targetRect.bottom <= containerRect.bottom - 20;

        if (!isComfortablyVisible) {
          const targetTop = targetElement.offsetTop;
          container.scrollTo({
            top: Math.max(0, targetTop - 20),
            behavior: "smooth",
          });
        }
      }
    }, 40);
  };

  const handleDragStart = (e: React.DragEvent, key: string) => {
    setDraggedItem(key);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetKey: string) => {
    e.preventDefault();
    if (!draggedItem || draggedItem === targetKey) return;

    const newOrder = [...website.sectionOrder!];
    const draggedIdx = newOrder.indexOf(draggedItem);
    const targetIdx = newOrder.indexOf(targetKey);

    newOrder.splice(draggedIdx, 1);
    newOrder.splice(targetIdx, 0, draggedItem);

    reorderSections(newOrder);
    setDraggedItem(null);
  };

  return (
    <aside className="w-72 border-r border-zinc-200/80 bg-white/90 dark:border-white/10 dark:bg-zinc-950/90 flex flex-col h-[calc(100vh-4rem)] flex-shrink-0 select-none overflow-hidden">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-zinc-200/80 dark:border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
            Page Structure
          </span>
        </div>
        <span className="text-[11px] font-mono text-zinc-400 font-semibold">
          {website.sectionOrder.length} sections
        </span>
      </div>

      {/* Section List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {website.sectionOrder.map((sectionKey) => {
          const baseType = sectionKey.split("_")[0];
          const Icon = ICONS[baseType] || Layers;
          const label = LABELS[baseType] || baseType;
          const isSelected = selectedSection === sectionKey;

          return (
            <div
              key={sectionKey}
              draggable
              onDragStart={(e) => handleDragStart(e, sectionKey)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, sectionKey)}
              className={cn(
                "group relative flex items-center justify-between rounded-xl border p-2.5 transition-all text-xs font-medium",
                isSelected
                  ? "border-violet-500/60 bg-violet-50 text-violet-900 shadow-2xs dark:border-violet-500/50 dark:bg-violet-950/40 dark:text-white"
                  : "border-transparent text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
              )}
            >
              {/* Drag Handle & Section Select Button */}
              <button
                type="button"
                onClick={() => handleSectionClick(sectionKey)}
                className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
              >
                <GripVertical className="h-3.5 w-3.5 text-zinc-400 opacity-50 group-hover:opacity-100 cursor-grab active:cursor-grabbing flex-shrink-0" />
                <Icon className={cn("h-4 w-4 flex-shrink-0", isSelected ? "text-violet-600 dark:text-violet-400" : "text-zinc-400")} />
                <span className="truncate">{label}</span>
              </button>

              {/* Quick Actions (Duplicate / Delete) */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    duplicateSection(sectionKey);
                  }}
                  title="Duplicate Section"
                  className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition"
                >
                  <Copy className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSection(sectionKey);
                  }}
                  title="Delete Section"
                  className="p-1 rounded-md text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Section Dropdown & Footer */}
      <div className="p-3 border-t border-zinc-200/80 dark:border-white/10 relative">
        <button
          type="button"
          onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 py-2.5 text-xs font-bold text-zinc-700 hover:bg-zinc-100 hover:border-zinc-400 dark:border-white/15 dark:bg-zinc-900/60 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:border-white/30 transition"
        >
          <Plus className="h-4 w-4" />
          <span>Add Section</span>
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isAddMenuOpen ? "rotate-180" : "")} />
        </button>

        {isAddMenuOpen && (
          <div className="absolute bottom-full left-3 right-3 mb-2 rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-xl dark:border-white/10 dark:bg-zinc-900 z-50 space-y-0.5">
            {AVAILABLE_SECTIONS.map((sec) => {
              const SecIcon = sec.icon;
              return (
                <button
                  key={sec.type}
                  type="button"
                  onClick={() => {
                    addSection(sec.type);
                    setIsAddMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-violet-50 hover:text-violet-700 dark:text-zinc-300 dark:hover:bg-violet-950/40 dark:hover:text-white transition"
                >
                  <SecIcon className="h-4 w-4 text-violet-500" />
                  <span>{sec.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}