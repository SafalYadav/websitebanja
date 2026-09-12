"use client";

import React, { useEffect, useRef } from "react";
import Matter from "matter-js";

export interface PhysicsGravityContainerProps {
  badges?: string[];
  className?: string;
  height?: number;
}

export default function PhysicsGravityContainer({
  badges = ["Tailwind", "Next.js", "Framer", "TypeScript", "GSAP", "Three.js", "WCAG AAA"],
  className = "",
  height = 320,
}: PhysicsGravityContainerProps) {
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const container = sceneRef.current;
    if (!container) return;

    const width = container.clientWidth || 600;

    // Matter module aliases
    const Engine = Matter.Engine;
    const Render = Matter.Render;
    const Runner = Matter.Runner;
    const Bodies = Matter.Bodies;
    const Composite = Matter.Composite;
    const Mouse = Matter.Mouse;
    const MouseConstraint = Matter.MouseConstraint;

    // Create engine
    const engine = Engine.create();
    const world = engine.world;

    // Create renderer
    const render = Render.create({
      element: container,
      engine: engine,
      options: {
        width,
        height,
        wireframes: false,
        background: "transparent",
      },
    });

    Render.run(render);
    const runner = Runner.create();
    Runner.run(runner, engine);

    // Create boundaries
    const wallOptions = { isStatic: true, render: { fillStyle: "transparent" } };
    const ground = Bodies.rectangle(width / 2, height + 20, width, 40, wallOptions);
    const leftWall = Bodies.rectangle(-20, height / 2, 40, height, wallOptions);
    const rightWall = Bodies.rectangle(width + 20, height / 2, 40, height, wallOptions);
    Composite.add(world, [ground, leftWall, rightWall]);

    // Create bouncing badges
    const colors = ["#0ea5e9", "#6366f1", "#ec4899", "#10b981", "#f59e0b"];
    const badgeBodies = badges.map((badge, i) => {
      const x = (width / (badges.length + 1)) * (i + 1);
      const y = 30 + Math.random() * 40;
      const body = Bodies.rectangle(x, y, 90, 36, {
        chamfer: { radius: 12 },
        restitution: 0.7,
        density: 0.002,
        render: {
          fillStyle: colors[i % colors.length],
        },
      });
      return body;
    });

    Composite.add(world, badgeBodies);

    // Add mouse control
    const mouse = Mouse.create(render.canvas);
    const mouseConstraint = MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: {
        stiffness: 0.2,
        render: { visible: false },
      },
    });
    Composite.add(world, mouseConstraint);
    render.mouse = mouse;

    // Cleanup
    return () => {
      Render.stop(render);
      Runner.stop(runner);
      Composite.clear(world, false);
      Engine.clear(engine);
      if (render.canvas && render.canvas.parentNode) {
        render.canvas.parentNode.removeChild(render.canvas);
      }
    };
  }, [badges, height]);

  return (
    <div className={`w-full relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/60 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">
          Matter.js 2D Rigid-Body Physics
        </span>
        <span className="text-[10px] text-zinc-500 font-mono">Drag badges with cursor</span>
      </div>
      <div ref={sceneRef} className="w-full relative overflow-hidden" style={{ height }} />
    </div>
  );
}
