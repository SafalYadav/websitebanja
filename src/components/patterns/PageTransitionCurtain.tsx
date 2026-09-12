"use client";

import React, { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

export interface PageTransitionCurtainProps {
  children?: React.ReactNode;
  triggerLabel?: string;
  onTransitionComplete?: () => void;
  className?: string;
}

export default function PageTransitionCurtain({
  children,
  triggerLabel = "Trigger Page Transition",
  onTransitionComplete,
  className = "",
}: PageTransitionCurtainProps) {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const handleTrigger = () => {
    if (shouldReduceMotion) {
      if (onTransitionComplete) onTransitionComplete();
      return;
    }
    setIsTransitioning(true);
    setTimeout(() => {
      setIsTransitioning(false);
      if (onTransitionComplete) onTransitionComplete();
    }, 900);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={handleTrigger}
        className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-xs font-bold text-white transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400"
      >
        {triggerLabel}
      </button>

      {children}

      <AnimatePresence>
        {isTransitioning && (
          <div className="fixed inset-0 z-50 pointer-events-none flex flex-col">
            <motion.div
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              exit={{ scaleY: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              style={{ originY: 0 }}
              className="w-full flex-1 bg-cyan-600"
            />
            <motion.div
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              exit={{ scaleY: 0 }}
              transition={{ duration: 0.45, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              style={{ originY: 1 }}
              className="w-full flex-1 bg-zinc-950"
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
