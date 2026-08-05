"use client";

import { useRouter } from "next/navigation";

import BuilderLayout from "@/components/builder/BuilderLayout";
import ProgressBar from "@/components/builder/ProgressBar";
import StepNavigation from "@/components/builder/StepNavigation";
import InputField from "@/components/builder/InputField";
import SelectField from "@/components/builder/SelectField";
import UploadField from "@/components/builder/UploadField";

import { editorRoute } from "@/lib/editorRoutes";
import { updateProject } from "@/lib/projects";
import { useBuilderStore } from "@/store/builderStore";

export default function BrandingPage() {
  const router = useRouter();

  const {
    projectId,
    style,
    primaryColor,
    secondaryColor,
    setStyle,
    setPrimaryColor,
    setSecondaryColor,
  } = useBuilderStore();

  async function handleNext() {
    if (!projectId) {
      alert("Project not found");
      return;
    }

    const { error } = await updateProject(projectId, {
      style,
      primary_color: primaryColor,
      secondary_color: secondaryColor,
    });

    if (error) {
      alert(error.message);
      return;
    }

    router.push(editorRoute(projectId, "content"));
  }

  return (
    <BuilderLayout
      title="Branding 🎨"
      description="Customize your website branding."
    >
      <ProgressBar step={1} />

      <div className="space-y-8">
        <SelectField
          label="Website Style"
          value={style}
          onChange={(e) => setStyle(e.target.value)}
          options={[
            "Modern",
            "Minimal",
            "Luxury",
            "Corporate",
            "Creative",
            "Dark",
          ]}
        />

        <InputField
          label="Primary Brand Color"
          placeholder="e.g. Blue"
          value={primaryColor}
          onChange={(e) => setPrimaryColor(e.target.value)}
        />

        <InputField
          label="Secondary Brand Color"
          placeholder="e.g. White"
          value={secondaryColor}
          onChange={(e) => setSecondaryColor(e.target.value)}
        />

        <UploadField label="Upload Logo" />

        <UploadField label="Upload Business Images" multiple />
      </div>

      <StepNavigation
        back={projectId ? editorRoute(projectId) : undefined}
        onNext={handleNext}
      />
    </BuilderLayout>
  );
}
