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

export default function BrandingPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const {
    projectId,
    style,
    primaryColor,
    secondaryColor,
    setStyle,
    setPrimaryColor,
    setSecondaryColor,
  } = useBuilderStore();

  const activeProjectId = params?.id || projectId;

  const [styleError, setStyleError] = useState<string | null>(null);
  const [primaryColorError, setPrimaryColorError] = useState<string | null>(null);
  const [secondaryColorError, setSecondaryColorError] = useState<string | null>(null);

  const { saveNow } = useProjectAutosave(activeProjectId, { style, primary_color: primaryColor, secondary_color: secondaryColor });

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
