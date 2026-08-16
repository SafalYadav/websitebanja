import { notFound } from "next/navigation";
import WebsiteRenderer from "@/components/editor/WebsiteRenderer";
import Logo from "@/components/brand/Logo";
import { getProjectBySlug } from "@/lib/projects";
import type { Metadata } from "next";
import type { WebsiteData } from "@/types/website";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const { data } = await getProjectBySlug(resolvedParams.slug);
  if (!data) return { title: "Not Found" };

  const jsonData = (data.json_data || {}) as WebsiteData;
  const homePage = jsonData.pages?.find((p) => p.isHome) || jsonData.pages?.[0];
  const pageTitle = homePage?.seo?.title || `${data.business_name || data.name} | Official Site`;
  const pageDesc = homePage?.seo?.description || data.description || "A responsive modern website created with WebsiteBanja AI";

  return {
    title: pageTitle,
    description: pageDesc,
    openGraph: {
      title: homePage?.seo?.ogTitle || pageTitle,
      description: homePage?.seo?.ogDescription || pageDesc,
      images: homePage?.seo?.ogImage ? [{ url: homePage.seo.ogImage }] : undefined,
    },
  };
}

import { AlertCircle } from "lucide-react";

export default async function PublicWebsitePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = await params;
  const { data: project } = await getProjectBySlug(resolvedParams.slug);

  if (!project || !project.json_data || Object.keys(project.json_data).length === 0) {
    notFound();
  }

  // Check if preview has expired
  if (project.preview_expires_at && Date.now() > new Date(project.preview_expires_at).getTime()) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 p-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-100 text-rose-600 mb-6 shadow-sm">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 mb-3 tracking-tight">
          Preview Expired
        </h1>
        <p className="text-zinc-500 max-w-sm mb-8">
          This WebsiteBanja preview link has expired. To view this website again, the owner must republish it from the Studio.
        </p>
        <a 
          href="/" 
          className="rounded-xl bg-zinc-900 px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-zinc-800 transition active:scale-95"
        >
          Build Your Own Website
        </a>
      </main>
    );
  }

  const websiteData = project.json_data as WebsiteData;

  return (
    <main className="min-h-screen relative">
      <WebsiteRenderer
        data={websiteData}
        pColor={project.primary_color}
        sColor={project.secondary_color}
        brandStyle={project.style}
        category={project.category}
        businessName={project.business_name || project.name}
        isPublic={true}
        publicSlug={resolvedParams.slug}
        activePageSlug=""
      />

      {/* Floating WebsiteBanja Brand Badge */}
      <a
        href="/"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-full border border-zinc-200/80 bg-white/90 px-3.5 py-1.5 text-xs font-semibold text-zinc-900 shadow-xl backdrop-blur-xl transition hover:bg-white hover:scale-105 active:scale-95 dark:border-white/15 dark:bg-zinc-900/90 dark:text-white"
      >
        <Logo imageSize={20} showText={false} />
        <span className="text-[11px] sm:text-xs">
          Built with <strong className="font-extrabold bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">WebsiteBanja AI</strong>
        </span>
      </a>
    </main>
  );
}
