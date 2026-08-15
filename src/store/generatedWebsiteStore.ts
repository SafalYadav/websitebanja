import { create } from "zustand";
import type { WebsiteData } from "@/types/website";

export type ViewportMode = "desktop" | "tablet" | "mobile";

interface GeneratedWebsiteState {
  website: WebsiteData | null;
  isGenerating: boolean;
  selectedSection: string | null;
  isPreviewMode: boolean;
  viewportMode: ViewportMode;

  // History for Undo/Redo
  history: WebsiteData[];
  historyIndex: number;

  setWebsite: (website: WebsiteData) => void;
  setIsGenerating: (value: boolean) => void;
  setSelectedSection: (section: string | null) => void;
  setIsPreviewMode: (value: boolean) => void;
  setViewportMode: (mode: ViewportMode) => void;
  
  updateWebsiteSection: (section: string, data: WebsiteData[keyof WebsiteData]) => void;
  addSection: (sectionType: string) => void;
  duplicateSection: (sectionKey: string) => void;
  deleteSection: (sectionKey: string) => void;
  reorderSections: (newOrder: string[]) => void;
  
  undo: () => void;
  redo: () => void;
  resetWebsite: () => void;
}

const DEFAULT_ORDER = ["hero", "about", "services", "features", "faq", "contact", "footer"];

export const useGeneratedWebsiteStore = create<GeneratedWebsiteState>(
  (set, get) => ({
    website: null,
    isGenerating: false,
    selectedSection: "hero",
    isPreviewMode: false,
    viewportMode: "desktop",
    history: [],
    historyIndex: -1,

    setWebsite: (website) => {
      // Ensure sectionOrder exists
      if (!website.sectionOrder) {
        website.sectionOrder = [...DEFAULT_ORDER];
      }
      set({
        website,
        history: [website],
        historyIndex: 0,
      });
    },

    setIsGenerating: (value) => set({ isGenerating: value }),
    setSelectedSection: (section) => set({ selectedSection: section }),
    setIsPreviewMode: (value) => set({ isPreviewMode: value }),
    setViewportMode: (mode) => set({ viewportMode: mode }),

    updateWebsiteSection: (section, data) => {
      const { website, history, historyIndex } = get();
      if (!website) return;
      
      const newWebsite = { ...website, [section]: data };
      const newHistory = [...history.slice(0, historyIndex + 1), newWebsite];
      
      set({
        website: newWebsite,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      });
    },

    addSection: (sectionType: string) => {
      const { website, history, historyIndex } = get();
      if (!website || !website.sectionOrder) return;

      const newKey = `${sectionType}_${Date.now()}`;
      let defaultData: unknown = {};

      if (sectionType === "hero") {
        defaultData = {
          title: "Welcome to Our Business",
          subtitle: "We deliver exceptional quality, craftsmanship, and service.",
          button: "Explore Offerings",
        };
      } else if (sectionType === "about") {
        defaultData = {
          title: "About Our Mission",
          content: "We are passionate professionals dedicated to excellence in everything we create.",
        };
      } else if (sectionType === "services") {
        defaultData = [
          { title: "Bespoke Consulting", description: "Tailored strategies for immediate impact." },
          { title: "Core Execution", description: "High-precision delivery and ongoing optimization." },
        ];
      } else if (sectionType === "features") {
        defaultData = [
          { title: "Lightning Fast", description: "Engineered for speed and minimal latency." },
          { title: "Enterprise Grade", description: "Maximum security and 99.99% reliability." },
        ];
      } else if (sectionType === "faq") {
        defaultData = [
          { question: "What is your typical process?", answer: "We assess your requirements and deliver tailored solutions." },
        ];
      } else if (sectionType === "contact") {
        defaultData = { phone: "+1 (555) 000-0000", email: "hello@example.com", address: "123 Innovation Way" };
      } else if (sectionType === "footer") {
        defaultData = { copyright: `© ${new Date().getFullYear()} All Rights Reserved.` };
      }

      const newOrder = [...website.sectionOrder, newKey];
      const newWebsite = {
        ...website,
        [newKey]: defaultData,
        sectionOrder: newOrder,
      } as WebsiteData;

      const newHistory = [...history.slice(0, historyIndex + 1), newWebsite];
      set({
        website: newWebsite,
        history: newHistory,
        historyIndex: newHistory.length - 1,
        selectedSection: newKey,
      });
    },

    duplicateSection: (sectionKey) => {
      const { website, history, historyIndex } = get();
      if (!website || !website.sectionOrder) return;

      const baseData = website[sectionKey];
      if (!baseData) return;

      const baseType = sectionKey.split("_")[0];
      const newKey = `${baseType}_${Date.now()}`;
      
      const newOrder = [...website.sectionOrder];
      const currentIndex = newOrder.indexOf(sectionKey);
      if (currentIndex !== -1) {
        newOrder.splice(currentIndex + 1, 0, newKey);
      } else {
        newOrder.push(newKey);
      }

      const newWebsite = {
        ...website,
        [newKey]: JSON.parse(JSON.stringify(baseData)), // deep copy
        sectionOrder: newOrder,
      };

      const newHistory = [...history.slice(0, historyIndex + 1), newWebsite];
      set({
        website: newWebsite,
        history: newHistory,
        historyIndex: newHistory.length - 1,
        selectedSection: newKey,
      });
    },

    deleteSection: (sectionKey) => {
      const { website, history, historyIndex, selectedSection } = get();
      if (!website || !website.sectionOrder) return;

      const newOrder = website.sectionOrder.filter((k) => k !== sectionKey);
      const newWebsite = { ...website, sectionOrder: newOrder };

      const newHistory = [...history.slice(0, historyIndex + 1), newWebsite];
      set({
        website: newWebsite,
        history: newHistory,
        historyIndex: newHistory.length - 1,
        selectedSection: selectedSection === sectionKey ? (newOrder[0] || null) : selectedSection,
      });
    },

    reorderSections: (newOrder) => {
      const { website, history, historyIndex } = get();
      if (!website) return;

      const newWebsite = { ...website, sectionOrder: newOrder };
      const newHistory = [...history.slice(0, historyIndex + 1), newWebsite];
      
      set({
        website: newWebsite,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      });
    },

    undo: () => {
      const { history, historyIndex } = get();
      if (historyIndex > 0) {
        set({
          website: history[historyIndex - 1],
          historyIndex: historyIndex - 1,
        });
      }
    },

    redo: () => {
      const { history, historyIndex } = get();
      if (historyIndex < history.length - 1) {
        set({
          website: history[historyIndex + 1],
          historyIndex: historyIndex + 1,
        });
      }
    },

    resetWebsite: () =>
      set({
        website: null,
        isGenerating: false,
        selectedSection: "hero",
        isPreviewMode: false,
        viewportMode: "desktop",
        history: [],
        historyIndex: -1,
      }),
  })
);