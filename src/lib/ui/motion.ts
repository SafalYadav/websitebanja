// src/lib/ui/motion.ts
import type { Variants, Transition } from "framer-motion";

/**
 * Standardized easing curves that feel snappy and premium.
 */
export const transitions = {
  snappy: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } as Transition,
  smooth: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] } as Transition,
  gentle: { duration: 0.45, ease: "easeOut" } as Transition,
  instant: { duration: 0 } as Transition,
};

/**
 * Common Framer Motion animation variants used across WebsiteBanja generated components.
 * Tuned to prevent excessive movement while maintaining high visual polish.
 */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: transitions.smooth,
  },
};

export const slideUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitions.snappy,
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: transitions.snappy,
  },
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

export const cardHover: Variants = {
  initial: { y: 0, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  hover: {
    y: -3,
    boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
    transition: { duration: 0.2, ease: "easeOut" },
  },
};

/**
 * Helper to get variants respecting prefers-reduced-motion.
 * If reduced motion is requested, animations immediately resolve to visible with 0 translation.
 */
export function getReducedMotionVariants(baseVariants: Variants, shouldReduceMotion: boolean | null): Variants {
  if (!shouldReduceMotion) return baseVariants;

  return {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.01 } },
  };
}
