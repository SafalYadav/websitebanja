"use client";

import React, { useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface MagneticButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  strength?: number;
  className?: string;
  variant?: "default" | "primary" | "secondary" | "outline" | "ghost";
}

const variantStyles: Record<string, string> = {
  default: "bg-cyan-500 hover:bg-cyan-400 text-zinc-950 focus-visible:ring-cyan-400",
  primary: "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 focus-visible:ring-zinc-400",
  secondary: "bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 focus-visible:ring-zinc-400",
  outline: "border border-zinc-300 text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800 focus-visible:ring-zinc-400",
  ghost: "text-zinc-900 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800 focus-visible:ring-zinc-400",
};

export default function MagneticButton({
  children,
  strength = 0.35,
  className = "",
  variant = "default",
  style,
  ...props
}: MagneticButtonProps) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const shouldReduceMotion = useReducedMotion();

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (shouldReduceMotion || !btnRef.current) return;
    const { clientX, clientY } = e;
    const { left, top, width, height } = btnRef.current.getBoundingClientRect();
    const middleX = clientX - (left + width / 2);
    const middleY = clientY - (top + height / 2);
    setPosition({ x: middleX * strength, y: middleY * strength });
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  // If a custom background style is applied (e.g. gradient) and no variant was explicitly selected,
  // do not impose the cyan background from the default showcase variant.
  const hasCustomBgStyle = Boolean(style && (style.background || style.backgroundColor));
  const baseVariant = hasCustomBgStyle && variant === "default" ? "" : variantStyles[variant] || variantStyles.default;

  return (
    <motion.button
      ref={btnRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: "spring", stiffness: 350, damping: 15, mass: 0.1 }}
      style={style}
      className={cn(
        "relative px-6 py-3 rounded-xl font-bold text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none cursor-pointer",
        baseVariant,
        className
      )}
      {...(props as any)}
    >
      {children}
    </motion.button>
  );
}

