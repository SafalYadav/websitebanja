import type { ButtonActionConfig } from "@/types/website";
import { resolveSectionTarget } from "./intelligence/planning/sectionOrder";

export function buttonActionAttributes(action: ButtonActionConfig | undefined, fallback: string, sectionOrder: string[] = []) {
  const type = action?.type || "scroll";
  return { "data-wb-action": type, "data-wb-action-target": type === "scroll"
    ? resolveSectionTarget(action?.target || fallback, sectionOrder) : action?.target || "" };
}

/**
 * Sanitizes URLs to prevent XSS (blocks javascript:, vbscript:, data:).
 */
export function sanitizeActionUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed || /[\u0000-\u0020\u007f\\]/.test(trimmed)) return "#";
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed;
  try {
    const explicitScheme = /^[a-z][a-z\d+.-]*:/i.test(trimmed);
    if (!explicitScheme && !trimmed.includes(".")) return "#";
    const candidate = explicitScheme ? trimmed : `https://${trimmed}`;
    const parsed = new URL(candidate);
    if (!["https:", "http:", "tel:", "mailto:"].includes(parsed.protocol) || parsed.username || parsed.password) return "#";
    return candidate;
  } catch { return "#"; }
}

/** Cancellable observation lets private rendered QA verify real routing without external delivery. */
function navigateExternal(url: string, mode: "new_tab" | "same_tab") {
  const event = new CustomEvent("websitebanja:external-navigation", { cancelable: true, detail: { url, mode } });
  if (!document.dispatchEvent(event)) return;
  if (mode === "new_tab") window.open(url, "_blank", "noopener,noreferrer");
  else window.location.href = url;
}

/**
 * Smoothly scrolls to a section in either the Studio canvas or full viewport.
 */
export function scrollToSection(sectionKey: string): void {
  if (!sectionKey) return;
  const cleanKey = sectionKey.replace(/^#/, "").replace(/^wb-section-/, "");

  // 1. Try exact element ID
  let targetElement = document.getElementById(`wb-section-${cleanKey}`) || document.getElementById(cleanKey);

  // 2. Try prefix match (for dynamically keyed sections like services_17823901)
  if (!targetElement) {
    targetElement = Array.from(document.querySelectorAll<HTMLElement>("[id]")).find(element =>
      element.id.startsWith(`wb-section-${cleanKey}_`) || element.id.startsWith(`wb-section-${cleanKey}-`)) || null;
  }

  if (!targetElement) return;

  const canvasContainer = document.getElementById("canvas-scroll-container");
  if (canvasContainer) {
    const targetTop = targetElement.offsetTop;
    canvasContainer.scrollTo({
      top: Math.max(0, targetTop - 20),
      behavior: "smooth",
    });
  } else {
    targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

/**
 * Executes a configured button action.
 */
export function handleButtonActionClick(
  action: ButtonActionConfig | undefined,
  fallbackScrollTarget: string = "contact",
  e?: React.MouseEvent,
  context?: { siteSlug?: string; onSwitchPage?: (pageIdOrSlug: string) => void; sectionOrder?: string[] }
): void {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  // If no action defined at all, fall back to default scroll
  if (!action) {
    scrollToSection(resolveSectionTarget(fallbackScrollTarget, context?.sectionOrder || []));
    return;
  }

  // If action is explicitly "none", do nothing
  if (action.type === "none") {
    return;
  }

  switch (action.type) {
    case "scroll": {
      const target = resolveSectionTarget(action.target || fallbackScrollTarget, context?.sectionOrder || []);
      scrollToSection(target);
      break;
    }
    case "page": {
      const targetPage = (action.target || "").trim();
      if (context?.onSwitchPage) {
        context.onSwitchPage(targetPage);
      } else if (context?.siteSlug) {
        const dest = targetPage === "home" || !targetPage ? `/p/${context.siteSlug}` : `/p/${context.siteSlug}/${targetPage}`;
        navigateExternal(dest, "same_tab");
      }
      break;
    }
    case "url": {
      const rawTarget = (action.target || "").trim();
      if (rawTarget) {
        const safeUrl = sanitizeActionUrl(rawTarget);
        if (safeUrl && safeUrl !== "#") {
          navigateExternal(safeUrl, "new_tab");
        }
      }
      break;
    }
    case "whatsapp": {
      const cleanPhone = (action.target || "").replace(/[^0-9]/g, "");
      if (cleanPhone) {
        const msg = encodeURIComponent("Hello! I would like to inquire about your services.");
        navigateExternal(`https://wa.me/${cleanPhone}?text=${msg}`, "new_tab");
      }
      break;
    }
    case "call": {
      const cleanPhone = (action.target || "").replace(/[^0-9+]/g, "");
      if (cleanPhone) {
        navigateExternal(`tel:${cleanPhone}`, "same_tab");
      }
      break;
    }
    case "email": {
      const cleanEmail = (action.target || "").trim();
      if (cleanEmail) {
        navigateExternal(`mailto:${cleanEmail}`, "same_tab");
      }
      break;
    }
    default: {
      break;
    }
  }
}
