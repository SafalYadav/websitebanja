"use client";

import BuilderLayout from "@/components/builder/BuilderLayout";
import ProgressBar from "@/components/builder/ProgressBar";
import StepNavigation from "@/components/builder/StepNavigation";

export default function ContentPage() {
  return (
    <BuilderLayout
      title="Website Content 📝"
      description="Choose the sections you want on your website."
    >
      <ProgressBar step={2} />

      <div className="space-y-5">

        {[
          "Home",
          "About",
          "Services",
          "Gallery",
          "Pricing",
          "Testimonials",
          "FAQ",
          "Contact",
          "Blog",
        ].map((section) => (
          <label
            key={section}
            className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 p-5 transition hover:border-violet-500"
          >
            <span className="font-medium">{section}</span>

            <input
              type="checkbox"
              defaultChecked
              className="h-5 w-5 accent-violet-600"
            />
          </label>
        ))}

      </div>

      <StepNavigation
        back="/builder/branding"
        next="/builder/contact"
      />
    </BuilderLayout>
  );
}