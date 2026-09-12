"use client";

import React, { useRef, useLayoutEffect } from "react";
import gsap from "gsap";

if (typeof window !== "undefined") {
  // GSAP client registration
}

export interface GsapRevealProps {
  children: React.ReactNode;
  duration?: number;
  delay?: number;
  yOffset?: number;
  scale?: number;
  className?: string;
}

export default function GsapReveal({
  children,
  duration = 0.8,
  delay = 0,
  yOffset = 40,
  scale = 0.95,
  className = "",
}: GsapRevealProps) {
  const elRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion || !elRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        elRef.current,
        {
          opacity: 0,
          y: yOffset,
          scale,
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration,
          delay,
          ease: "power3.out",
        }
      );
    }, elRef);

    return () => ctx.revert();
  }, [duration, delay, yOffset, scale]);

  return (
    <div ref={elRef} className={className}>
      {children}
    </div>
  );
}
