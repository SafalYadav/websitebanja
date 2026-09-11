"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

import BuilderLayout from "@/components/builder/BuilderLayout";
import ProgressBar from "@/components/builder/ProgressBar";
import StepNavigation from "@/components/builder/StepNavigation";
import InputField from "@/components/builder/InputField";
import SelectField from "@/components/builder/SelectField";
import TextAreaField from "@/components/builder/TextAreaField";

import { editorRoute } from "@/lib/editorRoutes";
import { useProjectAutosave } from "@/hooks/useProjectAutosave";
import { useBuilderStore } from "@/store/builderStore";
import { toast } from "@/store/toastStore";
import { cn } from "@/lib/utils";
import AiTalkingAgent from "@/components/agent/AiTalkingAgent";
import {
  Layers,
  ArrowRight,
  Check,
  Bot,
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

export default function OnboardingStartPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const shouldReduceMotion = useReducedMotion();

  const {
    projectId,
    onboardingMode,
    businessName,
    category,
    description,
    targetAudience,
    setOnboardingMode,
    setBusinessName,
    setCategory,
    setDescription,
    setTargetAudience,
  } = useBuilderStore();

  const activeProjectId = params?.id || projectId;

  const [businessNameError, setBusinessNameError] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);

  const { saveNow } = useProjectAutosave(activeProjectId, {
    name: businessName.trim() || undefined,
    business_name: businessName.trim() || undefined,
    category,
    description,
    target_audience: targetAudience,
  });

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
      router.push(editorRoute(activeProjectId, "branding"));
    } catch (error) {
      toast.error("Save Error", error instanceof Error ? error.message : "Unable to save project details.");
    }
  }

  return (
    <BuilderLayout
      title="How do you want to build your website?"
      description="Choose your preferred creation method. Talk with our AI Architect through live conversation, or enter structured business details."
    >
      {/* Choice Mode Toggle Cards: Exactly 2 Neutral Choices */}
      <div
        role="radiogroup"
        aria-label="Creation Methods"
        className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-10"
      >
        {/* Choice 1: Talk with AI Agent */}
        <button
          type="button"
          role="radio"
          aria-checked={onboardingMode === "agent"}
          tabIndex={0}
          onClick={() => setOnboardingMode("agent")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setOnboardingMode("agent");
            }
          }}
          className={cn(
            "relative text-left p-6 sm:p-8 rounded-3xl border-2 transition-all duration-200 cursor-pointer overflow-hidden flex flex-col justify-between group focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-500/20",
            onboardingMode === "agent"
              ? "border-violet-600 bg-violet-50/80 dark:bg-violet-950/35 ring-4 ring-violet-500/10 shadow-xl shadow-violet-500/10"
              : "border-zinc-200/90 bg-white/80 hover:border-zinc-300 dark:border-white/10 dark:bg-zinc-900/60 hover:shadow-md"
          )}
        >
          {onboardingMode === "agent" && (
            <div className="absolute top-5 right-5 h-6 w-6 rounded-full bg-violet-600 text-white flex items-center justify-center shadow-xs">
              <Check className="h-3.5 w-3.5" />
            </div>
          )}

          <div>
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-md mb-5 transition-transform duration-200 group-hover:scale-105">
              <Bot className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-zinc-950 dark:text-white">
              Talk with AI Agent
            </h3>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-2 leading-relaxed">
              For users who want AI to understand their business through conversation. Have a live voice & chat consultation with Mitra AI Architect to architect your site.
            </p>

            <div className="flex flex-wrap gap-1.5 mt-4">
              <span className="rounded-md bg-zinc-100 dark:bg-zinc-800/80 px-2 py-0.5 text-[10px] font-mono text-zinc-600 dark:text-zinc-300">
                Voice & Audio
              </span>
              <span className="rounded-md bg-zinc-100 dark:bg-zinc-800/80 px-2 py-0.5 text-[10px] font-mono text-zinc-600 dark:text-zinc-300">
                Adaptive Clarifications
              </span>
              <span className="rounded-md bg-zinc-100 dark:bg-zinc-800/80 px-2 py-0.5 text-[10px] font-mono text-zinc-600 dark:text-zinc-300">
                Zero Blank Canvas
              </span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-zinc-200/80 dark:border-white/10 flex items-center justify-between">
            <span className={cn(
              "text-xs font-bold flex items-center gap-1.5 transition",
              onboardingMode === "agent" ? "text-violet-600 dark:text-violet-400" : "text-zinc-700 dark:text-zinc-300"
            )}>
              Consult with AI <ArrowRight className="h-3.5 w-3.5" />
            </span>
            <span className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500">
              Conversational Intake
            </span>
          </div>
        </button>

        {/* Choice 2: Use Business Details */}
        <button
          type="button"
          role="radio"
          aria-checked={onboardingMode === "details"}
          tabIndex={0}
          onClick={() => setOnboardingMode("details")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setOnboardingMode("details");
            }
          }}
          className={cn(
            "relative text-left p-6 sm:p-8 rounded-3xl border-2 transition-all duration-200 cursor-pointer overflow-hidden flex flex-col justify-between group focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-500/20",
            onboardingMode === "details"
              ? "border-violet-600 bg-violet-50/80 dark:bg-violet-950/35 ring-4 ring-violet-500/10 shadow-xl shadow-violet-500/10"
              : "border-zinc-200/90 bg-white/80 hover:border-zinc-300 dark:border-white/10 dark:bg-zinc-900/60 hover:shadow-md"
          )}
        >
          {onboardingMode === "details" && (
            <div className="absolute top-5 right-5 h-6 w-6 rounded-full bg-violet-600 text-white flex items-center justify-center shadow-xs">
              <Check className="h-3.5 w-3.5" />
            </div>
          )}

          <div>
            <div className="h-12 w-12 rounded-2xl bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 flex items-center justify-center mb-5 transition-transform duration-200 group-hover:scale-105">
              <Layers className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-zinc-950 dark:text-white">
              Use Business Details
            </h3>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-2 leading-relaxed">
              For users who prefer structured input. Answer a few guided questions and build your website step by step with our structured wizard.
            </p>

            <div className="flex flex-wrap gap-1.5 mt-4">
              <span className="rounded-md bg-zinc-100 dark:bg-zinc-800/80 px-2 py-0.5 text-[10px] font-mono text-zinc-600 dark:text-zinc-300">
                Step-by-Step Wizard
              </span>
              <span className="rounded-md bg-zinc-100 dark:bg-zinc-800/80 px-2 py-0.5 text-[10px] font-mono text-zinc-600 dark:text-zinc-300">
                Structured Prompts
              </span>
              <span className="rounded-md bg-zinc-100 dark:bg-zinc-800/80 px-2 py-0.5 text-[10px] font-mono text-zinc-600 dark:text-zinc-300">
                Full Manual Review
              </span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-zinc-200/80 dark:border-white/10 flex items-center justify-between">
            <span className={cn(
              "text-xs font-bold flex items-center gap-1.5 transition",
              onboardingMode === "details" ? "text-violet-600 dark:text-violet-400" : "text-zinc-700 dark:text-zinc-300"
            )}>
              Enter Details <ArrowRight className="h-3.5 w-3.5" />
            </span>
            <span className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500">
              Guided Form
            </span>
          </div>
        </button>
      </div>

      {/* Mode Sub-Form */}
      <AnimatePresence mode="wait">
        {onboardingMode === "agent" ? (
          <motion.div
            key="agent-mode"
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <AiTalkingAgent
              projectId={activeProjectId}
              initialNeeds={{
                businessName: businessName || undefined,
                category: category || undefined,
                description: description || undefined,
                targetAudience: targetAudience || undefined,
              }}
            />
          </motion.div>
        ) : (
          <motion.div
            key="details-mode"
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
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
