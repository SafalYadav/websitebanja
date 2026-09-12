"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

export interface ShaderBackgroundProps {
  className?: string;
  speed?: number;
}

export default function ShaderBackground({
  className = "",
  speed = 1.0,
}: ShaderBackgroundProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 400;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true });
    } catch {
      return;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform float uTime;
      uniform vec2 uResolution;
      varying vec2 vUv;

      void main() {
        vec2 uv = gl_FragCoord.xy / uResolution.xy;
        float wave = sin(uv.x * 6.0 + uTime * 0.8) * cos(uv.y * 6.0 + uTime * 0.6) * 0.5 + 0.5;
        vec3 colorA = vec3(0.02, 0.04, 0.1);
        vec3 colorB = vec3(0.06, 0.45, 0.65);
        vec3 finalColor = mix(colorA, colorB, wave * 0.35);
        gl_FragColor = vec4(finalColor, 0.6);
      }
    `;

    const uniforms = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(width, height) },
    };

    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      transparent: true,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      if (!prefersReducedMotion) {
        uniforms.uTime.value = clock.getElapsedTime() * speed;
      }
      renderer.render(scene, camera);
      if (!prefersReducedMotion) {
        animId = requestAnimationFrame(animate);
      }
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h);
      uniforms.uResolution.value.set(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animId) cancelAnimationFrame(animId);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [speed]);

  return <div ref={mountRef} className={`w-full h-full relative overflow-hidden pointer-events-none ${className}`} />;
}
