import { create } from "zustand";
import type {
  WebsiteData,
  ElementSelection,
  ButtonActionConfig,
  WebsitePage,
  PageSeoConfig,
  WebsiteVersionSnapshot,
} from "@/types/website";

export type ViewportMode = "desktop" | "tablet" | "mobile";
export type StudioTab = "pages" | "layers" | "elements" | "catalog" | "ai" | "theme" | "seo" | "history";

interface GeneratedWebsiteState {
  currentProjectId: string | null;
  website: WebsiteData | null;
  isGenerating: boolean;
  selectedSection: string | null;
  selectedElement: ElementSelection | null;
  activeStudioTab: StudioTab;
  isPreviewMode: boolean;
  viewportMode: ViewportMode;

  // Multi-Page Website State
  activePageId: string;

  // Right Inspector Panel UX Controls
  isRightPanelOpen: boolean;
  rightPanelWidth: number;

  // Catalog & Product Full-Screen Workspace
  isCatalogModalOpen: boolean;
  isProductFullScreenEditorOpen: boolean;
  editingProductId: string | null;
  catalogVersion: number;
  refreshCatalog: () => void;

  // History for Undo/Redo
  history: WebsiteData[];
  historyIndex: number;

  // Setters
  setWebsite: (website: WebsiteData) => void;
  setWebsiteForProject: (projectId: string, website: WebsiteData) => void;
  clearWebsite: () => void;
  setIsGenerating: (value: boolean) => void;
  setSelectedSection: (section: string | null) => void;
  setSelectedElement: (element: ElementSelection | null) => void;
  setActiveStudioTab: (tab: StudioTab) => void;
  setIsPreviewMode: (value: boolean) => void;
  setViewportMode: (mode: ViewportMode) => void;

  // Multi-Page Handlers
  setActivePage: (pageId: string) => void;
  addPage: (title: string, slug?: string) => void;
  renamePage: (pageId: string, title: string, slug: string) => void;
  duplicatePage: (pageId: string) => void;
  deletePage: (pageId: string) => void;
  reorderPages: (pages: WebsitePage[]) => void;
  setHomepage: (pageId: string) => void;
  updatePageSeo: (pageId: string, seo: PageSeoConfig) => void;
  toggleAdminDashboard: (enabled?: boolean) => void;

  // Version Snapshots
  saveVersionSnapshot: (description?: string) => void;
  restoreVersionSnapshot: (versionId: string) => void;
  deleteVersionSnapshot: (versionId: string) => void;

  // Panel & Window Handlers
  setIsRightPanelOpen: (isOpen: boolean) => void;
  setRightPanelWidth: (width: number) => void;
  setIsCatalogModalOpen: (isOpen: boolean) => void;
  openProductEditor: (productId?: string | null) => void;
  closeProductEditor: () => void;

  // Section Operations
  updateWebsiteSection: (section: string, data: WebsiteData[keyof WebsiteData]) => void;
  addSection: (sectionType: string) => void;
  duplicateSection: (sectionKey: string) => void;
  deleteSection: (sectionKey: string) => void;
  reorderSections: (newOrder: string[]) => void;

  // Element-Level Direct Editing
  updateElementValue: (elementPath: string, newValue: unknown) => void;
  setButtonAction: (elementPath: string, action: ButtonActionConfig) => void;

  // Undo / Redo
  undo: () => void;
  redo: () => void;
  resetWebsite: () => void;
}

const DEFAULT_ORDER = ["hero", "about", "services", "features", "faq", "contact", "footer"];

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

function ensureDefaultPages(website: WebsiteData): WebsitePage[] {
  if (Array.isArray(website.pages) && website.pages.length > 0) {
    return website.pages;
  }
  return [
    {
      id: "home",
      slug: "",
      title: "Home",
      isHome: true,
      sectionOrder: website.sectionOrder || [...DEFAULT_ORDER],
      seo: {
        title: website.hero?.title ? `${website.hero.title} | Official Site` : "Home",
        description: website.hero?.subtitle || "Welcome to our website.",
      },
    },
  ];
}

export const useGeneratedWebsiteStore = create<GeneratedWebsiteState>((set, get) => ({
  currentProjectId: null,
  website: null,
  isGenerating: false,
  selectedSection: "hero",
  selectedElement: null,
  activeStudioTab: "layers",
  isPreviewMode: false,
  viewportMode: "desktop",
  activePageId: "home",

  // Right Inspector starts closed by default for maximum canvas space
  isRightPanelOpen: false,
  rightPanelWidth: 380,

  isCatalogModalOpen: false,
  isProductFullScreenEditorOpen: false,
  editingProductId: null,
  catalogVersion: 0,
  refreshCatalog: () => set((state) => ({ catalogVersion: state.catalogVersion + 1 })),

  history: [],
  historyIndex: -1,

  setWebsiteForProject: (projectId, website) => {
    if (!website) {
      set({
        currentProjectId: projectId,
        website: null,
        activePageId: "home",
        selectedSection: "hero",
        selectedElement: null,
        history: [],
        historyIndex: -1,
        isGenerating: false,
      });
      return;
    }
    const cleanWebsite = { ...website };
    if (!cleanWebsite.sectionOrder) {
      cleanWebsite.sectionOrder = [...DEFAULT_ORDER];
    }
    cleanWebsite.pages = ensureDefaultPages(cleanWebsite);
    const initialPage = cleanWebsite.pages.find((p) => p.isHome) || cleanWebsite.pages[0];

    set({
      currentProjectId: projectId,
      website: cleanWebsite,
      activePageId: initialPage?.id || "home",
      selectedSection: "hero",
      selectedElement: null,
      history: [cleanWebsite],
      historyIndex: 0,
      isGenerating: false,
    });
  },

  clearWebsite: () =>
    set({
      currentProjectId: null,
      website: null,
      isGenerating: false,
      selectedSection: "hero",
      selectedElement: null,
      activeStudioTab: "layers",
      isPreviewMode: false,
      viewportMode: "desktop",
      activePageId: "home",
      isRightPanelOpen: false,
      rightPanelWidth: 380,
      isCatalogModalOpen: false,
      isProductFullScreenEditorOpen: false,
      editingProductId: null,
      history: [],
      historyIndex: -1,
    }),

  setWebsite: (website) => {
    if (!website.sectionOrder) {
      website.sectionOrder = [...DEFAULT_ORDER];
    }
    website.pages = ensureDefaultPages(website);
    const initialPage = website.pages.find((p) => p.isHome) || website.pages[0];

    set({
      website,
      activePageId: initialPage?.id || "home",
      history: [website],
      historyIndex: 0,
    });
  },

  setIsGenerating: (value) => set({ isGenerating: value }),
  setSelectedSection: (section) => {
    set({ selectedSection: section });
  },
  setSelectedElement: (element) => {
    if (element) {
      set({
        selectedElement: element,
        selectedSection: element.sectionKey || get().selectedSection,
        isRightPanelOpen: true,
      });
    } else {
      set({
        selectedElement: null,
      });
    }
  },
  setActiveStudioTab: (tab) => {
    set({ activeStudioTab: tab });
    if (tab === "catalog") {
      set({ isCatalogModalOpen: true });
    }
  },
  setIsPreviewMode: (value) => set({ isPreviewMode: value }),
  setViewportMode: (mode) => set({ viewportMode: mode }),

  setIsRightPanelOpen: (isOpen) => set({ isRightPanelOpen: isOpen }),
  setRightPanelWidth: (width) => set({ rightPanelWidth: Math.min(Math.max(width, 300), 650) }),
  setIsCatalogModalOpen: (isOpen) => set({ isCatalogModalOpen: isOpen }),
  openProductEditor: (productId = null) =>
    set({
      editingProductId: productId,
      isProductFullScreenEditorOpen: true,
      isCatalogModalOpen: false,
    }),
  closeProductEditor: () =>
    set({
      editingProductId: null,
      isProductFullScreenEditorOpen: false,
      isCatalogModalOpen: true,
    }),

  // Multi-Page Handlers
  setActivePage: (pageId) => {
    const { website } = get();
    if (!website) return;
    const page = (website.pages || []).find((p) => p.id === pageId);
    if (page) {
      set({
        activePageId: pageId,
        selectedSection: page.sectionOrder[0] || null,
        selectedElement: null,
      });
    }
  },

  addPage: (title, slug) => {
    const { website, history, historyIndex } = get();
    if (!website) return;

    const rawSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const pageId = `page_${Date.now()}`;
    const hKey = `hero_${pageId}`;
    const aKey = `about_${pageId}`;
    const cKey = `contact_${pageId}`;
    const fKey = `footer_${pageId}`;

    const newPage: WebsitePage = {
      id: pageId,
      slug: rawSlug,
      title: title.trim(),
      isHome: false,
      sectionOrder: [hKey, aKey, cKey, fKey],
      seo: {
        title: `${title.trim()} | ${website.hero?.title || "Website"}`,
        description: `Explore our ${title.trim()} page.`,
      },
    };

    const currentPages = ensureDefaultPages(website);
    const updatedPages = [...currentPages, newPage];

    const newWebsite: WebsiteData = {
      ...website,
      pages: updatedPages,
      [hKey]: {
        title: `Welcome to ${title.trim()}`,
        subtitle: `Explore everything about ${title.trim()}`,
        button: "Learn More",
        buttonAction: { type: "scroll", target: aKey },
      },
      [aKey]: {
        title: "About this section",
        content: "Add your content here...",
      },
      [cKey]: { phone: website.contact?.phone || "", email: website.contact?.email || "", address: website.contact?.address || "" },
      [fKey]: { copyright: website.footer?.copyright || "" },
    };

    const newHistory = [...history.slice(0, historyIndex + 1), newWebsite];
    set({
      website: newWebsite,
      activePageId: pageId,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  renamePage: (pageId, title, slug) => {
    const { website, history, historyIndex } = get();
    if (!website || !website.pages) return;

    const updatedPages = website.pages.map((p) =>
      p.id === pageId
        ? {
            ...p,
            title: title.trim(),
            slug: p.isHome ? "" : slug.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          }
        : p
    );

    const newWebsite = { ...website, pages: updatedPages };
    const newHistory = [...history.slice(0, historyIndex + 1), newWebsite];

    set({
      website: newWebsite,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  duplicatePage: (pageId) => {
    const { website, history, historyIndex } = get();
    if (!website || !website.pages) return;

    const pageToDup = website.pages.find((p) => p.id === pageId);
    if (!pageToDup) return;

    const newId = `page_${Date.now()}`;
    const newPage: WebsitePage = {
      ...JSON.parse(JSON.stringify(pageToDup)),
      id: newId,
      title: `${pageToDup.title} (Copy)`,
      slug: `${pageToDup.slug}-copy`,
      isHome: false,
    };

    const updatedPages = [...website.pages, newPage];
    const newWebsite = { ...website, pages: updatedPages };
    const newHistory = [...history.slice(0, historyIndex + 1), newWebsite];

    set({
      website: newWebsite,
      activePageId: newId,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  deletePage: (pageId) => {
    const { website, history, historyIndex, activePageId } = get();
    if (!website || !website.pages || website.pages.length <= 1) return;

    const pageToDelete = website.pages.find((p) => p.id === pageId);
    if (pageToDelete?.isHome) return; // Prevent deleting the home page

    const updatedPages = website.pages.filter((p) => p.id !== pageId);
    const newActiveId = activePageId === pageId ? updatedPages[0]?.id || "home" : activePageId;

    const newWebsite = { ...website, pages: updatedPages };
    const newHistory = [...history.slice(0, historyIndex + 1), newWebsite];

    set({
      website: newWebsite,
      activePageId: newActiveId,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  reorderPages: (pages) => {
    const { website, history, historyIndex } = get();
    if (!website) return;

    const newWebsite = { ...website, pages };
    const newHistory = [...history.slice(0, historyIndex + 1), newWebsite];

    set({
      website: newWebsite,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  setHomepage: (pageId) => {
    const { website, history, historyIndex } = get();
    if (!website || !website.pages) return;

    const updatedPages = website.pages.map((p) => ({
      ...p,
      isHome: p.id === pageId,
      slug: p.id === pageId ? "" : p.slug || p.title.toLowerCase(),
    }));

    const newWebsite = { ...website, pages: updatedPages };
    const newHistory = [...history.slice(0, historyIndex + 1), newWebsite];

    set({
      website: newWebsite,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  updatePageSeo: (pageId, seo) => {
    const { website, history, historyIndex } = get();
    if (!website || !website.pages) return;

    const updatedPages = website.pages.map((p) => (p.id === pageId ? { ...p, seo: { ...p.seo, ...seo } } : p));
    const newWebsite = { ...website, pages: updatedPages };
    const newHistory = [...history.slice(0, historyIndex + 1), newWebsite];

    set({
      website: newWebsite,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  toggleAdminDashboard: (enabled) => {
    const { website, history, historyIndex } = get();
    if (!website) return;

    const newWebsite: WebsiteData = {
      ...website,
      hasAdminDashboard: enabled !== undefined ? enabled : !website.hasAdminDashboard,
    };
    const newHistory = [...history.slice(0, historyIndex + 1), newWebsite];

    set({
      website: newWebsite,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  saveVersionSnapshot: (description = "Manual Snapshot") => {
    const { website } = get();
    if (!website) return;

    const snapshot: WebsiteVersionSnapshot = {
      id: `ver_${Date.now()}`,
      timestamp: new Date().toISOString(),
      description,
      data: JSON.parse(JSON.stringify(website)),
    };

    const currentVersions = website.versions || [];
    const updatedVersions = [snapshot, ...currentVersions].slice(0, 20); // Keep last 20

    set({
      website: {
        ...website,
        versions: updatedVersions,
      },
    });
  },

  restoreVersionSnapshot: (versionId) => {
    const { website, history, historyIndex } = get();
    if (!website || !website.versions) return;

    const targetVersion = website.versions.find((v) => v.id === versionId);
    if (!targetVersion) return;

    const restoredWebsite: WebsiteData = {
      ...JSON.parse(JSON.stringify(targetVersion.data)),
      versions: website.versions, // preserve version list
    };

    const newHistory = [...history.slice(0, historyIndex + 1), restoredWebsite];
    set({
      website: restoredWebsite,
      history: newHistory,
      historyIndex: newHistory.length - 1,
      selectedElement: null,
    });
  },

  deleteVersionSnapshot: (versionId) => {
    const { website } = get();
    if (!website || !website.versions) return;

    const updatedVersions = website.versions.filter((v) => v.id !== versionId);
    set({
      website: {
        ...website,
        versions: updatedVersions,
      },
    });
  },

  updateWebsiteSection: (section, data) => {
    const { website, history, historyIndex } = get();
    if (!website) return;

    // Deep merge buttonAction to prevent CTA loss
    const existingSectionData = website[section as keyof WebsiteData] as Record<string, unknown> | undefined;
    const incomingSectionData = (typeof data === "object" && data !== null ? { ...data } : data) as Record<string, unknown>;
    
    if (existingSectionData?.buttonAction && typeof incomingSectionData === 'object' && !incomingSectionData.buttonAction) {
      incomingSectionData.buttonAction = existingSectionData.buttonAction;
    }

    const newWebsite = { ...website, [section]: incomingSectionData };
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

    const updatedWebsite = setDeepValue(
      website as unknown as Record<string, unknown>,
      elementPath,
      newValue
    ) as unknown as WebsiteData;
    const newHistory = [...history.slice(0, historyIndex + 1), updatedWebsite];

    set({
      website: updatedWebsite,
      history: newHistory,
      historyIndex: newHistory.length - 1,
      selectedElement: selectedElement ? { ...selectedElement, value: newValue } : null,
    });
  },

  setButtonAction: (elementPath, action) => {
    const { website, history, historyIndex } = get();
    if (!website) return;

    const basePath = elementPath.replace(/\.button$/, "");
    const actionPath = `${basePath}.buttonAction`;

    const updatedWebsite = setDeepValue(
      website as unknown as Record<string, unknown>,
      actionPath,
      action
    ) as unknown as WebsiteData;
    const newHistory = [...history.slice(0, historyIndex + 1), updatedWebsite];

    set({
      website: updatedWebsite,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  addSection: (sectionType: string) => {
    const { website, history, historyIndex } = get();
    if (!website) return;

    const newKey = `${sectionType}_${Date.now()}`;
    let defaultData: unknown = {};

    if (sectionType === "hero") {
      defaultData = {
        title: "Welcome to Our Business",
        subtitle: "We deliver exceptional quality, craftsmanship, and dedicated service.",
        button: "Explore Offerings",
        buttonAction: { type: "scroll", target: "services" },
      };
    } else if (sectionType === "about") {
      defaultData = {
        title: "About Our Mission",
        content: "We are passionate professionals dedicated to excellence in everything we create.",
      };
    } else if (sectionType === "services") {
      defaultData = [
        {
          title: "Bespoke Consulting",
          description: "Tailored strategies for immediate impact.",
          buttonAction: { type: "scroll", target: "contact" },
        },
        {
          title: "Core Execution",
          description: "High-precision delivery and ongoing optimization.",
          buttonAction: { type: "scroll", target: "contact" },
        },
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

    let updatedPages = website.pages || [];
    const { activePageId } = get();
    let newOrder = [...(website.sectionOrder || [])];

    if (updatedPages.length > 0 && activePageId) {
      updatedPages = updatedPages.map((p) => {
        if (p.id === activePageId || (activePageId === "home" && p.isHome)) {
          newOrder = [...p.sectionOrder, newKey];
          return { ...p, sectionOrder: newOrder };
        }
        return p;
      });
    } else {
      newOrder = [...(website.sectionOrder || []), newKey];
    }

    const newWebsite = {
      ...website,
      [newKey]: defaultData,
      sectionOrder: activePageId === "home" ? newOrder : website.sectionOrder,
      pages: updatedPages.length > 0 ? updatedPages : website.pages,
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
    const { website, history, historyIndex, activePageId } = get();
    if (!website) return;

    const baseData = website[sectionKey];
    if (!baseData) return;

    const baseType = sectionKey.split("_")[0];
    const newKey = `${baseType}_${Date.now()}`;

    let updatedPages = website.pages || [];
    let activeOrder = [...(website.sectionOrder || [])];

    if (updatedPages.length > 0 && activePageId) {
      const activePage = updatedPages.find((p) => p.id === activePageId || (activePageId === "home" && p.isHome));
      if (activePage) {
        activeOrder = [...activePage.sectionOrder];
      }
    }

    const currentIndex = activeOrder.indexOf(sectionKey);
    if (currentIndex !== -1) {
      activeOrder.splice(currentIndex + 1, 0, newKey);
    } else {
      activeOrder.push(newKey);
    }

    if (updatedPages.length > 0 && activePageId) {
      updatedPages = updatedPages.map((p) =>
        p.id === activePageId || (activePageId === "home" && p.isHome) ? { ...p, sectionOrder: activeOrder } : p
      );
    }

    const newWebsite = {
      ...website,
      [newKey]: JSON.parse(JSON.stringify(baseData)),
      sectionOrder: activePageId === "home" ? activeOrder : website.sectionOrder,
      pages: updatedPages.length > 0 ? updatedPages : website.pages,
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
    const { website, history, historyIndex, selectedSection, activePageId } = get();
    if (!website) return;

    let updatedPages = website.pages || [];
    let activeOrder = [...(website.sectionOrder || [])];

    if (updatedPages.length > 0 && activePageId) {
      const activePage = updatedPages.find((p) => p.id === activePageId || (activePageId === "home" && p.isHome));
      if (activePage) {
        activeOrder = activePage.sectionOrder.filter((k) => k !== sectionKey);
      }
    } else {
      activeOrder = activeOrder.filter((k) => k !== sectionKey);
    }

    if (updatedPages.length > 0 && activePageId) {
      updatedPages = updatedPages.map((p) =>
        p.id === activePageId || (activePageId === "home" && p.isHome) ? { ...p, sectionOrder: activeOrder } : p
      );
    }

    const newWebsite = {
      ...website,
      sectionOrder: activePageId === "home" ? activeOrder : website.sectionOrder,
      pages: updatedPages.length > 0 ? updatedPages : website.pages,
    };

    const newHistory = [...history.slice(0, historyIndex + 1), newWebsite];
    set({
      website: newWebsite,
      history: newHistory,
      historyIndex: newHistory.length - 1,
      selectedSection: selectedSection === sectionKey ? activeOrder[0] || null : selectedSection,
    });
  },

  reorderSections: (newOrder) => {
    const { website, history, historyIndex, activePageId } = get();
    if (!website) return;

    let updatedPages = website.pages || [];
    if (updatedPages.length > 0 && activePageId) {
      updatedPages = updatedPages.map((p) =>
        p.id === activePageId || (activePageId === "home" && p.isHome) ? { ...p, sectionOrder: newOrder } : p
      );
    }

    const newWebsite = {
      ...website,
      sectionOrder: activePageId === "home" ? newOrder : website.sectionOrder,
      pages: updatedPages.length > 0 ? updatedPages : website.pages,
    };

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
      activePageId: "home",
      isRightPanelOpen: false,
      rightPanelWidth: 380,
      isCatalogModalOpen: false,
      isProductFullScreenEditorOpen: false,
      editingProductId: null,
      history: [],
      historyIndex: -1,
    }),
}));