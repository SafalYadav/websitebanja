import type { ButtonActionConfig } from "@/types/website";

/**
 * Sanitizes URLs to prevent XSS (blocks javascript:, vbscript:, data:).
 */
export function sanitizeActionUrl(url: string): string {
  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();

  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("vbscript:") ||
    lower.startsWith("data:text/html")
  ) {
    return "#";
  }

  if (
    lower.startsWith("http://") ||
    lower.startsWith("https://") ||
    lower.startsWith("tel:") ||
    lower.startsWith("mailto:") ||
    lower.startsWith("https://wa.me/") ||
    lower.startsWith("/")
  ) {
    return trimmed;
  }

  // Prepend https:// if standard domain without protocol
  if (trimmed.includes(".") && !trimmed.startsWith("/")) {
    return `https://${trimmed}`;
  }

  return trimmed;
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
    targetElement = document.querySelector(`[id^="wb-section-${cleanKey}"]`) as HTMLElement | null;
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
  context?: { siteSlug?: string; onSwitchPage?: (pageIdOrSlug: string) => void }
): void {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  // If no action defined at all, fall back to default scroll
  if (!action) {
    scrollToSection(fallbackScrollTarget);
    return;
  }

  // If action is explicitly "none", do nothing
  if (action.type === "none") {
    return;
  }

  switch (action.type) {
    case "scroll": {
      const target = action.target || fallbackScrollTarget;
      scrollToSection(target);
      break;
    }
    case "page": {
      const targetPage = (action.target || "").trim();
      if (context?.onSwitchPage) {
        context.onSwitchPage(targetPage);
      } else if (context?.siteSlug) {
        const dest = targetPage === "home" || !targetPage ? `/p/${context.siteSlug}` : `/p/${context.siteSlug}/${targetPage}`;
        window.location.href = dest;
      }
      break;
    }
    case "url": {
      const rawTarget = (action.target || "").trim();
      if (rawTarget) {
        const safeUrl = sanitizeActionUrl(rawTarget);
        if (safeUrl && safeUrl !== "#") {
          window.open(safeUrl, "_blank", "noopener,noreferrer");
        }
      }
      break;
    }
    case "whatsapp": {
      const cleanPhone = (action.target || "").replace(/[^0-9]/g, "");
      if (cleanPhone) {
        const msg = encodeURIComponent("Hello! I would like to inquire about your services.");
        window.open(`https://wa.me/${cleanPhone}?text=${msg}`, "_blank", "noopener,noreferrer");
      }
      break;
    }
    case "call": {
      const cleanPhone = (action.target || "").replace(/[^0-9+]/g, "");
      if (cleanPhone) {
        window.location.href = `tel:${cleanPhone}`;
      }
      break;
    }
    case "email": {
      const cleanEmail = (action.target || "").trim();
      if (cleanEmail) {
        window.location.href = `mailto:${cleanEmail}`;
      }
      break;
    }
    default: {
      break;
    }
  }
}
