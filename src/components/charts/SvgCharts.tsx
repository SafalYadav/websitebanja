"use client";

import React, { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

// --- Types ---
export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface BaseChartProps {
  data?: ChartDataPoint[];
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
  height?: number;
  title?: string;
}

// --- 1. SVG LINE CHART ---
export function LineChart({
  data = [],
  loading = false,
  emptyMessage = "No data available",
  className = "",
  height = 200,
  title = "Line Chart",
}: BaseChartProps) {
  const shouldReduceMotion = useReducedMotion();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (loading) {
    return (
      <div 
        className={`w-full bg-zinc-900/50 rounded-2xl border border-white/10 animate-pulse flex items-center justify-center ${className}`}
        style={{ height }}
        role="status"
        aria-label="Loading line chart"
      >
        <span className="text-xs text-zinc-500 font-mono">Loading telemetry...</span>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div 
        className={`w-full bg-zinc-900/40 rounded-2xl border border-dashed border-zinc-800 flex items-center justify-center p-6 ${className}`}
        style={{ height }}
      >
        <p className="text-xs text-zinc-500 font-mono">{emptyMessage}</p>
      </div>
    );
  }

  const width = 600;
  const padding = 40;
  const graphWidth = width - padding * 2;
  const graphHeight = height - padding * 2;

  const maxValue = Math.max(...data.map(d => d.value), 1);
  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1 || 1)) * graphWidth;
    const y = height - padding - (d.value / maxValue) * graphHeight;
    return { x, y, ...d };
  });

  const pathD = points.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), "");

  return (
    <div className={`w-full overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/70 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono">{title}</h4>
        {hoveredIdx !== null && (
          <span className="text-xs font-mono text-cyan-400 font-semibold">
            {data[hoveredIdx].label}: {data[hoveredIdx].value}
          </span>
        )}
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible"
        role="img"
        aria-label={`${title} showing values from ${data[0]?.label} to ${data[data.length - 1]?.label}`}
      >
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const y = height - padding - ratio * graphHeight;
          return (
            <line
              key={i}
              x1={padding}
              y1={y}
              x2={width - padding}
              y2={y}
              stroke="rgba(255,255,255,0.06)"
              strokeDasharray="4 4"
            />
          );
        })}

        {/* Animated Line */}
        <motion.path
          d={pathD}
          fill="none"
          stroke="var(--wb-primary, #0ea5e9)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: shouldReduceMotion ? 1 : 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />

        {/* Data points */}
        {points.map((p, i) => (
          <g key={i} className="focus:outline-none" tabIndex={0} onFocus={() => setHoveredIdx(i)} onBlur={() => setHoveredIdx(null)}>
            <circle
              cx={p.x}
              cy={p.y}
              r={hoveredIdx === i ? 6 : 4}
              className="transition-all duration-200 cursor-pointer fill-zinc-950 stroke-[var(--wb-primary,#0ea5e9)] stroke-2 hover:stroke-white hover:stroke-[3px]"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
            <text
              x={p.x}
              y={height - 10}
              textAnchor="middle"
              className="text-[10px] fill-zinc-500 font-mono"
            >
              {p.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// --- 2. SVG BAR CHART ---
export function BarChart({
  data = [],
  loading = false,
  emptyMessage = "No data available",
  className = "",
  height = 200,
  title = "Bar Metrics",
}: BaseChartProps) {
  const shouldReduceMotion = useReducedMotion();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (loading) {
    return (
      <div className={`w-full bg-zinc-900/50 rounded-2xl border border-white/10 animate-pulse ${className}`} style={{ height }} />
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className={`w-full bg-zinc-900/40 rounded-2xl border border-dashed border-zinc-800 flex items-center justify-center ${className}`} style={{ height }}>
        <p className="text-xs text-zinc-500 font-mono">{emptyMessage}</p>
      </div>
    );
  }

  const width = 600;
  const padding = 40;
  const graphWidth = width - padding * 2;
  const graphHeight = height - padding * 2;
  const maxValue = Math.max(...data.map(d => d.value), 1);
  const barWidth = Math.min(graphWidth / (data.length * 1.5), 36);

  return (
    <div className={`w-full overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/70 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono">{title}</h4>
        {hoveredIdx !== null && (
          <span className="text-xs font-mono text-cyan-400 font-semibold">
            {data[hoveredIdx].label}: {data[hoveredIdx].value}
          </span>
        )}
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible" role="img" aria-label={title}>
        {data.map((d, i) => {
          const x = padding + (i / data.length) * graphWidth + (graphWidth / data.length - barWidth) / 2;
          const barHeight = (d.value / maxValue) * graphHeight;
          const y = height - padding - barHeight;

          return (
            <g key={i} tabIndex={0} onFocus={() => setHoveredIdx(i)} onBlur={() => setHoveredIdx(null)}>
              <motion.rect
                x={x}
                width={barWidth}
                initial={{ y: shouldReduceMotion ? y : height - padding, height: shouldReduceMotion ? barHeight : 0 }}
                animate={{ y, height: barHeight }}
                transition={{ duration: 0.5, delay: shouldReduceMotion ? 0 : i * 0.05 }}
                rx={4}
                className="transition-colors cursor-pointer fill-[var(--wb-primary,#0ea5e9)] hover:fill-cyan-300"
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
              <text
                x={x + barWidth / 2}
                y={height - 10}
                textAnchor="middle"
                className="text-[10px] fill-zinc-500 font-mono"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// --- 3. SVG AREA CHART ---
export function AreaChart({
  data = [],
  loading = false,
  emptyMessage = "No data available",
  className = "",
  height = 200,
  title = "Telemetry Area",
}: BaseChartProps) {
  const shouldReduceMotion = useReducedMotion();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (loading || !data || data.length === 0) {
    return <LineChart data={data} loading={loading} emptyMessage={emptyMessage} className={className} height={height} title={title} />;
  }

  const width = 600;
  const padding = 40;
  const graphWidth = width - padding * 2;
  const graphHeight = height - padding * 2;
  const maxValue = Math.max(...data.map(d => d.value), 1);

  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1 || 1)) * graphWidth;
    const y = height - padding - (d.value / maxValue) * graphHeight;
    return { x, y, ...d };
  });

  const lineD = points.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), "");
  const areaD = `${lineD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  return (
    <div className={`w-full overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/70 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono">{title}</h4>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible" role="img" aria-label={title}>
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--wb-primary, #0ea5e9)" stopOpacity="0.45" />
            <stop offset="100%" stopColor="var(--wb-primary, #0ea5e9)" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        <motion.path
          d={areaD}
          fill="url(#areaGradient)"
          initial={{ opacity: shouldReduceMotion ? 1 : 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        />

        <motion.path
          d={lineD}
          fill="none"
          stroke="var(--wb-primary, #0ea5e9)"
          strokeWidth="2.5"
          initial={{ pathLength: shouldReduceMotion ? 1 : 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8 }}
        />
      </svg>
    </div>
  );
}

// --- 4. SVG DONUT / RING CHART ---
export function DonutChart({
  data = [
    { label: "Direct", value: 45, color: "#0ea5e9" },
    { label: "Organic", value: 30, color: "#6366f1" },
    { label: "Referral", value: 25, color: "#ec4899" },
  ],
  loading = false,
  className = "",
  size = 180,
  title = "Distribution",
}: { data?: ChartDataPoint[]; loading?: boolean; className?: string; size?: number; title?: string }) {
  const shouldReduceMotion = useReducedMotion();
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const radius = 60;
  const strokeWidth = 20;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulated = 0;

  return (
    <div className={`p-4 rounded-2xl border border-white/10 bg-zinc-900/70 flex flex-col items-center ${className}`}>
      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono mb-4 w-full text-left">{title}</h4>
      
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
          {data.map((slice, i) => {
            const strokeDasharray = `${(slice.value / total) * circumference} ${circumference}`;
            const strokeDashoffset = -accumulated * circumference;
            accumulated += slice.value / total;

            return (
              <motion.circle
                key={i}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={slice.color || "var(--wb-primary,#0ea5e9)"}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                initial={{ opacity: shouldReduceMotion ? 1 : 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              />
            );
          })}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <span className="text-2xl font-black text-white font-mono">{total}</span>
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">Total</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 mt-6 justify-center">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs font-mono">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color || "var(--wb-primary)" }} />
            <span className="text-zinc-400">{d.label}:</span>
            <span className="text-white font-semibold">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- 5. STAT METRIC COMPONENT ---
export function StatMetric({
  value,
  label,
  delta,
  prefix = "",
  suffix = "",
  className = "",
}: {
  value: number | string;
  label: string;
  delta?: { value: string | number; isPositive: boolean };
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  return (
    <div className={`p-6 rounded-2xl border border-white/10 bg-zinc-900/80 backdrop-blur-md ${className}`}>
      <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold">{label}</span>
      <div className="flex items-baseline gap-2 mt-2">
        <span className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
          {prefix}{value}{suffix}
        </span>
        {delta && (
          <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${delta.isPositive ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
            {delta.isPositive ? "↑" : "↓"} {delta.value}
          </span>
        )}
      </div>
    </div>
  );
}

// --- 6. PROGRESS METRIC COMPONENT ---
export function ProgressMetric({
  value,
  max = 100,
  label,
  color = "var(--wb-primary, #0ea5e9)",
  className = "",
}: {
  value: number;
  max?: number;
  label: string;
  color?: string;
  className?: string;
}) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className={`p-4 rounded-xl border border-white/10 bg-zinc-900/60 ${className}`}>
      <div className="flex justify-between text-xs font-mono mb-2">
        <span className="text-zinc-400 font-medium">{label}</span>
        <span className="text-white font-bold">{value} / {max} ({Math.round(percentage)}%)</span>
      </div>
      <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
