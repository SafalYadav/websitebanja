"use client";

import React, { useEffect, useRef } from "react";

export interface MouseTrailParticleProps {
  className?: string;
  particleColor?: string;
}

export default function MouseTrailParticle({
  className = "",
  particleColor = "#0ea5e9",
}: MouseTrailParticleProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Only run on desktop and when reduced motion is not requested
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile = window.innerWidth < 768;
    if (prefersReducedMotion || isMobile) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 400);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 400);

    const particles: Array<{ x: number; y: number; size: number; alpha: number }> = [];

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Add small particle
      particles.push({
        x,
        y,
        size: Math.random() * 3 + 2,
        alpha: 0.8,
      });

      // Keep max 25 particles to preserve CPU
      if (particles.length > 25) particles.shift();
    };

    window.addEventListener("mousemove", handleMouseMove);

    let animId: number;
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.alpha -= 0.02;
        p.size *= 0.96;

        ctx.fillStyle = particleColor;
        ctx.globalAlpha = Math.max(p.alpha, 0);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Filter dead particles
      for (let i = particles.length - 1; i >= 0; i--) {
        if (particles[i].alpha <= 0) particles.splice(i, 1);
      }

      animId = requestAnimationFrame(render);
    };
    render();

    const handleResize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      if (animId) cancelAnimationFrame(animId);
    };
  }, [particleColor]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none z-20 ${className}`}
      aria-hidden="true"
    />
  );
}
