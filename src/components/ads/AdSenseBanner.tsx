"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { isAdSenseAllowedOnRoute } from "./AdSenseScript";

const ADSENSE_CLIENT_ID = "ca-pub-6886166249093676";

interface AdSenseBannerProps {
  slot?: string;
  format?: "auto" | "fluid" | "rectangle" | "horizontal";
  responsive?: boolean;
  className?: string;
  label?: string;
}

/**
 * Clean, non-intrusive in-page AdSense banner.
 * - Route-aware: Automatically suppresses rendering on excluded routes (/builder, /dashboard, etc.).
 * - Graceful degradation: Handles ad blockers without throwing unhandled console exceptions.
 * - Responsive: Constrained dimensions to avoid layout shift (CLS).
 */
export default function AdSenseBanner({
  slot,
  format = "auto",
  responsive = true,
  className = "",
  label = "ADVERTISEMENT",
}: AdSenseBannerProps) {
  const pathname = usePathname();
  const adRef = useRef<HTMLModElement | null>(null);
  const isAllowed = isAdSenseAllowedOnRoute(pathname);

  useEffect(() => {
    if (!isAllowed) return;

    try {
      if (typeof window !== "undefined") {
        const adsbygoogle = (window as any).adsbygoogle || [];
        adsbygoogle.push({});
      }
    } catch {
      // Ad blocker or script not loaded yet — fail silently without disrupting user flow
    }
  }, [isAllowed]);

  if (!isAllowed) {
    return null;
  }

  return (
    <aside
      aria-label="Advertisement"
      className={`w-full max-w-5xl mx-auto my-8 px-4 flex flex-col items-center justify-center transition-opacity duration-300 ${className}`}
    >
      <div className="w-full flex items-center justify-between py-1 px-3 border-b border-slate-200/50 dark:border-zinc-800/60 text-[10px] uppercase tracking-wider text-slate-400 dark:text-zinc-500 select-none">
        <span>{label}</span>
        <span className="text-[9px] text-slate-400/70 dark:text-zinc-600">Google AdSense</span>
      </div>

      <div className="w-full min-h-[100px] max-h-[280px] bg-slate-100/50 dark:bg-zinc-900/30 rounded-b-lg flex items-center justify-center overflow-hidden border border-t-0 border-slate-200/50 dark:border-zinc-800/60 p-2">
        <ins
          ref={adRef}
          className="adsbygoogle"
          style={{ display: "block", width: "100%", textAlign: "center" }}
          data-ad-client={ADSENSE_CLIENT_ID}
          {...(slot ? { "data-ad-slot": slot } : {})}
          data-ad-format={format}
          data-full-width-responsive={responsive ? "true" : "false"}
        />
      </div>
    </aside>
  );
}
