"use client";

import { useRouter } from "next/navigation";

import BuilderLayout from "@/components/builder/BuilderLayout";
import ProgressBar from "@/components/builder/ProgressBar";
import StepNavigation from "@/components/builder/StepNavigation";

import { editorRoute } from "@/lib/editorRoutes";
import { updateProject } from "@/lib/projects";
import { useBuilderStore } from "@/store/builderStore";

export default function ReviewPage() {
  const router = useRouter();

  const {
    projectId,
    businessName,
    category,
    description,
    targetAudience,
    style,
    primaryColor,
    secondaryColor,
    phone,
    email,
    address,
    website,
    instagram,
    facebook,
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
      style,
      primary_color: primaryColor,
      secondary_color: secondaryColor,
      phone,
      email,
      website,
      instagram,
      facebook,
      address,
    });

    if (error) {
      alert(error.message);
      return;
    }

    router.push(editorRoute(projectId, "loading"));
  }

  return (
    <BuilderLayout
      title="Review & Generate 🚀"
      description="Review your details before generating your website."
    >
      <ProgressBar step={4} />

      <div className="space-y-6">
        <div className="rounded-2xl border border-white/10 bg-black/30 p-6">
          <h2 className="mb-6 text-xl font-semibold">Business Summary</h2>

          <div className="space-y-4 text-zinc-300">
            <div className="flex justify-between">
              <span>Business</span>
              <span>{businessName || "Not Provided"}</span>
            </div>

            <div className="flex justify-between">
              <span>Category</span>
              <span>{category || "Not Selected"}</span>
            </div>

            <div className="flex justify-between">
              <span>Style</span>
              <span>{style || "Not Selected"}</span>
            </div>

            <div className="flex justify-between">
              <span>Primary Color</span>
              <span>{primaryColor || "Not Selected"}</span>
            </div>

            <div className="flex justify-between">
              <span>Secondary Color</span>
              <span>{secondaryColor || "Not Selected"}</span>
            </div>

            <div className="flex justify-between">
              <span>Phone</span>
              <span>{phone || "Not Provided"}</span>
            </div>

            <div className="flex justify-between">
              <span>Email</span>
              <span>{email || "Not Provided"}</span>
            </div>

            <div className="flex justify-between">
              <span>Address</span>
              <span>{address || "Not Provided"}</span>
            </div>

            <div className="flex justify-between">
              <span>Logo</span>
              <span>Coming Soon 🚧</span>
            </div>

            <div className="flex justify-between">
              <span>Images</span>
              <span>Coming Soon 🚧</span>
            </div>
          </div>
        </div>
      </div>

      <StepNavigation
        back={projectId ? editorRoute(projectId, "contact") : undefined}
        onNext={handleNext}
        nextText="🚀 Generate Website"
      />
    </BuilderLayout>
  );
}
