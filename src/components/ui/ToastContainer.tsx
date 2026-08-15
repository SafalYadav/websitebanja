"use client";

import { useToastStore } from "@/store/toastStore";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed bottom-5 right-5 z-50 flex max-w-sm flex-col gap-2.5"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
            className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-zinc-200 bg-white/95 p-4 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/95"
          >
            {toast.type === "success" && (
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-500" />
            )}
            {toast.type === "error" && (
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
            )}
            {toast.type === "info" && (
              <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-violet-500" />
            )}

            <div className="flex-1 text-sm">
              <p className="font-semibold text-zinc-900 dark:text-white">
                {toast.title}
              </p>
              {toast.description && (
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  {toast.description}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              aria-label="Close notification"
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
