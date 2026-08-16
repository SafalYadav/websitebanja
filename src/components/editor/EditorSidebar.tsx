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
  CreditCard,
  Quote,
  Users2,
  Flame,
  Search,
  RotateCcw,
  History,
  Globe,
  ShieldCheck,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<string, React.ElementType> = {
  hero: Home,
  about: FileText,
  services: Wrench,
  features: Sparkles,
  products: ShoppingBag,
  catalog: ShoppingBag,
  pricing: CreditCard,
  testimonials: Quote,
  team: Users2,
  cta: Flame,
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
  pricing: "Pricing Tables",
  testimonials: "Testimonials",
  team: "Team Members",
  cta: "Call to Action",
  faq: "FAQ Accordion",
  contact: "Contact Details",
  footer: "Footer Section",
};

const SECTION_CATEGORIES: { name: string; blocks: { type: string; label: string; desc: string; icon: React.ElementType }[] }[] = [
  {
    name: "General & Business",
    blocks: [
      { type: "hero", label: "Hero Showcase", desc: "Hero title, value prop & CTA", icon: Home },
      { type: "about", label: "About Mission", desc: "Founder story & verified trust", icon: FileText },
      { type: "services", label: "Core Services", desc: "Interactive service cards", icon: Wrench },
      { type: "features", label: "Feature Matrix", desc: "Key benefits and specs", icon: Sparkles },
    ],
  },
  {
    name: "E-Commerce & Sales",
    blocks: [
      { type: "products", label: "Product Grid", desc: "Live catalog & WhatsApp checkout", icon: ShoppingBag },
      { type: "pricing", label: "Pricing Tables", desc: "Tiered pricing plans & comparison", icon: CreditCard },
      { type: "cta", label: "High-Converting CTA", desc: "Bold banner driving immediate action", icon: Flame },
    ],
  },
  {
    name: "Social Proof & Team",
    blocks: [
      { type: "testimonials", label: "Customer Reviews", desc: "Client quotes and star ratings", icon: Quote },
      { type: "team", label: "Leadership & Team", desc: "Team bio cards and social handles", icon: Users2 },
    ],
  },
  {
    name: "Trust & Support",
    blocks: [
      { type: "faq", label: "FAQ Accordion", desc: "Answers to common objections", icon: HelpCircle },
      { type: "contact", label: "Contact & Leads", desc: "Direct lead capture form & phone", icon: Phone },
      { type: "footer", label: "Footer Links", desc: "Legal, copyright and anchors", icon: Layers },
    ],
  },
];

const THEME_PRESETS = [
  { name: "Modern", primary: "#4f46e5", secondary: "#06b6d4", style: "Modern" },
  { name: "Luxury", primary: "#d97706", secondary: "#18181b", style: "Luxury" },
  { name: "Minimal", primary: "#18181b", secondary: "#71717a", style: "Minimal" },
  { name: "Bold", primary: "#6366f1", secondary: "#f43f5e", style: "Creative" },
  { name: "Elegant", primary: "#059669", secondary: "#f59e0b", style: "Corporate" },
  { name: "Tech", primary: "#0ea5e9", secondary: "#8b5cf6", style: "Dark" },
  { name: "Ecommerce", primary: "#f59e0b", secondary: "#6366f1", style: "Modern" },
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
    activePageId,
    setActivePage,
    addPage,
    deletePage,
    duplicatePage,
    setHomepage,
    updatePageSeo,
    toggleAdminDashboard,
    saveVersionSnapshot,
    restoreVersionSnapshot,
  } = useGeneratedWebsiteStore();

  const primaryColor = useBuilderStore((state) => state.primaryColor);
  const secondaryColor = useBuilderStore((state) => state.secondaryColor);
  const setPrimaryColor = useBuilderStore((state) => state.setPrimaryColor);
  const setSecondaryColor = useBuilderStore((state) => state.setSecondaryColor);
  const style = useBuilderStore((state) => state.style);
  const setStyle = useBuilderStore((state) => state.setStyle);

  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [newPageTitle, setNewPageTitle] = useState("");
  const [isAddingPage, setIsAddingPage] = useState(false);
  const [snapshotDesc, setSnapshotDesc] = useState("");

  if (!website) return null;

  const pages = website.pages || [
    { id: "home", slug: "", title: "Home", isHome: true, sectionOrder: website.sectionOrder || [] },
  ];
  const activePage = pages.find((p) => p.id === activePageId) || pages[0];
  const activeSectionOrder = activePage?.sectionOrder || website.sectionOrder || [];

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

    const newOrder = [...activeSectionOrder];
    const draggedIdx = newOrder.indexOf(draggedItem);
    const targetIdx = newOrder.indexOf(targetKey);

    newOrder.splice(draggedIdx, 1);
    newOrder.splice(targetIdx, 0, draggedItem);

    reorderSections(newOrder);
    setDraggedItem(null);
  };

  const applyThemePreset = (preset: typeof THEME_PRESETS[0]) => {
    setPrimaryColor(preset.primary);
    setSecondaryColor(preset.secondary);
    setStyle(preset.style);
  };

  const handleCreatePage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPageTitle.trim()) return;
    addPage(newPageTitle.trim());
    setNewPageTitle("");
    setIsAddingPage(false);
  };

  const TABS: { id: StudioTab; label: string; icon: React.ElementType }[] = [
    { id: "pages", label: "Pages", icon: Globe },
    { id: "layers", label: "Layers", icon: Layers },
    { id: "elements", label: "Add", icon: LayoutGrid },
    { id: "catalog", label: "Catalog", icon: ShoppingBag },
    { id: "ai", label: "Copilot", icon: Bot },
    { id: "theme", label: "Theme", icon: Palette },
    { id: "seo", label: "SEO", icon: Search },
    { id: "history", label: "History", icon: History },
  ];

  return (
    <aside className="w-80 border-r border-zinc-200/80 bg-white/95 dark:border-white/10 dark:bg-zinc-950/95 flex flex-col h-full flex-shrink-0 select-none overflow-hidden backdrop-blur-xl">
      {/* Top Studio Mode Tab Strip */}
      <div className="grid grid-cols-4 border-b border-zinc-200/80 dark:border-white/10 bg-zinc-50/70 dark:bg-zinc-900/60 p-1 gap-1">
        {TABS.map((tab) => {
          const TabIcon = tab.icon;
          const isActive = activeStudioTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveStudioTab(tab.id)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-xl py-1.5 px-0.5 text-[9px] font-bold transition-all",
                isActive
                  ? "bg-white text-violet-600 shadow-xs dark:bg-zinc-800 dark:text-white"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40"
              )}
            >
              <TabIcon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Tab Panel Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* 1. Multi-Page Manager Tab */}
        {activeStudioTab === "pages" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Site Pages ({pages.length})
              </span>
              <button
                type="button"
                onClick={() => setIsAddingPage(true)}
                className="flex items-center gap-1 text-xs font-bold text-violet-600 hover:text-violet-700"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Page
              </button>
            </div>

            {isAddingPage && (
              <form onSubmit={handleCreatePage} className="p-3 rounded-2xl border border-violet-500/50 bg-violet-50/40 dark:bg-violet-950/20 space-y-2">
                <input
                  type="text"
                  placeholder="e.g. About Us, Menu, Services"
                  value={newPageTitle}
                  autoFocus
                  onChange={(e) => setNewPageTitle(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold outline-none focus:border-violet-500 dark:border-white/10 dark:bg-zinc-900"
                />
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsAddingPage(false)}
                    className="px-2.5 py-1 text-xs text-zinc-500 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-violet-600 px-3 py-1 text-xs font-bold text-white hover:bg-violet-700"
                  >
                    Create
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-2">
              {pages.map((page) => {
                const isActive = page.id === activePage.id;
                return (
                  <div
                    key={page.id}
                    className={cn(
                      "group flex items-center justify-between p-2.5 rounded-2xl border transition text-xs",
                      isActive
                        ? "border-violet-500 bg-violet-50 text-violet-950 dark:bg-violet-950/30 dark:text-white shadow-xs"
                        : "border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-zinc-900"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setActivePage(page.id)}
                      className="flex items-center gap-2 flex-1 min-w-0 text-left"
                    >
                      <Globe className={cn("h-4 w-4 shrink-0", isActive ? "text-violet-600" : "text-zinc-400")} />
                      <div className="min-w-0 truncate">
                        <span className="font-bold block truncate">{page.title}</span>
                        <span className="text-[10px] text-zinc-400 font-mono">
                          {page.isHome ? "/ (Home)" : `/${page.slug}`}
                        </span>
                      </div>
                    </button>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!page.isHome && (
                        <button
                          type="button"
                          onClick={() => setHomepage(page.id)}
                          title="Set as Homepage"
                          className="p-1 rounded-md text-zinc-400 hover:text-amber-500"
                        >
                          <Home className="h-3 w-3" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => duplicatePage(page.id)}
                        title="Duplicate Page"
                        className="p-1 rounded-md text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                      {!page.isHome && pages.length > 1 && (
                        <button
                          type="button"
                          onClick={() => deletePage(page.id)}
                          title="Delete Page"
                          className="p-1 rounded-md text-zinc-400 hover:text-rose-600"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Generated Website Owner Admin Toggle */}
            <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  Site Owner Admin
                </span>
                <button
                  type="button"
                  onClick={() => toggleAdminDashboard()}
                  className={cn(
                    "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden",
                    website.hasAdminDashboard ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
                      website.hasAdminDashboard ? "translate-x-4" : "translate-x-0"
                    )}
                  />
                </button>
              </div>
              <p className="text-[11px] text-zinc-500">
                Enables a dedicated <code>/p/[slug]/admin</code> portal for managing catalog, leads & site telemetry.
              </p>
            </div>
          </div>
        )}

        {/* 2. Layers Tab */}
        {activeStudioTab === "layers" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                {activePage?.title} Layers ({activeSectionOrder.length})
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
              {activeSectionOrder.map((sectionKey) => {
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

        {/* 3. Section Library Tab */}
        {activeStudioTab === "elements" && (
          <div className="space-y-5">
            {SECTION_CATEGORIES.map((cat) => (
              <div key={cat.name} className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
                  {cat.name}
                </span>
                <div className="grid grid-cols-1 gap-2">
                  {cat.blocks.map((block) => {
                    const BlockIcon = block.icon;
                    return (
                      <button
                        key={block.type}
                        type="button"
                        onClick={() => {
                          addSection(block.type);
                          setActiveStudioTab("layers");
                        }}
                        className="flex items-start gap-3 rounded-2xl border border-zinc-200 bg-white p-3 text-left transition hover:border-violet-500 hover:bg-violet-50/40 hover:shadow-xs dark:border-white/10 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-600/10 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400 shrink-0">
                          <BlockIcon className="h-4 w-4" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-zinc-900 dark:text-white block">
                            {block.label}
                          </span>
                          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block">
                            {block.desc}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 4. Catalog Tab */}
        {activeStudioTab === "catalog" && <CatalogManager />}

        {/* 5. AI Copilot Tab */}
        {activeStudioTab === "ai" && <AiStudioAssistant />}

        {/* 6. Theme & Styles Tab */}
        {activeStudioTab === "theme" && (
          <div className="space-y-6">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3">
                1-Click Theme Presets
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {THEME_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => applyThemePreset(preset)}
                    className="flex items-center gap-2.5 rounded-xl border border-zinc-200 p-2 text-left hover:border-violet-500 hover:bg-violet-50/30 dark:border-white/10 dark:hover:bg-zinc-900 transition"
                  >
                    <div className="flex items-center -space-x-1 shrink-0">
                      <span
                        className="h-4 w-4 rounded-full border border-white shadow-2xs"
                        style={{ backgroundColor: preset.primary }}
                      />
                      <span
                        className="h-4 w-4 rounded-full border border-white shadow-2xs"
                        style={{ backgroundColor: preset.secondary }}
                      />
                    </div>
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      {preset.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

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

        {/* 7. SEO Manager Tab */}
        {activeStudioTab === "seo" && (
          <div className="space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
              SEO & Social Cards — {activePage?.title}
            </span>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Page SEO Title
                </label>
                <input
                  type="text"
                  value={activePage?.seo?.title || ""}
                  placeholder={`${activePage?.title || "Page"} | Business`}
                  onChange={(e) => updatePageSeo(activePage.id, { title: e.target.value })}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium dark:border-white/10 dark:bg-zinc-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Meta Description
                </label>
                <textarea
                  rows={3}
                  value={activePage?.seo?.description || ""}
                  placeholder="Summary of this page for Google search results..."
                  onChange={(e) => updatePageSeo(activePage.id, { description: e.target.value })}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium dark:border-white/10 dark:bg-zinc-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Social Share (OG) Title
                </label>
                <input
                  type="text"
                  value={activePage?.seo?.ogTitle || ""}
                  placeholder="Title shown on WhatsApp, Twitter, and LinkedIn"
                  onChange={(e) => updatePageSeo(activePage.id, { ogTitle: e.target.value })}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium dark:border-white/10 dark:bg-zinc-900"
                />
              </div>

              {/* Google Search Preview Snippet */}
              <div className="mt-4 p-3 rounded-2xl bg-zinc-50 border border-zinc-200 dark:bg-zinc-900 dark:border-white/10">
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 block truncate">
                  https://websitebanja.com/p/.../{activePage?.slug}
                </span>
                <h5 className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-1 truncate">
                  {activePage?.seo?.title || `${activePage?.title} | Official Site`}
                </h5>
                <p className="text-[11px] text-zinc-500 line-clamp-2 mt-0.5">
                  {activePage?.seo?.description || "Explore our products, services, and company story."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 8. Version History & Restore Tab */}
        {activeStudioTab === "history" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Snapshots ({website.versions?.length || 0})
              </span>
              <button
                type="button"
                onClick={() => saveVersionSnapshot(snapshotDesc || "Saved Version")}
                className="flex items-center gap-1 text-xs font-bold text-violet-600 hover:text-violet-700"
              >
                <Plus className="h-3.5 w-3.5" />
                Save Version
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Snapshot label..."
                value={snapshotDesc}
                onChange={(e) => setSnapshotDesc(e.target.value)}
                className="flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs dark:border-white/10 dark:bg-zinc-900"
              />
              <button
                type="button"
                onClick={() => {
                  saveVersionSnapshot(snapshotDesc || "Manual Snapshot");
                  setSnapshotDesc("");
                }}
                className="rounded-xl bg-violet-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-violet-700"
              >
                Save
              </button>
            </div>

            <div className="space-y-2">
              {(website.versions || []).map((ver) => (
                <div
                  key={ver.id}
                  className="p-3 rounded-2xl border border-zinc-200 bg-white dark:border-white/10 dark:bg-zinc-900 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-zinc-900 dark:text-white block">{ver.description}</span>
                    <span className="text-[10px] text-zinc-400 flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3" />
                      {new Date(ver.timestamp).toLocaleDateString()} {new Date(ver.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => restoreVersionSnapshot(ver.id)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-violet-50 text-violet-700 dark:bg-zinc-800 dark:hover:bg-violet-950/40 dark:text-violet-300 font-bold transition"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Restore</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}