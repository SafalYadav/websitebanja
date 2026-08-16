"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Edit3, CheckCircle2, MessageCircle, Globe } from "lucide-react";

import BuilderLayout from "@/components/builder/BuilderLayout";
import ProgressBar from "@/components/builder/ProgressBar";
import StepNavigation from "@/components/builder/StepNavigation";

import { editorRoute } from "@/lib/editorRoutes";
import { useProjectAutosave } from "@/hooks/useProjectAutosave";
import { useBuilderStore } from "@/store/builderStore";
import { toast } from "@/store/toastStore";

export default function ReviewPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    selectedFeatures,
    whatsappNumber,
    whatsappMessage,
    whatsappEnabled,
  } = useBuilderStore();

  const activeProjectId = params?.id || projectId;

  const { saveNow } = useProjectAutosave(activeProjectId, {
    business_name: businessName,
    category,
    description,
    target_audience: targetAudience,
    style,
    primary_color: primaryColor,
    secondary_color: secondaryColor,
    phone: phone || whatsappNumber || undefined,
    email,
    website,
    instagram,
    facebook,
    address,
    backend_config: {
      selected_features: selectedFeatures,
      whatsapp_number: whatsappNumber,
      whatsapp_message: whatsappMessage,
      whatsapp_enabled: whatsappEnabled,
    },
  });

  async function handleNext() {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await saveNow();
      router.push(editorRoute(activeProjectId, "loading"));
    } catch (error) {
      setIsSubmitting(false);
      toast.error("Save Error", error instanceof Error ? error.message : "Unable to save project details.");
    }
  }

  return (
    <BuilderLayout
      title="Review & Launch"
      description="Review your curated business profile before AI crafts your live website."
    >
      <ProgressBar step={5} />

      <div className="space-y-6">
        {/* Business & Brand Card */}
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-6 shadow-xs dark:border-white/10 dark:bg-black/40 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-200/80 dark:border-white/10">
            <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              Business & Branding
            </h2>
            <Link
              href={editorRoute(projectId)}
              className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1 transition"
            >
              <Edit3 className="h-3.5 w-3.5" /> Edit
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-zinc-500 dark:text-zinc-400 block text-xs font-medium">Business Name</span>
              <span className="font-semibold text-zinc-900 dark:text-white">{businessName || "Not Provided"}</span>
            </div>
            <div>
              <span className="text-zinc-500 dark:text-zinc-400 block text-xs font-medium">Category</span>
              <span className="font-semibold text-zinc-900 dark:text-white">{category || "Not Selected"}</span>
            </div>
            <div>
              <span className="text-zinc-500 dark:text-zinc-400 block text-xs font-medium">Design Style</span>
              <span className="font-semibold text-zinc-900 dark:text-white">{style || "Not Selected"}</span>
            </div>
            <div>
              <span className="text-zinc-500 dark:text-zinc-400 block text-xs font-medium">Target Audience</span>
              <span className="font-semibold text-zinc-900 dark:text-white">{targetAudience || "General Audience"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-zinc-500 dark:text-zinc-400 text-xs font-medium">Primary:</span>
              <span
                className="inline-block h-4 w-4 rounded-full border border-zinc-300 dark:border-white/20 shadow-2xs"
                style={{ backgroundColor: primaryColor || "#2563eb" }}
              />
              <span className="font-mono text-xs font-semibold text-zinc-800 dark:text-zinc-200">{primaryColor || "Default"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-zinc-500 dark:text-zinc-400 text-xs font-medium">Secondary:</span>
              <span
                className="inline-block h-4 w-4 rounded-full border border-zinc-300 dark:border-white/20 shadow-2xs"
                style={{ backgroundColor: secondaryColor || "#7c3aed" }}
              />
              <span className="font-mono text-xs font-semibold text-zinc-800 dark:text-zinc-200">{secondaryColor || "Default"}</span>
            </div>
          </div>

          {description && (
            <div className="mt-4 pt-3 border-t border-zinc-200/60 dark:border-white/5">
              <span className="text-zinc-500 dark:text-zinc-400 block text-xs font-medium mb-1">Description</span>
              <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed line-clamp-3">{description}</p>
            </div>
          )}
        </div>

        {/* Contact Info Card */}
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-6 shadow-xs dark:border-white/10 dark:bg-black/40 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-200/80 dark:border-white/10">
            <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              Contact Details
            </h2>
            <Link
              href={editorRoute(projectId, "contact")}
              className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1 transition"
            >
              <Edit3 className="h-3.5 w-3.5" /> Edit
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-zinc-500 dark:text-zinc-400 block text-xs font-medium">Phone</span>
              <span className="font-semibold text-zinc-900 dark:text-white">{phone || "Not Provided"}</span>
            </div>
            <div>
              <span className="text-zinc-500 dark:text-zinc-400 block text-xs font-medium">Email</span>
              <span className="font-semibold text-zinc-900 dark:text-white">{email || "Not Provided"}</span>
            </div>
            {address && (
              <div className="sm:col-span-2">
                <span className="text-zinc-500 dark:text-zinc-400 block text-xs font-medium">Address</span>
                <span className="font-semibold text-zinc-900 dark:text-white">{address}</span>
              </div>
            )}
          </div>
        </div>

        {/* Integrations Card */}
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-6 shadow-xs dark:border-white/10 dark:bg-black/40 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-200/80 dark:border-white/10">
            <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Active Integrations & Tools
            </h2>
            <Link
              href={editorRoute(projectId, "integrations")}
              className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1 transition"
            >
              <Edit3 className="h-3.5 w-3.5" /> Edit
            </Link>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            {selectedFeatures.length > 0 ? (
              selectedFeatures.map((f) => (
                <span
                  key={f}
                  className="px-3 py-1.5 rounded-full bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 font-semibold uppercase tracking-wider text-[10px]"
                >
                  {f.replace("_", " ")}
                </span>
              ))
            ) : (
              <span className="text-zinc-500">Standard Sections Enabled</span>
            )}
          </div>

          {whatsappEnabled && whatsappNumber && (
            <div className="mt-3.5 pt-3 border-t border-zinc-200/60 dark:border-white/5 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
              <MessageCircle className="h-4 w-4" />
              <span>WhatsApp Live Chat: {whatsappNumber}</span>
            </div>
          )}
        </div>
      </div>

      <StepNavigation
        back={projectId ? editorRoute(projectId, "integrations") : undefined}
        onNext={handleNext}
        nextText={isSubmitting ? "Generating Studio..." : "✨ Generate My Website"}
      />
    </BuilderLayout>
  );
}
