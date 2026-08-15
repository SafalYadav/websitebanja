"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import BuilderLayout from "@/components/builder/BuilderLayout";
import ProgressBar from "@/components/builder/ProgressBar";
import StepNavigation from "@/components/builder/StepNavigation";
import InputField from "@/components/builder/InputField";
import TextAreaField from "@/components/builder/TextAreaField";

import { editorRoute } from "@/lib/editorRoutes";
import { useProjectAutosave } from "@/hooks/useProjectAutosave";
import { useBuilderStore } from "@/store/builderStore";
import { validateEmail, validatePhone, validateUrl } from "@/lib/validation";

export default function ContactPage() {
  const router = useRouter();

  const {
    projectId,
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

  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [websiteError, setWebsiteError] = useState<string | null>(null);

  const { saveNow } = useProjectAutosave(projectId, { phone, email, website, instagram, facebook, address });

  function handlePhoneBlur() {
    if (!phone.trim()) {
      setPhoneError(null);
      return;
    }
    const check = validatePhone(phone);
    if (!check.isValid) {
      setPhoneError(check.error ?? "Invalid phone number format.");
    } else {
      setPhoneError(null);
      setPhone(check.normalized);
    }
  }

  function handleEmailBlur() {
    if (!email.trim()) {
      setEmailError(null);
      return;
    }
    const check = validateEmail(email);
    if (!check.isValid) {
      setEmailError(check.error ?? "Invalid email format.");
    } else {
      setEmailError(null);
      setEmail(check.normalized);
    }
  }

  function handleWebsiteBlur() {
    if (!website.trim()) {
      setWebsiteError(null);
      return;
    }
    const check = validateUrl(website);
    if (!check.isValid) {
      setWebsiteError(check.error ?? "Invalid website URL format.");
    } else {
      setWebsiteError(null);
      setWebsite(check.normalized);
    }
  }

  async function handleNext() {
    let hasError = false;

    // Validate phone if provided
    if (phone.trim()) {
      const phoneCheck = validatePhone(phone);
      if (!phoneCheck.isValid) {
        setPhoneError(phoneCheck.error ?? "Invalid phone number.");
        hasError = true;
      } else {
        setPhoneError(null);
        setPhone(phoneCheck.normalized);
      }
    }

    // Validate email if provided
    if (email.trim()) {
      const emailCheck = validateEmail(email);
      if (!emailCheck.isValid) {
        setEmailError(emailCheck.error ?? "Invalid email address.");
        hasError = true;
      } else {
        setEmailError(null);
        setEmail(emailCheck.normalized);
      }
    }

    // Validate website URL if provided
    if (website.trim()) {
      const urlCheck = validateUrl(website);
      if (!urlCheck.isValid) {
        setWebsiteError(urlCheck.error ?? "Invalid website URL.");
        hasError = true;
      } else {
        setWebsiteError(null);
        setWebsite(urlCheck.normalized);
      }
    }

    if (hasError) {
      return;
    }

    try {
      await saveNow();
      router.push(editorRoute(projectId, "integrations"));
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to save project.");
    }
  }

  return (
    <BuilderLayout
      title="Contact & Location"
      description="Add your contact info so visitors and prospective clients can easily connect."
    >
      <ProgressBar step={3} />

      <div className="space-y-6">
        <InputField
          label="Direct Phone Number"
          placeholder="+1 555 123 4567 or +91 98765 43210"
          helperText="Include country code with '+' prefix"
          value={phone}
          error={phoneError ?? undefined}
          onChange={(e) => {
            setPhone(e.target.value);
            if (phoneError) setPhoneError(null);
          }}
          onBlur={handlePhoneBlur}
        />

        <InputField
          label="Business Email"
          type="email"
          placeholder="hello@yourbusiness.com"
          helperText="Displayed in the website contact section"
          value={email}
          error={emailError ?? undefined}
          onChange={(e) => {
            setEmail(e.target.value);
            if (emailError) setEmailError(null);
          }}
          onBlur={handleEmailBlur}
        />

        <InputField
          label="Custom Website URL (Optional)"
          placeholder="https://yourbusiness.com"
          value={website}
          error={websiteError ?? undefined}
          onChange={(e) => {
            setWebsite(e.target.value);
            if (websiteError) setWebsiteError(null);
          }}
          onBlur={handleWebsiteBlur}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InputField
            label="Instagram Handle"
            placeholder="@yourbusiness"
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
          />

          <InputField
            label="Facebook Page"
            placeholder="facebook.com/yourbusiness"
            value={facebook}
            onChange={(e) => setFacebook(e.target.value)}
          />
        </div>

        <TextAreaField
          label="Physical Business Address (Optional)"
          placeholder="Enter street, suite, city, postal code..."
          rows={3}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </div>

      <StepNavigation
        back={projectId ? editorRoute(projectId, "content") : undefined}
        onNext={handleNext}
      />
    </BuilderLayout>
  );
}
