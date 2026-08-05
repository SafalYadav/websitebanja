"use client";

import BuilderLayout from "@/components/builder/BuilderLayout";
import ProgressBar from "@/components/builder/ProgressBar";
import StepNavigation from "@/components/builder/StepNavigation";
import InputField from "@/components/builder/InputField";
import TextAreaField from "@/components/builder/TextAreaField";
import { useBuilderStore } from "@/store/builderStore";

export default function ContactPage() {
  const {
    phone,
    email,
    address,
    website,
    instagram,
    facebook,

    setPhone,
    setEmail,
    setAddress,
    setWebsite,
    setInstagram,
    setFacebook,
  } = useBuilderStore();

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
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <InputField
          label="Email Address"
          type="email"
          placeholder="hello@business.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <InputField
          label="Website URL (Optional)"
          placeholder="https://yourwebsite.com"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />

        <InputField
          label="Instagram"
          placeholder="@yourbusiness"
          value={instagram}
          onChange={(e) => setInstagram(e.target.value)}
        />

        <InputField
          label="Facebook"
          placeholder="facebook.com/yourbusiness"
          value={facebook}
          onChange={(e) => setFacebook(e.target.value)}
        />

        <TextAreaField
          label="Business Address"
          placeholder="Enter your business address..."
          rows={3}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />

      </div>

      <StepNavigation
        back="/builder/content"
        next="/builder/review"
      />

    </BuilderLayout>
  );
}