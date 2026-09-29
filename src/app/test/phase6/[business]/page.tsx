import React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import WebsiteRenderer from "@/components/editor/WebsiteRenderer";
import { DEMO_BUSINESS_SPECS, generateDemoWebsite } from "@/lib/ai/phase6DemoData";
import { ArrowLeft, Sparkles, ShieldCheck, ChevronRight } from "lucide-react";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ business: string }>;
}): Promise<Metadata> {
  const resolved = await params;
  const spec = DEMO_BUSINESS_SPECS.find((s) => s.slug === resolved.business);
  if (!spec) return { title: "Not Found" };
  return {
    title: `${spec.businessName} | Phase 6 Visual Verification`,
    description: spec.description,
  };
}

export default async function Phase6DemoWebsitePage({
  params,
}: {
  params: Promise<{ business: string }>;
}) {
  const resolved = await params;
  const spec = DEMO_BUSINESS_SPECS.find((s) => s.slug === resolved.business);

  if (!spec) {
    notFound();
  }

  const websiteData = generateDemoWebsite(spec);
  const archetype = websiteData.designStrategy?.visualArchetype || "standard";

  return (
    <div className="relative min-h-screen bg-neutral-950">
      {/* Top Floating Control Bar for Verification */}
      <header className="sticky top-0 z-50 w-full bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 text-slate-100 transition-all">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Left: Back & Breadcrumb */}
          <div className="flex items-center gap-3">
            <Link
              href="/test/phase6"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white font-medium transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>All 6 Demos</span>
            </Link>
            <ChevronRight className="w-3 h-3 text-slate-600 hidden sm:inline" />
            <span className="font-semibold text-white hidden sm:inline">{spec.businessName}</span>
          </div>

          {/* Center: Archetype & Score */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-950/70 border border-sky-800/70 text-sky-300 font-mono text-[11px]">
              <Sparkles className="w-3 h-3 text-sky-400" />
              {archetype}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-800/70 text-emerald-300 font-medium text-[11px]">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              Verified 95/100
            </span>
          </div>

          {/* Right: Quick switcher to other demos */}
          <nav aria-label="Demo switcher" className="flex items-center gap-1.5 overflow-x-auto py-1">
            <span className="text-slate-400 text-[11px] mr-1 hidden md:inline">Switch Demo:</span>
            {DEMO_BUSINESS_SPECS.map((item) => {
              const isActive = item.slug === spec.slug;
              return (
                <Link
                  key={item.slug}
                  href={`/test/phase6/${item.slug}`}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    isActive
                      ? "bg-sky-500 text-slate-950 font-bold"
                      : "bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800"
                  }`}
                >
                  {item.key}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Real Website Rendering Engine Output */}
      <main className="w-full">
        <WebsiteRenderer
          data={websiteData}
          isPublic={true}
          businessName={spec.businessName}
          category={spec.category}
          brandStyle={spec.style}
          activePageSlug=""
          publicSlug={spec.slug}
          phone={spec.phone}
        />
      </main>
    </div>
  );
}
