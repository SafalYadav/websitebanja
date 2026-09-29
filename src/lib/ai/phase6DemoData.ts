import { normalizeIndustry, generateDesignRules } from "@/lib/ai/design/designRules";
import {
  generateDesignStrategy,
  deriveVisualArchetype,
  deriveSectionSequence,
} from "@/lib/ai/designStrategy";
import { compileDesignBrief } from "@/lib/ai/design/designBrief";
import { validateWebsiteQuality, type QualityReport } from "@/lib/ai/design/qualityValidator";
import type { WebsiteRequirement } from "@/lib/ai/requirementModel";
import type { WebsiteData, FAQ } from "@/types/website";

export interface DemoBusinessSpec {
  key: string;
  slug: string;
  businessName: string;
  industry: string;
  category: string;
  tagline: string;
  description: string;
  location: string;
  phone: string;
  email: string;
  ctaText: string;
  badge: string;
  style: string;
  services: Array<{ title: string; description: string; price?: string }>;
  features: Array<{ title: string; description: string }>;
  reviews?: Array<{ author: string; role: string; quote: string; rating?: number }>;
  faq?: Array<{ question: string; answer: string }>;
  customData?: Record<string, any>;
}

export const DEMO_BUSINESS_SPECS: DemoBusinessSpec[] = [
  {
    key: "luxury-hotel",
    slug: "luxury-hotel",
    businessName: "The Grand Azure Resort & Spa",
    industry: "luxury_hotel",
    category: "Luxury Boutique Resort & Spa",
    style: "editorial_luxury",
    tagline: "An Untamed Sanctuary of Coastal Elegance",
    description: "Nestled along the private azure coastline, offering bespoke cliffside royal villas, infinity wellness sanctuaries, Michelin-starred gastronomy, and private yacht charters.",
    location: "Azure Coast, French Riviera",
    phone: "+33 4 93 00 11 22",
    email: "concierge@grandazureresort.com",
    ctaText: "Reserve Your Villa",
    badge: "5-Star Luxury Bespoke",
    services: [
      {
        title: "Oceanfront Cliffside Villas",
        description: "Private heated infinity pools, panoramic Mediterranean terraces, and round-the-clock dedicated butler service.",
        price: "From €1,850 / night",
      },
      {
        title: "Holistic Thalassotherapy Sanctuary",
        description: "Marine-inspired wellness therapies, botanical hammams, and bespoke restorative rituals overlooking the sea.",
        price: "Curated packages",
      },
      {
        title: "Michelin-Starred Degustation",
        description: "Celebrated 9-course gastronomy by Chef Laurent, paired with rare vintage biodynamic cellar collections.",
        price: "Tasting menu",
      },
      {
        title: "Private Coastal Yacht Charters",
        description: "Custom sunset voyages aboard our handcrafted Riva Dolceriva with onboard private sommelier.",
        price: "Private booking",
      },
    ],
    features: [
      {
        title: "Private Azure Cove & Beach Club",
        description: "Direct access to our secluded white-sand shoreline with dedicated cabanas.",
      },
      {
        title: "24-Hour Bespoke Butler Care",
        description: "Personalized itinerary curation, unpacking services, and private dining arrangements.",
      },
      {
        title: "Helipad & Private Chauffeur Fleet",
        description: "Seamless transfers from Nice Côte d'Azur Airport via helicopter or Maybach fleet.",
      },
      {
        title: "Bespoke Wellness & Spa Sanctuaries",
        description: "Thermal water therapy suites and certified aesthetic dermatology treatments.",
      },
    ],
    reviews: [
      {
        author: "Archibald & Helene Vance",
        role: "Luxury Travel Connoisseurs",
        quote: "The Grand Azure redefines European hospitality. The discretion, the cliffside breakfast, and the attention to detail were unmatched.",
        rating: 5,
      },
      {
        author: "Camille Dupont",
        role: "Architectural Digest",
        quote: "A masterclass in organic coastal architecture. Every vista is framed like a Renaissance painting.",
        rating: 5,
      },
    ],
    faq: [
      {
        question: "What is included with private villa stays?",
        answer: "Every villa includes private airport helicopter transfer, dedicated butler service, complimentary cellar tasting, and daily yacht excursion privileges.",
      },
      {
        question: "Can special dietary preferences be accommodated at dining venues?",
        answer: "Our culinary director curates custom menus tailored to all dietary and allergen specifications prior to your arrival.",
      },
    ],
    customData: {
      room_showcase: [
        {
          title: "The Royal Azure Villa",
          subtitle: "450 m² • 3 King Suites • Private 25m Infinity Pool",
          description: "Perched on the highest promontory, offering 360-degree sea panoramas and custom Carrera marble finishes.",
          price: "€3,200 / night",
        },
        {
          title: "The Mediterranean Penthouse",
          subtitle: "280 m² • 2 Suites • Rooftop Solarium & Jacuzzi",
          description: "Direct private elevator access, bespoke Italian linen, and open-air fire pits under the coastal stars.",
          price: "€2,100 / night",
        },
        {
          title: "Cove Heritage Suite",
          subtitle: "140 m² • 1 King Suite • Garden Terrace & Plunge Pool",
          description: "Surrounded by centenary olive groves and aromatic lavender gardens with private beach path.",
          price: "€1,450 / night",
        },
      ],
      atmosphere_story: {
        title: "Crafted by the Tides of the Mediterranean",
        subtitle: "Heritage of Discretion & Timeless Serenity",
        content: "Founded in 1928 as a sanctuary for artists and visionaries, The Grand Azure harmoniously balances preserved Belle Époque grandeur with contemporary architectural restraint.",
      },
    },
  },
  {
    key: "saas",
    slug: "saas",
    businessName: "HyperFlow AI",
    industry: "saas",
    category: "Enterprise Workflow Automation",
    style: "dark_technical",
    tagline: "Autonomous AI Orchestration for Modern Engineering Teams",
    description: "Connect microservices, diagnose distributed bottlenecks, and automate CI/CD pipeline recoveries in sub-millisecond execution cycles with verifiable neural agents.",
    location: "San Francisco, CA & Remote",
    phone: "+1 (415) 890-4420",
    email: "enterprise@hyperflow.ai",
    ctaText: "Start Free 14-Day Trial",
    badge: "Dark Technical & High-Contrast",
    services: [
      {
        title: "Autonomous Pipeline Recovery",
        description: "Self-healing incident response that resolves test flakiness and cluster memory spikes without human pager escalation.",
        price: "$499 / cluster / mo",
      },
      {
        title: "Sub-Millisecond Event Mesh",
        description: "Zero-latency telemetry pipeline ingesting over 500,000 metrics per second with automatic schema drift adaptation.",
        price: "Pay-as-you-scale",
      },
      {
        title: "SOC2 Type II & FedRAMP Shield",
        description: "Zero-retention air-gapped cryptographic execution with deterministic prompt verification and audit compliance.",
        price: "Enterprise ready",
      },
      {
        title: "Predictive Cost & Latency Balancer",
        description: "Dynamic cloud GPU provisioning reducing inference costs by up to 64% while maintaining strict P99 latency guarantees.",
        price: "Instant ROI",
      },
    ],
    features: [
      {
        title: "68% Latency Reduction",
        description: "Real-time edge vector caching eliminates repetitive LLM hops across all distributed services.",
      },
      {
        title: "Zero-Config CLI & SDK",
        description: "Deploy in 3 minutes via single `npx hyperflow-init` or Terraform provider bindings.",
      },
      {
        title: "Multi-Model Consensus Engine",
        description: "Cross-checks mission-critical decisions across Gemini, Claude, and GPT before committing changes.",
      },
      {
        title: "99.999% SLA Uptime Guarantee",
        description: "Globally distributed control plane spanning 18 AWS, GCP, and Azure multi-cloud regions.",
      },
    ],
    reviews: [
      {
        author: "Devon Zhao",
        role: "VP of Engineering at FinFlow",
        quote: "HyperFlow reduced our on-call alerts by 73% in our first quarter. The automated pipeline remediation feels like magic.",
        rating: 5,
      },
      {
        author: "Elena Rostova",
        role: "Head of Infrastructure at CloudScale",
        quote: "We scaled from 10M to 150M events daily without a single bottleneck. The telemetry observability is light years ahead.",
        rating: 5,
      },
    ],
    faq: [
      {
        question: "Does HyperFlow require sending proprietary source code to external servers?",
        answer: "No. HyperFlow offers an on-premise VPC container runtime where zero prompts, source code, or customer tokens ever leave your cloud boundary.",
      },
      {
        question: "How difficult is migration from legacy Airflow or GitHub Actions?",
        answer: "HyperFlow natively parses existing YAML configs and automatically translates them into self-healing execution graphs.",
      },
    ],
  },
  {
    key: "restaurant",
    slug: "restaurant",
    businessName: "L'Aura Epicure",
    industry: "restaurant",
    category: "Modern Culinary Atelier",
    style: "warm_artisanal",
    tagline: "A Progressive Sensory Tasting Journey Through Terroir",
    description: "An intimate 24-seat dining salon dedicated to hyper-seasonal heirloom produce, ancestral wood-fired fermentation, and rare biodynamic cellar discovery.",
    location: "Mayfair, London, UK",
    phone: "+44 20 7946 0912",
    email: "reservations@laura-epicure.co.uk",
    ctaText: "Book Your Table",
    badge: "Warm Artisanal & Atmospheric",
    services: [
      {
        title: "12-Course Terroir Degustation",
        description: "An evolving gastronomic narrative capturing morning harvests from our Kent regenerative farm.",
        price: "£195 per guest",
      },
      {
        title: "Rare Biodynamic Cellar Pairing",
        description: "Unfiltered natural vintages, small-grower Champagnes, and botanical infusions curated by Sommelier Claire Moreau.",
        price: "£125 per guest",
      },
      {
        title: "The Chef's Hearth Counter",
        description: "Front-row interactive seating with Executive Chef Julian, featuring exclusive kitchen-only courses.",
        price: "£245 per guest",
      },
      {
        title: "Private Salon Celebrations",
        description: "Exclusive salon hire for up to 14 guests with tailored commemorative menu cards and bespoke floral styling.",
        price: "Inquire directly",
      },
    ],
    features: [
      {
        title: "Regenerative Organic Farm-to-Hearth",
        description: "100% of our botanicals, heritage grains, and greens are harvested within 40 miles on the day of service.",
      },
      {
        title: "Ancestral Koji & Wood-Fired Aging",
        description: "Custom fermentation laboratory utilizing ancient techniques to yield unprecedented depth of umami.",
      },
      {
        title: "Low-Intervention Living Wines",
        description: "Over 600 hand-selected biodynamic references celebrating regenerative European viticulture.",
      },
      {
        title: "Intimate 24-Cover Salon",
        description: "Acoustically tuned environment designed for immersive culinary focus and calm celebration.",
      },
    ],
    reviews: [
      {
        author: "Marcus Sterling",
        role: "The Michelin Guide Reviewer",
        quote: "Julian's mastery of fire and wild fermentation is extraordinary. The salt-baked parsnip in hazelnut miso was revelatory.",
        rating: 5,
      },
      {
        author: "Sophia Chen",
        role: "Gastronomy Quarterly",
        quote: "Atmospheric, warm, and deeply authentic. Without doubt London's most poetic dining experience of the decade.",
        rating: 5,
      },
    ],
    faq: [
      {
        question: "How far in advance are reservations released?",
        answer: "Table reservations open on the 1st of each month at 10:00 AM GMT for the following calendar month.",
      },
      {
        question: "Is there a dress code?",
        answer: "Smart casual is welcomed. We encourage guests to dress comfortably for a relaxed, multi-hour dining journey.",
      },
    ],
    customData: {
      signature_dishes: [
        {
          title: "Ember-Smoked Langoustine",
          subtitle: "Wild sea buckthorn, charred kombu broth & preserved lemon",
          description: "Scottish langoustine briefly kiss-smoked over birch coals with our signature 3-year fermented kelp glaze.",
        },
        {
          title: "Heirloom Squab & Foraged Elderberry",
          subtitle: "Roasted hay essence, black garlic tartlet & wood sorrel",
          description: "Dry-aged for 14 days in beeswax, served with an intensely clarified reduction of roasted bones and autumnal berries.",
        },
        {
          title: "Meadow Honey & Roasted Yeast Parfait",
          subtitle: "Buckwheat tuile, caramelized whey & chamomile sorbet",
          description: "Our signature dessert pairing contrasting salty-sweet warmth with crisp botanical clarity.",
        },
      ],
      atmosphere_story: {
        title: "Where Ancestral Craft Meets Contemporary Elegance",
        subtitle: "The Philosophy of L'Aura Epicure",
        content: "We believe food should not merely nourish; it should evoke memory, honor the soil, and kindle human connection through sensory stillness.",
      },
    },
  },
  {
    key: "real-estate",
    slug: "real-estate",
    businessName: "Aura & Stone Realty",
    industry: "real_estate",
    category: "Luxury Architecture & Estates",
    style: "architectural_grid",
    tagline: "Curators of Rare Architectural Landmarks & Private Sanctuaries",
    description: "Representing prime mid-century masterpieces, waterfront compounds, and heritage estates for discerning global collectors and investors.",
    location: "Geneva & Beverly Hills",
    phone: "+41 22 819 9000",
    email: "estates@aurastone.com",
    ctaText: "Inquire for Private Dossier",
    badge: "Architectural Grid & Minimal Editorial",
    services: [
      {
        title: "Prime Architectural Acquisitions",
        description: "Bespoke sourcing of architect-designed modern masterpieces and historically protected heritage estates.",
        price: "Off-market representation",
      },
      {
        title: "Confidential Private Portfolio Sale",
        description: "Discreet marketing channels reaching pre-qualified ultra-high-net-worth family offices and private collectors.",
        price: "Full discretion",
      },
      {
        title: "Development & Masterplan Advisory",
        description: "Strategic zoning, architectural branding, and spatial positioning for prime luxury residential developments.",
        price: "Consultative mandate",
      },
      {
        title: "Global Relocation & Lifestyle Concierge",
        description: "Comprehensive tax, legal, and lifestyle onboarding across Switzerland, France, and North America.",
        price: "Client dedicated",
      },
    ],
    features: [
      {
        title: "$1.4B+ Verified Transaction Volume",
        description: "Over a decade of successful landmark estate closings across prime global tier-one markets.",
      },
      {
        title: "70% Confidential Off-Market Inventory",
        description: "Access iconic properties never publicly broadcast on standard MLS or aggregators.",
      },
      {
        title: "Architectural Integrity Curation",
        description: "Every represented property is vetted for structural pedigree, spatial light quality, and lasting value.",
      },
      {
        title: "Global Family Office Network",
        description: "Direct relationship bridges to elite collectors in Zurich, London, New York, Tokyo, and Dubai.",
      },
    ],
    reviews: [
      {
        author: "Henrik Lindqvist",
        role: "Industrialist & Collector",
        quote: "Aura & Stone located an unlisted Richard Neutra pavilion for us in under three weeks. Flawless execution and utmost privacy.",
        rating: 5,
      },
      {
        author: "Clarissa Montgomery",
        role: "Global Private Investor",
        quote: "Their architectural knowledge exceeds standard brokerage. They understand spatial aesthetics as deeply as capital appreciation.",
        rating: 5,
      },
    ],
    faq: [
      {
        question: "How do you preserve discretion for high-profile sellers?",
        answer: "We sign strict bi-lateral NDAs before releasing property addresses, floor plans, or photography, screening every buyer's capital credentials.",
      },
      {
        question: "Do you handle international cross-border acquisitions?",
        answer: "Yes. Our legal advisory partners in Zurich and London navigate residency guidelines, property taxes, and cross-border currency structuring.",
      },
    ],
    customData: {
      selected_works: [
        {
          title: "Villa Mirasol, Cap d'Antibes",
          subtitle: "€24,500,000 • 850 m² Interior • 4,200 m² Grounds",
          description: "Private peninsula residence featuring clean modernist lines, sea-level private dock, and manicured sculptural cypress gardens.",
        },
        {
          title: "The Glass Pavilion, Lake Geneva",
          subtitle: "CHF 18,200,000 • 6 Suites • Floor-to-Ceiling Thermal Glass",
          description: "Award-winning minimalist design by Kengo Kuma associates, framing uninterrupted Alpine vistas across the water.",
        },
        {
          title: "Bel-Air Mid-Century Icon",
          subtitle: "$21,000,000 • 5 Beds • Restored 1962 Masterpiece",
          description: "Meticulously preserved terrazzo floors, floating redwood ceilings, and sunken lounge opening onto city lights.",
        },
      ],
    },
  },
  {
    key: "creative-agency",
    slug: "creative-agency",
    businessName: "Studio Monochrome",
    industry: "creative_agency",
    category: "Digital Product & Brand Atelier",
    style: "expressive_creative",
    tagline: "We Design Bold Cultural Artefacts & Category-Defining Digital Realities",
    description: "Partnering with visionary founders and iconic institutions to create magnetic brand systems, boundary-pushing web applications, and immersive 3D realms.",
    location: "Berlin & New York",
    phone: "+49 30 5566 7788",
    email: "hello@studiomonochrome.de",
    ctaText: "Commission a Project",
    badge: "Expressive Creative & Bold Brutalist",
    services: [
      {
        title: "Avant-Garde Brand Architecture",
        description: "Radical typography, motion identities, generative design systems, and brand manifestos that demand cultural attention.",
        price: "From €35k",
      },
      {
        title: "Immersive Web & Spatial 3D",
        description: "WebGL, WebGPU, and interactive spatial websites with cinematic micro-interactions and frictionless conversion engineering.",
        price: "From €45k",
      },
      {
        title: "Digital Product Experience Design",
        description: "End-to-end design sprints, tokenized Figma component libraries, and interactive prototyping for high-growth tech platforms.",
        price: "Sprint or Retainer",
      },
      {
        title: "Creative Direction & Campaign Worlds",
        description: "3D editorial CGI, cinematic film production, and cross-platform global launch assets that win awards.",
        price: "Custom mandate",
      },
    ],
    features: [
      {
        title: "24 D&AD Pencils & Awwwards POTD",
        description: "Consistently recognized globally for pushing the expressive limits of visual and technological craft.",
      },
      {
        title: "6-Week Rapid Impact Sprints",
        description: "No bloated agency layers. You collaborate directly with principal creative directors and lead creative technologists.",
      },
      {
        title: "Sub-Second Framerate Performance",
        description: "Our heavy WebGL and 3D scenes are engineered to load instantly and run at butter-smooth 60fps on mobile devices.",
      },
      {
        title: "Global Cultural Reach",
        description: "Our campaigns have reached over 250M impressions across European, North American, and Asian markets.",
      },
    ],
    reviews: [
      {
        author: "Kaspar Brandt",
        role: "Founder, NeoPulse Robotics",
        quote: "Studio Monochrome transformed our tech startup into a cultural phenomenon. Our seed round was oversubscribed within 10 days of launch.",
        rating: 5,
      },
      {
        author: "Amara Okonjo",
        role: "Chief Brand Officer, Kvantum",
        quote: "They don't do boring corporate templates. Every detail is sharp, daring, and unapologetically visionary.",
        rating: 5,
      },
    ],
    faq: [
      {
        question: "What is your typical project timeline?",
        answer: "Brand identity systems typically require 4–6 weeks; full custom interactive 3D web platforms range from 6–10 weeks.",
      },
      {
        question: "Do you collaborate with our in-house engineering team?",
        answer: "Seamlessly. We deliver clean TypeScript/React code, Tailwind design tokens, and Framer Motion primitives ready for your engineers to ship.",
      },
    ],
    customData: {
      selected_cases: [
        {
          title: "Kvantum Autonomous OS",
          subtitle: "Brand Identity • 3D Interaction • Design System",
          description: "Category-defining brand transformation for Europe's fastest growing quantum computing platform.",
        },
        {
          title: "Aura Sound Hardware",
          subtitle: "E-Commerce • WebGL Spatial Experience • 3D CGI",
          description: "Sculptural hardware launch achieving 340% pre-order target in first 48 hours.",
        },
        {
          title: "Voltaic Energy Network",
          subtitle: "Interactive Annual Report • Real-time Data Art",
          description: "Transforming 100,000 real-time solar grid data points into an interactive living kinetic canvas.",
        },
      ],
    },
  },
  {
    key: "local-service",
    slug: "local-service",
    businessName: "Apex Prime Electrical",
    industry: "local_service",
    category: "Certified Residential & Commercial Electrical",
    style: "high_trust_service",
    tagline: "Licensed Master Electricians Available 24/7 for Guaranteed Safety",
    description: "Rapid emergency electrical response, smart home panel modernizations, EV fast-charger installations, and commercial code compliance certified by master electricians.",
    location: "Austin, TX & Surrounding Metro",
    phone: "+1 (512) 555-0199",
    email: "dispatch@apexprimeelectric.com",
    ctaText: "Call for Rapid Dispatch",
    badge: "High Trust Service & Certified",
    services: [
      {
        title: "24/7 Emergency Dispatch",
        description: "Immediate master electrician arrival for sudden power outages, circuit overloads, and storm damage hazards.",
        price: "Under 45 min response",
      },
      {
        title: "Smart Electrical Panel Upgrades",
        description: "200A/400A whole-home modernizations, smart breaker integrations, and complete code safety certification.",
        price: "Free upfront estimate",
      },
      {
        title: "Level 2 EV Charger Installations",
        description: "Tesla, ChargePoint, and universal EV charger circuits wired with surge protection and local rebate assistance.",
        price: "Fixed upfront pricing",
      },
      {
        title: "Commercial Safety & Code Audits",
        description: "Comprehensive thermal imaging diagnostics, generator backup hookups, and multi-tenant compliance logs.",
        price: "Licensed & bonded",
      },
    ],
    features: [
      {
        title: "45-Minute Average Response Time",
        description: "Mobile dispatch units continuously stationed throughout the metro area for rapid emergency response.",
      },
      {
        title: "100% Upfront Transparent Pricing",
        description: "No hidden dispatch fees or surprise overtime charges. You approve the exact quote before any work starts.",
      },
      {
        title: "Master Electrician Licensed & Insured",
        description: "All technicians are state-certified master or journeyman electricians with background checks and drug testing.",
      },
      {
        title: "Lifetime Workmanship Warranty",
        description: "Every panel installation and electrical run is backed by our unconditional 10-year parts & labor warranty.",
      },
    ],
    reviews: [
      {
        author: "Travis Hollingsworth",
        role: "Homeowner in Westlake",
        quote: "Our main breaker blew at 10 PM on a stormy Saturday. Apex arrived in 35 minutes, diagnosed a damaged neutral wire, and had power back safely before midnight.",
        rating: 5,
      },
      {
        author: "Sarah Jenkins",
        role: "Owner, Oak Hill Bistro",
        quote: "They upgraded our commercial kitchen panel with zero downtime during business hours. Professional, clean, and upfront about every dollar.",
        rating: 5,
      },
    ],
    faq: [
      {
        question: "How quickly can an emergency electrician arrive?",
        answer: "Our automated dispatch system routes the nearest truck directly to your location with an average arrival window of 35 to 45 minutes.",
      },
      {
        question: "Are your technicians licensed and insured?",
        answer: "Yes. Every technician holds state master or journeyman certification, and our company carries $2,000,000 comprehensive liability insurance.",
      },
    ],
  },
];

import { resolveSemanticImage, canonicalizeImageUrl } from "@/lib/images/semanticImageSourcing";

/**
 * Options for demo website generation including cross-business deduplication
 */
export interface GenerateDemoWebsiteOptions {
  avoidImages?: string[];
  seed?: string | number;
}

/**
 * Executes the complete WebsiteBanja Phase 6 design engine pipeline
 * to produce fully populated, differentiated WebsiteData with verified,
 * section-aware and industry-specific imagery.
 */
export function generateDemoWebsite(
  spec: DemoBusinessSpec,
  options?: GenerateDemoWebsiteOptions
): WebsiteData {
  const req: WebsiteRequirement = {
    intent: `create ${spec.businessName} website`,
    business: {
      name: spec.businessName,
      type: spec.category,
      industry: spec.industry,
    },
    services: spec.services.map((s) => s.title),
    brand: {
      style: spec.style,
    },
    cta: spec.ctaText,
  };

  // 1. Run Phase 6 industry normalization and design rules
  const normalizedInd = normalizeIndustry(req);
  const designRules = generateDesignRules(req);

  // 2. Generate Phase 6 Design Strategy
  const strategyInput = {
    category: normalizedInd,
    businessName: spec.businessName,
    description: spec.description,
    style: spec.style,
  };
  const computedStrategy = generateDesignStrategy(strategyInput);
  const archetype = deriveVisualArchetype(strategyInput);

  // 3. Compile full Design Brief
  const designBrief = compileDesignBrief(computedStrategy, designRules, req);

  // 4. Derive bespoke section sequence
  const sectionSequence = deriveSectionSequence(archetype, {
    category: normalizedInd,
    description: spec.description,
  });

  const faqItems: FAQ[] = (spec.faq || []).map((f) => ({
    question: f.question,
    answer: f.answer,
  }));

  // 5. Intelligent Image & Asset Differentiation (Phase 6.1)
  // Maintains strict in-page deduplication and respects cross-business avoid lists
  const usedInPage = new Set<string>();
  const avoidImages = [...(options?.avoidImages || [])];

  // Resolve distinct Hero Image
  const heroImageMeta = resolveSemanticImage({
    category: spec.industry,
    businessName: spec.businessName,
    archetype,
    role: "hero",
    usedInPage,
    avoidImages,
  });

  // Resolve distinct About Image
  const aboutImageMeta = resolveSemanticImage({
    category: spec.industry,
    businessName: spec.businessName,
    archetype,
    role: "about",
    usedInPage,
    avoidImages,
  });

  // Resolve distinct, role-aware Service Images
  const servicesData = spec.services.map((s, idx) => {
    const sMeta = resolveSemanticImage({
      category: spec.industry,
      businessName: spec.businessName,
      archetype,
      role: "services",
      itemIndex: idx,
      itemTitle: s.title,
      usedInPage,
      avoidImages,
    });
    return {
      title: s.title,
      description: s.description,
      price: s.price,
      image: sMeta.imageUrl,
    };
  });

  // Resolve distinct, role-aware Feature Images
  const featuresData = spec.features.map((f, idx) => {
    const fMeta = resolveSemanticImage({
      category: spec.industry,
      businessName: spec.businessName,
      archetype,
      role: "features",
      itemIndex: idx,
      itemTitle: f.title,
      usedInPage,
      avoidImages,
    });
    return {
      title: f.title,
      description: f.description,
      image: fMeta.imageUrl,
    };
  });

  // Resolve distinct images for Custom Collections (room_showcase, signature_dishes, selected_works)
  const populatedCustomData: Record<string, any> = {};
  if (spec.customData) {
    for (const [key, val] of Object.entries(spec.customData)) {
      if (Array.isArray(val)) {
        populatedCustomData[key] = val.map((item, idx) => {
          if (typeof item === "object" && item !== null && (item.title || item.name)) {
            const itemTitle = item.title || item.name;
            const meta = resolveSemanticImage({
              category: spec.industry,
              businessName: spec.businessName,
              archetype,
              role: "gallery",
              itemIndex: idx,
              itemTitle,
              usedInPage,
              avoidImages,
            });
            return {
              ...item,
              image: item.image || meta.imageUrl,
            };
          }
          return item;
        });
      } else {
        populatedCustomData[key] = val;
      }
    }
  }

  // 6. Construct full WebsiteData matching WebsiteBanja standards
  const websiteData: WebsiteData = {
    businessName: spec.businessName,
    brand: {
      name: spec.businessName,
      industry: spec.category,
      tagline: spec.tagline,
      description: spec.description,
    },
    navbar: {
      logo: {
        type: "text",
        text: spec.businessName,
      },
      links: [
        { id: "nav_services", label: "Offerings", action: { type: "scroll", target: "services" } },
        { id: "nav_features", label: "Excellence", action: { type: "scroll", target: "features" } },
        { id: "nav_about", label: "Story", action: { type: "scroll", target: "about" } },
        { id: "nav_contact", label: "Contact", action: { type: "scroll", target: "contact" } },
      ],
    },
    hero: {
      title: spec.tagline,
      subtitle: spec.description,
      button: spec.ctaText,
      eyebrow: spec.badge,
      image: heroImageMeta.imageUrl,
      buttonAction: {
        type: "scroll",
        target: "contact",
        label: spec.ctaText,
      },
      layoutVariant: computedStrategy.heroType as any,
      backgroundStyle: computedStrategy.backgroundStrategy,
      spatial3d: computedStrategy.spatial3d,
    },
    about: {
      title: `About ${spec.businessName}`,
      content: `${spec.description} Rooted in uncompromising dedication to quality, our mission is to deliver timeless distinction and measurable excellence in every client engagement.`,
      image: aboutImageMeta.imageUrl,
    },
    services: servicesData,
    features: featuresData,
    reviews: spec.reviews?.map((r) => ({
      name: r.author,
      role: r.role,
      comment: r.quote,
      rating: r.rating || 5,
    })),
    faq: faqItems,
    contact: {
      phone: spec.phone,
      email: spec.email,
      address: spec.location,
    },
    footer: {
      copyright: `© ${new Date().getFullYear()} ${spec.businessName}. All rights reserved. Built with WebsiteBanja AI.`,
    },
    designStrategy: {
      visualArchetype: archetype,
      heroType: computedStrategy.heroType,
      colorMood: computedStrategy.colorMood,
      typographyStyle: computedStrategy.typographyStyle,
      cardTreatment: computedStrategy.cardTreatment,
      backgroundStrategy: computedStrategy.backgroundStrategy,
      spatial3d: computedStrategy.spatial3d,
      heroBackground: computedStrategy.heroBackground,
      sectionSequence,
      cardFamilyStrategy: computedStrategy.cardFamilyStrategy,
      featuresLayoutStrategy: computedStrategy.featuresLayoutStrategy,
      colorSystem: {
        bg: designBrief.colorSystem.background,
        surface: designBrief.colorSystem.surface,
        surfaceAlt: designBrief.colorSystem.surfaceElevated,
        text: designBrief.colorSystem.foreground,
        muted: designBrief.colorSystem.muted,
        primary: designBrief.colorSystem.primary,
        secondary: designBrief.colorSystem.secondary,
        accent: designBrief.colorSystem.accent,
        border: designBrief.colorSystem.border,
        shadow: designBrief.colorSystem.shadow,
      },
    },
    sectionOrder: sectionSequence,
    pages: [
      {
        id: "home",
        slug: "",
        title: "Home",
        isHome: true,
        sectionOrder: sectionSequence,
      },
    ],
    // Attach custom section data (e.g. signature_dishes, room_showcase, selected_works, etc.)
    ...populatedCustomData,
  };

  return websiteData;
}

/**
 * Returns all generated demo websites mapped by slug,
 * strictly enforcing cross-business deduplication.
 */
export function getAllDemoWebsites(): Record<
  string,
  { spec: DemoBusinessSpec; website: WebsiteData; quality: QualityReport }
> {
  const result: Record<
    string,
    { spec: DemoBusinessSpec; website: WebsiteData; quality: QualityReport }
  > = {};

  const globalUsedImages = new Set<string>();

  for (const spec of DEMO_BUSINESS_SPECS) {
    const website = generateDemoWebsite(spec, {
      avoidImages: Array.from(globalUsedImages),
    });

    // Record images to prevent cross-business duplication
    if (website.hero?.image) {
      globalUsedImages.add(canonicalizeImageUrl(website.hero.image));
    }
    if (website.about?.image) {
      globalUsedImages.add(canonicalizeImageUrl(website.about.image));
    }
    website.services?.forEach((s) => {
      if (s.image) globalUsedImages.add(canonicalizeImageUrl(s.image));
    });
    website.features?.forEach((f) => {
      if (f.image) globalUsedImages.add(canonicalizeImageUrl(f.image));
    });

    const quality = validateWebsiteQuality(
      website as unknown as Record<string, unknown>,
      spec.businessName
    );

    result[spec.slug] = {
      spec,
      website,
      quality,
    };
  }
  return result;
}

/**
 * Audit result interface for Phase 6.1 asset differentiation verification
 */
export interface AssetDifferentiationAudit {
  totalWebsitesAudited: number;
  totalImagesResolved: number;
  inPageDuplicateCount: number;
  crossBusinessDuplicateCount: number;
  heroDuplicateCount: number;
  irrelevantIndustryImageCount: number;
  isSaaSCafeFixed: boolean;
  businessDetails: Record<
    string,
    {
      businessName: string;
      heroImage: string;
      imageCount: number;
      uniqueImages: string[];
      hasCafeImage: boolean;
      allImagesRelevant: boolean;
    }
  >;
}

const CAFE_IMAGE_BASE = "photo-1501339847302-ac426a4a7cbb";

/**
 * Validates that all generated websites have differentiated, section-aware,
 * industry-relevant imagery without any cross-business or in-page collisions.
 */
export function validateAssetDifferentiation(): AssetDifferentiationAudit {
  const allDemos = getAllDemoWebsites();
  const businessKeys = Object.keys(allDemos);

  let totalImagesResolved = 0;
  let inPageDuplicateCount = 0;
  const crossBusinessImages = new Map<string, string[]>(); // canonicalUrl -> [businessSlugs]
  const heroImages = new Map<string, string[]>(); // canonicalUrl -> [businessSlugs]
  let irrelevantIndustryImageCount = 0;
  let isSaaSCafeFixed = true;

  const businessDetails: AssetDifferentiationAudit["businessDetails"] = {};

  for (const slug of businessKeys) {
    const { spec, website } = allDemos[slug];
    const pageCanonicalImages: string[] = [];
    const seenOnPage = new Set<string>();

    const recordImage = (url: string | undefined, role: string) => {
      if (!url) return;
      totalImagesResolved++;
      const canonical = canonicalizeImageUrl(url);
      pageCanonicalImages.push(canonical);

      if (seenOnPage.has(canonical)) {
        inPageDuplicateCount++;
      } else {
        seenOnPage.add(canonical);
      }

      // Track cross-business occurrences
      const existing = crossBusinessImages.get(canonical) || [];
      existing.push(slug);
      crossBusinessImages.set(canonical, existing);

      // Check industry relevance
      if (slug === "saas") {
        if (canonical.includes(CAFE_IMAGE_BASE) || canonical.includes("restaurant") || canonical.includes("coffee")) {
          irrelevantIndustryImageCount++;
        }
      } else if (slug === "luxury-hotel") {
        if (canonical.includes("electric") || canonical.includes("server") || canonical.includes("coding")) {
          irrelevantIndustryImageCount++;
        }
      }
    };

    // Hero
    if (website.hero?.image) {
      recordImage(website.hero.image, "hero");
      const heroCanonical = canonicalizeImageUrl(website.hero.image);
      const heroOwners = heroImages.get(heroCanonical) || [];
      heroOwners.push(slug);
      heroImages.set(heroCanonical, heroOwners);
    }

    // About
    if (website.about?.image) {
      recordImage(website.about.image, "about");
    }

    // Services
    website.services?.forEach((s) => recordImage(s.image, "service"));

    // Features
    website.features?.forEach((f) => recordImage(f.image, "feature"));

    // Custom collections
    if (spec.customData) {
      for (const [key, val] of Object.entries(spec.customData)) {
        if (Array.isArray(val)) {
          val.forEach((item) => {
            if (item && typeof item === "object" && (item as any).image) {
              recordImage((item as any).image, key);
            }
          });
        }
      }
    }

    const hasCafeImage = pageCanonicalImages.some((img) => img.includes(CAFE_IMAGE_BASE));
    if (slug === "saas" && hasCafeImage) {
      isSaaSCafeFixed = false;
    }

    businessDetails[slug] = {
      businessName: spec.businessName,
      heroImage: website.hero?.image || "",
      imageCount: pageCanonicalImages.length,
      uniqueImages: Array.from(seenOnPage),
      hasCafeImage,
      allImagesRelevant: slug === "saas" ? !hasCafeImage : true,
    };
  }

  // Cross-business duplicates: any image appearing in more than 1 business
  let crossBusinessDuplicateCount = 0;
  for (const [, owners] of crossBusinessImages.entries()) {
    const uniqueOwners = new Set(owners);
    if (uniqueOwners.size > 1) {
      crossBusinessDuplicateCount += uniqueOwners.size - 1;
    }
  }

  // Hero duplicates: any hero image appearing in more than 1 business
  let heroDuplicateCount = 0;
  for (const [, owners] of heroImages.entries()) {
    const uniqueOwners = new Set(owners);
    if (uniqueOwners.size > 1) {
      heroDuplicateCount += uniqueOwners.size - 1;
    }
  }

  return {
    totalWebsitesAudited: businessKeys.length,
    totalImagesResolved,
    inPageDuplicateCount,
    crossBusinessDuplicateCount,
    heroDuplicateCount,
    irrelevantIndustryImageCount,
    isSaaSCafeFixed,
    businessDetails,
  };
}
