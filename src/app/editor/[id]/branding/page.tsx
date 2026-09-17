"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";

import BuilderLayout from "@/components/builder/BuilderLayout";
import ProgressBar from "@/components/builder/ProgressBar";
import StepNavigation from "@/components/builder/StepNavigation";
import InputField from "@/components/builder/InputField";
import SelectField from "@/components/builder/SelectField";
import UploadField from "@/components/builder/UploadField";

import { editorRoute } from "@/lib/editorRoutes";
import { useProjectAutosave } from "@/hooks/useProjectAutosave";
import { useBuilderStore } from "@/store/builderStore";
import { toast } from "@/store/toastStore";
import { cn } from "@/lib/utils";

export default function BrandingPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const {
    projectId,
    style,
    primaryColor,
    secondaryColor,
    threeDPreference,
    setStyle,
    setPrimaryColor,
    setSecondaryColor,
    setThreeDPreference,
  } = useBuilderStore();

  const activeProjectId = params?.id || projectId;

  const [styleError, setStyleError] = useState<string | null>(null);
  const [primaryColorError, setPrimaryColorError] = useState<string | null>(null);
  const [secondaryColorError, setSecondaryColorError] = useState<string | null>(null);

  const { saveNow } = useProjectAutosave(activeProjectId, {
    style,
    primary_color: primaryColor,
    secondary_color: secondaryColor,
    three_d_preference: threeDPreference,
  });

  async function handleNext() {
    let hasError = false;

    if (!style.trim()) {
      setStyleError("Please select a website design style.");
      hasError = true;
    } else {
      setStyleError(null);
    }

    if (!primaryColor.trim()) {
      setPrimaryColorError("Primary brand color is required.");
      hasError = true;
    } else {
      setPrimaryColorError(null);
    }

    if (!secondaryColor.trim()) {
      setSecondaryColorError("Secondary brand color is required.");
      hasError = true;
    } else {
      setSecondaryColorError(null);
    }

    if (hasError) return;

    try {
      await saveNow();
      router.push(editorRoute(activeProjectId, "content"));
    } catch (error) {
      toast.error("Save Error", error instanceof Error ? error.message : "Unable to save brand preferences.");
    }
  }

  return (
    <BuilderLayout
      title="Brand & Visual Identity"
      description="Choose your aesthetic tone and brand color accents."
    >
      <ProgressBar step={1} />

      <div className="space-y-6">
        <SelectField
          label="Visual Aesthetic Style"
          required
          value={style}
          error={styleError ?? undefined}
          onChange={(e) => {
            setStyle(e.target.value);
            if (styleError) setStyleError(null);
          }}
          options={[
            "Modern",
            "Minimal",
            "Luxury",
            "Corporate",
            "Creative",
            "Dark",
          ]}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InputField
            label="Primary Brand Color"
            placeholder="e.g. #2563eb or Royal Blue"
            required
            value={primaryColor}
            error={primaryColorError ?? undefined}
            onChange={(e) => {
              setPrimaryColor(e.target.value);
              if (primaryColorError) setPrimaryColorError(null);
            }}
            onBlur={() => {
              if (!primaryColor.trim()) setPrimaryColorError("Primary brand color is required.");
              else setPrimaryColorError(null);
            }}
          />

          <InputField
            label="Secondary Brand Color"
            placeholder="e.g. #7c3aed or Violet"
            required
            value={secondaryColor}
            error={secondaryColorError ?? undefined}
            onChange={(e) => {
              setSecondaryColor(e.target.value);
              if (secondaryColorError) setSecondaryColorError(null);
            }}
            onBlur={() => {
              if (!secondaryColor.trim()) setSecondaryColorError("Secondary brand color is required.");
              else setSecondaryColorError(null);
            }}
          />
        </div>

        <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-4 dark:border-white/10 dark:bg-zinc-900/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                3D Visual Experience
              </label>
              <p className="text-xs text-zinc-500 mt-0.5">
                Enable spatial 3D effects and interactive 3D hero elements (Default: Off).
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setThreeDPreference("no")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer",
                  threeDPreference === "no"
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs"
                    : "bg-zinc-200/70 text-zinc-700 hover:bg-zinc-300/70 dark:bg-white/10 dark:text-zinc-300"
                )}
              >
                No (Standard 2D)
              </button>
              <button
                type="button"
                onClick={() => setThreeDPreference("yes")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1 cursor-pointer",
                  threeDPreference === "yes"
                    ? "bg-violet-600 text-white shadow-xs"
                    : "bg-zinc-200/70 text-zinc-700 hover:bg-zinc-300/70 dark:bg-white/10 dark:text-zinc-300"
                )}
              >
                <span>Yes</span>
                <span>✨</span>
              </button>
            </div>
          </div>
        </div>

        <UploadField label="Brand Logo (Optional)" />

        <UploadField label="Business Media & Photos (Optional)" multiple />
      </div>

      <StepNavigation
        back={projectId ? editorRoute(projectId) : undefined}
        onNext={handleNext}
      />
    </BuilderLayout>
  );
}
