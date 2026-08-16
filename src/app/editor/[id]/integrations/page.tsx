"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import BuilderLayout from "@/components/builder/BuilderLayout";
import ProgressBar from "@/components/builder/ProgressBar";
import StepNavigation from "@/components/builder/StepNavigation";
import InputField from "@/components/builder/InputField";
import TextAreaField from "@/components/builder/TextAreaField";
import { editorRoute } from "@/lib/editorRoutes";
import { useProjectAutosave } from "@/hooks/useProjectAutosave";
import { useBuilderStore } from "@/store/builderStore";
import { validatePhone } from "@/lib/validation";
import { toast } from "@/store/toastStore";
import {
  MessageCircle,
  MapPin,
  Calendar,
  CreditCard,
  Check,
  Sparkles,
} from "lucide-react";
import { FaInstagram } from "react-icons/fa6";
import { cn } from "@/lib/utils";

const INTEGRATION_OPTIONS = [
  {
    id: "whatsapp",
    name: "WhatsApp Quick Chat",
    icon: MessageCircle,
    desc: "Floating 1-click WhatsApp button for instant inquiries.",
    color: "text-emerald-500",
  },
  {
    id: "google_maps",
    name: "Google Maps Embed",
    icon: MapPin,
    desc: "Interactive map and driving directions for physical locations.",
    color: "text-red-500",
  },
  {
    id: "appointments",
    name: "Appointment / Booking",
    icon: Calendar,
    desc: "Online calendar booking system for client reservations.",
    color: "text-blue-500",
  },
  {
    id: "payments",
    name: "Payment Gateway",
    icon: CreditCard,
    desc: "Accept UPI, Cards, and Net Banking deposits directly.",
    color: "text-violet-500",
  },
  {
    id: "instagram",
    name: "Instagram Live Feed",
    icon: FaInstagram,
    desc: "Showcase real-time photos and social proof.",
    color: "text-pink-500",
  },
];

export default function IntegrationsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const {
    projectId,
    selectedFeatures,
    toggleFeature,
    whatsappNumber,
    whatsappMessage,
    whatsappEnabled,
    setWhatsappNumber,
    setWhatsappMessage,
    setWhatsappEnabled,
  } = useBuilderStore();

  const activeProjectId = params?.id || projectId;

  const [whatsappError, setWhatsappError] = useState<string | null>(null);

  const { saveNow } = useProjectAutosave(activeProjectId, {
    phone: whatsappNumber.trim() || undefined,
    backend_config: {
      selected_features: selectedFeatures,
      whatsapp_number: whatsappNumber,
      whatsapp_message: whatsappMessage,
      whatsapp_enabled: whatsappEnabled,
    },
  });

  function handleWhatsappBlur() {
    if (!whatsappNumber.trim()) {
      setWhatsappError(null);
      return;
    }
    const check = validatePhone(whatsappNumber);
    if (!check.isValid) {
      setWhatsappError(check.error ?? "Invalid phone format.");
    } else {
      setWhatsappError(null);
      setWhatsappNumber(check.normalized);
    }
  }

  async function handleNext() {
    if (whatsappEnabled && whatsappNumber.trim()) {
      const check = validatePhone(whatsappNumber);
      if (!check.isValid) {
        setWhatsappError(check.error ?? "Invalid WhatsApp phone format.");
        return;
      }
      setWhatsappNumber(check.normalized);
    }

    try {
      await saveNow();
      router.push(editorRoute(activeProjectId, "review"));
    } catch (error) {
      toast.error("Save Error", error instanceof Error ? error.message : "Unable to save integration settings.");
    }
  }

  return (
    <BuilderLayout
      title="Integrations & Growth Tools"
      description="Connect powerful communication and customer engagement tools into your website."
    >
      <ProgressBar step={4} />

      <div className="space-y-8">
        {/* Feature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {INTEGRATION_OPTIONS.map((item) => {
            const isSelected = selectedFeatures.includes(item.id);
            const Icon = item.icon;

            return (
              <div
                key={item.id}
                onClick={() => {
                  toggleFeature(item.id);
                  if (item.id === "whatsapp") {
                    setWhatsappEnabled(!isSelected);
                  }
                }}
                className={cn(
                  "p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3.5 select-none",
                  isSelected
                    ? "border-violet-500 bg-violet-50/40 dark:bg-violet-950/30 ring-1 ring-violet-500"
                    : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-white/10 dark:bg-zinc-900"
                )}
              >
                <div className={cn("p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800", item.color)}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-900 dark:text-white">
                      {item.name}
                    </span>
                    <div
                      className={cn(
                        "h-4 w-4 rounded-md flex items-center justify-center border transition",
                        isSelected
                          ? "bg-violet-600 border-violet-600 text-white"
                          : "border-zinc-300 dark:border-zinc-700"
                      )}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* WhatsApp Deep Config Box */}
        {selectedFeatures.includes("whatsapp") && (
          <div className="rounded-3xl border border-emerald-500/30 bg-emerald-50/40 p-6 dark:bg-emerald-950/20 space-y-4">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                WhatsApp Live Button Configuration
              </h4>
            </div>

            <InputField
              label="WhatsApp Phone Number"
              placeholder="+91 98765 43210"
              helperText="Include country code with '+' prefix"
              value={whatsappNumber}
              error={whatsappError ?? undefined}
              onChange={(e) => {
                setWhatsappNumber(e.target.value);
                if (whatsappError) setWhatsappError(null);
              }}
              onBlur={handleWhatsappBlur}
            />

            <TextAreaField
              label="Pre-filled Customer Message"
              placeholder="Hi, I saw your website and would like to ask about..."
              rows={2}
              value={whatsappMessage}
              onChange={(e) => setWhatsappMessage(e.target.value)}
            />
          </div>
        )}

        <div className="rounded-2xl border border-violet-500/20 bg-violet-50/30 p-4 dark:bg-violet-950/20 flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-violet-600 flex-shrink-0" />
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Selected integrations will be automatically styled and embedded into your generated sections.
          </p>
        </div>
      </div>

      <StepNavigation
        back={projectId ? editorRoute(projectId, "contact") : undefined}
        onNext={handleNext}
      />
    </BuilderLayout>
  );
}
