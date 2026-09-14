"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect, useState } from "react";

const ADSENSE_CLIENT_ID = "ca-pub-6886166249093676";
const COOKIE_STORAGE_KEY = "wb_cookie_consent_v1";

/**
 * Authoritative list of routes where ads must NEVER be shown or loaded.
 * Ensures ads never interfere with creation, editing, authentication, checkout, or account management.
 */
const EXCLUDED_ROUTES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/auth",
  "/dashboard",
  "/builder",
  "/editor",
  "/studio",
  "/admin",
  "/agent",
  "/preview",
  "/pricing",
  "/checkout",
  "/account",
  "/settings",
  "/p/", // User-published websites
];

export function isAdSenseAllowedOnRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  const cleanPath = pathname.toLowerCase();

  // If path exactly equals or starts with an excluded route, ads are forbidden
  for (const excluded of EXCLUDED_ROUTES) {
    if (cleanPath === excluded || cleanPath.startsWith(excluded + "/") || cleanPath.startsWith(excluded)) {
      return false;
    }
  }

  return true;
}

export default function AdSenseScript() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const isAllowed = isAdSenseAllowedOnRoute(pathname);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);

    if (typeof window !== "undefined") {
      try {
        const storedConsent = localStorage.getItem(COOKIE_STORAGE_KEY);
        if (storedConsent) {
          const parsed = JSON.parse(storedConsent);
          // If user selected Essential Only (no analytics/functional), request non-personalized ads
          if (!parsed.analytics && !parsed.functional) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ((window as any).adsbygoogle = (window as any).adsbygoogle || []).requestNonPersonalizedAds = 1;
          }
        }
      } catch {
        // Safe fallback
      }
    }
  }, [pathname]);

  if (!mounted || !isAllowed) {
    return null;
  }

  return (
    <Script
      id="google-adsense-script"
      strategy="afterInteractive"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
      crossOrigin="anonymous"
    />
  );
}
