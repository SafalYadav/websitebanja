"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

export interface InteractiveOrbProps {
  color?: string;
  wireframe?: boolean;
  className?: string;
}

export default function InteractiveOrb({
  color = "#0ea5e9",
  wireframe = true,
  className = "",
}: InteractiveOrbProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const width = container.clientWidth || 300;
    const height = container.clientHeight || 300;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch {
      return;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 4;

    const geometry = new THREE.IcosahedronGeometry(1.4, 2);
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      wireframe,
      transparent: true,
      opacity: 0.85,
    });

    const orb = new THREE.Mesh(geometry, material);
    scene.add(orb);

    // Mouse tilt tracking
    let targetX = 0;
    let targetY = 0;

    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      targetX = x * 1.5;
      targetY = y * 1.5;
    };

    window.addEventListener("mousemove", onMouseMove);

    let animId: number;
    const render = () => {
      if (!prefersReducedMotion) {
        orb.rotation.y += 0.005;
        orb.rotation.x += 0.003;
        orb.rotation.y += (targetX - orb.rotation.y) * 0.05;
        orb.rotation.x += (targetY - orb.rotation.x) * 0.05;
      }
      renderer.render(scene, camera);
      if (!prefersReducedMotion) {
        animId = requestAnimationFrame(render);
      }
    };
    render();

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      if (animId) cancelAnimationFrame(animId);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [color, wireframe]);

  return <div ref={containerRef} className={`w-full h-full relative overflow-hidden ${className}`} />;
}
