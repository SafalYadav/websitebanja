"use client";

import React from "react";
import { Sparkles } from "lucide-react";

export interface VerseCardProps {
  verseNumber?: string;
  theme?: string;
  lines?: string[];
  citation?: string;
  className?: string;
}

export default function VerseCard({
  verseNumber = "VERSE 01",
  theme = "DIGITAL BRUTALISM",
  lines = [
    "Form does not merely follow function;",
    "it accelerates the conversion boundary,",
    "collapsing latency into tactile desire.",
  ],
  citation = "— System Manifesto 2026",
  className = "",
}: VerseCardProps) {
  return (
    <div
      tabIndex={0}
      role="article"
      className={`relative p-8 sm:p-12 rounded-3xl border border-white/15 bg-zinc-900/90 backdrop-blur-xl overflow-hidden group focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none ${className}`}
    >
      {/* Ambient background glow */}
      <div className="absolute -top-24 -right-24 w-60 h-60 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none group-hover:bg-cyan-500/20 transition-all duration-700" />

      <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-8 text-xs font-mono tracking-widest text-zinc-400">
        <span className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          {verseNumber}
        </span>
        <span className="text-zinc-500">{theme}</span>
      </div>

      <blockquote className="space-y-3">
        {lines.map((line, i) => (
          <p
            key={i}
            className="text-xl sm:text-2xl font-serif italic text-zinc-100 tracking-wide leading-relaxed group-hover:translate-x-1 transition-transform"
            style={{ transitionDelay: `${i * 50}ms` }}
          >
            {line}
          </p>
        ))}
      </blockquote>

      <div className="mt-8 pt-4 border-t border-white/10 flex justify-end text-xs font-mono text-cyan-400 font-semibold">
        <span>{citation}</span>
      </div>
    </div>
  );
}
