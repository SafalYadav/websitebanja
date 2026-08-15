"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

import BuilderLayout from "@/components/builder/BuilderLayout";
import ProgressBar from "@/components/builder/ProgressBar";
import StepNavigation from "@/components/builder/StepNavigation";
import InputField from "@/components/builder/InputField";
import SelectField from "@/components/builder/SelectField";
import TextAreaField from "@/components/builder/TextAreaField";

import { editorRoute } from "@/lib/editorRoutes";
import { useProjectAutosave } from "@/hooks/useProjectAutosave";
import { updateProject } from "@/lib/projects";
import { useBuilderStore } from "@/store/builderStore";
import { supabase } from "@/lib/supabase";
import { toast } from "@/store/toastStore";
import { cn } from "@/lib/utils";
import { extractBusinessDetailsFast } from "@/lib/promptExtractor";
import {
  Sparkles,
  Layers,
  ArrowRight,
  MessageCircle,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Star,
  CreditCard,
  ShoppingCart,
  Share2,
  BookOpen,
  Clock,
  Link as LinkIcon,
  Check,
  Loader2,
} from "lucide-react";

const CATEGORY_CHIPS = [
  "Restaurant",
  "Cafe",
  "Gym",
  "Salon",
  "Clinic",
  "Real Estate",
  "Hotel",
  "Agency",
  "Portfolio",
  "E-commerce",
  "Other",
];

const FEATURE_CHIPS = [
  { id: "whatsapp", label: "WhatsApp Integration", icon: MessageCircle },
  { id: "google_maps", label: "Google Maps", icon: MapPin },
  { id: "call_button", label: "Call Button", icon: Phone },
  { id: "contact_form", label: "Contact Form", icon: Mail },
  { id: "appointments", label: "Appointment Booking", icon: Calendar },
  { id: "testimonials", label: "Testimonials / Reviews", icon: Star },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "ordering", label: "Online Ordering", icon: ShoppingCart },
  { id: "social_media", label: "Social Media", icon: Share2 },
  { id: "blog", label: "Blog", icon: BookOpen },
  { id: "business_hours", label: "Business Hours", icon: Clock },
  { id: "custom_links", label: "Custom Links", icon: LinkIcon },
];

export default function OnboardingStartPage() {
  const router = useRouter();

  const {
    projectId,
    onboardingMode,
    userPrompt,
    selectedFeatures,
    businessName,
    category,
    description,
    targetAudience,
    whatsappNumber,
    whatsappMessage,
    whatsappEnabled,
    setOnboardingMode,
    setUserPrompt,
    toggleFeature,
    setBusinessName,
    setCategory,
    setDescription,
    setTargetAudience,
    setStyle,
    setPrimaryColor,
    setSecondaryColor,
    setPhone,
    setEmail,
    setWhatsappNumber,
    setWhatsappEnabled,
  } = useBuilderStore();

  const [isExtracting, setIsExtracting] = useState(false);
  const [businessNameError, setBusinessNameError] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [promptError, setPromptError] = useState<string | null>(null);

  const { saveNow } = useProjectAutosave(projectId, {
    name: businessName.trim() || undefined,
    business_name: businessName.trim() || undefined,
    category,
    description,
    target_audience: targetAudience,
    phone: whatsappNumber.trim() || undefined,
    backend_config: {
      onboarding_mode: onboardingMode,
      user_prompt: userPrompt,
      selected_features: selectedFeatures,
      whatsapp_number: whatsappNumber,
      whatsapp_message: whatsappMessage,
      whatsapp_enabled: whatsappEnabled,
    },
  });

  // Prompt Mode Submission Handler
  async function handlePromptSubmit() {
    if (!userPrompt.trim() || userPrompt.trim().length < 8) {
      setPromptError("Please describe your website in at least 8 characters.");
      return;
    }
    setPromptError(null);
    setIsExtracting(true);

    try {
      let extracted = extractBusinessDetailsFast(userPrompt.trim(), category || undefined, selectedFeatures);

      try {
        const session = (await supabase.auth.getSession()).data.session;
        const res = await fetch("/api/extract", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: session?.access_token ? `Bearer ${session.access_token}` : "",
          },
          body: JSON.stringify({
            prompt: userPrompt.trim(),
            selectedCategory: category || undefined,
            selectedFeatures,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            extracted = data.data;
          }
        }
      } catch (fetchErr) {
        console.warn("API extraction fallback to fast parser:", fetchErr);
      }

      // Populate extracted values with safe fallbacks
      const finalBusinessName = extracted.businessName || "My Business";
      const finalCategory = extracted.category || category || "Other";
      const finalDescription = extracted.description || userPrompt.trim();
      const finalTargetAudience = extracted.targetAudience || "";
      const finalStyle = extracted.style || "Modern";
      const finalPrimaryColor = extracted.primaryColor || "#7C3AED";
      const finalSecondaryColor = extracted.secondaryColor || "#2563EB";
      const finalPhone = (whatsappNumber.trim() || extracted.whatsappNumber || extracted.phone || "").trim();
      const finalEmail = (extracted.email || "").trim();

      // Update Zustand store immediately
      setBusinessName(finalBusinessName);
      setCategory(finalCategory);
      setDescription(finalDescription);
      setTargetAudience(finalTargetAudience);
      setStyle(finalStyle);
      setPrimaryColor(finalPrimaryColor);
      setSecondaryColor(finalSecondaryColor);
      setPhone(finalPhone);
      setEmail(finalEmail);
      if (finalPhone) {
        setWhatsappNumber(finalPhone);
        setWhatsappEnabled(true);
      }

      if (projectId) {
        await updateProject(projectId, {
          name: finalBusinessName,
          business_name: finalBusinessName,
          category: finalCategory,
          description: finalDescription,
          target_audience: finalTargetAudience,
          style: finalStyle,
          primary_color: finalPrimaryColor,
          secondary_color: finalSecondaryColor,
          phone: finalPhone,
          email: finalEmail,
          backend_config: {
            onboarding_mode: "prompt",
            user_prompt: userPrompt.trim(),
            selected_features: selectedFeatures,
            whatsapp_number: finalPhone,
            whatsapp_message: whatsappMessage,
            whatsapp_enabled: whatsappEnabled,
          },
        });
      }

      router.push(editorRoute(projectId, "loading"));
    } catch (err) {
      setIsExtracting(false);
      const isDev = process.env.NODE_ENV === "development";
      toast.error(
        "Generation Error",
        isDev && err instanceof Error ? err.message : "Failed to prepare website generation. Please try again."
      );
    }
  }

  // Business Details Wizard Handler
  async function handleDetailsNext() {
    let hasError = false;

    if (!businessName.trim()) {
      setBusinessNameError("Business name is required.");
      hasError = true;
    } else {
      setBusinessNameError(null);
    }

    if (!category.trim()) {
      setCategoryError("Please select a business category.");
      hasError = true;
    } else {
      setCategoryError(null);
    }

    if (!description.trim()) {
      setDescriptionError("Please describe your business.");
      hasError = true;
    } else if (description.trim().length < 10) {
      setDescriptionError("Please provide at least 10 characters.");
      hasError = true;
    } else {
      setDescriptionError(null);
    }

    if (hasError) return;

    try {
      await saveNow();
      router.push(editorRoute(projectId, "branding"));
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to save project.");
    }
  }

  return (
    <BuilderLayout
      title="How do you want to build your website?"
      description="Start with an idea or give us your business details. WebsiteBanja AI will turn it into a complete website."
    >
      {/* Choice Mode Toggle Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        {/* Card 1: Start with a Prompt */}
        <button
          type="button"
          onClick={() => setOnboardingMode("prompt")}
          className={cn(
            "relative text-left p-6 rounded-3xl border-2 transition-all duration-200 cursor-pointer overflow-hidden flex flex-col justify-between",
            onboardingMode === "prompt"
              ? "border-violet-600 bg-violet-50/60 dark:bg-violet-950/30 ring-4 ring-violet-500/10 shadow-lg shadow-violet-500/10"
              : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-white/10 dark:bg-zinc-900/60 hover:shadow-md"
          )}
        >
          {onboardingMode === "prompt" && (
            <div className="absolute top-4 right-4 h-6 w-6 rounded-full bg-violet-600 text-white flex items-center justify-center shadow-sm">
              <Check className="h-3.5 w-3.5" />
            </div>
          )}

          <div>
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-md mb-4">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
              Start with a Prompt
            </h3>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1.5 leading-relaxed">
              Describe your website in your own words and let AI handle the architecture, design, and copywriting.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-zinc-200/80 dark:border-white/10">
            <span className="text-xs font-bold text-violet-600 dark:text-violet-400 flex items-center gap-1.5">
              Start with AI Prompt <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </button>

        {/* Card 2: Use Business Details */}
        <button
          type="button"
          onClick={() => setOnboardingMode("details")}
          className={cn(
            "relative text-left p-6 rounded-3xl border-2 transition-all duration-200 cursor-pointer overflow-hidden flex flex-col justify-between",
            onboardingMode === "details"
              ? "border-violet-600 bg-violet-50/60 dark:bg-violet-950/30 ring-4 ring-violet-500/10 shadow-lg shadow-violet-500/10"
              : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-white/10 dark:bg-zinc-900/60 hover:shadow-md"
          )}
        >
          {onboardingMode === "details" && (
            <div className="absolute top-4 right-4 h-6 w-6 rounded-full bg-violet-600 text-white flex items-center justify-center shadow-sm">
              <Check className="h-3.5 w-3.5" />
            </div>
          )}

          <div>
            <div className="h-11 w-11 rounded-2xl bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 flex items-center justify-center mb-4">
              <Layers className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
              Use Business Details
            </h3>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1.5 leading-relaxed">
              Answer a few simple questions and build your website step by step with our structured wizard.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-zinc-200/80 dark:border-white/10">
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              Enter Business Details <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </button>
      </div>

      {/* Mode Sub-Form */}
      <AnimatePresence mode="wait">
        {onboardingMode === "prompt" ? (
          <motion.div
            key="prompt-mode"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Prompt Textarea */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-violet-600" />
                  Tell us about the website you want...
                </label>
                <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                  {userPrompt.length} / 800
                </span>
              </div>
              <textarea
                rows={4}
                maxLength={800}
                value={userPrompt}
                onChange={(e) => {
                  setUserPrompt(e.target.value);
                  if (promptError) setPromptError(null);
                }}
                placeholder="Example: Create a modern luxury salon website in Mumbai with WhatsApp appointments, services, pricing, testimonials and Google Maps."
                className={cn(
                  "w-full rounded-2xl border bg-white p-4 text-sm text-zinc-900 shadow-xs outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 dark:border-white/10 dark:bg-zinc-900 dark:text-white placeholder:text-zinc-400",
                  promptError && "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                )}
              />
              {promptError && (
                <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">
                  {promptError}
                </p>
              )}
            </div>

            {/* Category Chips */}
            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-2.5">
                Quick Category (Optional)
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_CHIPS.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(category === cat ? "" : cat)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer",
                      category === cat
                        ? "bg-violet-600 text-white border-violet-600 shadow-sm"
                        : "bg-white text-zinc-700 border-zinc-200 hover:border-zinc-300 dark:bg-zinc-900 dark:text-zinc-300 dark:border-white/10"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Selectable Feature Chips */}
            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-2.5">
                Add Features & Integrations (Optional)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {FEATURE_CHIPS.map((feat) => {
                  const isSelected = selectedFeatures.includes(feat.id);
                  const Icon = feat.icon;
                  return (
                    <button
                      key={feat.id}
                      type="button"
                      onClick={() => toggleFeature(feat.id)}
                      className={cn(
                        "p-2.5 rounded-xl border text-xs font-medium transition cursor-pointer flex items-center gap-2 select-none text-left",
                        isSelected
                          ? "bg-violet-50 text-violet-900 border-violet-500 dark:bg-violet-950/40 dark:text-violet-200"
                          : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300 dark:bg-zinc-900 dark:text-zinc-400 dark:border-white/10"
                      )}
                    >
                      <Icon className={cn("h-3.5 w-3.5", isSelected ? "text-violet-600 dark:text-violet-400" : "text-zinc-400")} />
                      <span className="truncate">{feat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* WhatsApp input if WhatsApp feature chosen */}
            {selectedFeatures.includes("whatsapp") && (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-50/40 p-4 dark:bg-emerald-950/20">
                <InputField
                  label="WhatsApp Phone Number (Optional)"
                  placeholder="+91 98765 43210"
                  helperText="Include country code (+91, +1, etc.)"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                />
              </div>
            )}

            {/* Submit Button */}
            <button
              type="button"
              disabled={isExtracting}
              onClick={handlePromptSubmit}
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-blue-600 via-violet-600 to-indigo-600 text-white font-bold text-base shadow-lg shadow-violet-500/25 hover:opacity-95 active:scale-[0.99] transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isExtracting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Synthesizing Website Architecture...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  <span>Generate Website with AI</span>
                </>
              )}
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="details-mode"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <ProgressBar step={0} />

            <div className="space-y-6">
              <InputField
                label="Business Name"
                placeholder="e.g. Acme Tech Solutions, Sharma Dental Clinic"
                required
                value={businessName}
                error={businessNameError ?? undefined}
                onChange={(e) => {
                  setBusinessName(e.target.value);
                  if (businessNameError) setBusinessNameError(null);
                }}
              />

              <SelectField
                label="Business Category"
                required
                value={category}
                error={categoryError ?? undefined}
                onChange={(e) => {
                  setCategory(e.target.value);
                  if (categoryError) setCategoryError(null);
                }}
                options={CATEGORY_CHIPS}
              />

              <TextAreaField
                label="Describe Your Business"
                placeholder="Describe what your business does, your key offerings, and what makes your approach unique..."
                required
                rows={4}
                value={description}
                error={descriptionError ?? undefined}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (descriptionError) setDescriptionError(null);
                }}
              />

              <InputField
                label="Target Audience (Optional)"
                placeholder="e.g. Founders, Local Families, Tech Professionals..."
                helperText="Who are your ideal customers?"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
              />
            </div>

            <StepNavigation onNext={handleDetailsNext} />
          </motion.div>
        )}
      </AnimatePresence>
    </BuilderLayout>
  );
}
