"use client";

import { useEffect } from "react";
import Lenis from "lenis";

let lenis: Lenis | null = null;

export function getLenis() {
  return lenis;
}

export default function SmoothScroll({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    lenis = new Lenis({
      autoRaf: true,
      lerp: 0.2,
      wheelMultiplier: 1,
      touchMultiplier: 1,
      syncTouch: false,
    });

    return () => {
      lenis?.destroy();
      lenis = null;
    };
  }, []);

  return <>{children}</>;
}