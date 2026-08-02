"use client";

import BuilderLayout from "@/components/builder/BuilderLayout";
import ProgressBar from "@/components/builder/ProgressBar";
import StepNavigation from "@/components/builder/StepNavigation";
import InputField from "@/components/builder/InputField";
import SelectField from "@/components/builder/SelectField";
import TextAreaField from "@/components/builder/TextAreaField";

export default function BuilderPage() {
  return (
    <BuilderLayout
      title="Business Details 🚀"
      description="Tell us about your business and let AI create a stunning website."
    >
      <ProgressBar step={0} />

      <div className="space-y-8">

        <InputField
          label="Business Name"
          placeholder="e.g. Sharma Restaurant"
        />

        <SelectField
          label="Business Category"
          options={[
            "Restaurant",
            "Cafe",
            "Gym",
            "Salon",
            "Hotel",
            "Agency",
            "Clinic",
            "Real Estate",
            "E-commerce",
            "Portfolio",
            "Other",
          ]}
        />

        <TextAreaField
  label="Describe Your Business"
  placeholder="Describe your business..."
/>

        <InputField
          label="Target Audience"
          placeholder="Students, Families, Professionals..."
        />

      </div>

      <StepNavigation
        next="/builder/branding"
      />
    </BuilderLayout>
  );
}