"use client";

import React, { useRef, useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export interface GsapScrollSceneProps {
  children: React.ReactNode;
  scrub?: boolean | number;
  pin?: boolean;
  startTrigger?: string;
  endTrigger?: string;
  parallaxSpeed?: number;
  className?: string;
}

export default function GsapScrollScene({
  children,
  scrub = 1,
  pin = false,
  startTrigger = "top 80%",
  endTrigger = "bottom 20%",
  parallaxSpeed = 50,
  className = "",
}: GsapScrollSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion || !containerRef.current) return;

    const ctx = gsap.context(() => {
      if (targetRef.current) {
        gsap.fromTo(
          targetRef.current,
          { y: -parallaxSpeed, opacity: 0.8 },
          {
            y: parallaxSpeed,
            opacity: 1,
            ease: "none",
            scrollTrigger: {
              trigger: containerRef.current,
              start: startTrigger,
              end: endTrigger,
              scrub,
              pin,
              invalidateOnRefresh: true,
            },
          }
        );
      }
    }, containerRef);

    return () => ctx.revert();
  }, [scrub, pin, startTrigger, endTrigger, parallaxSpeed]);

  return (
    <div ref={containerRef} className={`relative overflow-hidden ${className}`}>
      <div ref={targetRef} className="w-full h-full">
        {children}
      </div>
    </div>
  );
}
