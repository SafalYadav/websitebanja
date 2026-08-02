"use client";

import BuilderLayout from "@/components/builder/BuilderLayout";
import ProgressBar from "@/components/builder/ProgressBar";
import StepNavigation from "@/components/builder/StepNavigation";
import InputField from "@/components/builder/InputField";
import SelectField from "@/components/builder/SelectField";
import UploadField from "@/components/builder/UploadField";

export default function BrandingPage() {
  return (
    <BuilderLayout
      title="Branding 🎨"
      description="Customize your website branding."
    >
      <ProgressBar step={1} />

      <div className="space-y-8">

        <SelectField
          label="Website Style"
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
        />

        <InputField
          label="Secondary Brand Color"
          placeholder="e.g. White"
        />

        <UploadField
          label="Upload Logo"
        />

        <UploadField
          label="Upload Business Images"
          multiple
        />

      </div>

      <StepNavigation
        back="/builder"
        next="/builder/content"
      />

    </BuilderLayout>
  );
}