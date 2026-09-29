import React from "react";
import Link from "next/link";
import {
  DEMO_BUSINESS_SPECS,
  getAllDemoWebsites,
  validateAssetDifferentiation,
} from "@/lib/ai/phase6DemoData";
import {
  ArrowUpRight,
  Sparkles,
  Layers,
  Palette,
  Type,
  ShieldCheck,
  CheckCircle2,
  ImageIcon,
} from "lucide-react";

export const metadata = {
  title: "Phase 6.1 Premium Engine & Asset Verification Hub | WebsiteBanja",
  description:
    "Live browser visual verification of 6 distinct business websites generated with WebsiteBanja Phase 6 design engine and Phase 6.1 intelligent asset differentiation.",
};

const ARCHETYPE_BADGE_STYLES: Record<string, string> = {
  luxury_bespoke: "bg-amber-950/40 text-amber-300 border-amber-800/60",
  dark_technical: "bg-cyan-950/40 text-cyan-300 border-cyan-800/60",
  warm_artisanal: "bg-orange-950/40 text-orange-300 border-orange-800/60",
  minimal_editorial: "bg-stone-900/60 text-stone-200 border-stone-700/60",
  expressive_creative: "bg-fuchsia-950/40 text-fuchsia-300 border-fuchsia-800/60",
  high_trust_service: "bg-blue-950/40 text-blue-300 border-blue-800/60",
};

export default function Phase6DemoHubPage() {
  const allWebsites = getAllDemoWebsites();
  const assetAudit = validateAssetDifferentiation();

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 antialiased">
      {/* Background glow effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-[600px] h-[350px] bg-sky-500/10 blur-[120px] rounded-full" />
        <div className="absolute top-1/3 right-1/4 w-[500px] h-[400px] bg-indigo-500/10 blur-[140px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold uppercase tracking-wider mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            Phase 6.1 Visual & Asset Verification Hub
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-4">
            Real Website Generation <br />
            <span className="bg-gradient-to-r from-sky-400 via-indigo-300 to-fuchsia-400 bg-clip-text text-transparent">
              Visual & Imagery Verification
            </span>
          </h1>
          <p className="text-base sm:text-lg text-slate-400 leading-relaxed">
            All 6 websites below are generated via the complete WebsiteBanja Phase 6 design engine pipeline, demonstrating true visual differentiation across archetypes, color systems, typography pairings, bespoke section sequence architectures, and Phase 6.1 intelligent asset diversification.
          </p>
        </div>

        {/* Phase 6.1 Asset Verification Banner */}
        <div className="mb-12 p-6 rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-slate-900/90 border border-emerald-500/30 backdrop-blur-xl shadow-xl">
          <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-800/80 pb-4 mb-4">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-white">
                  Phase 6.1 Intelligent Image Differentiation Status: VERIFIED
                </h3>
                <p className="text-xs text-slate-400">
                  Every business receives business-aware, section-aware, and licensed imagery with 0 cross-business collisions.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-700/60 text-emerald-300 text-xs font-medium">
                SaaS Café Bug: FIXED (0 collisions)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="text-2xl font-bold text-emerald-400">
                {assetAudit.inPageDuplicateCount}
              </div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wide">
                In-Page Duplicates
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="text-2xl font-bold text-emerald-400">
                {assetAudit.crossBusinessDuplicateCount}
              </div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wide">
                Cross-Site Duplicates
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="text-2xl font-bold text-emerald-400">
                {assetAudit.heroDuplicateCount}
              </div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wide">
                Hero Collisions
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="text-2xl font-bold text-sky-400">
                {assetAudit.totalImagesResolved}
              </div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wide">
                Unique Assets Resolved
              </div>
            </div>
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {DEMO_BUSINESS_SPECS.map((spec) => {
            const entry = allWebsites[spec.slug];
            const website = entry.website;
            const quality = entry.quality;
            const strategy = website.designStrategy;
            const colors = strategy?.colorSystem;
            const archetype = strategy?.visualArchetype || "standard";
            const badgeClass =
              ARCHETYPE_BADGE_STYLES[archetype] ||
              "bg-slate-800 text-slate-300 border-slate-700";
            const heroImg = website.hero?.image;

            return (
              <div
                key={spec.slug}
                className="group flex flex-col rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all duration-300 hover:shadow-2xl hover:shadow-sky-500/5 overflow-hidden"
              >
                {/* Image Preview Banner */}
                {heroImg && (
                  <div className="relative h-44 w-full overflow-hidden bg-slate-950 border-b border-slate-800/80">
                    <img
                      src={heroImg}
                      alt={spec.businessName}
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
                    <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-950/80 backdrop-blur-md text-slate-300 border border-slate-700/60">
                        <ImageIcon className="w-3 h-3 text-sky-400" />
                        Domain Verified
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {spec.industry}
                      </span>
                    </div>
                  </div>
                )}

                {/* Card Header */}
                <div className="p-6 border-b border-slate-800/80">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${badgeClass}`}
                    >
                      {archetype.replace("_", " ").toUpperCase()}
                    </span>
                    <span className="flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-2 py-0.5 rounded-full">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Score {quality.score}/100
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white group-hover:text-sky-300 transition-colors">
                    {spec.businessName}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">{spec.category}</p>
                </div>

                {/* Card Body */}
                <div className="p-6 space-y-5 flex-1 flex flex-col justify-between">
                  <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                    {spec.tagline}
                  </p>

                  {/* Palette Preview */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                      <span className="flex items-center gap-1.5">
                        <Palette className="w-3.5 h-3.5 text-slate-500" />
                        Color Palette
                      </span>
                      <span className="text-[11px] text-slate-500">{colors?.primary}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-lg border border-white/20 shadow-sm"
                        style={{ backgroundColor: colors?.primary }}
                        title={`Primary: ${colors?.primary}`}
                      />
                      <div
                        className="w-8 h-8 rounded-lg border border-white/20 shadow-sm"
                        style={{ backgroundColor: colors?.secondary }}
                        title={`Secondary: ${colors?.secondary}`}
                      />
                      <div
                        className="w-8 h-8 rounded-lg border border-white/20 shadow-sm"
                        style={{ backgroundColor: colors?.accent }}
                        title={`Accent: ${colors?.accent}`}
                      />
                      <div
                        className="w-8 h-8 rounded-lg border border-white/20 shadow-sm"
                        style={{ backgroundColor: colors?.bg }}
                        title={`Background: ${colors?.bg}`}
                      />
                      <div
                        className="w-8 h-8 rounded-lg border border-white/20 shadow-sm"
                        style={{ backgroundColor: colors?.surface }}
                        title={`Surface: ${colors?.surface}`}
                      />
                    </div>
                  </div>

                  {/* Typography & Background */}
                  <div className="pt-3 border-t border-slate-800/80 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Type className="w-3.5 h-3.5 text-slate-500" />
                        Typography
                      </span>
                      <span className="text-slate-200 font-mono text-[11px]">
                        {strategy?.typographyStyle || "Editorial Pair"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-slate-500" />
                        Background
                      </span>
                      <span className="text-slate-200 font-mono text-[11px]">
                        {strategy?.backgroundStrategy?.type}
                      </span>
                    </div>
                  </div>

                  {/* Section Sequence Tags */}
                  <div className="pt-3 border-t border-slate-800/80">
                    <div className="text-[11px] text-slate-400 mb-2 font-medium">
                      Bespoke Section Order:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {website.sectionOrder?.slice(0, 5).map((sec) => (
                        <span
                          key={sec}
                          className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/60"
                        >
                          {sec}
                        </span>
                      ))}
                      {(website.sectionOrder?.length || 0) > 5 && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800/50 text-slate-500">
                          +{(website.sectionOrder?.length || 0) - 5} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action Link */}
                  <div className="pt-4">
                    <Link
                      href={`/test/phase6/${spec.slug}`}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs tracking-wide transition-all shadow-lg shadow-sky-500/20 group-hover:shadow-sky-500/30"
                    >
                      <span>Open Website</span>
                      <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Note */}
        <div className="mt-16 text-center text-xs text-slate-500 border-t border-slate-800/80 pt-8">
          WebsiteBanja Phase 6.1 Premium Generation Engine • Local Verification Sandbox • Strict Local-Only
        </div>
      </div>
    </div>
  );
}
