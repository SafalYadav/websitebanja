import { notFound } from "next/navigation";
import { getPreviewLinkData } from "@/lib/projects";
import WebsiteRenderer from "@/components/editor/WebsiteRenderer";
import type { WebsiteData } from "@/types/website";

export const dynamic = "force-dynamic";

export default async function PreviewPage({ params }: { params: { id: string } }) {
  const { data, error, expired } = await getPreviewLinkData(params.id);

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

  // Inject current theme explicitly for preview (defaulting to system/light if none)
  const previewData = { ...data } as WebsiteData;

  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: previewData.theme?.colors?.background || "#ffffff" }}>
      <WebsiteRenderer data={previewData} isPublic={true} activePageSlug="" />
    </div>
  );
}

