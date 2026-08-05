import { create } from "zustand";
import type { WebsiteData } from "@/types/website";

interface GeneratedWebsiteState {
  website: WebsiteData | null;
  isGenerating: boolean;

  setWebsite: (website: WebsiteData) => void;
  setIsGenerating: (value: boolean) => void;
  resetWebsite: () => void;
}

export const useGeneratedWebsiteStore = create<GeneratedWebsiteState>(
  (set) => ({
    website: null,
    isGenerating: false,

    setWebsite: (website) =>
      set({
        website,
      }),

    setIsGenerating: (value) =>
      set({
        isGenerating: value,
      }),

    resetWebsite: () =>
      set({
        website: null,
        isGenerating: false,
      }),
  })
);