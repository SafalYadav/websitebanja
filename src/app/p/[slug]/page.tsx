import { notFound } from "next/navigation";
import WebsiteRenderer from "@/components/editor/WebsiteRenderer";
import Logo from "@/components/brand/Logo";
import { getProjectBySlug } from "@/lib/projects";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const { data } = await getProjectBySlug(resolvedParams.slug);
  if (!data) return { title: "Not Found" };

  return {
    title: `${data.business_name || data.name} | Built with WebsiteBanja AI`,
    description: data.description || "A responsive modern website created with WebsiteBanja AI",
    openGraph: {
      title: `${data.business_name || data.name}`,
      description: data.description || "A responsive modern website created with WebsiteBanja AI",
    },
  };
}

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const websiteData = project.json_data as any;

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
