"use client";

import React, { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface PerspectiveCardData {
  id: string;
  title: string;
  subtitle: string;
  image: string;
}

const DEFAULT_CAROUSEL_DATA: PerspectiveCardData[] = [
  { id: "1", title: "Spatial Engine", subtitle: "Hardware-accelerated perspective matrix", image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&q=80" },
  { id: "2", title: "Kinetic Fluidity", subtitle: "Physics-driven spring transitions", image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&q=80" },
  { id: "3", title: "Tokenized Rhythm", subtitle: "Mathematical 8pt spatial harmonizer", image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&q=80" },
  { id: "4", title: "WCAG AAA Guard", subtitle: "Automated perceptual color contrast", image: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&q=80" },
];

export default function PerspectiveCarousel({
  items = DEFAULT_CAROUSEL_DATA,
  className = "",
}: {
  items?: PerspectiveCardData[];
  className?: string;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const shouldReduceMotion = useReducedMotion();

  const handlePrev = () => setActiveIdx((prev) => (prev - 1 + items.length) % items.length);
  const handleNext = () => setActiveIdx((prev) => (prev + 1) % items.length);

  return (
    <div className={`relative w-full max-w-4xl mx-auto py-12 flex flex-col items-center ${className}`}>
      {/* 3D Perspective Stage (Desktop) */}
      <div className="relative w-full h-[320px] flex items-center justify-center overflow-hidden perspective-1000">
        {items.map((item, idx) => {
          const offset = idx - activeIdx;
          const isActive = idx === activeIdx;

          // Compute 3D rotation, translation, and scale
          const rotateY = shouldReduceMotion ? 0 : offset * -25;
          const x = shouldReduceMotion ? offset * 220 : offset * 180;
          const z = shouldReduceMotion ? 0 : -Math.abs(offset) * 120;
          const scale = 1 - Math.abs(offset) * 0.15;
          const opacity = Math.abs(offset) > 2 ? 0 : 1 - Math.abs(offset) * 0.3;
          const zIndex = 20 - Math.abs(offset);

          return (
            <motion.div
              key={item.id}
              onClick={() => setActiveIdx(idx)}
              animate={{
                x,
                z,
                rotateY,
                scale,
                opacity,
              }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              style={{ zIndex }}
              className={`absolute w-72 sm:w-80 h-64 rounded-3xl overflow-hidden border border-white/20 bg-zinc-900 shadow-2xl cursor-pointer ${
                isActive ? "ring-2 ring-cyan-400" : ""
              }`}
            >
              <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent flex flex-col justify-end p-6">
                <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider mb-1">
                  Card 0{idx + 1}
                </span>
                <h4 className="text-lg font-bold text-white leading-tight">{item.title}</h4>
                <p className="text-xs text-zinc-400 mt-1">{item.subtitle}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 mt-8">
        <button
          onClick={handlePrev}
          className="p-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400"
          aria-label="Previous card"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <span className="text-xs font-mono text-zinc-400">
          {activeIdx + 1} / {items.length}
        </span>

        <button
          onClick={handleNext}
          className="p-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400"
          aria-label="Next card"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
