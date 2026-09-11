"use client";

import React, { useRef, useState, useEffect } from "react";
import { motion, useReducedMotion, useScroll, useTransform, useSpring } from "framer-motion";
import type { Spatial3dConfig } from "@/types/website";

interface SpatialSectionWrapperProps {
  children: React.ReactNode;
  config?: Spatial3dConfig;
  className?: string;
}

export default function SpatialSectionWrapper({
  children,
  config,
  className = "",
}: SpatialSectionWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile, { passive: true });
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const isEnabled = config?.enabled !== false && config?.level !== "NONE";
  const isSubtle = config?.level === "SUBTLE_2_5D";
  const maxTilt = isSubtle ? 5 : (config?.tiltMaxDeg || 10);
  const perspective = config?.perspective || 1200;

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 24,
    restDelta: 0.001,
  });

  const rotateX = useTransform(
    smoothProgress,
    [0, 0.4, 0.6, 1],
    [maxTilt, 0, 0, -maxTilt * 0.7]
  );

  const rotateY = useTransform(
    smoothProgress,
    [0, 0.5, 1],
    [-maxTilt * 0.6, 0, maxTilt * 0.4]
  );

  const scale = useTransform(smoothProgress, [0, 0.45, 1], [0.96, 1, 0.98]);

  if (!isEnabled || shouldReduceMotion || isMobile) {
    return (
      <div
        ref={containerRef}
        className={"wb-spatial-flat transition-transform duration-300 " + className}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={"wb-spatial-container relative " + className}
      style={{
        perspective: perspective + "px",
        perspectiveOrigin: "50% 40%",
      }}
    >
      <motion.div
        className="wb-spatial-stage will-change-transform"
        style={{
          transformStyle: "preserve-3d",
          rotateX,
          rotateY,
          scale,
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}
