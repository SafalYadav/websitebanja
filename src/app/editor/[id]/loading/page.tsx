"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

import { updateProject, getProject } from "@/lib/projects";
import { useBuilderStore } from "@/store/builderStore";
import { useGeneratedWebsiteStore, type ViewportMode } from "@/store/generatedWebsiteStore";
import { dashboardRoute, editorRoute, loginRoute } from "@/lib/editorRoutes";
import { supabase } from "@/lib/supabase";
import { AiWorkspaceError, readAiWorkspace, verifyAiWorkspace, writeAiWorkspace } from "@/lib/aiWorkspace";
import type { AiWorkspace, PlanningInput } from "@/types/aiWorkspace";
import type { WebsiteData } from "@/types/website";
import WebsiteRenderer from "@/components/editor/WebsiteRenderer";
import {
  Sparkles,
  Check,
  ArrowRight,
  AlertTriangle,
  Laptop,
  Tablet,
  Smartphone,
  RefreshCw,
  ShieldCheck,
  Zap,
  Globe,
  Star,
} from "lucide-react";
import ThemeToggle from "@/components/theme/ThemeToggle";
import Logo from "@/components/brand/Logo";
import { detectBackendRequirement } from "@/lib/backendDetection";

interface CustomerMilestone {
  title: string;
  desc: string;
  stepIndex: number;
}

const CUSTOMER_MILESTONES: CustomerMilestone[] = [
  {
    title: "Understanding your business",
    desc: "Analyzing category, value proposition & target audience",
    stepIndex: 0,
  },
  {
    title: "Planning website structure",
    desc: "Architecting section hierarchy, sitemap & navigation flow",
    stepIndex: 1,
  },
  {
    title: "Selecting visual & design direction",
    desc: "Curating color harmonies, typography scale & contrast",
    stepIndex: 2,
  },
  {
    title: "Building tailored sections & copy",
    desc: "Synthesizing bespoke copywriting, media blocks & actions",
    stepIndex: 3,
  },
  {
    title: "Reviewing quality & contrast",
    desc: "Validating responsive layouts, readability & accessibility",
    stepIndex: 4,
  },
  {
    title: "Finalizing studio workspace",
    desc: "Preparing visual canvas and interactive editing controls",
    stepIndex: 5,
  },
];

export default function LoadingPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const shouldReduceMotion = useReducedMotion();
  const hasStartedRef = useRef(false);

  const [isComplete, setIsComplete] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<"auth" | "network" | "general" | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [viewportMode, setViewportMode] = useState<ViewportMode>("desktop");
  const [generatedSiteData, setGeneratedSiteData] = useState<WebsiteData | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const storeProjectId = useBuilderStore((state) => state.projectId);
  const effectiveProjectId = params?.id || storeProjectId;

  const {
    businessName,
    category,
    description,
    targetAudience,
    style,
    primaryColor,
    secondaryColor,
    phone,
    email,
    website,
    instagram,
    facebook,
    address,
  } = useBuilderStore();

  const { setWebsiteForProject, setIsGenerating } = useGeneratedWebsiteStore();

  const executeGeneration = useCallback(async () => {
    if (!effectiveProjectId) {
      setErrorMessage("Project ID not found. Please create a new project from dashboard.");
      setErrorType("general");
      return;
    }

    try {
      setIsGenerating(true);
      setErrorMessage(null);
      setErrorType(null);
      setCurrentStep(0);

      useBuilderStore.getState().setProjectId(effectiveProjectId);

      // 1. Obtain and refresh Supabase auth token
      let token: string | undefined;
      const { data: sessionData } = await supabase.auth.getSession();
      let session = sessionData.session;
      if (session) {
        const isExpiringSoon = session.expires_at ? session.expires_at * 1000 < Date.now() + 120000 : false;
        if (isExpiringSoon) {
          const { data: refreshed } = await supabase.auth.refreshSession();
          if (refreshed?.session) session = refreshed.session;
        }
        token = session?.access_token;
      }

      if (!token) {
        setErrorType("auth");
        throw new Error("Authentication session expired or missing. Please sign in to generate and save your website.");
      }

      // Hydrate metadata from store or Supabase
      const curStore = useBuilderStore.getState();
      let curBusinessName = curStore.businessName || businessName;
      let curCategory = curStore.category || category;
      let curDesc = curStore.description || description;
      let curStyle = curStore.style || style;
      let curPColor = curStore.primaryColor || primaryColor;
      let curSColor = curStore.secondaryColor || secondaryColor;
      let curAudience = curStore.targetAudience || targetAudience;
      let curPhone = curStore.phone || phone;
      let curEmail = curStore.email || email;
      const curWebsite = curStore.website || website;
      const curInstagram = curStore.instagram || instagram;
      const curFacebook = curStore.facebook || facebook;
      const curAddress = curStore.address || address;

      if (!curBusinessName || !curCategory) {
        try {
          const { data: projData } = await getProject(effectiveProjectId);
          if (projData) {
            curBusinessName = projData.business_name || projData.name || curBusinessName || "My Business";
            curCategory = projData.category || curCategory || "Business";
            curDesc = projData.description || curDesc || `${curBusinessName} - ${curCategory}`;
            curStyle = projData.style || curStyle || "Modern";
            curPColor = projData.primary_color || curPColor || "#06b6d4";
            curSColor = projData.secondary_color || curSColor || "#3b82f6";
            curAudience = projData.target_audience || curAudience || "";
            curPhone = projData.phone || curPhone || "";
            curEmail = projData.email || curEmail || "";

            useBuilderStore.getState().setBusinessName(curBusinessName);
            useBuilderStore.getState().setCategory(curCategory);
            useBuilderStore.getState().setDescription(curDesc);
            useBuilderStore.getState().setStyle(curStyle);
            useBuilderStore.getState().setPrimaryColor(curPColor);
            useBuilderStore.getState().setSecondaryColor(curSColor);
          }
        } catch {
          // Proceed with fallback
        }
      }

      let existingWorkspace: AiWorkspace | undefined;
      try {
        existingWorkspace = await readAiWorkspace(effectiveProjectId);
      } catch {
        // Initial generation
      }

      // Milestone 1: Planning website structure
      setCurrentStep(1);

      const planningInput: PlanningInput = {
        projectId: effectiveProjectId,
        businessName: curBusinessName || "My Business",
        category: curCategory || "Business",
        description: curDesc || `${curBusinessName || "My Business"} - ${curCategory || "Website"}`,
        targetAudience: curAudience,
        style: curStyle || "Modern",
        primaryColor: curPColor || "#06b6d4",
        secondaryColor: curSColor || "#3b82f6",
        phone: curPhone,
        email: curEmail,
        website: curWebsite,
        instagram: curInstagram,
        facebook: curFacebook,
        address: curAddress,
      };

      // Helper with client-side retry for transient network / 503 issues
      const executeWithRetry = async (url: string, payload: unknown, maxAttempts = 3): Promise<Response> => {
        let lastRes: Response | null = null;
        let lastErr: unknown = null;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          try {
            const res = await fetch(url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(payload),
              signal: AbortSignal.timeout(180000),
            });

            lastRes = res;

            if (res.status === 401) {
              const { data: refData } = await supabase.auth.refreshSession();
              if (refData?.session?.access_token) {
                token = refData.session.access_token;
                continue;
              }
            }

            if (res.ok) return res;

            if (res.status === 503 || res.status === 502 || res.status === 504) {
              if (attempt < maxAttempts) {
                await new Promise((r) => setTimeout(r, 1200 * attempt));
                continue;
              }
            }

            return res;
          } catch (err) {
            lastErr = err;
            if (attempt < maxAttempts) {
              await new Promise((r) => setTimeout(r, 1200 * attempt));
            }
          }
        }

        if (lastRes) return lastRes;
        throw lastErr || new Error(`Failed to connect to ${url}`);
      };

      // Execute AI Plan
      const planRes = await executeWithRetry("/api/plan", { ...planningInput, existingWorkspace });
      let planningResult: {
        success?: boolean;
        data?: AiWorkspace;
        message?: string;
      } = {};
      try {
        planningResult = (await planRes.json()) as {
          success?: boolean;
          data?: AiWorkspace;
          message?: string;
        };
      } catch {
        // JSON parsing error fallback
      }

      if (!planRes.ok || !planningResult.success || !planningResult.data) {
        if (planRes.status === 401) {
          setErrorType("auth");
          throw new Error("Your session expired. Please sign in to proceed.");
        }
        if (planRes.status === 503) {
          setErrorType("network");
          throw new Error("The synthesis engine is temporarily reconnecting. Please retry in a moment.");
        }
        throw new Error(planningResult.message || "Planning website structure failed.");
      }

      await writeAiWorkspace(effectiveProjectId, planningResult.data, existingWorkspace);
      const workspace = await verifyAiWorkspace(effectiveProjectId);

      // Milestone 2 & 3: Visual styling & section generation
      setCurrentStep(2);
      await new Promise((r) => setTimeout(r, 400));
      setCurrentStep(3);

      const genRes = await executeWithRetry("/api/generate", {
        businessName: curBusinessName,
        category: curCategory,
        description: curDesc,
        targetAudience: curAudience,
        style: curStyle,
        primaryColor: curPColor,
        secondaryColor: curSColor,
        phone: curPhone,
        email: curEmail,
        website: curWebsite,
        instagram: curInstagram,
        facebook: curFacebook,
        address: curAddress,
        workspace,
      });

      let genData: {
        success?: boolean;
        data?: WebsiteData;
        message?: string;
      } = {};
      try {
        genData = (await genRes.json()) as {
          success?: boolean;
          data?: WebsiteData;
          message?: string;
        };
      } catch {
        // JSON parsing error fallback
      }

      if (!genRes.ok || !genData.success || !genData.data) {
        if (genRes.status === 401) {
          setErrorType("auth");
          throw new Error("Your session expired. Please sign in to proceed.");
        }
        if (genRes.status === 503) {
          setErrorType("network");
          throw new Error("The synthesis engine is temporarily reconnecting. Please retry in a moment.");
        }
        throw new Error(genData.message || `Website section generation failed (${genRes.status}).`);
      }

      // Immediately display real generated data in the live preview canvas!
      setGeneratedSiteData(genData.data);
      setWebsiteForProject(effectiveProjectId, genData.data);

      // Milestone 4: Reviewing quality & contrast
      setCurrentStep(4);
      await new Promise((r) => setTimeout(r, 450));

      // Milestone 5: Finalizing studio workspace
      setCurrentStep(5);

      const backendAnalysis = detectBackendRequirement(curCategory);
      const backendRequirement = backendAnalysis.requiresBackend ? backendAnalysis.requirementType : "static";

      const { error } = await updateProject(effectiveProjectId, {
        name: curBusinessName.trim() || undefined,
        business_name: curBusinessName.trim() || undefined,
        category: curCategory || undefined,
        backend_requirement: backendRequirement,
        backend_config: {
          requiresBackend: backendAnalysis.requiresBackend,
          requirementType: backendRequirement,
          title: backendAnalysis.title,
          capabilities: backendAnalysis.capabilities,
        },
        json_data: genData.data,
      });

      if (error) {
        throw new Error(error.message);
      }

      setIsComplete(true);
      setTimeout(() => {
        router.push(editorRoute(effectiveProjectId, "workspace"));
      }, 1600);
    } catch (err) {
      const msg =
        err instanceof AiWorkspaceError
          ? `${err.userMessage}: ${err.diagnostic}`
          : err instanceof Error
          ? err.message
          : "Website generation encountered an unexpected issue.";
      setErrorMessage(msg);
      if (msg.toLowerCase().includes("session") || msg.toLowerCase().includes("unauthorized") || msg.toLowerCase().includes("sign in")) {
        setErrorType("auth");
      } else if (msg.toLowerCase().includes("reconnecting") || msg.toLowerCase().includes("503") || msg.toLowerCase().includes("fetch failed")) {
        setErrorType("network");
      } else {
        setErrorType("general");
      }
    } finally {
      setIsGenerating(false);
      setIsRetrying(false);
    }
  }, [
    effectiveProjectId,
    businessName,
    category,
    description,
    targetAudience,
    style,
    primaryColor,
    secondaryColor,
    phone,
    email,
    website,
    instagram,
    facebook,
    address,
    setWebsiteForProject,
    setIsGenerating,
    router,
  ]);

  useEffect(() => {
    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      void executeGeneration();
    }
  }, [executeGeneration]);

  const handleRetry = () => {
    setIsRetrying(true);
    hasStartedRef.current = false;
    void executeGeneration();
  };

  const progressPercentage = isComplete
    ? 100
    : Math.min(95, Math.round(((currentStep + 1) / CUSTOMER_MILESTONES.length) * 100));

  const resolvedBusinessName = businessName || "Your Brand";
  const resolvedCategory = category || "Business Services";
  const previewSlug = resolvedBusinessName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "preview";

  return (
    <main className="min-h-screen bg-[#07090e] text-zinc-100 flex flex-col antialiased selection:bg-cyan-500/30">
      {/* Top Header */}
      <header className="h-16 border-b border-white/[0.08] bg-[#0a0d14]/90 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition">
            <Logo imageSize={30} showText={false} />
            <span className="font-bold text-base tracking-tight text-white hidden sm:inline">WebsiteBanja</span>
          </Link>
          <span className="text-zinc-600 dark:text-zinc-500 hidden sm:inline">/</span>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-semibold text-zinc-200 truncate max-w-[140px] sm:max-w-[240px]">
              {resolvedBusinessName}
            </span>
            <span className="inline-flex items-center rounded-full bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 text-[10px] font-semibold text-cyan-400">
              {resolvedCategory}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Real-time Status Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-xs">
            <span className="relative flex h-2 w-2">
              {isComplete ? (
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
              ) : errorMessage ? (
                <span className="h-2 w-2 rounded-full bg-amber-400" />
              ) : (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
                </>
              )}
            </span>
            <span className="text-[11px] font-medium text-zinc-300">
              {isComplete ? "Generation Complete" : errorMessage ? "Generation Paused" : "Synthesizing Live"}
            </span>
          </div>

          <ThemeToggle />
        </div>
      </header>

      {/* Main Workspace Body: 2 Columns */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* LEFT / MAIN: Live Website Preview Canvas */}
        <section className="flex-1 flex flex-col bg-[#05070b] border-b lg:border-b-0 lg:border-r border-white/[0.08] overflow-hidden">
          {/* Canvas Browser Toolbar */}
          <div className="h-12 border-b border-white/[0.08] bg-[#0a0d14]/70 px-4 flex items-center justify-between gap-3 shrink-0">
            {/* macOS Window Controls */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="h-3 w-3 rounded-full bg-rose-500/80 inline-block" />
              <span className="h-3 w-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="h-3 w-3 rounded-full bg-emerald-500/80 inline-block" />
            </div>

            {/* Address Bar */}
            <div className="flex-1 max-w-md mx-2 flex items-center justify-center">
              <div className="w-full flex items-center justify-center gap-2 rounded-lg bg-black/40 border border-white/[0.08] px-3 py-1 text-[11px] text-zinc-400 font-mono truncate">
                <Globe className="h-3 w-3 text-cyan-400 shrink-0" />
                <span className="truncate">https://{previewSlug}.websitebanja.com</span>
              </div>
            </div>

            {/* Viewport Device Switcher */}
            <div className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-black/30 p-0.5 shrink-0">
              <button
                type="button"
                onClick={() => setViewportMode("desktop")}
                title="Desktop View (Full)"
                className={`p-1.5 rounded-md transition ${
                  viewportMode === "desktop"
                    ? "bg-cyan-500/20 text-cyan-400 shadow-2xs"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <Laptop className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewportMode("tablet")}
                title="Tablet View (768px)"
                className={`p-1.5 rounded-md transition ${
                  viewportMode === "tablet"
                    ? "bg-cyan-500/20 text-cyan-400 shadow-2xs"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <Tablet className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewportMode("mobile")}
                title="Mobile View (375px)"
                className={`p-1.5 rounded-md transition ${
                  viewportMode === "mobile"
                    ? "bg-cyan-500/20 text-cyan-400 shadow-2xs"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <Smartphone className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Canvas Scrollable Viewport Area */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-6 flex justify-center items-start bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px]">
            <motion.div
              layout
              transition={{ duration: 0.3 }}
              className={`w-full transition-all duration-300 rounded-2xl border border-white/[0.1] bg-white text-zinc-900 shadow-2xl overflow-hidden relative min-h-[560px] ${
                viewportMode === "mobile"
                  ? "max-w-[375px]"
                  : viewportMode === "tablet"
                  ? "max-w-[768px]"
                  : "max-w-[1100px]"
              }`}
            >
              {/* Dynamic Content: Generated Site vs Pre-Render Skeleton */}
              <AnimatePresence mode="wait">
                {generatedSiteData ? (
                  <motion.div
                    key="live-generated-site"
                    initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    className="w-full pointer-events-none select-none"
                  >
                    <WebsiteRenderer
                      data={generatedSiteData}
                      businessName={resolvedBusinessName}
                      category={resolvedCategory}
                      pColor={primaryColor || "#06b6d4"}
                      sColor={secondaryColor || "#3b82f6"}
                      brandStyle={style || "Modern"}
                      isPublic={false}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="live-skeleton-preview"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full flex flex-col bg-slate-950 text-white min-h-[640px] select-none"
                  >
                    {/* Live Preview Navbar */}
                    <nav className="h-16 border-b border-white/10 px-6 flex items-center justify-between bg-slate-900/60 backdrop-blur-md sticky top-0 z-20">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="h-8 w-8 rounded-xl flex items-center justify-center font-black text-white shadow-md text-sm"
                          style={{ backgroundColor: primaryColor || "#06b6d4" }}
                        >
                          {resolvedBusinessName.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-sm tracking-tight">{resolvedBusinessName}</span>
                      </div>
                      <div className="hidden md:flex items-center gap-6 text-xs text-zinc-400 font-medium">
                        <span className="text-white">Home</span>
                        <span>Services</span>
                        <span>About</span>
                        <span>Contact</span>
                      </div>
                      <button
                        type="button"
                        className="rounded-xl px-4 py-2 text-xs font-bold text-white shadow-md transition"
                        style={{ backgroundColor: primaryColor || "#06b6d4" }}
                      >
                        Get in Touch
                      </button>
                    </nav>

                    {/* Live Preview Hero Section */}
                    <section className="px-6 py-12 sm:py-16 flex flex-col items-center text-center relative overflow-hidden bg-gradient-to-b from-slate-900/80 to-slate-950">
                      <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1 text-xs font-semibold text-cyan-300 mb-6">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>✦ Bespoke {resolvedCategory} Architecture</span>
                      </div>

                      <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight max-w-2xl leading-tight">
                        Elevate Your Presence with{" "}
                        <span
                          className="bg-clip-text text-transparent bg-gradient-to-r"
                          style={{
                            backgroundImage: `linear-gradient(to right, ${primaryColor || "#06b6d4"}, ${secondaryColor || "#60a5fa"})`,
                          }}
                        >
                          {resolvedBusinessName}
                        </span>
                      </h1>

                      <p className="mt-4 text-xs sm:text-sm md:text-base text-zinc-400 max-w-xl leading-relaxed">
                        {description ||
                          `Providing exceptional, high-converting digital solutions crafted specifically for ${resolvedBusinessName}. Designed for performance, reliability, and growth.`}
                      </p>

                      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                        <div
                          className="rounded-xl px-6 py-3 text-xs sm:text-sm font-bold text-white shadow-lg flex items-center gap-2"
                          style={{ backgroundColor: primaryColor || "#06b6d4" }}
                        >
                          <span>Explore Offerings</span>
                          <ArrowRight className="h-4 w-4" />
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-xs sm:text-sm font-semibold text-zinc-300">
                          <span>Learn More</span>
                        </div>
                      </div>

                      {/* Trust Indicators */}
                      <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-xl">
                        <div className="flex items-center justify-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-2.5 text-[11px] text-zinc-300">
                          <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                          <span>4.9/5 Client Rating</span>
                        </div>
                        <div className="flex items-center justify-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-2.5 text-[11px] text-zinc-300">
                          <Zap className="h-3.5 w-3.5 text-cyan-400" />
                          <span>Ultra-Fast Experience</span>
                        </div>
                        <div className="flex items-center justify-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-2.5 text-[11px] text-zinc-300">
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                          <span>Enterprise Quality</span>
                        </div>
                      </div>
                    </section>

                    {/* Live Preview Feature Cards with Shimmer */}
                    <section className="px-6 py-8 border-t border-white/5 bg-slate-950">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                          { title: "Premium Strategy", desc: "Curated specifically for your market niche." },
                          { title: "Seamless Operations", desc: "Built with modern responsive standards." },
                          { title: "Customer Delight", desc: "Engineered to convert visitors into loyal clients." },
                        ].map((card, idx) => (
                          <div
                            key={idx}
                            className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 relative overflow-hidden group"
                          >
                            <div className="h-8 w-8 rounded-xl bg-white/5 flex items-center justify-center mb-3">
                              <Sparkles className="h-4 w-4 text-cyan-400" />
                            </div>
                            <h3 className="text-sm font-bold text-white">{card.title}</h3>
                            <p className="mt-1 text-xs text-zinc-400">{card.desc}</p>
                            {/* Animated Shimmer Bar */}
                            <div className="mt-4 h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                              <motion.div
                                className="h-full bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent"
                                animate={{ x: ["-100%", "100%"] }}
                                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* Synthesis Canvas Notification Overlay */}
                    <div className="p-4 border-t border-white/10 bg-slate-900/80 flex items-center justify-center gap-2 text-xs text-zinc-400">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
                      </span>
                      <span>Synthesizing customized sections & components...</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </section>

        {/* RIGHT: Modern Customer Progress Sidebar */}
        <aside className="w-full lg:w-[420px] bg-[#0a0d14] p-5 sm:p-7 flex flex-col justify-between overflow-y-auto shrink-0 border-t lg:border-t-0">
          <div className="space-y-6">
            {/* Header Block */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-400 mb-3">
                <Sparkles className="h-3.5 w-3.5" />
                <span>AI Website Synthesis</span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white">
                {isComplete ? "Your Website is Ready!" : "Crafting Your Website"}
              </h2>
              <p className="mt-1.5 text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Building a complete, production-ready website tailored to{" "}
                <strong className="text-zinc-200">{resolvedBusinessName}</strong>.
              </p>
            </div>

            {/* Overall Progress Metric */}
            <div className="space-y-2 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-300">
                  {isComplete ? "100% Completed" : `Step ${currentStep + 1} of ${CUSTOMER_MILESTONES.length}`}
                </span>
                <span className="font-mono font-bold text-cyan-400">{progressPercentage}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-white/[0.06] overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-500"
                  initial={{ width: "10%" }}
                  animate={{ width: `${progressPercentage}%` }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              </div>
              <p className="text-[11px] text-zinc-500 text-right">
                {isComplete ? "Ready to launch" : "~10-15s estimated remaining"}
              </p>
            </div>

            {/* Error Card Inside Panel (Keeps Canvas Visible!) */}
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-rose-500/30 bg-rose-950/30 p-4 space-y-3"
              >
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-rose-200">
                      {errorType === "auth" ? "Sign In Required" : "Generation Temporarily Paused"}
                    </h3>
                    <p className="text-[11px] text-rose-300/80 mt-0.5 leading-relaxed">
                      {errorType === "auth"
                        ? "Your session needs to be authenticated to save this generated website."
                        : errorMessage || "The connection or authentication service took too long. Your configuration is preserved."}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  {errorType === "auth" ? (
                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `${loginRoute()}?redirectTo=${encodeURIComponent(`/editor/${effectiveProjectId}/loading`)}`
                        )
                      }
                      className="flex-1 rounded-xl bg-cyan-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-cyan-400 transition"
                    >
                      Sign In to Save
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRetry}
                      disabled={isRetrying}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-cyan-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-cyan-400 transition disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isRetrying ? "animate-spin" : ""}`} />
                      <span>{isRetrying ? "Retrying..." : "Retry Generation"}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => router.push(dashboardRoute())}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-white/10 transition"
                  >
                    Dashboard
                  </button>
                </div>
              </motion.div>
            )}

            {/* 6 Customer-Facing Milestones */}
            <div className="space-y-2.5">
              {CUSTOMER_MILESTONES.map((milestone) => {
                const isDone = isComplete || currentStep > milestone.stepIndex;
                const isActive = !isComplete && currentStep === milestone.stepIndex && !errorMessage;

                return (
                  <div
                    key={milestone.stepIndex}
                    className={`flex items-start gap-3.5 p-3 rounded-xl border transition-all duration-200 ${
                      isDone
                        ? "border-emerald-500/20 bg-emerald-500/[0.04] text-zinc-300"
                        : isActive
                        ? "border-cyan-500/40 bg-cyan-500/[0.08] text-white shadow-xs"
                        : "border-white/[0.05] bg-white/[0.01] text-zinc-500"
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isDone ? (
                        <div className="h-5 w-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                          <Check className="h-3 w-3" />
                        </div>
                      ) : isActive ? (
                        <div className="h-5 w-5 rounded-full bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center">
                          <span className="inline-block h-2.5 w-2.5 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
                        </div>
                      ) : (
                        <div className="h-5 w-5 rounded-full border border-white/10 flex items-center justify-center text-zinc-600 text-[10px]">
                          {milestone.stepIndex + 1}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-semibold ${isActive ? "text-cyan-300" : ""}`}>
                          {milestone.title}
                        </span>
                        {isActive && (
                          <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">
                            In Progress
                          </span>
                        )}
                        {isDone && (
                          <span className="text-[10px] font-semibold text-emerald-400">
                            Completed
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">{milestone.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Action Footer */}
          <div className="pt-6 border-t border-white/[0.08] mt-6">
            {isComplete ? (
              <button
                type="button"
                onClick={() => router.push(editorRoute(effectiveProjectId, "workspace"))}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/20 hover:opacity-95 transition active:scale-[0.98]"
              >
                <span>Open in Studio Canvas</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>Auto-saving project details</span>
                <Link
                  href={dashboardRoute()}
                  className="hover:text-zinc-300 underline underline-offset-2 transition"
                >
                  Return to Dashboard
                </Link>
              </div>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
