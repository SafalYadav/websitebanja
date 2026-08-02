"use client";

import BuilderLayout from "@/components/builder/BuilderLayout";
import ProgressBar from "@/components/builder/ProgressBar";
import StepNavigation from "@/components/builder/StepNavigation";
import InputField from "@/components/builder/InputField";
import TextAreaField from "@/components/builder/TextAreaField";

export default function ContactPage() {
  return (
    <BuilderLayout
      title="Contact Information 📞"
      description="Add your business contact details."
    >
      <ProgressBar step={3} />

      <div className="space-y-8">

        <InputField
          label="Phone Number"
          placeholder="+91 9876543210"
        />

        <InputField
          label="Email Address"
          placeholder="hello@business.com"
          type="email"
        />

        <InputField
          label="Website URL (Optional)"
          placeholder="https://yourwebsite.com"
        />

        <InputField
          label="Instagram"
          placeholder="@yourbusiness"
        />

        <InputField
          label="Facebook"
          placeholder="facebook.com/yourbusiness"
        />

        <TextAreaField
          label="Business Address"
          placeholder="Enter your business address..."
          rows={3}
        />

      </div>

      <StepNavigation
        back="/builder/content"
        next="/builder/review"
      />

    </BuilderLayout>
  );
}