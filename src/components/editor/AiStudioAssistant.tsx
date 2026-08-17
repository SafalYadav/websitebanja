"use client";

import React, { useState } from "react";
import { useGeneratedWebsiteStore } from "@/store/generatedWebsiteStore";
import { useBuilderStore } from "@/store/builderStore";
import { executeStudioActions, type StudioAiAction } from "@/lib/studioAiActions";
import {
  Sparkles,
  Send,
  RotateCcw,
  CheckCircle2,
  HelpCircle,
  Lightbulb,
} from "lucide-react";
import { toast } from "@/store/toastStore";
import { supabase } from "@/lib/supabase";

const SUGGESTED_PROMPTS = [
  "Make the hero headline more premium & punchy",
  "Add 3 bestselling products to our catalog",
  "Change the hero button to 'Book on WhatsApp'",
  "Add an FAQ section for common customer questions",
  "Improve the about section story for high trust",
];

export default function AiStudioAssistant() {
  const website = useGeneratedWebsiteStore((state) => state.website);
  const setWebsite = useGeneratedWebsiteStore((state) => state.setWebsite);
  const undo = useGeneratedWebsiteStore((state) => state.undo);
  const selectedElement = useGeneratedWebsiteStore((state) => state.selectedElement);
  const activePageId = useGeneratedWebsiteStore((state) => state.activePageId);

  const businessName = useBuilderStore((state) => state.businessName);
  const category = useBuilderStore((state) => state.category);

  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [historyLogs, setHistoryLogs] = useState<
    { prompt: string; summary: string; actions: StudioAiAction[]; timestamp: string }[]
  >([]);

  const handleExecutePrompt = async (customPrompt?: string) => {
    const textToRun = (customPrompt || prompt).trim();
    if (!textToRun || !website) return;

    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch("/api/studio/ai-action", {
        method: "POST",
        headers,
        body: JSON.stringify({
          prompt: textToRun,
          currentWebsite: website,
          selectedElement,
          businessName,
          category,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.details || data.error || "Failed to execute AI modification.");
      }

      // Intercept catalog actions to write directly to DB
      const projectId = useBuilderStore.getState().projectId;
      if (projectId) {
        const { createCatalogItem, updateCatalogItem } = await import("@/lib/catalog");
        for (const act of (data.actions || []) as StudioAiAction[]) {
          if (act.action === "add_product") {
            const product = act.payload.product as Record<string, unknown> | undefined;
            if (product && typeof product.name === "string") {
              await createCatalogItem({
                project_id: projectId,
                name: product.name,
                item_type: "product",
                price: Number(product.price) || 0,
                description: typeof product.description === "string" ? product.description : "",
                category: typeof product.category === "string" ? product.category : "General",
                status: "active",
                images: typeof product.image === "string" ? [product.image] : [],
              });
            }
          } else if (act.action === "update_product") {
            const productId = String(act.payload.productId);
            const updates = act.payload.updates as Record<string, unknown> | undefined;
            if (productId && updates) {
              await updateCatalogItem(productId, updates);
            }
          }
        }
      }

      const { updatedWebsite, appliedSummaries } = executeStudioActions(
        website,
        data.actions || [],
        activePageId || undefined
      );

      setWebsite(updatedWebsite);

      const newLog = {
        prompt: textToRun,
        summary: data.summary || appliedSummaries.join(", ") || "Website updated.",
        actions: data.actions || [],
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setHistoryLogs((prev) => [newLog, ...prev]);
      setPrompt("");
      toast.success("AI Modification Applied", newLog.summary);
    } catch (err) {
      toast.error(
        "AI Action Error",
        err instanceof Error ? err.message : "Unable to process AI instruction."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-violet-600 text-white shadow-md shadow-violet-500/20">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
              Studio AI Copilot
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Describe edits in natural language. Powered by structured actions.
            </p>
          </div>
        </div>
      </div>

      {/* Selected Element Context Notice */}
      {selectedElement && (
        <div className="flex items-center gap-2 rounded-2xl border border-violet-500/30 bg-violet-50/50 p-2.5 dark:bg-violet-950/20 text-xs">
          <Sparkles className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400 shrink-0" />
          <span className="text-zinc-700 dark:text-zinc-300 truncate">
            Active Target: <strong className="text-violet-600 dark:text-violet-400">{selectedElement.label || selectedElement.elementType}</strong> ({selectedElement.elementPath})
          </span>
        </div>
      )}

      {/* Quick Prompt Suggestions */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
          <Lightbulb className="h-3 w-3 text-amber-500" />
          Suggested Actions
        </span>
        <div className="flex flex-col gap-1.5">
          {SUGGESTED_PROMPTS.slice(0, 3).map((sug) => (
            <button
              key={sug}
              type="button"
              disabled={isLoading}
              onClick={() => handleExecutePrompt(sug)}
              className="text-left rounded-xl border border-zinc-200 bg-white/70 px-3 py-2 text-xs font-medium text-zinc-700 transition hover:border-violet-500 hover:bg-violet-50/50 dark:border-white/10 dark:bg-zinc-900/60 dark:text-zinc-300 dark:hover:bg-zinc-800 disabled:opacity-50"
            >
              &ldquo;{sug}&rdquo;
            </button>
          ))}
        </div>
      </div>

      {/* Input Prompt Box */}
      <div className="relative">
        <textarea
          rows={3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              void handleExecutePrompt();
            }
          }}
          disabled={isLoading}
          placeholder="e.g. Make the hero headline bolder and add 2 luxury features..."
          className="w-full rounded-2xl border border-zinc-200 bg-white p-3.5 pb-10 text-xs text-zinc-900 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
        />

        <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5">
          <span className="text-[10px] text-zinc-400 hidden sm:inline">⌘ + Enter</span>
          <button
            type="button"
            onClick={() => handleExecutePrompt()}
            disabled={!prompt.trim() || isLoading}
            className="flex h-8 items-center gap-1.5 rounded-xl bg-violet-600 px-3 text-xs font-bold text-white shadow-md shadow-violet-500/25 hover:bg-violet-700 disabled:opacity-40 transition"
          >
            {isLoading ? (
              <span className="flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 animate-spin" />
                Thinking...
              </span>
            ) : (
              <>
                <Send className="h-3 w-3" />
                Apply
              </>
            )}
          </button>
        </div>
      </div>

      {/* Action Execution Logs */}
      <div className="flex-1 space-y-2 overflow-y-auto pr-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
            Session History
          </span>
          {historyLogs.length > 0 && (
            <button
              type="button"
              onClick={undo}
              className="flex items-center gap-1 text-xs font-bold text-violet-600 hover:text-violet-700 dark:text-violet-400"
            >
              <RotateCcw className="h-3 w-3" />
              Undo Last
            </button>
          )}
        </div>

        {historyLogs.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200/60 bg-zinc-50/50 p-4 text-center dark:border-white/5 dark:bg-zinc-900/30">
            <HelpCircle className="h-5 w-5 mx-auto text-zinc-400 mb-1" />
            <p className="text-xs text-zinc-500">
              Type any command above to instruct AI to refine text, images, or sections.
            </p>
          </div>
        ) : (
          historyLogs.map((log, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-xs dark:border-white/10 dark:bg-zinc-900"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-white">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span className="truncate">&ldquo;{log.prompt}&rdquo;</span>
                </div>
                <span className="text-[10px] text-zinc-400 shrink-0">{log.timestamp}</span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 pl-5">
                {log.summary}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
