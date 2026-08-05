import { create } from "zustand";

interface BuilderState {
  // Project
  projectId: string;

  // Business
  businessName: string;
  category: string;
  description: string;
  targetAudience: string;

  // Branding
  style: string;
  primaryColor: string;
  secondaryColor: string;

  // Contact
  phone: string;
  email: string;
  website: string;
  instagram: string;
  facebook: string;
  address: string;

  // Project Actions
  setProjectId: (value: string) => void;

  // Business Actions
  setBusinessName: (value: string) => void;
  setCategory: (value: string) => void;
  setDescription: (value: string) => void;
  setTargetAudience: (value: string) => void;

  // Branding Actions
  setStyle: (value: string) => void;
  setPrimaryColor: (value: string) => void;
  setSecondaryColor: (value: string) => void;

  // Contact Actions
  setPhone: (value: string) => void;
  setEmail: (value: string) => void;
  setWebsite: (value: string) => void;
  setInstagram: (value: string) => void;
  setFacebook: (value: string) => void;
  setAddress: (value: string) => void;
}

export const useBuilderStore = create<BuilderState>((set) => ({
  // Project
  projectId: "",

  // Business
  businessName: "",
  category: "",
  description: "",
  targetAudience: "",

  // Branding
  style: "",
  primaryColor: "",
  secondaryColor: "",

  // Contact
  phone: "",
  email: "",
  website: "",
  instagram: "",
  facebook: "",
  address: "",

  // Project Actions
  setProjectId: (value) => set({ projectId: value }),

  // Business Actions
  setBusinessName: (value) => set({ businessName: value }),
  setCategory: (value) => set({ category: value }),
  setDescription: (value) => set({ description: value }),
  setTargetAudience: (value) => set({ targetAudience: value }),

  // Branding Actions
  setStyle: (value) => set({ style: value }),
  setPrimaryColor: (value) => set({ primaryColor: value }),
  setSecondaryColor: (value) => set({ secondaryColor: value }),

  // Contact Actions
  setPhone: (value) => set({ phone: value }),
  setEmail: (value) => set({ email: value }),
  setWebsite: (value) => set({ website: value }),
  setInstagram: (value) => set({ instagram: value }),
  setFacebook: (value) => set({ facebook: value }),
  setAddress: (value) => set({ address: value }),
}));