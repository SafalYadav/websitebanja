import { create } from "zustand";
import type { Project, OnboardingMode } from "@/types/project";

interface BuilderState {
  // Project
  projectId: string;

  // Onboarding Mode & Prompt
  onboardingMode: OnboardingMode;
  userPrompt: string;
  selectedFeatures: string[];

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

  // WhatsApp
  whatsappNumber: string;
  whatsappMessage: string;
  whatsappEnabled: boolean;

  // Publishing
  isPublished: boolean;
  publicSlug: string | null;
  setIsPublished: (value: boolean) => void;
  setPublicSlug: (value: string | null) => void;

  // Project Actions
  setProjectId: (value: string) => void;
  hydrateFromProject: (project: Project) => void;

  // Onboarding Mode Actions
  setOnboardingMode: (value: OnboardingMode) => void;
  setUserPrompt: (value: string) => void;
  setSelectedFeatures: (value: string[]) => void;
  toggleFeature: (feature: string) => void;

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

  // WhatsApp Actions
  setWhatsappNumber: (value: string) => void;
  setWhatsappMessage: (value: string) => void;
  setWhatsappEnabled: (value: boolean) => void;
}

export const useBuilderStore = create<BuilderState>((set) => ({
  // Project
  projectId: "",

  // Onboarding Mode & Prompt
  onboardingMode: "prompt",
  userPrompt: "",
  selectedFeatures: ["whatsapp", "contact_form", "testimonials", "google_maps"],

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

  // WhatsApp
  whatsappNumber: "",
  whatsappMessage: "Hi, I found your website and would like to know more about your services.",
  whatsappEnabled: true,

  // Publishing
  isPublished: false,
  publicSlug: null,

  // Project Actions
  setProjectId: (value) => set({ projectId: value }),

  hydrateFromProject: (project) =>
    set({
      projectId: project.id,
      onboardingMode: project.onboarding_mode ?? "prompt",
      userPrompt: project.user_prompt ?? "",
      selectedFeatures: project.selected_features ?? ["whatsapp", "contact_form", "testimonials", "google_maps"],
      businessName: project.business_name ?? "",
      category: project.category ?? "",
      description: project.description ?? "",
      targetAudience: project.target_audience ?? "",
      style: project.style ?? "",
      primaryColor: project.primary_color ?? "",
      secondaryColor: project.secondary_color ?? "",
      phone: project.phone ?? "",
      email: project.email ?? "",
      website: project.website ?? "",
      instagram: project.instagram ?? "",
      facebook: project.facebook ?? "",
      address: project.address ?? "",
      whatsappNumber: project.whatsapp_number ?? project.phone ?? "",
      whatsappMessage: project.whatsapp_message ?? "Hi, I found your website and would like to know more about your services.",
      whatsappEnabled: project.whatsapp_enabled ?? true,
      isPublished: project.is_published ?? false,
      publicSlug: project.public_slug ?? null,
    }),

  // Onboarding Mode Actions
  setOnboardingMode: (value) => set({ onboardingMode: value }),
  setUserPrompt: (value) => set({ userPrompt: value }),
  setSelectedFeatures: (value) => set({ selectedFeatures: value }),
  toggleFeature: (feature) =>
    set((state) => ({
      selectedFeatures: state.selectedFeatures.includes(feature)
        ? state.selectedFeatures.filter((f) => f !== feature)
        : [...state.selectedFeatures, feature],
    })),

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

  // WhatsApp Actions
  setWhatsappNumber: (value) => set({ whatsappNumber: value }),
  setWhatsappMessage: (value) => set({ whatsappMessage: value }),
  setWhatsappEnabled: (value) => set({ whatsappEnabled: value }),

  // Publishing Actions
  setIsPublished: (value) => set({ isPublished: value }),
  setPublicSlug: (value) => set({ publicSlug: value }),
}));
