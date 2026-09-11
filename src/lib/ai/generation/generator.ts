// src/lib/ai/generation/generator.ts

import type { WebsiteRequirement } from "@/lib/ai/requirementModel";
import type { ComponentPlan, WebsitePlan, DesignPlan } from "@/lib/ai/planner";
import type { DesignTokens } from "@/lib/ai/design/designTokens";
import { resolveComponent } from "@/lib/components/registry";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";

export interface GenerationResult {
  outDir: string;
  files: string[];
  tokensApplied: {
    primaryColor: string;
    secondaryColor: string;
    headingFont: string;
    bodyFont: string;
    spacingDensity: string;
    motionLevel: string;
  };
}

/**
 * Converts any component identifier into a safe TypeScript identifier and filename.
 * e.g., "21st:hero-glow" -> "HeroGlow21st"
 * "21st:bento-grid" -> "BentoGrid21st"
 * "HeroSection" -> "HeroSection"
 */
export function toSafeComponentName(rawName: string): string {
  if (rawName.startsWith("21st:")) {
    const clean = rawName.replace(/^21st:/, "");
    return (
      clean
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join("") + "21st"
    );
  }
  return rawName.replace(/[^a-zA-Z0-9_]/g, "");
}

/**
 * Generates production-ready, fully compilable React components in `src/generated`
 * that consume design tokens, responsive breakpoints, and Framer Motion animation variants.
 */
export function generateComponents(
  requirement: WebsiteRequirement,
  componentPlan: ComponentPlan,
  websitePlan?: WebsitePlan,
  designPlan?: DesignPlan
): GenerationResult {
  const outDir = path.resolve(process.cwd(), "src", "generated");
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }

  const generatedFiles: string[] = [];
  const tokens: DesignTokens = websitePlan?.designTokens || designPlan?.designTokens || ({} as DesignTokens);
  const colors = tokens.colors || {
    primary: "#2563EB",
    secondary: "#60A5FA",
    background: "#FFFFFF",
    text: "#0F172A",
    border: "rgba(0,0,0,0.08)",
  };
  const typography = tokens.typography || {
    heading: "Plus Jakarta Sans, sans-serif",
    body: "Inter, sans-serif",
    headingScale: 1.4,
    bodyScale: 1.0,
  };
  const spacing = tokens.spacing || {
    sectionPaddingY: "py-20 sm:py-28",
    cardPadding: "p-6",
    unit: "8px",
  };
  const motionInfo = tokens.motion || {
    durationBase: "300ms",
    easing: "easeOut",
    animationLevel: "subtle",
  };

  const businessName = requirement.business?.name || "My Business";
  const primaryCta = requirement.cta || "Get Started";

  // 1. Generate individual section wrapper components
  for (const compName of componentPlan.components) {
    const meta = resolveComponent(compName);
    const safeName = toSafeComponentName(compName);
    let componentCode = "";

    switch (compName) {
      case "Navbar":
        componentCode = `"use client";
import React from "react";
import NavbarSection from "${meta.importPath}";

export default function GeneratedNavbar() {
  return (
    <NavbarSection
      businessName="${businessName.replace(/"/g, '\\"')}"
      phone="${(requirement.contactInformation?.phone || "").replace(/"/g, '\\"')}"
      whatsappNumber="${(requirement.contactInformation?.whatsapp || "").replace(/"/g, '\\"')}"
    />
  );
}
`;
        break;

      case "HeroSection":
        componentCode = `"use client";
import React from "react";
import HeroSection from "${meta.importPath}";
import { motion, useReducedMotion } from "framer-motion";
import { fadeIn } from "@/lib/ui/motion";

export default function GeneratedHeroSection() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      variants={shouldReduceMotion ? {} : fadeIn}
      initial="hidden"
      animate="visible"
    >
      <HeroSection
        title="${(requirement.content?.heroTitle || `${businessName} - Premium Quality & Service`).replace(/"/g, '\\"')}"
        subtitle="${(requirement.content?.heroSubtitle || `Experience industry-leading excellence with ${businessName}. Crafted for discerning clients.`).replace(/"/g, '\\"')}"
        button="${primaryCta.replace(/"/g, '\\"')}"
        buttonAction={{
          type: "${requirement.functionality?.whatsappDirect ? "whatsapp" : "scroll"}",
          target: "contact"
        }}
      />
    </motion.div>
  );
}
`;
        break;

      case "21st:hero-glow":
        componentCode = `"use client";
import React from "react";
import HeroGlow21st from "${meta.importPath}";

export default function GeneratedHeroGlow21st() {
  return (
    <HeroGlow21st
      badge="${(requirement.brand?.style || "Next-Gen Intelligent SaaS").replace(/"/g, '\\"')}"
      title="${(requirement.content?.heroTitle || `${businessName} - High Velocity Platform`).replace(/"/g, '\\"')}"
      subtitle="${(requirement.content?.heroSubtitle || "Transform your workflow with autonomous architecture, self-healing code, and dynamic design systems.").replace(/"/g, '\\"')}"
      primaryCta="${primaryCta.replace(/"/g, '\\"')}"
      secondaryCta="Explore Architecture"
    />
  );
}
`;
        break;

      case "21st:bento-grid":
        componentCode = `"use client";
import React from "react";
import BentoGrid21st from "${meta.importPath}";

export default function GeneratedBentoGrid21st() {
  return (
    <BentoGrid21st
      heading="Intelligent Infrastructure & Design Systems"
      subheading="Modular, fault-tolerant components engineered to turn visitors into loyal advocates."
      badge="Architectural Core"
    />
  );
}
`;
        break;

      case "21st:pricing-table":
        componentCode = `"use client";
import React from "react";
import PricingTable21st from "${meta.importPath}";

export default function GeneratedPricingTable21st() {
  return (
    <PricingTable21st
      title="Transparent, Predictable Investment"
      subtitle="Choose the velocity that suits your business scale."
      badge="Flexible Tiers"
    />
  );
}
`;
        break;

      case "21st:animated-cta":
        componentCode = `"use client";
import React from "react";
import AnimatedCta21st from "${meta.importPath}";

export default function GeneratedAnimatedCta21st() {
  return (
    <AnimatedCta21st
      title="Ready to Elevate Your Digital Experience?"
      subtitle="Join industry leaders deploying production-grade web systems in seconds."
      primaryButtonText="${primaryCta.replace(/"/g, '\\"')}"
      secondaryButtonText="Talk to an Architect"
    />
  );
}
`;
        break;

      case "ServicesSection":
        const servicesList =
          requirement.services && requirement.services.length > 0
            ? requirement.services
            : ["Custom Tailored Solutions", "Professional Consultation", "Rapid Implementation", "24/7 Dedicated Support"];

        componentCode = `"use client";
import React from "react";
import ServicesSection from "${meta.importPath}";
import { motion } from "framer-motion";
import { slideUp } from "@/lib/ui/motion";

export default function GeneratedServicesSection() {
  const services = ${JSON.stringify(
    servicesList.map((s, idx) => ({
      title: s,
      description: `Comprehensive ${s.toLowerCase()} designed to exceed your highest expectations.`,
      icon: idx === 0 ? "Zap" : idx === 1 ? "ShieldCheck" : "Star",
    }))
  )};

  return (
    <motion.div variants={slideUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
      <ServicesSection services={services} />
    </motion.div>
  );
}
`;
        break;

      case "ProductsSection":
        const productItems = requirement.products || [
          { name: "Premium Tier Service", price: 199, description: "All-inclusive flagship package with complete support." },
          { name: "Standard Package", price: 99, description: "Balanced core offering designed for growing teams." },
        ];

        componentCode = `"use client";
import React from "react";
import ProductsSection from "${meta.importPath}";
import type { ProductItem } from "@/types/website";

export default function GeneratedProductsSection() {
  const products: ProductItem[] = (${JSON.stringify(
    productItems.map((p, idx) => ({
      id: `prod_${idx}`,
      name: p.name,
      price: p.price ?? 99,
      description: p.description ?? "High quality solution tailored to your exact specifications.",
      category: p.category ?? "Featured",
      status: "active",
      images: [p.image || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80"],
    }))
  )}) as ProductItem[];

  return (
    <ProductsSection
      data={{
        title: "Featured Offerings",
        subtitle: "Explore our curated solutions and packages",
        products,
      }}
    />
  );
}
`;
        break;

      case "FeaturesSection":
        componentCode = `"use client";
import React from "react";
import FeaturesSection from "${meta.importPath}";

export default function GeneratedFeaturesSection() {
  return (
    <FeaturesSection
      features={[
        { title: "Verified Excellence", description: "Built to the most rigorous standards of performance and reliability." },
        { title: "Rapid Turnaround", description: "Prompt delivery with seamless communication at every step." },
        { title: "Transparent Pricing", description: "Upfront terms with zero hidden fees or unexpected charges." },
      ]}
    />
  );
}
`;
        break;

      case "AboutSection":
        componentCode = `"use client";
import React from "react";
import AboutSection from "${meta.importPath}";

export default function GeneratedAboutSection() {
  return (
    <AboutSection
      title="About ${businessName.replace(/"/g, '\\"')}"
      content="Driven by a passion for quality and a commitment to our community, we bring decades of combined experience to deliver transformative results."
    />
  );
}
`;
        break;

      case "FAQSection":
        componentCode = `"use client";
import React from "react";
import FAQSection from "${meta.importPath}";

export default function GeneratedFAQSection() {
  return (
    <FAQSection
      faq={[
        { question: "How do I get started?", answer: "Simply contact us or book directly through our online schedule." },
        { question: "What is your satisfaction guarantee?", answer: "We stand behind all our work with a 100% satisfaction commitment." },
        { question: "Do you offer custom packages?", answer: "Yes, we customize every solution to match your specific requirements." },
      ]}
    />
  );
}
`;
        break;

      case "ContactSection":
        componentCode = `"use client";
import React from "react";
import ContactSection from "${meta.importPath}";

export default function GeneratedContactSection() {
  return (
    <ContactSection
      contact={{
        phone: "${(requirement.contactInformation?.phone || "+1 (555) 019-2834").replace(/"/g, '\\"')}",
        email: "${(requirement.contactInformation?.email || "contact@websitebanja.com").replace(/"/g, '\\"')}",
        address: "${(requirement.contactInformation?.address || "Downtown Metropolitan Hub").replace(/"/g, '\\"')}",
      }}
    />
  );
}
`;
        break;

      case "FooterSection":
        componentCode = `"use client";
import React from "react";
import FooterSection from "${meta.importPath}";

export default function GeneratedFooterSection() {
  return (
    <FooterSection
      footer={{
        copyright: "© ${new Date().getFullYear()} ${businessName.replace(/"/g, '\\"')}. All rights reserved.",
      }}
    />
  );
}
`;
        break;

      default:
        if (meta.isFallback) {
          componentCode = `"use client";
import React from "react";
import FallbackComponent from "${meta.importPath}";

// 21st.dev Fallback applied: ${meta.fallbackReason || "Defaulted to local component"}
export default function Generated${safeName}() {
  return <FallbackComponent />;
}
`;
        } else {
          componentCode = `"use client";
import React from "react";

export default function Generated${safeName}() {
  return (
    <div className="${spacing.cardPadding}" style={{ color: "${colors.text}" }}>
      ${compName} Content
    </div>
  );
}
`;
        }
    }

    const filePath = path.join(outDir, `${safeName}.tsx`);
    writeFileSync(filePath, componentCode, "utf8");
    generatedFiles.push(`${safeName}.tsx`);
  }

  // 2. Generate composite Website Page component injecting token CSS variables
  const websitePageCode = `"use client";
import React from "react";
${componentPlan.components
  .map((c) => {
    const safe = toSafeComponentName(c);
    return `import Generated${safe} from "./${safe}";`;
  })
  .join("\n")}

export default function GeneratedWebsite() {
  return (
    <main
      className="min-h-screen w-full transition-colors duration-300 relative"
      style={{
        backgroundColor: "${colors.background}",
        color: "${colors.text}",
        fontFamily: "${typography.body}",
        "--wb-primary": "${colors.primary}",
        "--wb-secondary": "${colors.secondary}",
        "--wb-accent": "${colors.accent || colors.primary}",
        "--wb-bg": "${colors.background}",
        "--wb-bg-alt": "${colors.backgroundAlt || colors.background}",
        "--wb-surface": "${colors.surface}",
        "--wb-surface-hover": "${colors.surfaceHover}",
        "--wb-card": "${colors.card || colors.surface}",
        "--wb-card-fg": "${colors.cardForeground || colors.text}",
        "--wb-fg": "${colors.text}",
        "--wb-muted": "${colors.muted}",
        "--wb-border": "${colors.border}",
        "--wb-ring": "${colors.ring || colors.primary}",
        "--wb-destructive": "${colors.destructive || "#EF4444"}",
        "--wb-glow-primary": "${colors.glowPrimary || "rgba(37,99,235,0.2)"}",
        "--wb-glow-secondary": "${colors.glowSecondary || "rgba(96,165,250,0.15)"}",
        "--wb-gradient-primary": "${colors.gradientPrimary || "linear-gradient(135deg, #2563EB 0%, #60A5FA 100%)"}",
        "--wb-font-heading": "${typography.heading}",
        "--wb-font-body": "${typography.body}",
        "--wb-radius-default": "${tokens.radius?.default || "0.5rem"}",
        "--wb-radius-button": "${tokens.radius?.button || "0.5rem"}",
        "--wb-radius-card": "${tokens.radius?.card || "0.75rem"}",
        "--wb-shadow-subtle": "${tokens.shadows?.subtle || "0 1px 2px rgba(0,0,0,0.05)"}",
        "--wb-shadow-medium": "${tokens.shadows?.medium || "0 4px 6px -1px rgba(0,0,0,0.1)"}",
        "--wb-shadow-prominent": "${tokens.shadows?.prominent || "0 10px 15px -3px rgba(0,0,0,0.1)"}",
      } as React.CSSProperties}
    >
${componentPlan.components
  .map((c) => {
    const safe = toSafeComponentName(c);
    return `      <Generated${safe} />`;
  })
  .join("\n")}
    </main>
  );
}
`;

  writeFileSync(path.join(outDir, "Website.tsx"), websitePageCode, "utf8");
  generatedFiles.push("Website.tsx");

  // 3. Generate index.ts exporting all components
  const indexExports = [
    ...componentPlan.components.map((c) => {
      const safe = toSafeComponentName(c);
      return `export { default as Generated${safe} } from "./${safe}";`;
    }),
    `export { default as GeneratedWebsite } from "./Website";`,
  ].join("\n");

  writeFileSync(path.join(outDir, "index.ts"), indexExports, "utf8");
  generatedFiles.push("index.ts");

  return {
    outDir,
    files: generatedFiles,
    tokensApplied: {
      primaryColor: colors.primary,
      secondaryColor: colors.secondary,
      headingFont: typography.heading,
      bodyFont: typography.body,
      spacingDensity: spacing.unit,
      motionLevel: motionInfo.animationLevel,
    },
  };
}
