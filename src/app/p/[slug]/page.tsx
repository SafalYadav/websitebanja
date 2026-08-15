import { notFound } from "next/navigation";
import WebsiteRenderer from "@/components/editor/WebsiteRenderer";
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
    <main className="min-h-screen">
      <WebsiteRenderer
        data={websiteData}
        pColor={project.primary_color}
        sColor={project.secondary_color}
        brandStyle={project.style}
        category={project.category}
        businessName={project.business_name || project.name}
        isPublic={true}
      />
    </main>
  );
}
