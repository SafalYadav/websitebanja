"use client";

import React, { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

export interface ScatterItem {
  id: string;
  src: string;
  title: string;
  rotation: number;
  offsetX: number;
  offsetY: number;
  scale: number;
}

const DEFAULT_ITEMS: ScatterItem[] = [
  { id: "1", src: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&q=80", title: "Spatial Lattice", rotation: -6, offsetX: -140, offsetY: -30, scale: 0.95 },
  { id: "2", src: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&q=80", title: "Cyber Terminal", rotation: 4, offsetX: 130, offsetY: -40, scale: 1.0 },
  { id: "3", src: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&q=80", title: "Telemetry Core", rotation: -3, offsetX: 0, offsetY: 60, scale: 1.05 },
];

export default function ImageScatter({
  items = DEFAULT_ITEMS,
  className = "",
}: {
  items?: ScatterItem[];
  className?: string;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className={`relative w-full max-w-4xl mx-auto min-h-[420px] flex items-center justify-center p-6 overflow-hidden ${className}`}>
      {/* Desktop Scattered Grid */}
      <div className="hidden sm:flex relative w-full h-[380px] items-center justify-center">
        {items.map((item) => {
          const isHovered = activeId === item.id;

          return (
            <motion.div
              key={item.id}
              onMouseEnter={() => setActiveId(item.id)}
              onMouseLeave={() => setActiveId(null)}
              animate={{
                x: shouldReduceMotion ? 0 : item.offsetX,
                y: shouldReduceMotion ? 0 : isHovered ? item.offsetY - 20 : item.offsetY,
                rotate: shouldReduceMotion ? 0 : isHovered ? 0 : item.rotation,
                scale: isHovered ? 1.15 : item.scale,
                zIndex: isHovered ? 30 : 10,
              }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="absolute w-56 h-40 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-zinc-900 cursor-pointer"
            >
              <img src={item.src} alt={item.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent flex items-end p-3">
                <span className="text-xs font-bold text-white tracking-wide">{item.title}</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Mobile Collision-Safe Linear Fallback */}
      <div className="sm:hidden grid grid-cols-1 gap-4 w-full">
        {items.map((item) => (
          <div key={item.id} className="w-full rounded-2xl overflow-hidden border border-white/10 aspect-video relative">
            <img src={item.src} alt={item.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 to-transparent flex items-end p-4">
              <span className="text-sm font-bold text-white">{item.title}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
