"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

export interface WebGLSceneProps {
  className?: string;
  children?: (props: {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
  }) => (() => void) | void;
  fallback?: React.ReactNode;
}

export default function WebGLScene({ className = "", children, fallback }: WebGLSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hasWebGL, setHasWebGL] = useState(true);

  useEffect(() => {
    if (!mountRef.current) return;

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Setup Scene, Camera, Renderer
    const container = mountRef.current;
    const width = container.clientWidth || 300;
    const height = container.clientHeight || 300;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHasWebGL(false);
      return;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 5;

    // Custom child hooks or setup
    let customCleanup: (() => void) | void;
    if (children) {
      customCleanup = children({ scene, camera, renderer });
    }

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / (newHeight || 1);
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener("resize", handleResize);

    // Animation Loop
    let animationFrameId: number;
    const render = () => {
      if (!prefersReducedMotion) {
        renderer.render(scene, camera);
        animationFrameId = requestAnimationFrame(render);
      } else {
        renderer.render(scene, camera);
      }
    };
    render();

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (customCleanup) customCleanup();

      scene.clear();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [children]);

  if (!hasWebGL) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-zinc-950 ${className}`}>
        {fallback || <div className="w-full h-full bg-radial-gradient opacity-30" />}
      </div>
    );
  }

  return <div ref={mountRef} className={`w-full h-full relative overflow-hidden ${className}`} />;
}
