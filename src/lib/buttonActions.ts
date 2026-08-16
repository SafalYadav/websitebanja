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
    lower.startsWith("https://wa.me/")
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
  const targetId = sectionKey.startsWith("wb-section-")
    ? sectionKey
    : `wb-section-${sectionKey.replace(/^#/, "")}`;

  const targetElement = document.getElementById(targetId);
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
  e?: React.MouseEvent
): void {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  if (!action || action.type === "none") {
    scrollToSection(fallbackScrollTarget);
    return;
  }

  switch (action.type) {
    case "scroll": {
      const target = action.target || fallbackScrollTarget;
      scrollToSection(target);
      break;
    }
    case "url": {
      if (action.target) {
        const safeUrl = sanitizeActionUrl(action.target);
        if (safeUrl && safeUrl !== "#") {
          window.open(safeUrl, "_blank", "noopener,noreferrer");
        }
      }
      break;
    }
    case "whatsapp": {
      const cleanPhone = (action.target || "+919876543210").replace(/[^0-9]/g, "");
      const msg = encodeURIComponent("Hello! I would like to inquire about your services.");
      window.open(`https://wa.me/${cleanPhone}?text=${msg}`, "_blank", "noopener,noreferrer");
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
      if (action.target) {
        window.location.href = `mailto:${action.target.trim()}`;
      }
      break;
    }
    default: {
      scrollToSection(fallbackScrollTarget);
      break;
    }
  }
}
