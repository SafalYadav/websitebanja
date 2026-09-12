"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";

export interface KineticTextRevealProps {
  text: string;
  className?: string;
  tag?: "h1" | "h2" | "h3" | "p";
  delay?: number;
}

export default function KineticTextReveal({
  text,
  className = "",
  tag = "h1",
  delay = 0,
}: KineticTextRevealProps) {
  const shouldReduceMotion = useReducedMotion();
  const words = text.split(" ");
  const Tag = tag;

  if (shouldReduceMotion) {
    return <Tag className={className}>{text}</Tag>;
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: (customDelay: number) => ({
      opacity: 1,
      transition: {
        staggerChildren: 0.04,
        delayChildren: customDelay,
      },
    }),
  };

  const wordVariants = {
    hidden: {
      opacity: 0,
      y: 35,
      rotateZ: 6,
      scale: 0.9,
    },
    visible: {
      opacity: 1,
      y: 0,
      rotateZ: 0,
      scale: 1,
      transition: {
        type: "spring" as const,
        damping: 16,
        stiffness: 220,
      },
    },
  };

  return (
    <Tag className={className}>
      <motion.span
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        custom={delay}
        className="inline-flex flex-wrap gap-x-2 overflow-hidden py-1"
        aria-label={text}
      >
        {words.map((word, i) => (
          <span key={i} className="inline-block overflow-hidden">
            <motion.span variants={wordVariants} className="inline-block">
              {word}
            </motion.span>
          </span>
        ))}
      </motion.span>
    </Tag>
  );
}
