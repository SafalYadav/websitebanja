"use client";

import { useRouter } from "next/navigation";

import BuilderLayout from "@/components/builder/BuilderLayout";
import ProgressBar from "@/components/builder/ProgressBar";
import StepNavigation from "@/components/builder/StepNavigation";
import InputField from "@/components/builder/InputField";
import SelectField from "@/components/builder/SelectField";
import TextAreaField from "@/components/builder/TextAreaField";

import { editorRoute } from "@/lib/editorRoutes";
import { updateProject } from "@/lib/projects";
import { useBuilderStore } from "@/store/builderStore";

export default function BusinessDetailsPage() {
  const router = useRouter();

  const {
    projectId,
    businessName,
    category,
    description,
    targetAudience,
    setBusinessName,
    setCategory,
    setDescription,
    setTargetAudience,
  } = useBuilderStore();

  async function handleNext() {
    if (!projectId) {
      alert("Project not found");
      return;
    }

    const { error } = await updateProject(projectId, {
      business_name: businessName,
      category,
      description,
      target_audience: targetAudience,
    });

    if (error) {
      alert(error.message);
      return;
    }

    router.push(editorRoute(projectId, "branding"));
  }

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
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
        />

        <SelectField
          label="Business Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
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
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <InputField
          label="Target Audience"
          placeholder="Students, Families, Professionals..."
          value={targetAudience}
          onChange={(e) => setTargetAudience(e.target.value)}
        />
      </div>

      <StepNavigation onNext={handleNext} />
    </BuilderLayout>
  );
}
