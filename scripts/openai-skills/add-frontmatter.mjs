import fs from "fs";
import path from "path";

const SKILL_METADATA = [
  {
    id: "ui-ux",
    name: "websitebanja-ui-ux",
    description: "Foundational visual hierarchy, 3-second rule, 8pt spatial rhythm, WCAG 2.2 contrast, and conversion architecture.",
  },
  {
    id: "framer-motion",
    name: "websitebanja-framer-motion",
    description: "Production-ready Framer Motion choreography, spring physics (400/30), reduced motion support, and micro-interactions.",
  },
  {
    id: "21st-dev",
    name: "websitebanja-21st-dev",
    description: "Modern component architecture, tactile surfaces, atmospheric depth, subtle specular borders, and high-converting bento layouts.",
  },
  {
    id: "design-systems",
    name: "websitebanja-design-systems",
    description: "Design token architecture, 8pt mathematical rhythm, semantic color roles, border radius, and elevation tokens.",
  },
  {
    id: "cro",
    name: "websitebanja-cro",
    description: "Conversion Rate Optimization, high-intent user journeys, social proof architecture, and friction reduction.",
  },
  {
    id: "typography",
    name: "websitebanja-typography",
    description: "Font pairing personalities, modular typographic scale, optical tracking/leading, and fluid clamp() rules.",
  },
  {
    id: "responsive-design",
    name: "websitebanja-responsive-design",
    description: "Mobile-first thumb-zone ergonomics, fluid grid reflows, 44x44px touch targets, and zero-overflow rules.",
  },
  {
    id: "accessibility",
    name: "websitebanja-accessibility",
    description: "Inclusive design floor, WCAG 2.2 AA contrast (4.5:1), keyboard navigation, focus rings, single H1, and ARIA discipline.",
  },
  {
    id: "ux-psychology",
    name: "websitebanja-ux-psychology",
    description: "Hick's Law choice limits, Fitts's Law spatial targets, Miller's Law chunking, Jakob's Law, and zero dark patterns.",
  },
  {
    id: "interaction-design",
    name: "websitebanja-interaction-design",
    description: "8-state component completeness (hover, focus, active, loading, disabled, error, empty), and tactile micro-feedback.",
  },
  {
    id: "creative-art-direction",
    name: "websitebanja-creative-art-direction",
    description: "Aesthetic cohesion, brand personality, mood alignment, and distinctive non-generic art direction.",
  },
  {
    id: "seo",
    name: "websitebanja-seo",
    description: "Semantic HTML hierarchy, JSON-LD structured data, metadata hygiene, and search intent alignment.",
  },
  {
    id: "performance",
    name: "websitebanja-performance",
    description: "Core Web Vitals budgets (LCP < 2.5s, CLS < 0.1, INP < 200ms), asset weight limits, and layout stability.",
  },
  {
    id: "industry-intelligence",
    name: "websitebanja-industry-intelligence",
    description: "Industry-specific layout patterns, terminology, conversion mechanisms, and customer expectations.",
  },
  {
    id: "gsap",
    name: "websitebanja-gsap",
    description: "Timeline orchestration, ScrollTrigger scrollytelling, pinning mechanics, and cinematic scroll choreography.",
  },
  {
    id: "threejs",
    name: "websitebanja-threejs",
    description: "3D WebGL environments, particle shaders, interactive canvas viewports, and performance-budgeted 3D product showcases.",
  },
  {
    id: "data-visualization",
    name: "websitebanja-data-visualization",
    description: "Executive analytics dashboards, KPI metric scorecards, interactive charts, and clear data hierarchy.",
  },
  {
    id: "saas-ux",
    name: "websitebanja-saas-ux",
    description: "Software-as-a-Service UX patterns, interactive product tours, tier comparison matrices, and friction-free onboarding.",
  },
  {
    id: "ecommerce-ux",
    name: "websitebanja-ecommerce-ux",
    description: "E-commerce conversion architecture, product cards, category filters, trust guarantees, and checkout reassurance.",
  },
];

const ROOT_DIR = process.cwd();
const SKILLS_DIR = path.resolve(ROOT_DIR, "skills");

for (const meta of SKILL_METADATA) {
  const targetDir = path.resolve(SKILLS_DIR, meta.id);
  const skillFile = path.resolve(targetDir, "skill.md");

  if (!fs.existsSync(skillFile)) {
    console.warn(`File not found: ${skillFile}`);
    continue;
  }

  let content = fs.readFileSync(skillFile, "utf-8");
  if (content.startsWith("---")) {
    console.log(`[SKIP] Already has frontmatter: ${meta.id}`);
    continue;
  }

  const frontmatter = `---
name: ${meta.name}
description: ${meta.description}
version: 1.0.0
---

`;

  fs.writeFileSync(skillFile, frontmatter + content, "utf-8");
  console.log(`[UPDATED] Added frontmatter to: ${meta.id}`);
}
