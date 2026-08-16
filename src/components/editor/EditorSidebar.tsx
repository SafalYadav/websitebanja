"use client";

import React, { useState } from "react";
import { useGeneratedWebsiteStore, type StudioTab } from "@/store/generatedWebsiteStore";
import { useBuilderStore } from "@/store/builderStore";
import CatalogManager from "@/components/editor/CatalogManager";
import AiStudioAssistant from "@/components/editor/AiStudioAssistant";
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
  ShoppingBag,
  Palette,
  Bot,
  LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<string, React.ElementType> = {
  hero: Home,
  about: FileText,
  services: Wrench,
  features: Sparkles,
  products: ShoppingBag,
  catalog: ShoppingBag,
  faq: HelpCircle,
  contact: Phone,
  footer: Layers,
};

const LABELS: Record<string, string> = {
  hero: "Hero Header",
  about: "About Story",
  services: "Services Section",
  features: "Features Grid",
  products: "Product Catalog",
  catalog: "Product Catalog",
  faq: "FAQ Accordion",
  contact: "Contact Details",
  footer: "Footer Section",
};

const AVAILABLE_BLOCKS = [
  { type: "hero", label: "Hero Banner", desc: "Headline, CTA, and visual hero showcase", icon: Home },
  { type: "about", label: "About Mission", desc: "Narrative story and verified value points", icon: FileText },
  { type: "services", label: "Services Cards", desc: "Detailed breakdown of bespoke offerings", icon: Wrench },
  { type: "features", label: "Feature Grid", desc: "Key benefits, advantages, and technology", icon: Sparkles },
  { type: "products", label: "Product Catalog", desc: "E-commerce items, pricing, and WhatsApp orders", icon: ShoppingBag },
  { type: "faq", label: "FAQ Accordion", desc: "Answers to common customer questions", icon: HelpCircle },
  { type: "contact", label: "Contact Form", desc: "Direct phone, email, and inquiry form", icon: Phone },
  { type: "footer", label: "Footer Section", desc: "Copyright notice and fast jump anchors", icon: Layers },
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
    activeStudioTab,
    setActiveStudioTab,
  } = useGeneratedWebsiteStore();

  const primaryColor = useBuilderStore((state) => state.primaryColor);
  const secondaryColor = useBuilderStore((state) => state.secondaryColor);
  const setPrimaryColor = useBuilderStore((state) => state.setPrimaryColor);
  const setSecondaryColor = useBuilderStore((state) => state.setSecondaryColor);
  const style = useBuilderStore((state) => state.style);
  const setStyle = useBuilderStore((state) => state.setStyle);

  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  if (!website || !website.sectionOrder) return null;

  const handleSectionClick = (sectionKey: string) => {
    setSelectedSection(sectionKey);

    setTimeout(() => {
      const targetElement = document.getElementById(`wb-section-${sectionKey}`);
      const container = document.getElementById("canvas-scroll-container");

      if (targetElement && container) {
        const containerRect = container.getBoundingClientRect();
        const targetRect = targetElement.getBoundingClientRect();

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

  const TABS: { id: StudioTab; label: string; icon: React.ElementType }[] = [
    { id: "layers", label: "Layers", icon: Layers },
    { id: "elements", label: "Add", icon: LayoutGrid },
    { id: "catalog", label: "Catalog", icon: ShoppingBag },
    { id: "ai", label: "Copilot", icon: Bot },
    { id: "theme", label: "Theme", icon: Palette },
  ];

  return (
    <aside className="w-80 border-r border-zinc-200/80 bg-white/95 dark:border-white/10 dark:bg-zinc-950/95 flex flex-col h-full flex-shrink-0 select-none overflow-hidden backdrop-blur-xl">
      {/* Top Studio Mode Tab Strip */}
      <div className="grid grid-cols-5 border-b border-zinc-200/80 dark:border-white/10 bg-zinc-50/70 dark:bg-zinc-900/60 p-1.5 gap-1">
        {TABS.map((tab) => {
          const TabIcon = tab.icon;
          const isActive = activeStudioTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveStudioTab(tab.id)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-xl py-2 px-1 text-[10px] font-bold transition-all",
                isActive
                  ? "bg-white text-violet-600 shadow-xs dark:bg-zinc-800 dark:text-white"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40"
              )}
            >
              <TabIcon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Tab Panel Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* 1. Layers Tab */}
        {activeStudioTab === "layers" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Canvas Layers ({website.sectionOrder.length})
              </span>
              <button
                type="button"
                onClick={() => setActiveStudioTab("elements")}
                className="flex items-center gap-1 text-xs font-bold text-violet-600 hover:text-violet-700 dark:text-violet-400"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Block
              </button>
            </div>

            <div className="space-y-1.5">
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
                      "group relative flex items-center justify-between rounded-2xl border p-3 transition-all text-xs font-medium",
                      isSelected
                        ? "border-violet-500/60 bg-violet-50/80 text-violet-950 shadow-xs dark:border-violet-500/50 dark:bg-violet-950/40 dark:text-white"
                        : "border-transparent text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => handleSectionClick(sectionKey)}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left"
                    >
                      <GripVertical className="h-4 w-4 text-zinc-400 opacity-40 group-hover:opacity-100 cursor-grab active:cursor-grabbing flex-shrink-0" />
                      <div
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-lg flex-shrink-0",
                          isSelected
                            ? "bg-violet-600 text-white"
                            : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <span className="truncate font-semibold">{label}</span>
                    </button>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicateSection(sectionKey);
                        }}
                        title="Duplicate Section"
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSection(sectionKey);
                        }}
                        title="Delete Section"
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. Add Elements Tab */}
        {activeStudioTab === "elements" && (
          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Insert Section Block
            </span>
            <div className="grid grid-cols-1 gap-2.5">
              {AVAILABLE_BLOCKS.map((block) => {
                const BlockIcon = block.icon;
                return (
                  <button
                    key={block.type}
                    type="button"
                    onClick={() => {
                      addSection(block.type);
                      setActiveStudioTab("layers");
                    }}
                    className="flex items-start gap-3 rounded-2xl border border-zinc-200 bg-white p-3.5 text-left transition hover:border-violet-500 hover:bg-violet-50/40 hover:shadow-md dark:border-white/10 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600/10 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400 shrink-0">
                      <BlockIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-zinc-900 dark:text-white block">
                        {block.label}
                      </span>
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 block">
                        {block.desc}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. Catalog Tab */}
        {activeStudioTab === "catalog" && <CatalogManager />}

        {/* 4. AI Copilot Tab */}
        {activeStudioTab === "ai" && <AiStudioAssistant />}

        {/* 5. Theme & Styles Tab */}
        {activeStudioTab === "theme" && (
          <div className="space-y-6">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3">
                Visual Aesthetic Style
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {["Modern", "Minimal", "Luxury", "Corporate", "Creative", "Dark"].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStyle(st)}
                    className={cn(
                      "rounded-xl border p-2.5 text-xs font-bold transition text-center",
                      style === st
                        ? "border-violet-600 bg-violet-50 text-violet-700 shadow-xs dark:bg-violet-950/40 dark:text-white"
                        : "border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-400 dark:hover:bg-zinc-900"
                    )}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3">
                Brand Palette Colors
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Primary Accent Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={primaryColor.startsWith("#") ? primaryColor : "#6366f1"}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="h-9 w-9 rounded-xl border border-zinc-200 dark:border-white/10 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-900 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Secondary Accent Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={secondaryColor.startsWith("#") ? secondaryColor : "#a855f7"}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="h-9 w-9 rounded-xl border border-zinc-200 dark:border-white/10 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-900 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}