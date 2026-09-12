"use client";

import React, { useState, useEffect, useCallback } from "react";
import { FaShieldHalved, FaCheck, FaXmark, FaSliders } from "react-icons/fa6";

export interface CookiePreferences {
  necessary: boolean;
  functional: boolean;
  analytics: boolean;
  timestamp: string;
}

const STORAGE_KEY = "wb_cookie_consent_v1";
const OPEN_EVENT = "wb:open-cookie-settings";

export default function CookieConsent() {
  const [mounted, setMounted] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [functional, setFunctional] = useState(true);
  const [analytics, setAnalytics] = useState(false);

  // Initialize from localStorage on client mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as CookiePreferences;
        setFunctional(Boolean(parsed.functional));
        setAnalytics(Boolean(parsed.analytics));
      } else {
        // First-time visitor: reveal banner
        setShowBanner(true);
      }
    } catch {
      setShowBanner(true);
    }

    const handleOpenSettings = () => {
      setShowModal(true);
    };

    window.addEventListener(OPEN_EVENT, handleOpenSettings);
    return () => {
      window.removeEventListener(OPEN_EVENT, handleOpenSettings);
    };
  }, []);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showModal) {
        setShowModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showModal]);

  const saveConsent = useCallback(
    (prefs: { functional: boolean; analytics: boolean }) => {
      const payload: CookiePreferences = {
        necessary: true,
        functional: prefs.functional,
        analytics: prefs.analytics,
        timestamp: new Date().toISOString(),
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      } catch (e) {
        console.warn("Could not save cookie preferences to localStorage:", e);
      }
      setFunctional(prefs.functional);
      setAnalytics(prefs.analytics);
      setShowBanner(false);
      setShowModal(false);
    },
    []
  );

  const handleAcceptAll = () => {
    saveConsent({ functional: true, analytics: true });
  };

  const handleEssentialOnly = () => {
    saveConsent({ functional: false, analytics: false });
  };

  const handleSaveCustom = () => {
    saveConsent({ functional, analytics });
  };

  if (!mounted) return null;

  return (
    <>
      {/* 1. Bottom / Corner Floating Banner */}
      {showBanner && !showModal && (
        <aside
          role="region"
          aria-label="Cookie and Privacy Consent"
          className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-4xl animate-in fade-in slide-in-from-bottom-5 duration-300 sm:bottom-6 sm:left-6 sm:right-6"
        >
          <div className="relative overflow-hidden rounded-2xl border border-zinc-200/90 bg-white/95 p-5 shadow-2xl backdrop-blur-md dark:border-white/10 dark:bg-zinc-950/95 sm:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-400">
                  <FaShieldHalved className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
                    Privacy & Cookie Preferences
                  </h3>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-2xl">
                    We use cookies to maintain your session, keep the studio responsive, and save your preferences.
                    We do not load invasive third-party ad trackers or cross-site tracking scripts.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-200 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition cursor-pointer"
                >
                  <FaSliders className="h-3 w-3" />
                  <span>Customize</span>
                </button>
                <button
                  type="button"
                  onClick={handleEssentialOnly}
                  className="rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition cursor-pointer"
                >
                  Essential Only
                </button>
                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="rounded-xl bg-cyan-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-cyan-500 dark:bg-cyan-500 dark:hover:bg-cyan-400 dark:text-black transition cursor-pointer"
                >
                  Accept All
                </button>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* 2. Detailed Preferences Modal */}
      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cookie-preferences-title"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-zinc-950 sm:p-7">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-400">
                  <FaSliders className="h-4 w-4" />
                </div>
                <div>
                  <h2
                    id="cookie-preferences-title"
                    className="text-base font-semibold text-zinc-900 dark:text-white"
                  >
                    Cookie Settings
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Control how WebsiteBanja stores data in your browser.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                aria-label="Close cookie settings"
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-900 dark:hover:text-zinc-200 transition cursor-pointer"
              >
                <FaXmark className="h-5 w-5" />
              </button>
            </div>

            {/* Categories */}
            <div className="my-5 space-y-4 text-left">
              {/* Strictly Necessary */}
              <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/60 p-4 dark:border-white/10 dark:bg-zinc-900/40">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-zinc-900 dark:text-white">
                        Strictly Necessary
                      </span>
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                        Always Active
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      Essential for logging in, Supabase authentication, CSRF security, and retaining your active studio project state. Cannot be switched off.
                    </p>
                  </div>
                  <div className="shrink-0 pt-0.5">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                      <FaCheck className="h-3 w-3" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Functional */}
              <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/60 p-4 dark:border-white/10 dark:bg-zinc-900/40">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-zinc-900 dark:text-white">
                      Functional & UI Preferences
                    </span>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      Preserves your theme mode (light/dark), studio sidebar layout, and audio mute state across sessions.
                    </p>
                  </div>
                  <label className="relative inline-flex shrink-0 cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={functional}
                      onChange={(e) => setFunctional(e.target.checked)}
                      className="sr-only peer"
                      aria-label="Toggle Functional cookies"
                    />
                    <div className="h-6 w-11 rounded-full bg-zinc-200 peer-focus:outline-hidden dark:bg-zinc-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600 dark:peer-checked:bg-cyan-500"></div>
                  </label>
                </div>
              </div>

              {/* Analytics */}
              <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/60 p-4 dark:border-white/10 dark:bg-zinc-900/40">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-zinc-900 dark:text-white">
                        Performance Telemetry
                      </span>
                      <span className="rounded-full bg-zinc-200/80 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                        Zero Ad Tracking
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      First-party aggregated metrics to monitor studio generation latency and error rates. No third-party marketing tags, Facebook pixels, or Google Ads cookies are ever utilized.
                    </p>
                  </div>
                  <label className="relative inline-flex shrink-0 cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={analytics}
                      onChange={(e) => setAnalytics(e.target.checked)}
                      className="sr-only peer"
                      aria-label="Toggle Analytics telemetry"
                    />
                    <div className="h-6 w-11 rounded-full bg-zinc-200 peer-focus:outline-hidden dark:bg-zinc-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600 dark:peer-checked:bg-cyan-500"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end border-t border-zinc-100 pt-4 dark:border-white/10">
              <button
                type="button"
                onClick={handleEssentialOnly}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition cursor-pointer"
              >
                Reject Non-Essential
              </button>
              <button
                type="button"
                onClick={handleSaveCustom}
                className="rounded-xl border border-cyan-500/40 bg-cyan-50 px-4 py-2.5 text-xs font-semibold text-cyan-700 hover:bg-cyan-100 dark:border-cyan-500/30 dark:bg-cyan-950/40 dark:text-cyan-300 dark:hover:bg-cyan-900/50 transition cursor-pointer"
              >
                Save Preferences
              </button>
              <button
                type="button"
                onClick={handleAcceptAll}
                className="rounded-xl bg-cyan-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-cyan-500 dark:bg-cyan-500 dark:hover:bg-cyan-400 dark:text-black transition cursor-pointer"
              >
                Accept All
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
