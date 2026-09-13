"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  X,
  Check,
  Zap,
  Globe,
  Headphones,
  ShieldCheck,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { launchRazorpayProCheckout } from "@/lib/razorpayClient";
import { toast } from "@/store/toastStore";

interface ProUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgradeSuccess?: () => void;
  title?: string;
  subtitle?: string;
  ctaText?: string;
  isRenewal?: boolean;
}

export default function ProUpgradeModal({
  isOpen,
  onClose,
  onUpgradeSuccess,
  isRenewal = false,
  title = isRenewal
    ? "Your Pro plan expires tomorrow."
    : "You've reached your Free Plan Studio change limit.",
  subtitle = isRenewal
    ? "Your Pro access will expire in 1 day. Renew Pro to continue enjoying Unlimited Studio Changes and Pro features."
    : "Upgrade to Pro to continue editing your website.",
  ctaText = isRenewal ? "Renew Pro — ₹500" : "Upgrade to Pro — ₹500/month",
}: ProUpgradeModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleUpgrade = async () => {
    setIsProcessing(true);
    await launchRazorpayProCheckout({
      amountPaise: 50000,
      onSuccess: () => {
        setIsProcessing(false);
        if (isRenewal) {
          toast.success(
            "Pro Plan Renewed!",
            "Your 30-day Pro access and Unlimited Studio Changes have been extended."
          );
        } else {
          toast.success(
            "Welcome to Paid Pro!",
            "Payment successful! You now have Unlimited Studio Changes."
          );
        }
        onUpgradeSuccess?.();
        onClose();
      },
      onError: (err) => {
        setIsProcessing(false);
        toast.error("Upgrade Error", err.message || "Unable to complete payment.");
      },
      onDismiss: () => {
        setIsProcessing(false);
      },
    });
  };


  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-cyan-500/30 bg-[#0A0D14] p-6 sm:p-8 text-white shadow-2xl shadow-cyan-500/10"
        >
          {/* Ambient background glow */}
          <div className="pointer-events-none absolute -top-24 -right-24 h-60 w-60 rounded-full bg-cyan-500/20 blur-[90px]" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-60 w-60 rounded-full bg-blue-600/15 blur-[90px]" />

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="absolute top-5 right-5 flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white transition disabled:opacity-40 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Icon & Plan Badge */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-slate-950 shadow-lg shadow-cyan-500/25">
              <Sparkles className="h-5 w-5 fill-current" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                Pro Plan
              </span>
            </div>
          </div>

          {/* Headline & Subtitle */}
          <div className="space-y-1.5 mb-6">
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug">
              {title}
            </h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              {subtitle}
            </p>
          </div>

          {/* Price Box */}
          <div className="flex items-baseline gap-2 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] mb-6">
            <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              ₹500
            </span>
            <span className="text-sm font-medium text-zinc-400">/ month</span>
            <span className="ml-auto text-xs font-semibold text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/20">
              Cancel anytime
            </span>
          </div>

          {/* Features Checklist */}
          <div className="space-y-3 mb-8 text-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400 flex-shrink-0">
                <Check className="h-3 w-3" />
              </div>
              <span className="font-semibold text-white">Unlimited Studio Changes</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400 flex-shrink-0">
                <Check className="h-3 w-3" />
              </div>
              <span className="text-zinc-300">Custom domain connection (<span className="text-cyan-400 font-medium">yourbrand.com</span>)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400 flex-shrink-0">
                <Check className="h-3 w-3" />
              </div>
              <span className="text-zinc-300">50 AI requests per rolling 7 days</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400 flex-shrink-0">
                <Check className="h-3 w-3" />
              </div>
              <span className="text-zinc-300">Remove WebsiteBanja footer watermark</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400 flex-shrink-0">
                <Check className="h-3 w-3" />
              </div>
              <span className="text-zinc-300">Fast Global CDN edge delivery & priority support</span>
            </div>
          </div>

          {/* Action CTA Button */}
          <button
            type="button"
            onClick={handleUpgrade}
            disabled={isProcessing}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-4 text-sm sm:text-base font-bold text-slate-950 shadow-xl shadow-cyan-500/20 hover:opacity-95 active:scale-[0.99] transition disabled:opacity-50 cursor-pointer"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Opening Razorpay Checkout...</span>
              </>
            ) : (
              <>
                <span>{ctaText}</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}

          </button>

          <div className="mt-4 flex items-center justify-center gap-4 text-xs text-zinc-500">
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              100% Secure via Razorpay
            </span>
            <span>•</span>
            <span>Instant Activation</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
