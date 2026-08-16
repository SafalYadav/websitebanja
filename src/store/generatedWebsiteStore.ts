import { create } from "zustand";
import type { WebsiteData, ElementSelection, ProductItem } from "@/types/website";

export type ViewportMode = "desktop" | "tablet" | "mobile";
export type StudioTab = "layers" | "elements" | "catalog" | "ai" | "theme";

interface GeneratedWebsiteState {
  website: WebsiteData | null;
  isGenerating: boolean;
  selectedSection: string | null;
  selectedElement: ElementSelection | null;
  activeStudioTab: StudioTab;
  isPreviewMode: boolean;
  viewportMode: ViewportMode;

  // History for Undo/Redo
  history: WebsiteData[];
  historyIndex: number;

  // Setters
  setWebsite: (website: WebsiteData) => void;
  setIsGenerating: (value: boolean) => void;
  setSelectedSection: (section: string | null) => void;
  setSelectedElement: (element: ElementSelection | null) => void;
  setActiveStudioTab: (tab: StudioTab) => void;
  setIsPreviewMode: (value: boolean) => void;
  setViewportMode: (mode: ViewportMode) => void;

  // Section Operations
  updateWebsiteSection: (section: string, data: WebsiteData[keyof WebsiteData]) => void;
  addSection: (sectionType: string) => void;
  duplicateSection: (sectionKey: string) => void;
  deleteSection: (sectionKey: string) => void;
  reorderSections: (newOrder: string[]) => void;

  // Element-Level Direct Editing
  updateElementValue: (elementPath: string, newValue: unknown) => void;

  // E-Commerce Catalog Operations
  addProduct: (product: Omit<ProductItem, "id">) => void;
  updateProduct: (productId: string, updates: Partial<ProductItem>) => void;
  deleteProduct: (productId: string) => void;
  reorderProducts: (products: ProductItem[]) => void;

  // Undo / Redo
  undo: () => void;
  redo: () => void;
  resetWebsite: () => void;
}

const DEFAULT_ORDER = ["hero", "about", "services", "features", "faq", "contact", "footer"];

// Helper: Safely sets a deep value using a path string e.g. "hero.title" or "services[0].title"
function setDeepValue(obj: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const root = JSON.parse(JSON.stringify(obj)) as Record<string, unknown>;
  const keys = path.replace(/\[(\w+)\]/g, ".$1").split(".");
  let current: Record<string, unknown> = root;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!current[key] || typeof current[key] !== "object") {
      current[key] = isNaN(Number(keys[i + 1])) ? {} : [];
    }
    current = current[key] as Record<string, unknown>;
  }

  current[keys[keys.length - 1]] = value;
  return root;
}

export const useGeneratedWebsiteStore = create<GeneratedWebsiteState>((set, get) => ({
  website: null,
  isGenerating: false,
  selectedSection: "hero",
  selectedElement: null,
  activeStudioTab: "layers",
  isPreviewMode: false,
  viewportMode: "desktop",
  history: [],
  historyIndex: -1,

  setWebsite: (website) => {
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
  setSelectedElement: (element) => {
    set({ selectedElement: element });
    if (element?.sectionKey) {
      set({ selectedSection: element.sectionKey });
    }
  },
  setActiveStudioTab: (tab) => set({ activeStudioTab: tab }),
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

  updateElementValue: (elementPath, newValue) => {
    const { website, history, historyIndex, selectedElement } = get();
    if (!website) return;

    const updatedWebsite = setDeepValue(website as unknown as Record<string, unknown>, elementPath, newValue) as unknown as WebsiteData;
    const newHistory = [...history.slice(0, historyIndex + 1), updatedWebsite];

    set({
      website: updatedWebsite,
      history: newHistory,
      historyIndex: newHistory.length - 1,
      selectedElement: selectedElement ? { ...selectedElement, value: newValue } : null,
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
        subtitle: "We deliver exceptional quality, craftsmanship, and dedicated service.",
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
    } else if (sectionType === "products" || sectionType === "catalog") {
      defaultData = {
        title: "Featured Collection",
        subtitle: "Explore our bestselling curated selection of products.",
        products: [
          {
            id: `prod_${Date.now()}_1`,
            name: "Signature Item Pro",
            description: "Premium handcrafted quality designed for lasting performance.",
            price: 2499,
            originalPrice: 3499,
            image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80",
            category: "Bestseller",
            status: "active",
            ctaText: "Order on WhatsApp",
            badge: "Popular",
          },
          {
            id: `prod_${Date.now()}_2`,
            name: "Classic Edition",
            description: "Essential everyday standard with refined modern aesthetic.",
            price: 1499,
            originalPrice: 1999,
            image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80",
            category: "Essential",
            status: "active",
            ctaText: "Order on WhatsApp",
          },
        ],
      };
    } else if (sectionType === "faq") {
      defaultData = [
        { question: "What is your typical turnaround time?", answer: "We assess your requirements and deliver rapid turnaround with dedicated support." },
      ];
    } else if (sectionType === "contact") {
      defaultData = { phone: "+91 98765 43210", email: "contact@example.com", address: "Mumbai, India" };
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
      [newKey]: JSON.parse(JSON.stringify(baseData)),
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
      selectedSection: selectedSection === sectionKey ? newOrder[0] || null : selectedSection,
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

  // E-Commerce Catalog
  addProduct: (product) => {
    const { website, history, historyIndex } = get();
    if (!website) return;

    const newProduct: ProductItem = {
      ...product,
      id: `prod_${Date.now()}`,
    };

    const currentProducts = (website.products as ProductItem[] | undefined) || [];
    const updatedProducts = [newProduct, ...currentProducts];

    // Also update productsSection if active
    const newWebsite = {
      ...website,
      products: updatedProducts,
    };

    if (website.productsSection) {
      newWebsite.productsSection = {
        ...website.productsSection,
        products: updatedProducts,
      };
    }

    const newHistory = [...history.slice(0, historyIndex + 1), newWebsite];
    set({
      website: newWebsite,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  updateProduct: (productId, updates) => {
    const { website, history, historyIndex } = get();
    if (!website) return;

    const currentProducts = (website.products as ProductItem[] | undefined) || [];
    const updatedProducts = currentProducts.map((p) => (p.id === productId ? { ...p, ...updates } : p));

    const newWebsite = {
      ...website,
      products: updatedProducts,
    };

    if (website.productsSection) {
      newWebsite.productsSection = {
        ...website.productsSection,
        products: updatedProducts,
      };
    }

    const newHistory = [...history.slice(0, historyIndex + 1), newWebsite];
    set({
      website: newWebsite,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  deleteProduct: (productId) => {
    const { website, history, historyIndex } = get();
    if (!website) return;

    const currentProducts = (website.products as ProductItem[] | undefined) || [];
    const updatedProducts = currentProducts.filter((p) => p.id !== productId);

    const newWebsite = {
      ...website,
      products: updatedProducts,
    };

    if (website.productsSection) {
      newWebsite.productsSection = {
        ...website.productsSection,
        products: updatedProducts,
      };
    }

    const newHistory = [...history.slice(0, historyIndex + 1), newWebsite];
    set({
      website: newWebsite,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  reorderProducts: (products) => {
    const { website, history, historyIndex } = get();
    if (!website) return;

    const newWebsite = {
      ...website,
      products,
    };

    if (website.productsSection) {
      newWebsite.productsSection = {
        ...website.productsSection,
        products,
      };
    }

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
      selectedElement: null,
      activeStudioTab: "layers",
      isPreviewMode: false,
      viewportMode: "desktop",
      history: [],
      historyIndex: -1,
    }),
}));