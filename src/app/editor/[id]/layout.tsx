"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { dashboardRoute } from "@/lib/editorRoutes";
import { getProject } from "@/lib/projects";
import { useBuilderStore } from "@/store/builderStore";
import { useGeneratedWebsiteStore } from "@/store/generatedWebsiteStore";
import type { WebsiteData } from "@/types/website";

export default function EditorLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let isCancelled = false;

    async function loadProject() {
      if (!params?.id) return;
      setStatus("loading");

      // If store already has this exact project loaded, we are ready
      const storeState = useGeneratedWebsiteStore.getState();
      if (storeState.currentProjectId === params.id && storeState.website) {
        setStatus("ready");
        return;
      }

      // Support demo, preview, and test workspaces gracefully
      if (params.id.startsWith("demo") || params.id === "preview" || params.id.startsWith("test")) {
        const demoWebsite: WebsiteData = {
          hero: {
            title: "Welcome to Elite Smile Dental",
            subtitle: "Award-winning painless dental care and smile transformations.",
            button: "Book Appointment",
            buttonAction: { type: "scroll", target: "contact" },
          },
          about: {
            title: "About Us",
            content: "Serving our local community with world-class dental care for over a decade.",
          },
          services: [
            { title: "General Dentistry", description: "Complete checkups, cleanings, and digital dental x-rays." },
            { title: "Teeth Whitening", description: "Advanced laser whitening for radiant, bright smiles." },
          ],
          features: [
            { title: "Modern Technology", description: "Painless laser care and 3D digital imaging." },
          ],
          faq: [
            { question: "Do you accept new patients?", answer: "Yes, we welcome all new patients and walk-ins." },
          ],
          contact: {
            phone: "+919876543210",
            email: "contact@elitesmile.com",
            address: "123 Healthcare Blvd, Mumbai, MH",
          },
          footer: {
            copyright: `© ${new Date().getFullYear()} Elite Smile Dental. All rights reserved.`,
          },
          sectionOrder: ["hero", "about", "services", "features", "faq", "contact", "footer"],
          pages: [
            {
              id: "home",
              slug: "",
              title: "Home",
              isHome: true,
              sectionOrder: ["hero", "about", "services", "features", "faq", "contact", "footer"],
            },
          ],
        };
        useBuilderStore.getState().hydrateFromProject({
          id: params.id,
          name: "Elite Smile Dental",
          business_name: "Elite Smile Dental",
          category: "Healthcare",
          json_data: demoWebsite,
          user_id: "guest-user",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any);
        useGeneratedWebsiteStore.getState().setWebsiteForProject(params.id, demoWebsite);
        setStatus("ready");
        return;
      }

      // Clear previous project state to prevent any state leakage
      useBuilderStore.getState().clearProject();
      useGeneratedWebsiteStore.getState().clearWebsite();

      const { data, error } = await getProject(params.id);
      if (isCancelled) return;

      if (error || !data) {
        setStatus("error");
        return;
      }

      useBuilderStore.getState().hydrateFromProject(data);

      if (data.json_data && Object.keys(data.json_data).length > 0) {
        useGeneratedWebsiteStore.getState().setWebsiteForProject(params.id, data.json_data as WebsiteData);
      }

      setStatus("ready");
    }

    void loadProject();

    return () => {
      isCancelled = true;
    };
  }, [params?.id]);

  if (status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-900 text-zinc-400">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
          <span className="text-xs font-semibold">Loading project workspace...</span>
        </div>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black px-6 text-center text-white">
        <div>
          <h1 className="text-3xl font-bold">Project unavailable</h1>
          <p className="mt-3 text-zinc-400">It may have been deleted or you may no longer have access.</p>
          <button
            onClick={() => router.push(dashboardRoute())}
            className="mt-6 rounded-xl bg-white px-5 py-3 font-semibold text-black"
          >
            Back to dashboard
          </button>
        </div>
      </main>
    );
  }

  return children;
}
