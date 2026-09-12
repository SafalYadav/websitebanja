"use client";

import React, { useRef, useLayoutEffect } from "react";
import gsap from "gsap";

export interface GsapStaggerProps {
  children: React.ReactNode;
  stagger?: number;
  duration?: number;
  yOffset?: number;
  className?: string;
}

export default function GsapStagger({
  children,
  stagger = 0.1,
  duration = 0.6,
  yOffset = 30,
  className = "",
}: GsapStaggerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion || !containerRef.current) return;

    const ctx = gsap.context(() => {
      const items = containerRef.current?.children;
      if (items && items.length > 0) {
        gsap.fromTo(
          items,
          {
            opacity: 0,
            y: yOffset,
          },
          {
            opacity: 1,
            y: 0,
            duration,
            stagger,
            ease: "back.out(1.4)",
          }
        );
      }
    }, containerRef);

    return () => ctx.revert();
  }, [stagger, duration, yOffset]);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}
