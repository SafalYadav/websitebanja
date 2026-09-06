import type { GlobalKnowledgeEntry, ComponentDefinitionPayload } from "./types";

export const navbarComponent: GlobalKnowledgeEntry<ComponentDefinitionPayload> = {
  metadata: {
    id: "wb:global:components:navbar:v1",
    category: "components",
    title: "Navigation Bar (Navbar)",
    description: "Top navigation header featuring brand logo and interactive navigation links",
    version: "1.0.0",
    status: "active",
    source: "src/knowledge/global/components.ts",
    schemaVersion: "1.0.0",
    updatedAt: "2026-09-05T00:00:00Z",
    tags: ["navbar", "navigation", "header", "menu", "logo"]
  },
  data: {
    componentKey: "navbar",
    displayName: "Navigation Bar",
    description: "Header navigation with brand logo (text or image) and links to website sections or subpages",
    allowedElementTypes: ["logo", "link", "button", "section"],
    requiredFields: ["logo", "links"],
    optionalFields: [],
    supportsButtonAction: true,
    supportsImageFallback: false,
    defaultData: {
      logo: { type: "text", text: "BrandName" },
      links: [
        { id: "nav_home", label: "Home", action: { type: "scroll", target: "hero" } },
        { id: "nav_about", label: "About", action: { type: "scroll", target: "about" } },
        { id: "nav_services", label: "Services", action: { type: "scroll", target: "services" } },
        { id: "nav_contact", label: "Contact", action: { type: "scroll", target: "contact" } }
      ]
    }
  }
};

export const heroComponent: GlobalKnowledgeEntry<ComponentDefinitionPayload> = {
  metadata: {
    id: "wb:global:components:hero:v1",
    category: "components",
    title: "Hero Banner",
    description: "High-impact visual banner with headline, subheadline, call-to-action button, and background image",
    version: "1.0.0",
    status: "active",
    source: "src/knowledge/global/components.ts",
    schemaVersion: "1.0.0",
    updatedAt: "2026-09-05T00:00:00Z",
    tags: ["hero", "banner", "headline", "cta", "showcase"]
  },
  data: {
    componentKey: "hero",
    displayName: "Hero Banner",
    description: "Primary above-the-fold banner designed to capture visitor attention and drive immediate conversion",
    allowedElementTypes: ["heading", "paragraph", "button", "image", "section"],
    requiredFields: ["title", "subtitle", "button"],
    optionalFields: ["image", "buttonAction"],
    supportsButtonAction: true,
    supportsImageFallback: true,
    defaultData: {
      title: "Transforming Vision Into Reality",
      subtitle: "Delivering world-class quality and exceptional service crafted specifically for your needs.",
      button: "Get In Touch",
      buttonAction: { type: "scroll", target: "contact" },
      image: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80"
    }
  }
};

export const aboutComponent: GlobalKnowledgeEntry<ComponentDefinitionPayload> = {
  metadata: {
    id: "wb:global:components:about:v1",
    category: "components",
    title: "About Us Section",
    description: "Narrative section presenting brand story, mission, founder heritage, and company values",
    version: "1.0.0",
    status: "active",
    source: "src/knowledge/global/components.ts",
    schemaVersion: "1.0.0",
    updatedAt: "2026-09-05T00:00:00Z",
    tags: ["about", "story", "mission", "company", "values"]
  },
  data: {
    componentKey: "about",
    displayName: "About Us",
    description: "Storytelling section that establishes credibility, introduces the team, and outlines core philosophy",
    allowedElementTypes: ["heading", "paragraph", "image", "section"],
    requiredFields: ["title", "content"],
    optionalFields: ["image"],
    supportsButtonAction: false,
    supportsImageFallback: true,
    defaultData: {
      title: "Our Story & Commitment",
      content: "Founded with a passion for excellence, we strive to deliver unparalleled quality across every project. Our dedicated team combines years of domain mastery with a relentless commitment to customer delight.",
      image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1000&q=80"
    }
  }
};

export const servicesComponent: GlobalKnowledgeEntry<ComponentDefinitionPayload> = {
  metadata: {
    id: "wb:global:components:services:v1",
    category: "components",
    title: "Services & Offerings Grid",
    description: "Card grid presenting discrete services, treatment options, or solution packages with CTAs",
    version: "1.0.0",
    status: "active",
    source: "src/knowledge/global/components.ts",
    schemaVersion: "1.0.0",
    updatedAt: "2026-09-05T00:00:00Z",
    tags: ["services", "offerings", "solutions", "packages", "cards"]
  },
  data: {
    componentKey: "services",
    displayName: "Services & Capabilities",
    description: "Structured array of offerings highlighting unique benefits, icons, and direct inquiry actions",
    allowedElementTypes: ["heading", "paragraph", "card", "image", "badge", "button", "section"],
    requiredFields: ["title", "description"],
    optionalFields: ["icon", "image", "buttonAction"],
    supportsButtonAction: true,
    supportsImageFallback: true,
    defaultData: [
      {
        title: "Strategic Consulting",
        description: "Comprehensive audits and roadmaps engineered to accelerate operational efficiency.",
        icon: "Briefcase",
        buttonAction: { type: "scroll", target: "contact" }
      },
      {
        title: "End-to-End Execution",
        description: "Flawless technical and creative execution backed by rigorous quality standards.",
        icon: "CheckCircle",
        buttonAction: { type: "scroll", target: "contact" }
      },
      {
        title: "Dedicated Client Support",
        description: "24/7 priority support and proactive maintenance for complete peace of mind.",
        icon: "ShieldCheck",
        buttonAction: { type: "whatsapp", target: "" }
      }
    ]
  }
};

export const featuresComponent: GlobalKnowledgeEntry<ComponentDefinitionPayload> = {
  metadata: {
    id: "wb:global:components:features:v1",
    category: "components",
    title: "Features & Competitive Advantages",
    description: "Bullet or card layout showcasing differentiating advantages, metrics, and core guarantees",
    version: "1.0.0",
    status: "active",
    source: "src/knowledge/global/components.ts",
    schemaVersion: "1.0.0",
    updatedAt: "2026-09-05T00:00:00Z",
    tags: ["features", "benefits", "advantages", "guarantees", "metrics"]
  },
  data: {
    componentKey: "features",
    displayName: "Key Features & Highlights",
    description: "Highlight section communicating trust, speed, precision, and verified outcomes",
    allowedElementTypes: ["heading", "paragraph", "card", "badge", "section"],
    requiredFields: ["title", "description"],
    optionalFields: ["icon"],
    supportsButtonAction: false,
    supportsImageFallback: false,
    defaultData: [
      {
        title: "Certified Excellence",
        description: "Industry-certified practitioners adhering to global benchmarks and best practices.",
        icon: "Award"
      },
      {
        title: "Rapid Turnaround",
        description: "Streamlined processes ensuring swift project delivery without compromising quality.",
        icon: "Zap"
      },
      {
        title: "Transparent Pricing",
        description: "Clear, upfront pricing structures with zero hidden fees or unexpected costs.",
        icon: "DollarSign"
      }
    ]
  }
};

export const productsSectionComponent: GlobalKnowledgeEntry<ComponentDefinitionPayload> = {
  metadata: {
    id: "wb:global:components:productsSection:v1",
    category: "components",
    title: "Product Catalog & Offerings Showcase",
    description: "Interactive showcase of physical goods, menu dishes, rental units, or digital items with prices and CTAs",
    version: "1.0.0",
    status: "active",
    source: "src/knowledge/global/components.ts",
    schemaVersion: "1.0.0",
    updatedAt: "2026-09-05T00:00:00Z",
    tags: ["products", "catalog", "menu", "store", "shop", "pricing", "items"]
  },
  data: {
    componentKey: "productsSection",
    displayName: "Product / Catalog Showcase",
    description: "Card grid featuring curated items with images, pricing, original price strike-throughs, and WhatsApp ordering",
    allowedElementTypes: ["heading", "paragraph", "card", "product", "badge", "button", "image", "section"],
    requiredFields: ["title", "subtitle", "products"],
    optionalFields: [],
    supportsButtonAction: true,
    supportsImageFallback: true,
    defaultData: {
      title: "Featured Collection",
      subtitle: "Discover our handpicked selection of premium offerings crafted for discerning clients.",
      products: [
        {
          id: "prod_sample_1",
          name: "Signature Collection Item",
          description: "Our top-rated premium offering handcrafted with the finest materials.",
          price: 999,
          originalPrice: 1299,
          currencyCode: "INR",
          category: "Featured",
          status: "active",
          images: ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80"],
          ctaText: "Order on WhatsApp",
          buttonAction: { type: "whatsapp", target: "" }
        }
      ]
    }
  }
};

export const faqComponent: GlobalKnowledgeEntry<ComponentDefinitionPayload> = {
  metadata: {
    id: "wb:global:components:faq:v1",
    category: "components",
    title: "Frequently Asked Questions (FAQ)",
    description: "Collapsible accordion addressing common customer inquiries, booking rules, and policies",
    version: "1.0.0",
    status: "active",
    source: "src/knowledge/global/components.ts",
    schemaVersion: "1.0.0",
    updatedAt: "2026-09-05T00:00:00Z",
    tags: ["faq", "questions", "answers", "support", "help", "accordion"]
  },
  data: {
    componentKey: "faq",
    displayName: "FAQ Accordion",
    description: "Question and answer list reducing support inquiries and clarifying customer journey questions",
    allowedElementTypes: ["heading", "paragraph", "card", "section"],
    requiredFields: ["question", "answer"],
    optionalFields: [],
    supportsButtonAction: false,
    supportsImageFallback: false,
    defaultData: [
      {
        question: "How do I place an order or schedule an appointment?",
        answer: "You can book directly by clicking our WhatsApp button or by submitting the contact form below. Our team responds within 15 minutes."
      },
      {
        question: "What payment methods are accepted?",
        answer: "We support instant UPI, major credit/debit cards, net banking, and cash on delivery/arrival."
      },
      {
        question: "What is your cancellation or refund policy?",
        answer: "Appointments may be rescheduled or cancelled with 24 hours advance notice for a full refund."
      }
    ]
  }
};

export const contactComponent: GlobalKnowledgeEntry<ComponentDefinitionPayload> = {
  metadata: {
    id: "wb:global:components:contact:v1",
    category: "components",
    title: "Contact & Location Section",
    description: "Direct contact channels (phone, email, physical address) integrated with interactive lead capture",
    version: "1.0.0",
    status: "active",
    source: "src/knowledge/global/components.ts",
    schemaVersion: "1.0.0",
    updatedAt: "2026-09-05T00:00:00Z",
    tags: ["contact", "location", "phone", "email", "leads", "address"]
  },
  data: {
    componentKey: "contact",
    displayName: "Contact Information & Form",
    description: "Essential communication anchor providing click-to-call, click-to-email, and lead capture form",
    allowedElementTypes: ["heading", "paragraph", "button", "link", "card", "section"],
    requiredFields: ["phone", "email", "address"],
    optionalFields: [],
    supportsButtonAction: true,
    supportsImageFallback: false,
    defaultData: {
      phone: "+91 98765 43210",
      email: "contact@example.com",
      address: "123 Business Avenue, Tech Park, Bangalore, KA 560001"
    }
  }
};

export const footerComponent: GlobalKnowledgeEntry<ComponentDefinitionPayload> = {
  metadata: {
    id: "wb:global:components:footer:v1",
    category: "components",
    title: "Footer Section",
    description: "Page closing bar containing legal copyright, brand attribution, and essential privacy links",
    version: "1.0.0",
    status: "active",
    source: "src/knowledge/global/components.ts",
    schemaVersion: "1.0.0",
    updatedAt: "2026-09-05T00:00:00Z",
    tags: ["footer", "copyright", "legal", "branding", "bottom"]
  },
  data: {
    componentKey: "footer",
    displayName: "Website Footer",
    description: "Standard terminal section with copyright notice and subtle WebsiteBanja attribution",
    allowedElementTypes: ["paragraph", "link", "section"],
    requiredFields: ["copyright"],
    optionalFields: [],
    supportsButtonAction: false,
    supportsImageFallback: false,
    defaultData: {
      copyright: "© 2026 BrandName. All Rights Reserved. Powered by WebsiteBanja."
    }
  }
};

export const GLOBAL_COMPONENTS: GlobalKnowledgeEntry<ComponentDefinitionPayload>[] = [
  navbarComponent,
  heroComponent,
  aboutComponent,
  servicesComponent,
  featuresComponent,
  productsSectionComponent,
  faqComponent,
  contactComponent,
  footerComponent,
];

export const SUPPORTED_ELEMENT_TYPES = [
  "heading",
  "paragraph",
  "button",
  "image",
  "badge",
  "card",
  "link",
  "product",
  "section",
  "logo",
  "page",
] as const;

export const SUPPORTED_BUTTON_ACTIONS = [
  "scroll",
  "page",
  "url",
  "whatsapp",
  "call",
  "email",
  "none",
] as const;
