"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Sparkles, Zap, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { StudioQuotaStatus } from "@/types/plans";

interface StudioQuotaBadgeProps {
  onOpenUpgradeModal: () => void;
  overrideQuota?: StudioQuotaStatus | null;
  refreshTrigger?: number;
}

export default function StudioQuotaBadge({
  onOpenUpgradeModal,
  overrideQuota,
  refreshTrigger = 0,
}: StudioQuotaBadgeProps) {
  const [quota, setQuota] = useState<StudioQuotaStatus | null>(overrideQuota || null);
  const [loading, setLoading] = useState(!overrideQuota);

  const fetchQuota = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch("/api/studio/quota", { headers });
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        setQuota(json.data);
      }
    } catch {
      // Ignore network errors on background check
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!overrideQuota) {
      void fetchQuota();
    }
  }, [overrideQuota, fetchQuota, refreshTrigger]);

  const activeQuota = overrideQuota ?? quota;

  if ((loading && !overrideQuota) || !activeQuota) {
    return null;
  }

  // Pro Plan: "Unlimited Studio Changes"
  if (activeQuota.isPro) {
    return (
      <div
        className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/25 px-2.5 py-1 text-[11px] font-semibold text-cyan-700 dark:text-cyan-300 select-none shadow-2xs"
        title="Pro Plan: Unlimited Studio changes active"
      >
        <Sparkles className="h-3 w-3 text-cyan-500 fill-current" />
        <span>Unlimited Studio Changes</span>
      </div>
    );
  }

  // Free Plan: Show remaining changes or blocked badge
  const remaining = activeQuota.remainingChanges;
  const isLimitReached = activeQuota.isBlocked || remaining <= 0;

  if (isLimitReached) {
    return (
      <button
        type="button"
        onClick={onOpenUpgradeModal}
        className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 border border-rose-500/30 px-2.5 py-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition cursor-pointer select-none"
        title="You've reached your Free Plan limit. Click to upgrade to Pro."
      >
        <AlertCircle className="h-3 w-3 text-rose-500" />
        <span>Change limit reached</span>
        <span className="ml-1 text-[10px] text-cyan-600 dark:text-cyan-400 underline font-semibold">
          Upgrade
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpenUpgradeModal}
      className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 transition cursor-pointer select-none"
      title="Free Starter Plan: Studio changes remaining. Click to view Pro plan."
    >
      <Zap className="h-3 w-3 text-amber-500 fill-current" />
      <span>
        {remaining === 1 ? "1 Studio change remaining" : `${remaining} Studio changes remaining`}
      </span>
    </button>
  );
}
