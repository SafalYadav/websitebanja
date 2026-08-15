"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";

import { updateProject } from "@/lib/projects";
import { useBuilderStore } from "@/store/builderStore";
import { useGeneratedWebsiteStore } from "@/store/generatedWebsiteStore";
import { dashboardRoute, editorRoute } from "@/lib/editorRoutes";
import { supabase } from "@/lib/supabase";
import { AiWorkspaceError, readAiWorkspace, verifyAiWorkspace, writeAiWorkspace } from "@/lib/aiWorkspace";
import type { AiWorkspace, PlanningInput } from "@/types/aiWorkspace";
import SnakeGame from "@/components/game/SnakeGame";
import { Sparkles, Check, ArrowRight, AlertTriangle } from "lucide-react";
import ThemeToggle from "@/components/theme/ThemeToggle";
import Logo from "@/components/brand/Logo";

export default function LoadingPage() {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const hasStartedRef = useRef(false);

  const [isComplete, setIsComplete] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [showGame, setShowGame] = useState(true);

  const projectId = useBuilderStore((state) => state.projectId);

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

  const { setWebsite, setIsGenerating } = useGeneratedWebsiteStore();

  useEffect(() => {
    async function generateWebsite() {
      if (!projectId) {
        setErrorMessage("Project not found");
        return;
      }
      if (hasStartedRef.current) return;

      hasStartedRef.current = true;

      try {
        setIsGenerating(true);
        setCurrentStep(0);

        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) throw new Error("Unauthorized: No session token found");

        let existingWorkspace: AiWorkspace | undefined;
        try {
          existingWorkspace = await readAiWorkspace(projectId);
        } catch {
          // The first generation has no workspace to load.
        }

        setCurrentStep(1); // Planning

        const planningInput: PlanningInput = {
          projectId, businessName, category, description, targetAudience, style,
          primaryColor, secondaryColor, phone, email, website, instagram, facebook, address,
        };
        const planningResponse = await fetch("/api/plan", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ ...planningInput, existingWorkspace }),
        });
        const planningResult = await planningResponse.json() as { success?: boolean; data?: AiWorkspace; message?: string };
        if (!planningResponse.ok || !planningResult.success || !planningResult.data) {
          throw new Error(planningResult.message ?? "AI planning failed");
        }

        await writeAiWorkspace(projectId, planningResult.data, existingWorkspace);
        const workspace = await verifyAiWorkspace(projectId);

        setCurrentStep(2); // Generating Sections

        const response = await fetch("/api/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
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
            workspace,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || "Generation failed");
        }

        setCurrentStep(3); // Finalizing
        setWebsite(data.data);

        const { error } = await updateProject(projectId, {
          name: businessName.trim() || undefined,
          business_name: businessName.trim() || undefined,
          json_data: data.data,
        });

        if (error) {
          throw new Error(error.message);
        }

        setIsComplete(true);
      } catch (err) {
        setErrorMessage(
          err instanceof AiWorkspaceError
            ? `${err.userMessage}\n${err.diagnostic}`
            : err instanceof Error
            ? `❌ Website generation failed\n${err.message}`
            : "❌ Website generation failed\nUnknown error"
        );
      } finally {
        setIsGenerating(false);
      }
    }

    void generateWebsite();
  }, [
    projectId,
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
    setWebsite,
    setIsGenerating,
  ]);

  if (errorMessage) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-900 dark:bg-[#09090B] dark:text-zinc-100 px-4">
        <motion.div
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-xl rounded-3xl border border-red-300 bg-white p-8 text-center shadow-2xl dark:border-red-500/20 dark:bg-zinc-950"
        >
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400 text-2xl mb-4">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Generation Stopped</h1>
          <p className="mt-4 whitespace-pre-line text-xs font-mono text-red-700 bg-red-50 border border-red-200 p-4 rounded-xl text-left dark:bg-red-950/30 dark:border-red-900/40 dark:text-red-300">
            {errorMessage}
          </p>
          <div className="mt-6 flex justify-center gap-4">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-xl bg-zinc-900 px-6 py-3 text-sm font-bold text-white hover:bg-zinc-800 transition active:scale-95 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
            >
              Try Again
            </button>
            <button
              type="button"
              onClick={() => router.push(dashboardRoute())}
              className="rounded-xl border border-zinc-200 bg-zinc-100 px-6 py-3 text-sm font-semibold text-zinc-800 hover:bg-zinc-200 transition active:scale-95 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800"
            >
              Back to Dashboard
            </button>
          </div>
        </motion.div>
      </main>
    );
  }

  if (isComplete) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-900 dark:bg-[#09090B] dark:text-zinc-100 px-4">
        <motion.div
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-xl rounded-3xl border border-zinc-200 bg-white p-10 text-center shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/80"
        >
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 text-3xl mb-4">
            <Sparkles className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Website Generated!</h1>
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Your website has been architected, styled, and loaded into the visual studio canvas.
          </p>
          <button
            type="button"
            onClick={() => router.push(editorRoute(projectId, "workspace"))}
            className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-violet-600 to-indigo-600 px-8 py-4 text-sm font-bold text-white shadow-xl shadow-violet-600/30 hover:opacity-95 transition active:scale-95"
          >
            <span>Open Studio Canvas</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </motion.div>
      </main>
    );
  }

  const steps = [
    { title: "✨ Understanding your business", done: currentStep > 0, active: currentStep === 0 },
    { title: "🎨 Creating your visual direction & theme", done: currentStep > 1, active: currentStep === 1 },
    { title: "🧱 Building website sections & copywriting", done: currentStep > 2, active: currentStep === 2 },
    { title: "🖼️ Selecting relevant curated imagery", done: currentStep > 2, active: currentStep === 2 },
    { title: "⚡ Preparing your website & studio canvas", done: isComplete, active: currentStep === 3 },
  ];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#09090B] dark:text-zinc-100 py-12 px-4 flex flex-col items-center justify-center relative transition-colors duration-200">
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left Column: Progress & Status */}
        <motion.div
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          <div>
            <Link href="/" className="inline-block mb-3">
              <Logo imageSize={40} textClassName="text-xl" subtitleClassName="text-[10px]" />
            </Link>
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white mt-1">
              Building your website...
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400 text-xs sm:text-sm mt-2 leading-relaxed">
              Synthesizing bespoke copywriting, color harmonies, and responsive sections for{" "}
              <strong className="text-zinc-900 dark:text-white">{businessName || "your business"}</strong>.
            </p>
          </div>

          {/* Progress Bar */}
          <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-white/10">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-blue-600 via-violet-600 to-indigo-600"
              initial={{ width: "15%" }}
              animate={{
                width: currentStep === 0 ? "25%" : currentStep === 1 ? "50%" : currentStep === 2 ? "80%" : "100%",
              }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            />
          </div>

          {/* Progress Step List */}
          <div className="space-y-3 pt-1">
            {steps.map((s, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-3 p-3.5 rounded-2xl border text-xs sm:text-sm transition-all duration-200 ${
                  s.done
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-950/20 dark:text-emerald-300"
                    : s.active
                    ? "border-violet-300 bg-violet-50 text-violet-900 font-semibold shadow-xs dark:border-violet-500/50 dark:bg-violet-950/30 dark:text-white"
                    : "border-zinc-200 bg-white text-zinc-400 dark:border-white/5 dark:bg-zinc-900/30 dark:text-zinc-500"
                }`}
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold shrink-0">
                  {s.done ? <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> : s.active ? "●" : "○"}
                </div>
                <span>{s.title}</span>
                {s.active && (
                  <span className="ml-auto inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-violet-600 dark:border-violet-400 border-t-transparent" />
                )}
              </div>
            ))}
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowGame((prev) => !prev)}
              className="text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white underline transition"
            >
              {showGame ? "Hide Retro Mini-Game" : "Show Retro Mini-Game 🎮"}
            </button>
          </div>
        </motion.div>

        {/* Right Column: Retro Mini-Game */}
        <motion.div
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center"
        >
          {showGame ? (
            <div className="w-full">
              <div className="text-center mb-3">
                <p className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                  Optional Retro Game
                </p>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Play while the AI compiles your live website.
                </p>
              </div>
              <SnakeGame />
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-zinc-300 bg-white p-12 text-center w-full max-w-sm dark:border-white/10 dark:bg-zinc-900/30">
              <div className="text-4xl mb-3">⚡</div>
              <p className="text-sm text-zinc-800 dark:text-zinc-200 font-bold">Generation in Progress</p>
              <p className="text-xs text-zinc-500 mt-1">
                Your complete website is compiling in the background.
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </main>
  );
}
