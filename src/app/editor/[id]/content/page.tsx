"use client";

import { useRouter } from "next/navigation";

import BuilderLayout from "@/components/builder/BuilderLayout";
import ProgressBar from "@/components/builder/ProgressBar";
import StepNavigation from "@/components/builder/StepNavigation";

import { editorRoute } from "@/lib/editorRoutes";
import { getProject, updateProject } from "@/lib/projects";
import { useBuilderStore } from "@/store/builderStore";

const DEFAULT_SECTIONS = [
  "Home",
  "About",
  "Services",
  "Gallery",
  "Pricing",
  "Testimonials",
  "FAQ",
  "Contact",
  "Blog",
];

export default function ContentPage() {
  const router = useRouter();
  const projectId = useBuilderStore((state) => state.projectId);

  async function handleNext() {
    if (!projectId) {
      alert("Project not found");
      return;
    }

    const { data: project, error: fetchError } = await getProject(projectId);

    if (fetchError) {
      alert(fetchError.message);
      return;
    }

    const existingJson =
      project?.json_data &&
      typeof project.json_data === "object" &&
      !Array.isArray(project.json_data)
        ? project.json_data
        : {};

    const { error } = await updateProject(projectId, {
      json_data: {
        ...existingJson,
        content_sections: DEFAULT_SECTIONS,
      },
    });

    if (error) {
      alert(error.message);
      return;
    }

    router.push(editorRoute(projectId, "contact"));
  }

  return (
    <BuilderLayout
      title="Website Content 📝"
      description="Choose the sections you want on your website."
    >
      <ProgressBar step={2} />

      <div className="space-y-5">
        {DEFAULT_SECTIONS.map((section) => (
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
        back={projectId ? editorRoute(projectId, "branding") : undefined}
        onNext={handleNext}
      />
    </BuilderLayout>
  );
}
