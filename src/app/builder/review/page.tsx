"use client";

import BuilderLayout from "@/components/builder/BuilderLayout";
import ProgressBar from "@/components/builder/ProgressBar";
import StepNavigation from "@/components/builder/StepNavigation";

export default function ReviewPage() {
  return (
    <BuilderLayout
      title="Review & Generate 🚀"
      description="Review your details before generating your website."
    >
      <ProgressBar step={4} />

      <div className="space-y-6">

        <div className="rounded-2xl border border-white/10 bg-black/30 p-6">
          <h2 className="mb-4 text-xl font-semibold">
            Business Summary
          </h2>

          <div className="space-y-3 text-zinc-300">

            <div className="flex justify-between">
              <span>Business</span>
              <span>Sharma Restaurant</span>
            </div>

            <div className="flex justify-between">
              <span>Category</span>
              <span>Restaurant</span>
            </div>

            <div className="flex justify-between">
              <span>Style</span>
              <span>Luxury</span>
            </div>

            <div className="flex justify-between">
              <span>Primary Color</span>
              <span>Blue</span>
            </div>

            <div className="flex justify-between">
              <span>Content Sections</span>
              <span>9 Selected</span>
            </div>

            <div className="flex justify-between">
              <span>Logo</span>
              <span>✅ Uploaded</span>
            </div>

            <div className="flex justify-between">
              <span>Images</span>
              <span>✅ Uploaded</span>
            </div>

          </div>
        </div>

      </div>

      <StepNavigation
        back="/builder/contact"
        next="/builder/loading"
        nextText="🚀 Generate Website"
      />

    </BuilderLayout>
  );
}