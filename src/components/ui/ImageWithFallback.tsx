"use client";

import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface ImageWithFallbackProps {
  src?: string | null;
  alt: string;
  className?: string;
  wrapperClassName?: string;
  fallbackGradient?: string;
}

export default function ImageWithFallback({
  src,
  alt,
  className = "",
  wrapperClassName = "",
  fallbackGradient = "linear-gradient(135deg, var(--wb-glow-primary), var(--wb-glow-secondary))",
}: ImageWithFallbackProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = React.useRef<HTMLImageElement>(null);

  React.useEffect(() => {
    // Reset states for new src
    setHasError(false);
    setIsLoaded(false);
    
    // Check if the new image is already cached/complete
    if (imgRef.current?.complete) {
      if (imgRef.current.naturalWidth === 0) {
        // If complete is true but naturalWidth is 0, it might be a broken image,
        // or Chrome is still decoding it. We check again in a microtask.
        const timer = setTimeout(() => {
          if (imgRef.current?.naturalWidth === 0) {
            setHasError(true);
          } else {
            setIsLoaded(true);
          }
        }, 50);
        return () => clearTimeout(timer);
      } else {
        setIsLoaded(true);
      }
    }
  }, [src]);

  if (!src || hasError) {
    return (
      <div
        className={cn("relative overflow-hidden rounded-2xl flex items-center justify-center", wrapperClassName)}
        style={{
          background: fallbackGradient,
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:16px_16px]" />
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden", wrapperClassName)}>
      {/* Loading Skeleton Placeholder */}
      {!isLoaded && (
        <div
          className="absolute inset-0 animate-pulse"
          style={{ background: fallbackGradient }}
        />
      )}

      {/* Actual Image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={src || 'empty'}
        ref={imgRef}
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={cn(
          "h-full w-full object-cover transition-all duration-500",
          !isLoaded ? "opacity-0 scale-95" : "opacity-100 scale-100",
          className
        )}
      />
    </div>
  );
}
