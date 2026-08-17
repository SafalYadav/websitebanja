import { notFound } from "next/navigation";
import { getPreviewLinkData, getProject } from "@/lib/projects";
import { getCatalogItems, type CatalogItem } from "@/lib/catalog";
import WebsiteRenderer from "@/components/editor/WebsiteRenderer";
import type { WebsiteData } from "@/types/website";

export const dynamic = "force-dynamic";

export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const { data, error, expired, projectId } = await getPreviewLinkData(resolvedParams.id);

  if (expired) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-4 text-center dark:bg-zinc-950">
        <h1 className="mb-4 text-2xl font-bold text-zinc-900 dark:text-zinc-100">Preview Expired</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-md">
          This 2-day preview link has expired. Please ask the creator to share a new preview link or visit the permanently published website.
        </p>
      </div>
    );
  }

  if (error || !data) {
    notFound();
  }

  const previewData = { ...data } as WebsiteData;
  const themeConfig = previewData.theme as { colors?: { background?: string } } | undefined;
  const bgColor = themeConfig?.colors?.background || "#ffffff";

  let catalogItems: CatalogItem[] = [];
  let project = null;
  if (projectId) {
    const { data: items } = await getCatalogItems(projectId);
    if (items) catalogItems = items;
    
    const { data: pData } = await getProject(projectId);
    if (pData) project = pData;
  }

  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: bgColor }}>
      <WebsiteRenderer 
        data={previewData} 
        catalogItems={catalogItems} 
        isPublic={true} 
        activePageSlug=""
        pColor={project?.primary_color}
        sColor={project?.secondary_color}
        brandStyle={project?.style}
        category={project?.category}
        businessName={project?.business_name || project?.name}
        whatsappNumber={project?.whatsapp_number}
        phone={project?.phone}
        whatsappMessage={project?.whatsapp_message}
        whatsappEnabled={project?.whatsapp_enabled}
      />
    </div>
  );
}

