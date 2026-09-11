// src/lib/skills/skillRegistry.ts
import fs from "fs";
import path from "path";
import type { SkillId, SkillMetadata, SkillSelectionContext } from "./types";

// WHY file-based cache with mtimeMs invalidation: Skill documents are read on every
// generation request. Reading 19 markdown files from disk per request is wasteful.
// We cache content keyed by absolute path and invalidate when the file's modification
// timestamp changes, so skill edits take effect immediately without server restart.
interface SkillFileCache {
  content: string;
  mtime: number;
}

const fileCache = new Map<string, SkillFileCache>();

const ALL_SKILL_METADATA: SkillMetadata[] = [
  // Foundational Core Skills
  {
    id: "ui-ux",
    name: "UI/UX Design Intelligence",
    description: "Foundational visual hierarchy, 3-second rule, 8pt spatial rhythm, WCAG 2.2 contrast, and conversion architecture.",
    filePath: path.resolve(process.cwd(), "skills", "ui-ux", "skill.md"),
    version: "1.0.0",
    priority: 1,
    categoryGroup: "foundational",
    tags: ["hierarchy", "typography", "spacing", "accessibility", "conversion", "layout"],
    performanceSensitivity: "low",
    accessibilitySensitivity: "critical",
  },
  {
    id: "design-systems",
    name: "Design Systems & Tokens",
    description: "Design token architecture, 8pt mathematical rhythm, semantic color roles, border radius, and elevation tokens.",
    filePath: path.resolve(process.cwd(), "skills", "design-systems", "skill.md"),
    version: "1.0.0",
    priority: 2,
    categoryGroup: "foundational",
    tags: ["tokens", "variables", "elevation", "radius", "spacing", "color-system"],
    performanceSensitivity: "low",
    accessibilitySensitivity: "high",
  },
  {
    id: "typography",
    name: "Typography Engineering",
    description: "Font pairing personalities, modular typographic scale, optical tracking/leading, and fluid clamp() rules.",
    filePath: path.resolve(process.cwd(), "skills", "typography", "skill.md"),
    version: "1.0.0",
    priority: 3,
    categoryGroup: "foundational",
    tags: ["fonts", "scale", "leading", "tracking", "readability", "hierarchy"],
    performanceSensitivity: "low",
    accessibilitySensitivity: "critical",
  },
  {
    id: "responsive-design",
    name: "Responsive & Mobile-First Design",
    description: "Mobile-first thumb-zone ergonomics, fluid grid reflows, 44x44px touch targets, and zero-overflow rules.",
    filePath: path.resolve(process.cwd(), "skills", "responsive-design", "skill.md"),
    version: "1.0.0",
    priority: 4,
    categoryGroup: "foundational",
    tags: ["mobile-first", "breakpoints", "touch-targets", "reflow", "layout"],
    performanceSensitivity: "medium",
    accessibilitySensitivity: "critical",
  },
  {
    id: "accessibility",
    name: "Accessibility & WCAG 2.2 Compliance",
    description: "Inclusive design floor, WCAG 2.2 AA contrast (4.5:1), keyboard navigation, focus rings, single H1, and ARIA discipline.",
    filePath: path.resolve(process.cwd(), "skills", "accessibility", "skill.md"),
    version: "1.0.0",
    priority: 5,
    categoryGroup: "foundational",
    tags: ["wcag", "aria", "keyboard", "contrast", "screen-readers", "semantics"],
    performanceSensitivity: "low",
    accessibilitySensitivity: "critical",
  },
  {
    id: "ux-psychology",
    name: "UX Psychology & Cognitive Architecture",
    description: "Hick's Law choice limits, Fitts's Law spatial targets, Miller's Law chunking, Jakob's Law, and zero dark patterns.",
    filePath: path.resolve(process.cwd(), "skills", "ux-psychology", "skill.md"),
    version: "1.0.0",
    priority: 6,
    categoryGroup: "foundational",
    tags: ["cognitive-load", "hicks-law", "fittss-law", "gestalt", "ethical-ux"],
    performanceSensitivity: "low",
    accessibilitySensitivity: "high",
  },
  {
    id: "interaction-design",
    name: "Interaction Design & State Machines",
    description: "8-state component completeness (hover, focus, active, loading, disabled, error, empty), and tactile micro-feedback.",
    filePath: path.resolve(process.cwd(), "skills", "interaction-design", "skill.md"),
    version: "1.0.0",
    priority: 7,
    categoryGroup: "foundational",
    tags: ["states", "micro-interactions", "feedback", "modals", "drawers", "affordances"],
    performanceSensitivity: "low",
    accessibilitySensitivity: "high",
  },
  {
    id: "creative-art-direction",
    name: "Creative Art Direction & Visual Tone",
    description: "Cohesive aesthetic archetypes (Minimalist, Editorial, Dark Ambient, Neo-Brutalist, Organic, Enterprise).",
    filePath: path.resolve(process.cwd(), "skills", "creative-art-direction", "skill.md"),
    version: "1.0.0",
    priority: 8,
    categoryGroup: "foundational",
    tags: ["art-direction", "branding", "mood", "archetypes", "aesthetic"],
    performanceSensitivity: "low",
    accessibilitySensitivity: "medium",
  },

  // Optimization & Search Skills
  {
    id: "cro",
    name: "Conversion Rate Optimization (CRO)",
    description: "Value proposition clarity, above-the-fold CTA dominance, friction reduction, trust anchors, and objection handling.",
    filePath: path.resolve(process.cwd(), "skills", "cro", "skill.md"),
    version: "1.0.0",
    priority: 9,
    categoryGroup: "optimization",
    tags: ["conversion", "funnel", "cta", "trust", "friction-reduction", "objections"],
    performanceSensitivity: "low",
    accessibilitySensitivity: "high",
  },
  {
    id: "seo",
    name: "SEO & Search Architecture",
    description: "Semantic HTML structure, benefit-driven title tags, meta descriptions, Schema.org JSON-LD, and NAP consistency.",
    filePath: path.resolve(process.cwd(), "skills", "seo", "skill.md"),
    version: "1.0.0",
    priority: 10,
    categoryGroup: "optimization",
    tags: ["seo", "schema-org", "metadata", "crawlability", "local-seo"],
    performanceSensitivity: "low",
    accessibilitySensitivity: "high",
  },
  {
    id: "performance",
    name: "Web Performance & Core Web Vitals",
    description: "Core Web Vitals budgets (LCP < 2.5s, CLS < 0.1), explicit image dimensions, bundle splitting, and GPU compositing.",
    filePath: path.resolve(process.cwd(), "skills", "performance", "skill.md"),
    version: "1.0.0",
    priority: 11,
    categoryGroup: "optimization",
    tags: ["performance", "core-web-vitals", "lcp", "cls", "lazy-loading", "compositor"],
    performanceSensitivity: "critical",
    accessibilitySensitivity: "medium",
  },
  {
    id: "industry-intelligence",
    name: "Industry & Vertical Intelligence",
    description: "Sector-specific customer intent mapping, tailored conversion goals, and information hierarchies across 15+ verticals.",
    filePath: path.resolve(process.cwd(), "skills", "industry-intelligence", "skill.md"),
    version: "1.0.0",
    priority: 12,
    categoryGroup: "domain",
    tags: ["verticals", "restaurant", "saas", "trades", "clinic", "legal", "portfolio"],
    performanceSensitivity: "low",
    accessibilitySensitivity: "medium",
  },

  // Modern Component & Animation Skills
  {
    id: "21st-dev",
    name: "21st.dev Component Architecture",
    description: "Modern tactile surfaces, ambient lighting, bento grids, modern hero archetypes, pricing tables, and tokens.",
    filePath: path.resolve(process.cwd(), "skills", "21st-dev", "skill.md"),
    version: "1.0.0",
    priority: 13,
    categoryGroup: "component",
    tags: ["bento-grid", "ambient-glow", "components", "pricing", "tactile-borders", "modern-hero"],
    performanceSensitivity: "medium",
    accessibilitySensitivity: "high",
  },
  {
    id: "framer-motion",
    name: "Framer Motion Physics & Choreography",
    description: "Spring physics, layout transitions, gesture feedback, scroll animations, and reduced-motion accessibility.",
    filePath: path.resolve(process.cwd(), "skills", "framer-motion", "skill.md"),
    version: "1.0.0",
    priority: 14,
    categoryGroup: "animation",
    tags: ["animation", "springs", "transitions", "gestures", "scroll", "reduced-motion"],
    performanceSensitivity: "high",
    accessibilitySensitivity: "critical",
  },
  {
    id: "gsap",
    name: "GSAP & Advanced Web Animation",
    description: "Timeline sequencing, ScrollTrigger scrubbing, section pinning, SplitText character reveals, and lifecycle cleanup.",
    filePath: path.resolve(process.cwd(), "skills", "gsap", "skill.md"),
    version: "1.0.0",
    priority: 15,
    categoryGroup: "animation",
    tags: ["gsap", "timeline", "scrolltrigger", "pinning", "scrollytelling", "splittext"],
    performanceSensitivity: "high",
    accessibilitySensitivity: "critical",
  },
  {
    id: "threejs",
    name: "Three.js & 3D Web Experiences",
    description: "Hardware-budgeted WebGL 3D scenes, glTF PBR materials, dynamic SSR isolation, and mobile poster fallbacks.",
    filePath: path.resolve(process.cwd(), "skills", "threejs", "skill.md"),
    version: "1.0.0",
    priority: 16,
    categoryGroup: "specialized",
    tags: ["3d", "webgl", "shaders", "particles", "gltf", "mobile-fallback"],
    performanceSensitivity: "critical",
    accessibilitySensitivity: "high",
  },

  // Domain Specialization Skills
  {
    id: "data-visualization",
    name: "Data Visualization & Dashboards",
    description: "Tufte graphical integrity, truthful chart selection (line, bar, donut), KPI sparkline cards, and colorblind palettes.",
    filePath: path.resolve(process.cwd(), "skills", "data-visualization", "skill.md"),
    version: "1.0.0",
    priority: 17,
    categoryGroup: "specialized",
    tags: ["charts", "dashboards", "kpi", "analytics", "data-viz", "colorblind-safe"],
    performanceSensitivity: "medium",
    accessibilitySensitivity: "critical",
  },
  {
    id: "saas-ux",
    name: "SaaS UX & Product Architecture",
    description: "Time-to-Value optimization, collapsible sidebars, Cmd+K command palettes, usage meters, and self-serve billing.",
    filePath: path.resolve(process.cwd(), "skills", "saas-ux", "skill.md"),
    version: "1.0.0",
    priority: 18,
    categoryGroup: "domain",
    tags: ["saas", "dashboard", "onboarding", "billing", "permissions", "command-palette"],
    performanceSensitivity: "medium",
    accessibilitySensitivity: "high",
  },
  {
    id: "ecommerce-ux",
    name: "E-Commerce UX & Conversion Architecture",
    description: "Faceted search & filtering, high-converting product cards, PDP buy box architecture, guest checkout, and mini-carts.",
    filePath: path.resolve(process.cwd(), "skills", "ecommerce-ux", "skill.md"),
    version: "1.0.0",
    priority: 19,
    categoryGroup: "domain",
    tags: ["ecommerce", "pdp", "checkout", "cart", "products", "filters", "mobile-commerce"],
    performanceSensitivity: "high",
    accessibilitySensitivity: "high",
  },
  {
    id: "spatial-interaction",
    name: "3D & Spatial Scroll Interaction Intelligence",
    description: "Multi-plane CSS 3D depth, perspective, rotation, docking, mobile 2.5D fallbacks, and reduced-motion compliance.",
    filePath: path.resolve(process.cwd(), "skills", "spatial-interaction", "skill.md"),
    version: "1.0.0",
    priority: 20,
    categoryGroup: "animation",
    tags: ["3d", "spatial", "perspective", "preserve-3d", "tilt", "scroll-depth", "docking", "mobile-fallback"],
    performanceSensitivity: "critical",
    accessibilitySensitivity: "critical",
  },
];

// WHY SKILL.md vs skill.md: The master orchestrator uses SKILL.md (uppercase) to match
// the Antigravity/AGY skill convention. The 19 specialized skills use skill.md (lowercase)
// because they were authored as WebsiteBanja-internal design documents, not AGY skills.
// Both conventions work — the registry explicitly specifies each file path.
export const MASTER_SKILL_METADATA: SkillMetadata = {
  id: "master-design-intelligence",
  name: "Master Design Intelligence Orchestrator",
  description: "Master Design Intelligence Orchestrator. Analyzes business requirements, resolves conflicts, enforces strict user priority hierarchy, and coordinates specialized design skills without context bloating.",
  filePath: path.resolve(process.cwd(), "skills", "master-design-intelligence", "SKILL.md"),
  version: "1.0.0",
  priority: 0,
  categoryGroup: "specialized",
  tags: ["orchestrator", "conflict-resolution", "priority", "master"],
  performanceSensitivity: "low",
  accessibilitySensitivity: "critical",
  openaiName: "websitebanja-master-design-intelligence",
};

const REGISTERED_SKILLS: Map<SkillId, SkillMetadata> = new Map(
  ALL_SKILL_METADATA.map((skill) => [skill.id, skill])
);

/**
 * Returns the Master Design Intelligence Orchestration metadata.
 */
export function getMasterSkillMetadata(): SkillMetadata {
  return { ...MASTER_SKILL_METADATA };
}

/**
 * Registers an additional skill dynamically into the engine.
 * Ensures the architecture is completely extensible for future design intelligence sources.
 */
export function registerSkill(meta: SkillMetadata): void {
  REGISTERED_SKILLS.set(meta.id, meta);
}

/**
 * Returns all currently registered skill definitions ordered by priority,
 * enriched with OpenAI Hosted Skill IDs and versions when available.
 */
export function getRegisteredSkills(): SkillMetadata[] {
  let manifestSkills: Record<string, any> = {};
  try {
    const manifestPath = path.resolve(process.cwd(), "skills", "openai-manifest.json");
    if (fs.existsSync(manifestPath)) {
      const raw = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      manifestSkills = raw.skills || {};
    }
  } catch {
    // Fall back to baseline metadata if manifest read fails
  }

  return Array.from(REGISTERED_SKILLS.values())
    .map((skill) => {
      const hosted = manifestSkills[skill.id];
      if (hosted && hosted.hostedSkillId) {
        return {
          ...skill,
          hostedSkillId: hosted.hostedSkillId,
          hostedVersion: hosted.hostedVersion || undefined,
          openaiName: hosted.openaiName,
        };
      }
      return skill;
    })
    .sort((a, b) => a.priority - b.priority);
}

/**
 * Returns metadata for a specific registered skill.
 */
export function getSkillMetadata(skillId: SkillId): SkillMetadata | undefined {
  if (skillId === "master-design-intelligence") return MASTER_SKILL_METADATA;
  return getRegisteredSkills().find((s) => s.id === skillId);
}

/**
 * Reads and caches the raw markdown document of any registered skill.
 * Uses filesystem modification timestamp (mtimeMs) to invalidate cache safely on edits.
 */
export function loadSkillContent(skillId: SkillId): string {
  const meta = REGISTERED_SKILLS.get(skillId);
  const targetPath = meta?.filePath || path.resolve(process.cwd(), "skills", skillId, "skill.md");

  try {
    if (!fs.existsSync(targetPath)) {
      console.warn(`[SkillRegistry] Skill document not found at: ${targetPath}`);
      return "";
    }

    const stat = fs.statSync(targetPath);
    const cached = fileCache.get(targetPath);

    if (!cached || cached.mtime !== stat.mtimeMs) {
      const content = fs.readFileSync(targetPath, "utf-8");
      fileCache.set(targetPath, {
        content,
        mtime: stat.mtimeMs,
      });
      return content;
    }

    return cached.content;
  } catch (err) {
    console.error(`[SkillRegistry] Error reading skill document for "${skillId}":`, err);
    return "";
  }
}

/**
 * Generates tailored prompt directives for a given skill based on the selection context.
 */
export function generateSkillGuidance(skillId: SkillId, context: SkillSelectionContext): string {
  const category = context.category || "business";
  const style = context.style || "modern, clean";
  const businessName = context.businessName || "the business";

  switch (skillId) {
    case "ui-ux":
      return `
[UI/UX DESIGN DIRECTIVES - skills/ui-ux/skill.md]
- Visual Hierarchy: 3-second scanning rule. Headline clearly states value proposition for ${category}; subtitle addresses user pain points.
- Aesthetic Style: Embody a ${style} aesthetic with clean visual balance.
- Action-Oriented CTAs: Use high-intent verbs tailored to ${category} (e.g. "Reserve A Table", "Explore Plans", "Book Free Audit").
- Typography & Spacing: Strict 8pt spatial rhythm (p-4, p-6, p-8, p-12). Headline-to-body optical contrast. Line length capped at 65-75 chars.
- 60-30-10 Color Balance: 60% neutral surface, 30% structural cards/borders, 10% high-intent accent.
- Vector Icon Discipline: STRICTLY FORBIDDEN to use decorative emojis (🚀, 💡, 🔥, ⭐, etc.) in buttons, headers, or nav. Use Lucide SVG icons.
- Accessibility: Minimum 4.5:1 text contrast, complete contact details, and authentic FAQs.
`.trim();

    case "design-systems":
      return `
[DESIGN SYSTEMS & TOKENS - skills/design-systems/skill.md]
- Mathematical Spatial Rhythm: All paddings, margins, and gaps must follow the 8pt scale (4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px).
- Semantic Tokens: Use semantic color tokens (--wb-bg, --wb-fg, --wb-primary, --wb-border, --wb-surface). Never invent arbitrary uncoordinated hex colors.
- Radius Consistency: Apply consistent border-radius across cards, buttons, and inputs matching the ${style} aesthetic.
- Elevation: Use subtle borders and diffused shadows rather than harsh black drop shadows.
`.trim();

    case "typography":
      return `
[TYPOGRAPHY ENGINEERING - skills/typography/skill.md]
- Font Pairings: Pair an expressive Display headline font with an ultra-legible Body font matching ${category}.
- Modular Scale: Enforce a strict typographic hierarchy (Display -> H1 -> H2 -> H3 -> Body -> Micro).
- Optical Leading & Tracking: Tight tracking (-0.02em to -0.03em) on large headlines; wider tracking (+0.05em) on small uppercase badges.
- Measure: Limit body prose to 45-75 characters per line (max-w-prose / max-w-2xl) to prevent reader fatigue.
`.trim();

    case "responsive-design":
      return `
[RESPONSIVE DESIGN - skills/responsive-design/skill.md]
- Mobile-First Reasoning: Design intentionally for small screens rather than merely shrinking desktop views.
- Touch Targets: Interactive buttons and links must meet minimum 44x44px touch boundaries with surrounding clearance.
- Grid Reflow: Multi-column desktop grids collapse to 1 or 2 columns on mobile.
- Zero Horizontal Overflow: Guarantee zero horizontal scrollbar blowout across all viewports (375px to 1440px).
- Navigation: Desktop header collapses to an accessible mobile drawer on screens < 768px.
`.trim();

    case "accessibility":
      return `
[ACCESSIBILITY & WCAG 2.2 - skills/accessibility/skill.md]
- Contrast Law: Minimum 4.5:1 contrast for normal body text; 3:0:1 for large display headlines and UI borders.
- Heading Integrity: Exactly one <h1> tag per page, followed by an unbroken heading hierarchy (H1 -> H2 -> H3).
- Focus States: Maintain high-visibility focus rings (focus-visible:ring-2 focus-visible:ring-primary) for keyboard navigation.
- Native Semantics: Prefer native HTML elements (<button>, <nav>, <header>) over custom synthetic ARIA divs.
- Form Accessibility: Explicit <label htmlFor="..."> associations on every form field.
`.trim();

    case "ux-psychology":
      return `
[UX PSYCHOLOGY & COGNITIVE ARCHITECTURE - skills/ux-psychology/skill.md]
- Hick's Law: Limit choices at key decision points. Offer 1 primary CTA and at most 1 secondary CTA in the hero section.
- Fitts's Law: Make primary conversion targets physically prominent and thumb-accessible on mobile.
- Miller's Law: Chunk dense features into 3 to 5 thematic groups rather than long overwhelming lists.
- Jakob's Law: Adhere to familiar platform conventions (top-left logo, top-right contact/cart).
- Zero Dark Patterns: Strictly forbid fake countdown timers, hidden fees, or manipulative confirm-shaming.
`.trim();

    case "interaction-design":
      return `
[INTERACTION DESIGN & STATES - skills/interaction-design/skill.md]
- State Completeness: Define clear states for rest, hover, focus-visible, active/pressed, loading, disabled, and error.
- Tactile Micro-Interactions: Micro-elevation (translate-y-[-1px]) and border illumination on hover with 150ms smooth transitions.
- Dialog Discipline: Modals and slide-out sheets must support Escape key dismissal and click-outside closing.
- Non-Destructive Errors: Preserve entered form data during validation failures; provide clear inline error text.
`.trim();

    case "creative-art-direction":
      return `
[CREATIVE ART DIRECTION - skills/creative-art-direction/skill.md]
- Bespoke Art Direction: Embody a distinct visual soul tailored to "${businessName}" (${category}). Avoid generic cookie-cutter templates.
- Cohesive Archetype: Harmonize typography, color temperature, border styles, and whitespace to express the intended brand emotion.
- Whitespace Cushioning: Use generous vertical cushions (py-20 to py-32) to let premium content breathe.
`.trim();

    case "cro":
      return `
[CONVERSION RATE OPTIMIZATION - skills/cro/skill.md]
- Sector-Specific CTA: Primary action must match the vertical (${category}) using active verbs (e.g. "Reserve A Table", "Start Free Trial", "Book Free Inspection").
- Above-The-Fold Clarity: State what the business offers and for whom within 3 seconds; position an immediate proof badge adjacent to the CTA.
- Friction Elimination: Restrict lead forms to minimum required fields (Name, Email, Phone/Need).
- Objection Handling: Address the #1 customer hesitation right beneath the primary CTA or in an authentic FAQ.
`.trim();

    case "seo":
      return `
[SEO & SEARCH ARCHITECTURE - skills/seo/skill.md]
- Title & Meta: Unique benefit-driven title (50-60 chars) and active meta description (140-160 chars) with primary value proposition.
- Structured Entities: Include Schema.org JSON-LD structured data (Organization, LocalBusiness, SoftwareApplication, or FAQPage).
- NAP Consistency: Ensure Name, Address, and Phone number are prominently displayed and click-to-call enabled (<a href="tel:...">).
- Semantic Crawlability: High-value text must exist as server-rendered HTML copy, not locked inside raster graphics.
`.trim();

    case "performance":
      return `
[WEB PERFORMANCE & CORE WEB VITALS - skills/performance/skill.md]
- Core Web Vitals Targets: LCP < 2.5s, CLS < 0.1, INP < 200ms.
- Image Sizing: Explicit aspect ratios and dimensions on all images to eliminate layout shifts.
- Preload Hero: Preload/prioritize the above-the-fold hero image; lazy-load all below-the-fold imagery.
- GPU Compositing: Confine animation strictly to CSS transform and opacity properties.
`.trim();

    case "industry-intelligence":
      return `
[INDUSTRY & VERTICAL INTELLIGENCE - skills/industry-intelligence/skill.md]
- Domain Reality: Remember that ${category} has unique buyer psychology, trust markers, and logistical requirements.
- Information Flow: Structure sections to match how buyers evaluate ${category} (e.g. Menu & Hours for dining; Licenses & Service Area for trades; Live Demo & Security for SaaS).
- Sector Trust Badges: Embed verified credentials authentic to ${category} (licenses, hygiene scores, client logos, certifications).
`.trim();

    case "21st-dev":
      return `
[21ST.DEV COMPONENT ARCHITECTURE - skills/21st-dev/skill.md]
- Atmospheric Surfaces: Layered tactile borders (1px border with subtle inner highlight inset 0 1px 0 rgba(255,255,255,0.1)) and soft ambient radial spotlights behind key anchors.
- Modern Hero Archetype: Adapt layout to vertical (${category}). Use ambient glow or asymmetric editorial composition with floating pill badge and clear dual CTAs.
- Bento Grid Features: Asymmetrical 2:1 or 1:2 column spans on desktop, housing eyebrow pills, crisp headlines, and live interactive preview artifacts or metrics.
- High-Conversion Pricing: 3-tier hierarchy with billing toggle (Monthly/Annual discount pill). Highlighted "Recommended" tier with glow border and elevated badge.
- Social Proof & Trust: Infinite grayscale logo marquee with pause-on-hover, verified customer quote cards with star ratings and quantifiable metrics.
- High-Impact CTA Banner: Inset rounded-3xl container with radial backlight, primary action button, and zero-friction reassurance copy.
`.trim();

    case "framer-motion":
      return `
[FRAMER MOTION DIRECTIVES - skills/framer-motion/skill.md]
- Purpose-Driven Motion: Every animation must serve orientation, hierarchy, or tactile feedback. Do NOT add gratuitous floating or spinning.
- Physics Over Clocks: Use spring physics for interactive elements (stiffness: 400, damping: 30 for buttons/toggles; stiffness: 260, damping: 24 for cards/dialogs).
- Asymmetric Exit Rule: Exits must resolve 30-40% faster than entrances (entrance 300-400ms -> exit 180-220ms).
- Orchestrated Hero Entrance: Stagger reveal sequence: Badge (0ms) -> Headline (80ms) -> Subtitle (160ms) -> CTA Group (240ms) -> Hero Graphic (320ms).
- Micro-Interactions: Buttons use whileHover={{ scale: 1.02, y: -1 }} and whileTap={{ scale: 0.98, y: 1 }}.
- Viewport Discipline: Scroll reveals use viewport={{ once: true, margin: "-10% 0px" }} to prevent distracting re-triggers.
- Accessibility: Respect prefers-reduced-motion via useReducedMotion(). Zero translation when reduced motion is preferred.
`.trim();

    case "gsap":
      return `
[GSAP ADVANCED ANIMATION - skills/gsap/skill.md]
- Scrollytelling Choreography: Structure smooth timeline-based scroll sequences with numerical scrub (scrub: 0.8 to 1.2).
- Pinning Discipline: Limit section pinning to at most 1 or 2 critical narrative sections with deterministic container heights.
- Scoped Cleanup: Ensure all GSAP animations are scoped via gsap.context() and reverted on unmount to prevent memory leaks.
- Reduced Motion: Check window.matchMedia("(prefers-reduced-motion: reduce)") and render immediate static final state when matched.
`.trim();

    case "threejs":
      return `
[THREE.JS & 3D EXPERIENCES - skills/threejs/skill.md]
- Performance Budgets: Maximum 45,000 vertices and 40 draw calls per frame to ensure smooth 60fps rendering.
- SSR Isolation: Three.js canvas must be loaded via dynamic import ({ ssr: false }) with a lightweight skeleton placeholder.
- Mobile Fallback: On mobile screens (< 768px), fallback to a lightweight high-res WebP render or CSS gradient.
- Render Throttling: Automatically pause the animation loop when offscreen or when document.hidden is true.
`.trim();

    case "data-visualization":
      return `
[DATA VISUALIZATION & DASHBOARDS - skills/data-visualization/skill.md]
- Truthful Chart Selection: Line/area for trends over time, horizontal/vertical bars for categorical comparison, donuts for composition (<5 items).
- Baseline Zero: Bar charts MUST start at baseline 0 to prevent misleading lie-factors.
- KPI Hierarchy: Top-level vital metric cards with sparklines and delta percentages (+14.2%) preceding detailed charts.
- Colorblind Safety: Pair colored series lines with distinct dash patterns or textual direct labels.
`.trim();

    case "saas-ux":
      return `
[SAAS UX & PRODUCT ARCHITECTURE - skills/saas-ux/skill.md]
- Time-to-Value: Focus on rapid user activation with a lightweight 3-step setup checklist.
- Navigation Shell: Collapsible sidebar (240px -> 64px) with workspace switcher, active route indicators, and usage quota progress bar.
- Global Search: Include a prominent Cmd+K command palette pattern for rapid keyboard navigation.
- Empty State Guidance: Never display a blank table; provide clear explanatory copy and a primary creation button.
- Transparent Billing: Clear usage metering with proactive warnings (85% and 100%) and 1-click self-serve plan management.
`.trim();

    case "ecommerce-ux":
      return `
[E-COMMERCE UX & CONVERSION - skills/ecommerce-ux/skill.md]
- Discovery & Filters: Omnipresent predictive search and faceted filtering (category, price slider, size chips, in-stock toggle).
- Product Card Polish: High-res 4:5 image, savings badge, star ratings, color swatches, and quick add button.
- PDP Buy Box: Clear variant selectors with out-of-stock visual cues, transparent shipping policy, and primary Add to Cart CTA.
- Mini-Cart Drawer: Slide-out cart with real-time free shipping incentive progress bar ("Add $12 more for Free Shipping").
- Frictionless Checkout: Mandatory guest checkout option and upfront transparent pricing with zero surprise fees.
`.trim();

    case "spatial-interaction":
      return `
[3D & SPATIAL INTERACTION INTELLIGENCE - skills/spatial-interaction/skill.md]
- Purpose-Driven Depth: Prefer lightweight CSS 3D transforms (perspective: 1200px, transform-style: preserve-3d, translateZ, rotateX/Y) over heavy WebGL.
- Section-Specific Scope: Apply spatial 3D strictly to the hero or visual showcase section; never wrap entire page in 3D perspective.
- Multi-Plane Separation: Separate background card (translateZ: 0px), visual hero frame (translateZ: 24px), and floating UI chips (translateZ: 48px).
- Mobile & Reduced-Motion Fallback: On viewports < 768px or when prefers-reduced-motion is active, flatten rotation to 0deg and convert Z-depth to standard CSS box-shadow.
`.trim();

    default: {
      const raw = loadSkillContent(skillId);
      if (!raw) return "";
      return `[${skillId.toUpperCase()} DESIGN DIRECTIVES]\nApply core principles from skills/${skillId}/skill.md tailored to ${category}.`;
    }
  }
}
