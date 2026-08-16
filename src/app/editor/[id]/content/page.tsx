"use client";

import { useRouter, useParams } from "next/navigation";
import BuilderLayout from "@/components/builder/BuilderLayout";
import ProgressBar from "@/components/builder/ProgressBar";
import StepNavigation from "@/components/builder/StepNavigation";
import { editorRoute } from "@/lib/editorRoutes";
import { useProjectAutosave } from "@/hooks/useProjectAutosave";
import { useBuilderStore } from "@/store/builderStore";
import { toast } from "@/store/toastStore";

const DEFAULT_SECTIONS = [
  { name: "Hero Header", desc: "Eye-catching introduction with strong value proposition" },
  { name: "About Story", desc: "Your background, mission, and company journey" },
  { name: "Services", desc: "Detailed breakdown of what you offer" },
  { name: "Features & Highlights", desc: "Key benefits, technology, and why clients choose you" },
  { name: "FAQ Accordion", desc: "Clear answers to frequently asked customer questions" },
  { name: "Contact & Booking", desc: "Direct phone, email, and location information" },
  { name: "Footer", desc: "Copyright notice, navigation, and social links" },
];

export default function ContentPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const projectId = useBuilderStore((state) => state.projectId);
  const activeProjectId = params?.id || projectId;

  const { saveNow } = useProjectAutosave(activeProjectId, {
    json_data: { content_sections: DEFAULT_SECTIONS.map((s) => s.name) },
  });

  async function handleNext() {
    try {
      await saveNow();
      router.push(editorRoute(activeProjectId, "contact"));
    } catch (error) {
      toast.error("Save Error", error instanceof Error ? error.message : "Unable to save content preferences.");
    }
  }

  return (
    <BuilderLayout
      title="Website Sections"
      description="Choose the content sections AI should architect for your website."
    >
      <ProgressBar step={2} />

      <div className="space-y-3">
        {DEFAULT_SECTIONS.map((section) => (
          <label
            key={section.name}
            className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4 sm:p-5 transition hover:border-violet-500/60 hover:bg-violet-50/30 dark:border-white/10 dark:bg-black/30 dark:hover:border-violet-500/50 cursor-pointer"
          >
            <div>
              <span className="font-bold text-sm text-zinc-900 dark:text-white block">
                {section.name}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 block">
                {section.desc}
              </span>
            </div>

            <input
              type="checkbox"
              defaultChecked
              className="h-5 w-5 rounded-md accent-violet-600 cursor-pointer"
            />
          </label>
        ))}
      </div>

      <StepNavigation
        back={projectId ? editorRoute(projectId, "branding") : undefined}
        onNext={handleNext}
      />
    </BuilderLayout>
  );
}
