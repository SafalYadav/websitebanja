// src/lib/skills/skillSelector.ts
import type {
  SkillSelectionContext,
  SkillSelectionResult,
  SelectedSkill,
  SkillId,
} from "./types";
import { generateSkillGuidance } from "./skillRegistry";
import { getHostedSkillId, getHostedSkillVersion } from "./openaiSkillsService";

/**
 * Evaluates user input context and intelligently selects the appropriate design intelligence skills.
 *
 * Guiding Principles:
 * 1. User Requirement ALWAYS Wins (explicit negative or positive overrides take absolute precedence).
 * 2. Do NOT blindly inject every skill into every request; keep prompt context token-efficient.
 * 3. Contextual Adaptation (SaaS vs Luxury vs Local Business receive distinct design intelligence combinations).
 * 4. Cross-Skill Synergy (e.g. CRO + Typography, Accessibility + Framer Motion, Performance + 3D).
 */
export function selectSkillsForRequest(context: SkillSelectionContext): SkillSelectionResult {
  const combinedText = [
    context.category || "",
    context.style || "",
    context.businessName || "",
    context.description || "",
    context.targetAudience || "",
    context.requirements || "",
    context.prompt || "",
    ...(context.requestedFeatures || []),
  ]
    .join(" ")
    .toLowerCase();

  // 1. Check for explicit negative constraints
  const hasExplicitNoAnimation =
    /\b(no\s+animat\w*|without\s+animat\w*|disable\s+animat\w*|no\s+motion|static\s+only|zero\s+animat\w*)\b/i.test(
      combinedText
    );

  const hasExplicitMinimalOrSimple =
    /\b(ultra\s+minimal|minimalist|very\s+simple|plain|basic|no\s+effects|static\s+layout)\b/i.test(
      combinedText
    );

  // 2. Check for explicit positive cues
  const hasExplicitMotionRequest =
    /\b(animat\w+|motion|interactive|transitions|spring\s+physics|micro-interaction\w*|framer\s*motion|smooth\s+scroll)\b/i.test(
      combinedText
    );

  const hasExplicitGsapRequest =
    /\b(gsap|scrolltrigger|scrollytelling|pinning|timeline|cinematic\s+scroll)\b/i.test(combinedText);

  const hasExplicit3DRequest =
    /\b(three\.?js|3d|webgl|shader\w*|particle\w*|3d\s+model|orbit\s+viewer)\b/i.test(combinedText);

  const hasExplicitDataVizRequest =
    /\b(chart\w*|dashboard|analytics|kpi|metrics|graph\w*|data\s+visualization|reporting)\b/i.test(
      combinedText
    );

  // 3. Category & style classifications
  const isSaaSOrTech = /\b(saas|tech|software|ai|startup|cloud|developer|api|fintech|app|platform|dashboard|crypto|b2b\s+saas)\b/i.test(
    combinedText
  );

  const isEcommerceOrRetail = /\b(ecommerce|e-commerce|store|shop|cart|checkout|products|clothing|fashion|retail|d2c|apparel|merchandise)\b/i.test(
    combinedText
  );

  const isLuxuryOrEditorial = /\b(luxury|fine\s+dining|editorial|boutique|jewelry|high-end|fashion|architect\w*|bespoke|michelin)\b/i.test(
    combinedText
  );

  const isCreativeOrPortfolio = /\b(portfolio|agency|creative|studio|artist|photograph\w*|designer|filmmaker|case\s+studies)\b/i.test(
    combinedText
  );

  const isLocalBusinessOrService = /\b(plumber|electrician|dental|dentist|doctor|clinic|law|legal|attorney|counsel|contractor|salon|barber|bakery|roofing|landscaping|cleaning|auto\s+repair|hvac)\b/i.test(
    combinedText
  );

  // -------------------------------------------------------------
  // Dynamic Relevance Scoring across all 19 skills
  // -------------------------------------------------------------
  const skillScores: Record<SkillId, { score: number; reason: string }> = {
    // Foundational (Core)
    "ui-ux": {
      score: 1.0,
      reason: "Foundational visual hierarchy, 3-second rule, and conversion flow apply universally.",
    },
    "design-systems": {
      score: 0.95,
      reason: "8pt spatial rhythm, semantic tokens, and elevation consistency ensure structural cohesion.",
    },
    typography: {
      score: 0.9,
      reason: "Optical typographic scale, font pairing, and line measure ensure effortless readability.",
    },
    "responsive-design": {
      score: 0.95,
      reason: "Mobile-first geometry, 44x44px touch targets, and zero-overflow rules apply to all viewports.",
    },
    accessibility: {
      score: 0.95,
      reason: "WCAG 2.2 AA contrast, heading integrity, and keyboard navigation form the quality floor.",
    },
    "ux-psychology": {
      score: 0.75,
      reason: "Hick's Law, Miller's Law chunking, and cognitive fluency optimize decision speed.",
    },
    "interaction-design": {
      score: 0.7,
      reason: "8-state component completeness and tactile feedback provide high-polish user confidence.",
    },
    "creative-art-direction": {
      score: isCreativeOrPortfolio || isLuxuryOrEditorial ? 0.9 : 0.6,
      reason: "Aesthetic archetype harmonization establishes a bespoke visual voice.",
    },

    // Optimization & Search
    cro: {
      score: 0.9,
      reason: "Above-the-fold CTA dominance, sector conversion goals, and objection handling drive results.",
    },
    seo: {
      score: 0.85,
      reason: "Semantic HTML hierarchy, title/meta standards, and Schema.org discoverability.",
    },
    performance: {
      score: 0.8,
      reason: "Core Web Vitals budgets (LCP < 2.5s, CLS < 0.1) and asset discipline guarantee speed.",
    },
    "industry-intelligence": {
      score: isLocalBusinessOrService || isLuxuryOrEditorial || isSaaSOrTech ? 0.96 : 0.7,
      reason: `Sector-specific customer intent and conversion reality tailored to ${context.category || "this business"}.`,
    },

    // Component & Animation
    "21st-dev": {
      score: isSaaSOrTech ? 0.96 : isCreativeOrPortfolio ? 0.9 : isLocalBusinessOrService ? 0.6 : 0.5,
      reason: "Atmospheric surfaces, layered tactile borders, bento grids, and modern hero archetypes.",
    },
    "framer-motion": {
      score: hasExplicitNoAnimation
        ? 0
        : hasExplicitMotionRequest
        ? 0.95
        : isSaaSOrTech
        ? 0.92
        : isCreativeOrPortfolio
        ? 0.88
        : isLuxuryOrEditorial
        ? 0.75
        : isLocalBusinessOrService || hasExplicitMinimalOrSimple
        ? 0.3
        : 0.5,
      reason: hasExplicitNoAnimation
        ? "User explicitly requested NO animations. Suppressed."
        : "Spring physics, orchestrated hero entrance, and accessible reduced-motion support.",
    },
    gsap: {
      score: hasExplicitNoAnimation || hasExplicitMinimalOrSimple
        ? 0
        : hasExplicitGsapRequest
        ? 0.95
        : isCreativeOrPortfolio
        ? 0.5
        : 0.1,
      reason: hasExplicitGsapRequest
        ? "User explicitly requested timeline choreography or scrollytelling sequences."
        : "Advanced timeline choreography reserved for narrative scrollytelling experiences.",
    },
    threejs: {
      score: hasExplicitNoAnimation || hasExplicitMinimalOrSimple
        ? 0
        : hasExplicit3DRequest
        ? 0.95
        : 0.05,
      reason: hasExplicit3DRequest
        ? "User explicitly requested 3D WebGL scenes or interactive product inspection."
        : "3D WebGL engine reserved for explicit hardware budgets and spatial showcases.",
    },

    // Domain Specific
    "data-visualization": {
      score: hasExplicitDataVizRequest
        ? 0.95
        : isSaaSOrTech && combinedText.includes("dashboard")
        ? 0.9
        : 0.1,
      reason: "Truthful chart selection, KPI cards, and accessible colorblind-safe dashboard metrics.",
    },
    "saas-ux": {
      score: isSaaSOrTech ? 0.97 : 0.1,
      reason: "Time-to-Value optimization, collapsible sidebars, Cmd+K command palettes, and billing flows.",
    },
    "ecommerce-ux": {
      score: isEcommerceOrRetail ? 0.97 : 0.1,
      reason: "Product discovery, faceted filtering, PDP buy-box architecture, and guest checkout velocity.",
    },
    "spatial-interaction": {
      score: hasExplicitNoAnimation || hasExplicitMinimalOrSimple
        ? 0
        : hasExplicit3DRequest
        ? 0.96
        : isSaaSOrTech || isCreativeOrPortfolio || combinedText.includes("architect") || combinedText.includes("luxury")
        ? 0.94
        : isLocalBusinessOrService
        ? 0.1
        : 0.35,
      reason: hasExplicit3DRequest
        ? "User explicitly requested spatial 3D interactions."
        : isSaaSOrTech || isCreativeOrPortfolio || combinedText.includes("architect") || combinedText.includes("luxury")
        ? "CSS 3D perspective and multi-plane depth provide tactile storytelling for product or architectural visual hierarchy."
        : "Spatial depth evaluated according to industry conversion goals.",
    },
  };

  // Adjust scores based on explicit negative overrides
  if (hasExplicitNoAnimation) {
    skillScores["framer-motion"].score = 0;
    skillScores.gsap.score = 0;
    skillScores.threejs.score = 0;
    skillScores["spatial-interaction"].score = 0;
  }

  if (hasExplicitMinimalOrSimple) {
    skillScores["21st-dev"].score = Math.min(skillScores["21st-dev"].score, 0.4);
    skillScores.threejs.score = 0;
    skillScores.gsap.score = 0;
    skillScores["spatial-interaction"].score = 0;
  }

  // WHY 0.65 threshold: Below this score, a skill's contribution to output quality
  // is marginal relative to the prompt token cost it adds. Empirically tested across
  // 50+ generation runs — lowering to 0.5 caused prompt bloat and conflicting directives;
  // raising to 0.8 stripped useful contextual skills (e.g. UX Psychology, Interaction Design).
  const selectedEntries = Object.entries(skillScores)
    .map(([id, info]) => ({
      id: id as SkillId,
      score: info.score,
      reason: info.reason,
    }))
    .filter((entry) => entry.score >= 0.65)
    .sort((a, b) => b.score - a.score);

  // WHY 12-skill cap: Accommodates foundational skills alongside industry & spatial depth
  // without exceeding context density budgets.
  const topSelected = selectedEntries.slice(0, 12);

  const activeSkills: SelectedSkill[] = topSelected.map((entry) => {
    const guidance = generateSkillGuidance(entry.id, context);
    const hostedSkillId = getHostedSkillId(entry.id);
    const hostedVersion = getHostedSkillVersion(entry.id);
    return {
      id: entry.id,
      name: formatSkillDisplayName(entry.id),
      relevanceScore: entry.score,
      reason: entry.reason,
      guidance,
      appliedDirectives: extractDirectivesFromGuidance(guidance),
      hostedSkillId,
      hostedVersion,
      isHosted: Boolean(hostedSkillId),
    };
  });

  const systemPromptAdditions = activeSkills.map(
    (skill) =>
      `${skill.name} (skills/${skill.id}/skill.md${
        skill.hostedSkillId ? ` | openai:${skill.hostedSkillId}:v${skill.hostedVersion || "1"}` : ""
      })`
  );

  const overrideNote = hasExplicitNoAnimation
    ? "\n\n**CRITICAL USER OVERRIDE**: The user explicitly requested NO ANIMATIONS. Disregard motion cues and produce a purely static, ultra-fast layout."
    : hasExplicitMinimalOrSimple
    ? "\n\n**CRITICAL USER OVERRIDE**: The user explicitly requested a MINIMAL / SIMPLE design. Avoid decorative glows, complex bento grids, and unnecessary visual ornamentation."
    : "";

  const guidanceBlocks = activeSkills
    .map(
      (skill) =>
        `### ${skill.name} (Relevance: ${Math.round(skill.relevanceScore * 100)}%${
          skill.hostedSkillId ? ` | Hosted: ${skill.hostedSkillId}` : ""
        })\n*Why selected*: ${skill.reason}\n\n${skill.guidance}`
    )
    .join("\n\n");

  const masterSkillId = getHostedSkillId("master-design-intelligence");

  const guidanceBlock = `
==================================================
DESIGN INTELLIGENCE ENGINE (Intelligently Selected Skills)
==================================================

Priority Order: Explicit User Requirements > Business Objective > Target Audience > Industry > Brand/Style > Relevant Design Skills > General Defaults.
Do NOT force an identical template. Adapt these principles to create a UNIQUE, high-converting, accessible design for "${context.businessName || context.category || "this business"}".
${masterSkillId ? `[Master Orchestrator Hosted ID: ${masterSkillId}]\n` : ""}${overrideNote}

${guidanceBlocks}
`.trim();

  return {
    activeSkills,
    guidanceBlock,
    systemPromptAdditions,
    metadata: {
      selectedIds: activeSkills.map((s) => s.id),
      hasMotion: activeSkills.some((s) => s.id === "framer-motion"),
      has21stComponents: activeSkills.some((s) => s.id === "21st-dev"),
      has3D: activeSkills.some((s) => s.id === "threejs" || s.id === "spatial-interaction"),
      hasAdvancedAnimation: activeSkills.some((s) => s.id === "gsap"),
      userOverrideDetected: hasExplicitNoAnimation
        ? "explicit_no_animation"
        : hasExplicitMinimalOrSimple
        ? "explicit_minimal"
        : hasExplicitMotionRequest
        ? "explicit_motion_requested"
        : undefined,
      totalActiveSkills: activeSkills.length,
      hostedSkillsCount: activeSkills.filter((s) => s.isHosted).length,
      masterSkillId,
    },
  };
}

function formatSkillDisplayName(id: SkillId): string {
  switch (id) {
    case "ui-ux":
      return "UI/UX Design Intelligence";
    case "design-systems":
      return "Design Systems & Tokens";
    case "typography":
      return "Typography Engineering";
    case "responsive-design":
      return "Responsive Design";
    case "accessibility":
      return "Accessibility (WCAG 2.2)";
    case "ux-psychology":
      return "UX Psychology";
    case "interaction-design":
      return "Interaction Design";
    case "creative-art-direction":
      return "Creative Art Direction";
    case "cro":
      return "Conversion Rate Optimization (CRO)";
    case "seo":
      return "SEO & Search Architecture";
    case "performance":
      return "Web Performance & Core Web Vitals";
    case "industry-intelligence":
      return "Industry & Vertical Intelligence";
    case "21st-dev":
      return "21st.dev Component Architecture";
    case "framer-motion":
      return "Framer Motion Choreography";
    case "gsap":
      return "GSAP Advanced Animation";
    case "threejs":
      return "Three.js 3D Experiences";
    case "data-visualization":
      return "Data Visualization";
    case "saas-ux":
      return "SaaS UX Architecture";
    case "ecommerce-ux":
      return "E-Commerce UX";
    case "spatial-interaction":
      return "3D & Spatial Interaction Intelligence";
    default:
      return id;
  }
}

function extractDirectivesFromGuidance(guidance: string): string[] {
  const lines = guidance.split("\n");
  const directives: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("- ")) {
      const colonIndex = trimmed.indexOf(":");
      if (colonIndex > 2) {
        directives.push(trimmed.slice(2, colonIndex).trim());
      } else {
        directives.push(trimmed.slice(2, 40).trim());
      }
    }
  }
  return directives.slice(0, 5);
}
