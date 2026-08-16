"use client";

import React, { useState } from "react";
import { useGeneratedWebsiteStore } from "@/store/generatedWebsiteStore";
import InputField from "@/components/builder/InputField";
import TextAreaField from "@/components/builder/TextAreaField";
import ImageMediaModal from "@/components/editor/ImageMediaModal";
import {
  Home,
  FileText,
  Wrench,
  Sparkles,
  HelpCircle,
  Phone,
  Layers,
  Plus,
  Trash2,
  Sliders,
  ImageIcon,
  ShoppingBag,
  X,
  Type,
  MousePointerClick,
} from "lucide-react";

const SECTION_ICONS: Record<string, React.ElementType> = {
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

export default function SectionEditor() {
  const website = useGeneratedWebsiteStore((state) => state.website);
  const selectedSection = useGeneratedWebsiteStore((state) => state.selectedSection);
  const updateWebsiteSection = useGeneratedWebsiteStore((state) => state.updateWebsiteSection);
  const selectedElement = useGeneratedWebsiteStore((state) => state.selectedElement);
  const setSelectedElement = useGeneratedWebsiteStore((state) => state.setSelectedElement);
  const updateElementValue = useGeneratedWebsiteStore((state) => state.updateElementValue);

  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  // 1. Element-Level Inspector Mode
  if (selectedElement) {
    const isImage = selectedElement.elementType === "image";
    const currentValue = typeof selectedElement.value === "string" ? selectedElement.value : "";

    return (
      <div className="h-full w-full overflow-y-auto p-5 select-none space-y-6">
        {/* Element Inspector Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-white/10">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-violet-600 text-white shadow-xs">
              {isImage ? <ImageIcon className="h-3.5 w-3.5" /> : <Type className="h-3.5 w-3.5" />}
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
                {selectedElement.label || selectedElement.elementType}
              </h2>
              <span className="text-[10px] text-zinc-400 font-mono">
                {selectedElement.elementPath}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSelectedElement(null)}
            className="flex h-6 w-6 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-white transition"
            title="Deselect Element"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Content Controls */}
        <div className="space-y-4">
          {isImage ? (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Image Source URL
              </label>
              <InputField
                label=""
                placeholder="https://images.unsplash.com/..."
                value={currentValue}
                onChange={(e) => updateElementValue(selectedElement.elementPath, e.target.value)}
              />

              <button
                type="button"
                onClick={() => setIsImageModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-xs font-bold text-white shadow-md shadow-violet-500/20 hover:bg-violet-700 transition"
              >
                <ImageIcon className="h-4 w-4" />
                Browse & Replace Image
              </button>
            </div>
          ) : selectedElement.elementType === "paragraph" || currentValue.length > 70 ? (
            <TextAreaField
              label="Element Text"
              rows={5}
              value={currentValue}
              onChange={(e) => updateElementValue(selectedElement.elementPath, e.target.value)}
            />
          ) : (
            <InputField
              label="Element Content"
              value={currentValue}
              onChange={(e) => updateElementValue(selectedElement.elementPath, e.target.value)}
            />
          )}

          <div className="rounded-2xl border border-zinc-200/60 bg-zinc-50/50 p-3.5 dark:border-white/5 dark:bg-zinc-900/40 text-xs text-zinc-500">
            <div className="flex items-center gap-1.5 font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              <MousePointerClick className="h-3.5 w-3.5 text-violet-500" />
              Direct Editing Active
            </div>
            Changes synchronize immediately with the canvas and autosave.
          </div>
        </div>

        {isImageModalOpen && (
          <ImageMediaModal
            isOpen={isImageModalOpen}
            currentUrl={currentValue}
            onClose={() => setIsImageModalOpen(false)}
            onSelectImage={(newUrl) => {
              updateElementValue(selectedElement.elementPath, newUrl);
            }}
          />
        )}
      </div>
    );
  }

  // 2. Section Inspector Mode
  if (!website || !selectedSection) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-900 text-zinc-400 mb-3">
          <Sliders className="h-6 w-6" />
        </div>
        <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          No Section Selected
        </p>
        <p className="text-xs text-zinc-500 mt-1 max-w-[200px]">
          Click any section or element on the canvas to inspect and edit.
        </p>
      </div>
    );
  }

  const sectionData = website[selectedSection];
  const baseType = selectedSection.split("_")[0];
  const Icon = SECTION_ICONS[baseType] || Sliders;

  const handleUpdate = (updates: unknown) => {
    if (Array.isArray(updates)) {
      updateWebsiteSection(selectedSection, updates as unknown as Parameters<typeof updateWebsiteSection>[1]);
    } else if (typeof updates === "object" && updates !== null) {
      if (Array.isArray(sectionData)) {
        updateWebsiteSection(selectedSection, updates as unknown as Parameters<typeof updateWebsiteSection>[1]);
      } else {
        updateWebsiteSection(selectedSection, {
          ...(typeof sectionData === "object" && !Array.isArray(sectionData) ? sectionData : {}),
          ...updates,
        } as unknown as Parameters<typeof updateWebsiteSection>[1]);
      }
    }
  };

  const renderFields = () => {
    switch (baseType) {
      case "hero": {
        const hero = (sectionData && typeof sectionData === "object" && !Array.isArray(sectionData)
          ? sectionData
          : {}) as {
          title?: string;
          subtitle?: string;
          button?: string;
          image?: string;
        };
        return (
          <div className="space-y-4">
            <InputField
              label="Hero Headline"
              placeholder="Your primary value proposition..."
              value={hero.title || ""}
              onChange={(e) => handleUpdate({ title: e.target.value })}
            />
            <TextAreaField
              label="Supporting Subtitle"
              placeholder="Detailed explanation of your business offering..."
              rows={3}
              value={hero.subtitle || ""}
              onChange={(e) => handleUpdate({ subtitle: e.target.value })}
            />
            <InputField
              label="Primary CTA Button Text"
              placeholder="e.g. Get Started, Book Consultation"
              value={hero.button || ""}
              onChange={(e) => handleUpdate({ button: e.target.value })}
            />
            <InputField
              label="Hero Showcase Image URL"
              placeholder="https://images.unsplash.com/..."
              value={hero.image || ""}
              onChange={(e) => handleUpdate({ image: e.target.value })}
            />
          </div>
        );
      }

      case "about": {
        const about = (sectionData && typeof sectionData === "object" && !Array.isArray(sectionData)
          ? sectionData
          : {}) as {
          title?: string;
          content?: string;
          image?: string;
        };
        return (
          <div className="space-y-4">
            <InputField
              label="Section Headline"
              placeholder="About our story..."
              value={about.title || ""}
              onChange={(e) => handleUpdate({ title: e.target.value })}
            />
            <TextAreaField
              label="Mission & Story Copy"
              placeholder="Describe your company journey, values, and vision..."
              rows={6}
              value={about.content || ""}
              onChange={(e) => handleUpdate({ content: e.target.value })}
            />
            <InputField
              label="About Photo Image URL"
              placeholder="https://images.unsplash.com/..."
              value={about.image || ""}
              onChange={(e) => handleUpdate({ image: e.target.value })}
            />
          </div>
        );
      }

      case "services": {
        let services: Array<{ title: string; description: string }> = [];
        if (Array.isArray(sectionData)) {
          services = (sectionData as unknown[]).filter((v): v is { title: string; description: string } =>
            Boolean(v && typeof v === "object" && "title" in v)
          );
        } else if (sectionData && typeof sectionData === "object") {
          services = Object.values(sectionData).filter((v): v is { title: string; description: string } =>
            Boolean(v && typeof v === "object" && "title" in v)
          );
        }

        return (
          <div className="space-y-4">
            {services.map((svc, i) => (
              <div
                key={i}
                className="space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-zinc-900/60"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                    Service {i + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const newServices = services.filter((_, idx) => idx !== i);
                      handleUpdate(newServices);
                    }}
                    className="text-zinc-400 hover:text-red-500 transition p-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <InputField
                  label="Service Title"
                  value={svc.title || ""}
                  onChange={(e) => {
                    const newServices = services.map((s, idx) =>
                      idx === i ? { ...s, title: e.target.value } : s
                    );
                    handleUpdate(newServices);
                  }}
                />
                <TextAreaField
                  label="Description"
                  rows={2}
                  value={svc.description || ""}
                  onChange={(e) => {
                    const newServices = services.map((s, idx) =>
                      idx === i ? { ...s, description: e.target.value } : s
                    );
                    handleUpdate(newServices);
                  }}
                />
              </div>
            ))}

            <button
              type="button"
              onClick={() => {
                const newServices = [
                  ...services,
                  { title: "New Service Offering", description: "Tailored to your requirements." },
                ];
                handleUpdate(newServices);
              }}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-zinc-300 py-2.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:border-white/15 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Service</span>
            </button>
          </div>
        );
      }

      case "features": {
        let features: Array<{ title: string; description: string }> = [];
        if (Array.isArray(sectionData)) {
          features = (sectionData as unknown[]).filter((v): v is { title: string; description: string } =>
            Boolean(v && typeof v === "object" && "title" in v)
          );
        } else if (sectionData && typeof sectionData === "object") {
          features = Object.values(sectionData).filter((v): v is { title: string; description: string } =>
            Boolean(v && typeof v === "object" && "title" in v)
          );
        }

        return (
          <div className="space-y-4">
            {features.map((ft, i) => (
              <div
                key={i}
                className="space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-zinc-900/60"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                    Feature {i + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const newFeatures = features.filter((_, idx) => idx !== i);
                      handleUpdate(newFeatures);
                    }}
                    className="text-zinc-400 hover:text-red-500 transition p-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <InputField
                  label="Feature Title"
                  value={ft.title || ""}
                  onChange={(e) => {
                    const newFeatures = features.map((f, idx) =>
                      idx === i ? { ...f, title: e.target.value } : f
                    );
                    handleUpdate(newFeatures);
                  }}
                />
                <TextAreaField
                  label="Description"
                  rows={2}
                  value={ft.description || ""}
                  onChange={(e) => {
                    const newFeatures = features.map((f, idx) =>
                      idx === i ? { ...f, description: e.target.value } : f
                    );
                    handleUpdate(newFeatures);
                  }}
                />
              </div>
            ))}

            <button
              type="button"
              onClick={() => {
                const newFeatures = [
                  ...features,
                  { title: "New Core Feature", description: "Engineered for speed, reliability, and security." },
                ];
                handleUpdate(newFeatures);
              }}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-zinc-300 py-2.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:border-white/15 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Feature</span>
            </button>
          </div>
        );
      }

      case "faq": {
        let faq: Array<{ question: string; answer: string }> = [];
        if (Array.isArray(sectionData)) {
          faq = (sectionData as unknown[]).filter((v): v is { question: string; answer: string } =>
            Boolean(v && typeof v === "object" && "question" in v)
          );
        } else if (sectionData && typeof sectionData === "object") {
          faq = Object.values(sectionData).filter((v): v is { question: string; answer: string } =>
            Boolean(v && typeof v === "object" && "question" in v)
          );
        }

        return (
          <div className="space-y-4">
            {faq.map((item, i) => (
              <div
                key={i}
                className="space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-zinc-900/60"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                    Question {i + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const newFaq = faq.filter((_, idx) => idx !== i);
                      handleUpdate(newFaq);
                    }}
                    className="text-zinc-400 hover:text-red-500 transition p-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <InputField
                  label="Question"
                  value={item.question || ""}
                  onChange={(e) => {
                    const newFaq = faq.map((q, idx) =>
                      idx === i ? { ...q, question: e.target.value } : q
                    );
                    handleUpdate(newFaq);
                  }}
                />
                <TextAreaField
                  label="Answer"
                  rows={2}
                  value={item.answer || ""}
                  onChange={(e) => {
                    const newFaq = faq.map((q, idx) =>
                      idx === i ? { ...q, answer: e.target.value } : q
                    );
                    handleUpdate(newFaq);
                  }}
                />
              </div>
            ))}

            <button
              type="button"
              onClick={() => {
                const newFaq = [
                  ...faq,
                  { question: "What is your pricing policy?", answer: "Transparent and predictable." },
                ];
                handleUpdate(newFaq);
              }}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-zinc-300 py-2.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:border-white/15 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Question</span>
            </button>
          </div>
        );
      }

      case "contact": {
        const contact = (sectionData && typeof sectionData === "object" && !Array.isArray(sectionData)
          ? sectionData
          : {}) as {
          phone?: string;
          email?: string;
          address?: string;
        };
        return (
          <div className="space-y-4">
            <InputField
              label="Direct Phone Number"
              placeholder="+91 98765 43210"
              value={contact.phone || ""}
              onChange={(e) => handleUpdate({ phone: e.target.value })}
            />
            <InputField
              label="Business Email"
              type="email"
              placeholder="hello@business.com"
              value={contact.email || ""}
              onChange={(e) => handleUpdate({ email: e.target.value })}
            />
            <TextAreaField
              label="Physical Address / Location"
              rows={2}
              placeholder="City, State, Country..."
              value={contact.address || ""}
              onChange={(e) => handleUpdate({ address: e.target.value })}
            />
          </div>
        );
      }

      case "footer": {
        const footer = (sectionData && typeof sectionData === "object" && !Array.isArray(sectionData)
          ? sectionData
          : {}) as {
          copyright?: string;
        };
        return (
          <div className="space-y-4">
            <InputField
              label="Copyright & Legal Notice"
              placeholder="© 2026 Business Name. All rights reserved."
              value={footer.copyright || ""}
              onChange={(e) => handleUpdate({ copyright: e.target.value })}
            />
          </div>
        );
      }

      default:
        return <p className="text-xs text-zinc-500">Custom section properties active.</p>;
    }
  };

  return (
    <div className="h-full w-full overflow-y-auto p-5 select-none space-y-6">
      {/* Inspector Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-white/10">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-violet-600 text-white shadow-xs">
            <Icon className="h-3.5 w-3.5" />
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
              {baseType} Properties
            </h2>
            <span className="text-[10px] text-zinc-400 font-mono">Live Synchronized</span>
          </div>
        </div>
      </div>

      <div>{renderFields()}</div>
    </div>
  );
}
