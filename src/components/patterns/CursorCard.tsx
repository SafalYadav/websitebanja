"use client";

import React, { useState, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";

export interface CursorCardProps {
  title: string;
  category: string;
  previewImage: string;
  className?: string;
}

export default function CursorCard({
  title,
  category,
  previewImage,
  className = "",
}: CursorCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (shouldReduceMotion || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseMove={handleMouseMove}
      className={`relative p-8 rounded-3xl border border-white/10 bg-zinc-900 overflow-hidden cursor-pointer group ${className}`}
    >
      <div className="flex flex-col justify-between h-full relative z-10">
        <div>
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 mb-2 block">
            {category}
          </span>
          <h3 className="text-2xl font-bold text-white mb-2">{title}</h3>
          <p className="text-sm text-zinc-400">Hover across the boundary to summon the spatial floating preview card.</p>
        </div>
      </div>

      {/* Floating Cursor Follower Card (Desktop only, spring-damped) */}
      {!shouldReduceMotion && isHovered && (
        <motion.div
          animate={{
            x: mousePos.x + 20,
            y: mousePos.y - 80,
          }}
          transition={{
            type: "spring",
            damping: 20,
            stiffness: 250,
            mass: 0.2,
          }}
          className="hidden md:block absolute top-0 left-0 pointer-events-none z-30 w-48 h-32 rounded-xl overflow-hidden border border-white/20 shadow-2xl"
        >
          <img src={previewImage} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 to-transparent flex items-end p-2">
            <span className="text-[10px] font-mono font-bold text-white">Preview Follower</span>
          </div>
        </motion.div>
      )}

      {/* Mobile Static Preview Fallback */}
      <div className="block md:hidden mt-6 rounded-xl overflow-hidden aspect-video border border-white/10">
        <img src={previewImage} alt="" className="w-full h-full object-cover" />
      </div>
    </div>
  );
}
