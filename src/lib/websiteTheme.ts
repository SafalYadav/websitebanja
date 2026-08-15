export interface WebsiteThemeTokens {
  primary: string;
  secondary: string;
  accent: string;
  bg: string;
  bgAlt: string;
  surface: string;
  surfaceHover: string;
  fg: string;
  muted: string;
  border: string;
  glowPrimary: string;
  glowSecondary: string;
  gradientPrimary: string;
  gradientSecondary: string;
  gradientText: string;
  gradientHeroOverlay: string;
  isDark: boolean;
  fontFamily: string;
}

interface ResolveThemeInput {
  style?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  category?: string | null;
  businessName?: string | null;
}

// Convert hex to rgb components
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let sanitized = hex.replace("#", "").trim();
  if (sanitized.length === 3) {
    sanitized = sanitized[0] + sanitized[0] + sanitized[1] + sanitized[1] + sanitized[2] + sanitized[2];
  }
  if (sanitized.length === 6) {
    const r = parseInt(sanitized.substring(0, 2), 16);
    const g = parseInt(sanitized.substring(2, 4), 16);
    const b = parseInt(sanitized.substring(4, 6), 16);
    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
      return { r, g, b };
    }
  }
  return { r: 79, g: 70, b: 229 }; // Default Indigo
}

function hexToRgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function resolveWebsiteTheme({
  style,
  primaryColor,
  secondaryColor,
  category,
  businessName,
}: ResolveThemeInput): WebsiteThemeTokens {
  const combinedContext = `${category || ""} ${businessName || ""}`.toLowerCase();
  const normalizedStyle = (style || "modern").toLowerCase();

  // 1. Resolve Primary & Secondary Colors
  const rawP = primaryColor?.trim() || "";
  const rawS = secondaryColor?.trim() || "";

  let primary = rawP.startsWith("#") ? rawP : "";
  let secondary = rawS.startsWith("#") ? rawS : "";

  // Category-tailored vibrant defaults if no colors selected
  if (!primary) {
    if (combinedContext.includes("grocery") || combinedContext.includes("supermarket") || combinedContext.includes("kirana")) {
      primary = "#16A34A"; // Fresh Emerald Green
      secondary = "#F59E0B"; // Warm Harvest Amber
    } else if (combinedContext.includes("cafe") || combinedContext.includes("coffee") || combinedContext.includes("bakery")) {
      primary = "#D97706"; // Rich Warm Amber
      secondary = "#9A3412"; // Roasted Espresso
    } else if (combinedContext.includes("restaurant") || combinedContext.includes("food") || combinedContext.includes("dining")) {
      primary = "#E11D48"; // Crimson Red
      secondary = "#FB923C"; // Warm Orange
    } else if (combinedContext.includes("gym") || combinedContext.includes("fitness") || combinedContext.includes("workout")) {
      primary = "#EA580C"; // Athletic Orange-Red
      secondary = "#4F46E5"; // Electric Indigo
    } else if (combinedContext.includes("salon") || combinedContext.includes("spa") || combinedContext.includes("beauty")) {
      primary = "#DB2777"; // Luxe Magenta / Rose
      secondary = "#9333EA"; // Velvet Purple
    } else if (combinedContext.includes("clinic") || combinedContext.includes("dental") || combinedContext.includes("medical") || combinedContext.includes("health")) {
      primary = "#0284C7"; // Medical Ocean Sky
      secondary = "#0D9488"; // Vitality Teal
    } else if (combinedContext.includes("real estate") || combinedContext.includes("architecture") || combinedContext.includes("property")) {
      primary = "#2563EB"; // Architectural Royal Blue
      secondary = "#4F46E5"; // Structure Indigo
    } else if (combinedContext.includes("agency") || combinedContext.includes("design") || combinedContext.includes("creative")) {
      primary = "#7C3AED"; // Creative Violet
      secondary = "#EC4899"; // Electric Rose
    } else if (combinedContext.includes("tech") || combinedContext.includes("saas") || combinedContext.includes("software") || combinedContext.includes("ai")) {
      primary = "#4F46E5"; // Modern Indigo
      secondary = "#06B6D4"; // Vivid Cyan
    } else {
      primary = "#3B82F6"; // Vivid Blue default
      secondary = "#8B5CF6"; // Vibrant Purple default
    }
  }

  if (!secondary) {
    secondary = "#8B5CF6";
  }

  if (primary.toLowerCase() === secondary.toLowerCase()) {
    secondary = "#8B5CF6";
  }

  const pRgb = hexToRgb(primary);
  const sRgb = hexToRgb(secondary);

  // 2. Determine if the theme should be DARK or LIGHT
  // Rule: Default is LIGHT PREMIUM. Dark is used ONLY when style explicitly specifies "dark", "night", or "dark luxury".
  const isDark =
    normalizedStyle.includes("dark") ||
    normalizedStyle.includes("night") ||
    normalizedStyle.includes("black");

  let bg: string;
  let bgAlt: string;
  let surface: string;
  let surfaceHover: string;
  let fg: string;
  let muted: string;
  let border: string;

  if (isDark) {
    // Rich Brand-Tinted Dark (NOT PURE #000!)
    const bgR = Math.min(26, Math.max(8, Math.round(pRgb.r * 0.08)));
    const bgG = Math.min(26, Math.max(8, Math.round(pRgb.g * 0.08)));
    const bgB = Math.min(32, Math.max(10, Math.round(pRgb.b * 0.1)));
    bg = `rgb(${bgR}, ${bgG}, ${bgB})`;

    const bgAltR = Math.min(34, Math.max(12, Math.round(pRgb.r * 0.11 + sRgb.r * 0.04)));
    const bgAltG = Math.min(34, Math.max(12, Math.round(pRgb.g * 0.11 + sRgb.g * 0.04)));
    const bgAltB = Math.min(42, Math.max(15, Math.round(pRgb.b * 0.14 + sRgb.b * 0.05)));
    bgAlt = `rgb(${bgAltR}, ${bgAltG}, ${bgAltB})`;

    surface = "rgba(255, 255, 255, 0.05)";
    surfaceHover = "rgba(255, 255, 255, 0.09)";
    fg = "#F8FAFC";
    muted = "#94A3B8";
    border = "rgba(255, 255, 255, 0.1)";
  } else {
    // Premium Luminous Light Palette (Soft brand-tinted luminous canvas)
    // Blend primary RGB gently into clean white (5-8% tint for luxurious atmosphere)
    const tintR = Math.round(255 - (255 - pRgb.r) * 0.04);
    const tintG = Math.round(255 - (255 - pRgb.g) * 0.04);
    const tintB = Math.round(255 - (255 - pRgb.b) * 0.04);
    bg = `rgb(${tintR}, ${tintG}, ${tintB})`;

    const altR = Math.round(255 - (255 - pRgb.r) * 0.08 - (255 - sRgb.r) * 0.03);
    const altG = Math.round(255 - (255 - pRgb.g) * 0.08 - (255 - sRgb.g) * 0.03);
    const altB = Math.round(255 - (255 - pRgb.b) * 0.08 - (255 - sRgb.b) * 0.03);
    bgAlt = `rgb(${altR}, ${altG}, ${altB})`;

    surface = "rgba(255, 255, 255, 0.88)";
    surfaceHover = "#FFFFFF";
    fg = "#0F172A"; // Crisp slate 900
    muted = "#475569"; // Slate 600 for high legibility
    border = "rgba(0, 0, 0, 0.08)";
  }

  const accent = "#38BDF8";
  const glowPrimary = hexToRgba(primary, isDark ? 0.3 : 0.18);
  const glowSecondary = hexToRgba(secondary, isDark ? 0.22 : 0.14);
  const gradientPrimary = `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`;
  const gradientSecondary = `linear-gradient(135deg, ${secondary} 0%, ${primary} 100%)`;
  const gradientText = isDark
    ? `linear-gradient(135deg, #FFFFFF 40%, ${primary} 80%, ${secondary} 100%)`
    : `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`;
  const gradientHeroOverlay = `radial-gradient(ellipse 90% 70% at 50% -10%, ${hexToRgba(primary, isDark ? 0.35 : 0.2)}, ${hexToRgba(secondary, isDark ? 0.15 : 0.08)} 60%, transparent 90%)`;

  return {
    primary,
    secondary,
    accent,
    bg,
    bgAlt,
    surface,
    surfaceHover,
    fg,
    muted,
    border,
    glowPrimary,
    glowSecondary,
    gradientPrimary,
    gradientSecondary,
    gradientText,
    gradientHeroOverlay,
    isDark,
    fontFamily: "var(--font-sans), system-ui, -apple-system, sans-serif",
  };
}
