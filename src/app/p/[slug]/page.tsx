import { notFound } from "next/navigation";
import WebsiteRenderer from "@/components/editor/WebsiteRenderer";
import Logo from "@/components/brand/Logo";
import { getProjectBySlug, getPublishedSnapshot } from "@/lib/projects";
import { getCatalogItems } from "@/lib/catalog";
import type { Metadata } from "next";
import type { WebsiteData } from "@/types/website";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const { data } = await getProjectBySlug(resolvedParams.slug);
  if (!data) return { title: "Not Found" };

  const { snapshot_data } = await getPublishedSnapshot(data.id);
  if (!snapshot_data || Object.keys(snapshot_data).length === 0) {
    return { title: "Not Found" };
  }
  
  const jsonData = snapshot_data as WebsiteData;
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


export default async function PublicWebsitePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = await params;
  const { data: project } = await getProjectBySlug(resolvedParams.slug);

  if (!project) {
    notFound();
  }

  const { snapshot_data } = await getPublishedSnapshot(project.id);
  
  if (!snapshot_data || Object.keys(snapshot_data).length === 0) {
    notFound();
  }

  const websiteData = snapshot_data as WebsiteData;
  // Use metadata injected at publish time if available, fallback to current project
  const meta = (snapshot_data._project_meta as Record<string, any>) || project;
  const { data: catalogItems } = await getCatalogItems(project.id);

  return (
    <main className="min-h-screen relative">
      <WebsiteRenderer
        data={websiteData}
        catalogItems={catalogItems || undefined}
        pColor={meta.primary_color}
        sColor={meta.secondary_color}
        brandStyle={meta.style}
        category={meta.category}
        businessName={meta.business_name || meta.name}
        isPublic={true}
        publicSlug={resolvedParams.slug}
        activePageSlug=""
        whatsappNumber={meta.whatsapp_number}
        phone={meta.phone}
        whatsappMessage={meta.whatsapp_message}
        whatsappEnabled={meta.whatsapp_enabled}
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
