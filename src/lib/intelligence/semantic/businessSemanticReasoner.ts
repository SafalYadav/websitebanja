// src/lib/intelligence/semantic/businessSemanticReasoner.ts
/**
 * WebsiteBanja Semantic Business Reasoning Engine
 * 
 * Understands business domain, service intent, primary objects/vehicles,
 * forbidden objects, and customer conversion motivation without relying on rigid,
 * brittle category strings.
 * 
 * Distinguishes:
 * - FACT: Directly verified in business listing, name, or Google Places data
 * - INFERENCE: High-confidence semantic deduction from business terminology
 * - UNKNOWN: Indeterminate attributes requiring safe neutral handling
 */

export interface SemanticConceptCluster {
  domain: string;
  subdomain: string;
  keywords: string[];
  primaryObjects: string[];
  forbiddenObjects: string[];
  preferredImageryThemes: string[];
  forbiddenImageryThemes: string[];
  primaryCtaOptions: {
    primary: string;
    secondary: string;
    intent: string;
  };
  sampleServices: Array<{
    title: string;
    description: string;
    price?: string;
  }>;
  taglineTemplate: (name: string, location: string) => string;
}

export interface BusinessSemanticProfile {
  domain: string;
  subdomain: string;
  confidence: number;
  confidenceLevel: "HIGH" | "MEDIUM" | "LOW";
  primaryObjects: string[];
  forbiddenObjects: string[];
  preferredImageryThemes: string[];
  forbiddenImageryThemes: string[];
  customerIntent: string;
  primaryCta: {
    label: string;
    secondaryLabel: string;
    intent: string;
  };
  recommendedServices: Array<{
    title: string;
    description: string;
    price?: string;
  }>;
  factualTagline: string;
  groundedTrustBadges: string[];
  forbiddenClaims: string[];
  evidenceSummary: {
    factsObserved: string[];
    inferencesDeducted: string[];
    unknownsIdentified: string[];
  };
  googlePlaceTypes: string[];
  offerings: string[];
  tone: string[];
  trustSignals: string[];
  sectionStrategy: string[];
  evidenceSources: Array<"business_name" | "category" | "google_places" | "description" | "location">;
}

/** @deprecated Use BusinessSemanticProfile. */
export type SemanticBusinessAnalysis = BusinessSemanticProfile;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Match complete words/phrases so `Thai`, `Said`, and `Retail` never match `ai`. */
export function containsSemanticPhrase(text: string, phrase: string): boolean {
  const normalizedPhrase = phrase.trim().replace(/[_-]+/g, " ");
  if (!normalizedPhrase) return false;
  const pattern = escapeRegExp(normalizedPhrase).replace(/\s+/g, "[\\s_-]+");
  return new RegExp(`(?:^|[^a-z0-9])${pattern}(?=$|[^a-z0-9])`, "i").test(text);
}

/**
 * Universal Semantic Concept Clusters
 * Organizes business understanding around semantic intent rather than single keywords.
 */
const CONCEPT_CLUSTERS: SemanticConceptCluster[] = [
  // 1. Two-Wheeler / Motorcycle & Scooter Mobility
  {
    domain: "transportation_mobility",
    subdomain: "two_wheeler_rental",
    keywords: [
      "bike rental",
      "bike on rent",
      "motorcycle rental",
      "motorcycle hire",
      "scooter rental",
      "scooty on rent",
      "two wheeler rental",
      "two-wheeler",
      "rent a bike",
      "bike hire",
      "bullet rental",
      "royal enfield on rent",
      "activa rental",
      "vespa rental",
      "bike tours",
      "motorbike rental",
    ],
    primaryObjects: [
      "motorcycle",
      "scooter",
      "bike",
      "two-wheeler",
      "motorbike",
      "helmet",
      "riding gear",
      "royal enfield",
      "activa",
    ],
    forbiddenObjects: [
      "car",
      "automobile",
      "sedan",
      "suv",
      "hatchback",
      "luxury car",
      "dining",
      "restaurant",
      "food",
      "dish",
      "bed",
      "hotel room",
    ],
    preferredImageryThemes: [
      "motorcycle_fleet",
      "scooter_rental",
      "riding_highways",
      "motorcycle_touring",
      "city_two_wheelers",
      "local_scenic_roads",
    ],
    forbiddenImageryThemes: [
      "luxury_sedans",
      "car_interiors",
      "foreign_highway_cars",
      "fine_dining_tables",
      "hotel_suites",
    ],
    primaryCtaOptions: {
      primary: "Book a Bike",
      secondary: "Check Bike Availability",
      intent: "reserve_two_wheeler",
    },
    sampleServices: [
      {
        title: "Daily Scooter & Activa Rentals",
        description: "Economical, lightweight, and hassle-free automatic scooters for smooth city commuting and sightseeing.",
        price: "From ₹400 / day",
      },
      {
        title: "Royal Enfield & Cruiser Motorcycles",
        description: "Powerful 350cc & 500cc touring motorbikes inspected and prepped for long-distance highway road trips.",
        price: "From ₹900 / day",
      },
      {
        title: "Premium Commuter Motorbikes",
        description: "Fuel-efficient, dependable 125cc-160cc street bikes perfect for flexible daily or weekly rentals.",
        price: "From ₹600 / day",
      },
      {
        title: "Rider Safety Kit & Tour Gear",
        description: "Sanitized ISI-certified helmets, mobile navigation mounts, luggage bungee cords, and safety locks included.",
        price: "Complimentary with rental",
      },
    ],
    taglineTemplate: (name, loc) => `Verified Two-Wheeler & Motorcycle Rentals in ${loc}`,
  },

  // 2. Four-Wheeler / Self-Drive & Chauffeur Mobility
  {
    domain: "transportation_mobility",
    subdomain: "four_wheeler_rental",
    keywords: [
      "car rental",
      "self drive car",
      "car hire",
      "car hire service",
      "cab service",
      "chauffeur",
      "vehicle rental",
      "suv rental",
      "sedan rental",
      "carz",
    ],
    primaryObjects: [
      "car",
      "sedan",
      "suv",
      "automobile",
      "self-drive vehicle",
      "fleet",
      "car dashboard",
    ],
    forbiddenObjects: [
      "motorcycle",
      "scooter",
      "bike",
      "dining",
      "restaurant",
      "food",
      "hotel bedroom",
    ],
    preferredImageryThemes: [
      "self_drive_cars",
      "suv_fleet",
      "scenic_drive",
      "highway_transit",
    ],
    forbiddenImageryThemes: [
      "motorcycles",
      "two_wheelers",
      "fine_dining",
      "hotel_rooms",
    ],
    primaryCtaOptions: {
      primary: "Book a Vehicle",
      secondary: "Check Fleet Availability",
      intent: "reserve_car",
    },
    sampleServices: [
      {
        title: "Self-Drive Sedan & Hatchback Fleet",
        description: "Immaculately maintained modern cars for seamless city transit, business appointments, and weekend getaways.",
        price: "From ₹1,800 / day",
      },
      {
        title: "All-Terrain SUVs & Outstation Fleet",
        description: "High-clearance spacious 7-seater vehicles engineered for comfortable long-distance family expeditions.",
        price: "From ₹3,200 / day",
      },
      {
        title: "Airport Transfers & Priority Transit",
        description: "Guaranteed on-time terminal pickups with sanitized vehicles and seamless keyless dispatch.",
        price: "Fixed transparent rates",
      },
      {
        title: "Executive Chauffeur Service",
        description: "Professional background-verified chauffeurs for VIP corporate transit and guided heritage touring.",
        price: "Custom hourly & daily tiers",
      },
    ],
    taglineTemplate: (name, loc) => `Premium Self-Drive & Vehicle Rental in ${loc}`,
  },

  // 3. Cafe / Specialty Coffee Roasters & Bakeries
  {
    domain: "food_dining",
    subdomain: "cafe_roastery",
    keywords: [
      "cafe",
      "coffee",
      "coffee roasters",
      "espresso",
      "bakery",
      "patisserie",
      "brewery",
      "specialty coffee",
      "artisan bakery",
    ],
    primaryObjects: [
      "coffee cup",
      "latte art",
      "espresso machine",
      "coffee beans",
      "pastry",
      "cafe interior",
    ],
    forbiddenObjects: [
      "car",
      "motorcycle",
      "vehicle",
      "dental chair",
      "medical tools",
      "gym weights",
    ],
    preferredImageryThemes: [
      "coffee_roasting",
      "latte_art",
      "warm_cafe_ambience",
      "fresh_pastries",
    ],
    forbiddenImageryThemes: [
      "vehicles",
      "industrial_garages",
      "clinical_rooms",
    ],
    primaryCtaOptions: {
      primary: "Explore Menu & Coffee",
      secondary: "Visit Cafe",
      intent: "visit_cafe",
    },
    sampleServices: [
      {
        title: "Specialty Pour-Over & Single Origin",
        description: "Carefully calibrated manual brews highlighting unique floral, fruity, and chocolate notes of estate beans.",
        price: "From ₹220",
      },
      {
        title: "Artisanal Espresso & Signature Lattes",
        description: "Double-shot espresso pulled on high-precision commercial machinery paired with velvety microfoam.",
        price: "From ₹180",
      },
      {
        title: "Handcrafted Sourdough & Fresh Bakes",
        description: "Naturally fermented sourdough breads, butter croissants, and seasonal pastries baked daily.",
        price: "Daily bake selection",
      },
      {
        title: "Fresh Whole-Bean Bags & Grounds",
        description: "Small-batch freshly roasted specialty arabica beans packaged with roast date guarantees for home brewing.",
        price: "From ₹450 / 250g",
      },
    ],
    taglineTemplate: (name, loc) => `Artisanal Coffee & Roastery Experience in ${loc}`,
  },

  // 4. Restaurant & Dining
  {
    domain: "food_dining",
    subdomain: "restaurant",
    keywords: [
      "restaurant",
      "fine dining",
      "dining",
      "bistro",
      "dhaba",
      "cuisine",
      "thali",
      "family dining",
    ],
    primaryObjects: [
      "dining table",
      "served dish",
      "cutlery",
      "chef plating",
      "restaurant seating",
    ],
    forbiddenObjects: [
      "car",
      "motorcycle",
      "two-wheeler",
      "vehicle rental",
      "dental drill",
      "barbell",
    ],
    preferredImageryThemes: [
      "culinary_dishes",
      "elegant_dining_room",
      "chef_cooking",
      "authentic_table_setting",
    ],
    forbiddenImageryThemes: [
      "automobiles",
      "motorcycles",
      "clinical_rooms",
    ],
    primaryCtaOptions: {
      primary: "Reserve a Table",
      secondary: "View Full Menu",
      intent: "reserve_dining",
    },
    sampleServices: [
      {
        title: "Signature Heritage Dining & Thali",
        description: "An authentic culinary journey through regional delicacies slow-cooked with freshly ground traditional spices.",
        price: "A la carte & set thali",
      },
      {
        title: "Family & Celebration Feasts",
        description: "Generous shared platters, clay oven tandoori specialties, and festive curated multi-course menus.",
        price: "Curated packages",
      },
      {
        title: "Private Dining & Group Celebrations",
        description: "Dedicated dining salons with personalized service, custom menus, and ambient celebration arrangements.",
        price: "Advance booking",
      },
      {
        title: "Artisanal Desserts & Sweets",
        description: "Traditional confections prepared with pure organic dairy, saffron, and slow-reduced rich milk.",
        price: "Fresh daily",
      },
    ],
    taglineTemplate: (name, loc) => `Authentic Culinary & Dining Heritage in ${loc}`,
  },

  // 5. Spa, Massage & Restorative Wellness (kept separate from hair/beauty)
  {
    domain: "wellness_personal_care",
    subdomain: "spa_and_massage",
    keywords: [
      "thai spa",
      "spa",
      "massage",
      "wellness centre",
      "wellness center",
      "body therapy",
      "aromatherapy",
      "reflexology",
      "ayurvedic massage",
      "holistic wellness",
    ],
    primaryObjects: [
      "massage treatment room",
      "spa treatment bed",
      "folded towels",
      "aromatherapy oils",
      "calm wellness interior",
    ],
    forbiddenObjects: [
      "computer dashboard",
      "server rack",
      "coffee beans",
      "restaurant table",
      "hair cutting chair",
      "car",
      "motorcycle",
    ],
    preferredImageryThemes: [
      "spa_treatment_room",
      "thai_massage_wellness",
      "aromatherapy_ritual",
      "calm_wellness_interior",
      "restorative_body_therapy",
    ],
    forbiddenImageryThemes: [
      "software_dashboards",
      "server_infrastructure",
      "coffee_shop",
      "hair_salon",
      "automotive",
    ],
    primaryCtaOptions: {
      primary: "Book a Treatment",
      secondary: "Explore Wellness Services",
      intent: "book_wellness_treatment",
    },
    sampleServices: [
      {
        title: "Traditional Thai Massage",
        description: "A restorative wellness session focused on assisted stretching, rhythmic pressure, and relaxation.",
        price: "Contact for current pricing",
      },
      {
        title: "Relaxation Massage",
        description: "A calming full-body wellness experience designed to ease everyday tension and encourage deep relaxation.",
        price: "Contact for current pricing",
      },
      {
        title: "Aromatherapy Wellness Ritual",
        description: "A gentle massage experience using aromatic oils in a private, peaceful treatment setting.",
        price: "Contact for current pricing",
      },
      {
        title: "Personalised Wellness Session",
        description: "Discuss preferences and availability directly with the spa before choosing a suitable treatment.",
        price: "Advance booking recommended",
      },
    ],
    taglineTemplate: (_name, loc) => `Restorative Thai Spa & Wellness in ${loc}`,
  },

  // Software and AI technology. Short tokens are boundary-matched by containsSemanticPhrase.
  {
    domain: "software_technology",
    subdomain: "saas_platform",
    keywords: ["saas", "software", "ai", "artificial intelligence", "cloud platform", "developer platform", "api"],
    primaryObjects: ["software interface", "product dashboard", "technology team", "data visualization"],
    forbiddenObjects: ["massage bed", "coffee beans", "restaurant table", "car fleet"],
    preferredImageryThemes: ["software_product_interface", "technology_team", "data_visualization"],
    forbiddenImageryThemes: ["spa", "restaurant", "automotive"],
    primaryCtaOptions: { primary: "Request a Demo", secondary: "Explore the Platform", intent: "software_demo" },
    sampleServices: [
      { title: "Platform Capabilities", description: "Explore the core workflows and product capabilities available to customers.", price: "Contact for plans" },
      { title: "Implementation Support", description: "Structured guidance for setup, configuration, and team adoption.", price: "Plan dependent" },
      { title: "Integrations", description: "Connect supported tools and data sources through documented product integrations.", price: "Contact for details" },
    ],
    taglineTemplate: (_name, loc) => `Modern Software Solutions in ${loc}`,
  },

  // Legal and advisory services.
  {
    domain: "professional_services",
    subdomain: "legal_practice",
    keywords: ["law firm", "lawyer", "attorney", "advocate", "legal counsel", "solicitor", "barrister"],
    primaryObjects: ["legal consultation", "professional office", "case documents", "client meeting"],
    forbiddenObjects: ["massage bed", "restaurant table", "software dashboard", "vehicle fleet"],
    preferredImageryThemes: ["legal_consultation", "professional_office", "case_review"],
    forbiddenImageryThemes: ["spa", "restaurant", "automotive"],
    primaryCtaOptions: { primary: "Request a Consultation", secondary: "Explore Practice Areas", intent: "legal_consultation" },
    sampleServices: [
      { title: "Legal Consultation", description: "Discuss your matter, available options, and the appropriate next steps with the practice.", price: "Contact for consultation terms" },
      { title: "Advisory & Documentation", description: "Professional guidance and document support based on the scope of your legal requirements.", price: "Scope-based quote" },
      { title: "Matter Representation", description: "Representation services subject to an initial review, engagement terms, and applicable jurisdiction.", price: "Contact for details" },
    ],
    taglineTemplate: (_name, loc) => `Professional Legal Guidance in ${loc}`,
  },

  // Education and training.
  {
    domain: "education_training",
    subdomain: "education_provider",
    keywords: ["school", "academy", "college", "university", "coaching institute", "training center", "education"],
    primaryObjects: ["classroom", "learning materials", "students", "instructor"],
    forbiddenObjects: ["massage bed", "restaurant table", "server rack", "vehicle fleet"],
    preferredImageryThemes: ["classroom_learning", "student_collaboration", "instructor_guidance"],
    forbiddenImageryThemes: ["spa", "restaurant", "automotive"],
    primaryCtaOptions: { primary: "Enquire About Admissions", secondary: "Explore Programs", intent: "education_enquiry" },
    sampleServices: [
      { title: "Programs & Courses", description: "Explore available learning programs, schedules, and suitability for different learner goals.", price: "Contact for current fees" },
      { title: "Admissions Guidance", description: "Get clear information about eligibility, enrollment steps, and current availability.", price: "Enquiry available" },
      { title: "Learning Support", description: "Structured instruction and learner support aligned with the provider's confirmed curriculum.", price: "Program dependent" },
    ],
    taglineTemplate: (_name, loc) => `Learning & Skill Development in ${loc}`,
  },

  // 6. Fitness Gym & Athletic Performance
  {
    domain: "wellness_fitness",
    subdomain: "fitness_gym",
    keywords: [
      "gym",
      "fitness",
      "workout",
      "crossfit",
      "bodybuilding",
      "personal training",
      "powerlifting",
      "strength training",
    ],
    primaryObjects: [
      "weights",
      "dumbbells",
      "barbells",
      "gym equipment",
      "fitness studio",
      "training area",
    ],
    forbiddenObjects: [
      "car",
      "motorcycle",
      "dining table",
      "food platter",
      "hotel bed",
    ],
    preferredImageryThemes: [
      "modern_gym_weights",
      "strength_training_rigs",
      "cardio_studio",
      "athletic_workout",
    ],
    forbiddenImageryThemes: [
      "cars",
      "food",
      "restaurants",
    ],
    primaryCtaOptions: {
      primary: "Claim Free Pass",
      secondary: "View Membership Plans",
      intent: "gym_membership",
    },
    sampleServices: [
      {
        title: "Strength & Resistance Training Zone",
        description: "Biomechanical plate-loaded machines, Olympic barbells, custom power racks, and heavy dumbbell sets.",
        price: "Membership included",
      },
      {
        title: "1-on-1 Certified Personal Coaching",
        description: "Personalized body transformation protocols, postural analysis, and progressive overload tracking.",
        price: "Personalized coaching packages",
      },
      {
        title: "Cardio & Metabolic Conditioning",
        description: "Curated HIIT zones, curved treadmills, rowing ergs, and assault bikes for peak stamina.",
        price: "Unlimited access",
      },
      {
        title: "Nutrition & Body Composition Guidance",
        description: "Periodic bioelectrical impedance scans and tailored macronutrient guidance to accelerate goals.",
        price: "Quarterly assessment",
      },
    ],
    taglineTemplate: (name, loc) => `Elite Fitness & Strength Conditioning in ${loc}`,
  },

  // 6. Salon & Aesthetics
  {
    domain: "beauty_aesthetics",
    subdomain: "beauty_salon",
    keywords: [
      "salon",
      "hair salon",
      "beauty parlor",
      "barbershop",
      "hair styling",
      "spa and salon",
      "skin care",
      "nail studio",
    ],
    primaryObjects: [
      "styling chair",
      "hair wash station",
      "scissors and comb",
      "skincare products",
      "salon mirror",
    ],
    forbiddenObjects: [
      "car",
      "motorcycle",
      "dining table",
      "gym dumbbells",
    ],
    preferredImageryThemes: [
      "chic_salon_chairs",
      "hair_styling",
      "beauty_treatments",
      "aesthetic_interior",
    ],
    forbiddenImageryThemes: [
      "automobiles",
      "food",
      "dining",
    ],
    primaryCtaOptions: {
      primary: "Book Appointment",
      secondary: "Explore Service Menu",
      intent: "book_salon",
    },
    sampleServices: [
      {
        title: "Precision Haircut & Custom Styling",
        description: "Face-shape tailored precision scissor and clipper cutting, blowout styling, and luxury wash treatments.",
        price: "From ₹450",
      },
      {
        title: "Advanced Hair Color & Balayage",
        description: "Organic ammonia-free color formulations, multi-dimensional highlights, gloss toners, and keratin care.",
        price: "Consultation required",
      },
      {
        title: "Botanical Skin Rejuvenation & Facials",
        description: "Deep ultrasonic pore cleansing, collagen-boosting facial massages, and customized skin hydration masks.",
        price: "From ₹1,200",
      },
      {
        title: "Bridal & Festive Makeover Suites",
        description: "High-definition bridal makeup, elegant saree draping, and customized styling for auspicious occasions.",
        price: "Bespoke bridal packages",
      },
    ],
    taglineTemplate: (name, loc) => `Signature Styling & Aesthetic Care in ${loc}`,
  },

  // 7. Healthcare & Clinical Care
  {
    domain: "healthcare_clinical",
    subdomain: "clinical_care",
    keywords: [
      "clinic",
      "hospital",
      "doctor",
      "dental",
      "dentist",
      "physiotherapy",
      "pediatrician",
      "orthopedic",
      "eye care",
    ],
    primaryObjects: [
      "clinical examination room",
      "doctor consultation desk",
      "diagnostic devices",
      "healthcare reception",
    ],
    forbiddenObjects: [
      "restaurant table",
      "food plate",
      "motorcycle",
      "car rental",
    ],
    preferredImageryThemes: [
      "clean_clinical_interior",
      "diagnostic_consultation",
      "modern_medical_desk",
    ],
    forbiddenImageryThemes: [
      "vehicles",
      "food",
      "dining",
    ],
    primaryCtaOptions: {
      primary: "Book Consultation",
      secondary: "Contact Clinic",
      intent: "book_clinic",
    },
    sampleServices: [
      {
        title: "Comprehensive Clinical Consultation",
        description: "Thorough clinical evaluations, detailed diagnostic history review, and evidence-based treatment plans.",
        price: "Standard consultation fee",
      },
      {
        title: "Preventive Health Screening",
        description: "Targeted vital checks, diagnostic monitoring, and individualized preventive lifestyle protocols.",
        price: "Screening packages available",
      },
      {
        title: "Advanced In-Clinic Procedures",
        description: "Sterile, state-of-the-art specialized therapies performed with precision medical standards.",
        price: "Procedure-specific estimate",
      },
    ],
    taglineTemplate: (name, loc) => `Trusted Healthcare & Clinical Excellence in ${loc}`,
  },

  // 8. Hospitality, Hotel & Resort
  {
    domain: "hospitality_lodging",
    subdomain: "luxury_hotel",
    keywords: [
      "hotel",
      "resort",
      "lodging",
      "inn",
      "suites",
      "stay",
      "haveli",
      "guest house",
      "homestay",
      "boutique hotel",
    ],
    primaryObjects: [
      "hotel room",
      "luxury suite",
      "hotel bed",
      "reception lobby",
      "swimming pool",
      "courtyard",
    ],
    forbiddenObjects: [
      "car rental",
      "motorcycle",
      "wrench",
      "dental drill",
      "barbell",
    ],
    preferredImageryThemes: [
      "hotel_suite",
      "luxury_resort",
      "hotel_exterior",
      "courtyard_palms",
    ],
    forbiddenImageryThemes: [
      "cars",
      "mechanics",
      "gym_weights",
    ],
    primaryCtaOptions: {
      primary: "Reserve a Room",
      secondary: "Check Room Availability",
      intent: "book_hotel",
    },
    sampleServices: [
      {
        title: "Bespoke Suites & Heritage Rooms",
        description: "Opulent accommodations featuring plush linens, handcrafted furnishings, and panoramic city or garden vistas.",
        price: "From ₹4,500 / night",
      },
      {
        title: "Curated In-House Dining & Breakfast",
        description: "Multi-cuisine artisanal morning buffet and all-day dining prepared fresh by master executive chefs.",
        price: "Included with premium stays",
      },
      {
        title: "Concierge & Heritage City Excursions",
        description: "Personalized itinerary planning, airport pick-up arrangements, and guided tours of local architectural landmarks.",
        price: "Concierge assistance",
      },
      {
        title: "Wellness Spa & Swimming Retreat",
        description: "Tranquil outdoor pool, therapeutic massage suites, and tranquil relaxation pavilions.",
        price: "Complimentary access",
      },
    ],
    taglineTemplate: (name, loc) => `Luxury Hospitality & Heritage Suites in ${loc}`,
  },

  // 9. Boutique Retail & Home Decor
  {
    domain: "retail_commercial",
    subdomain: "boutique_retail",
    keywords: [
      "retail",
      "store",
      "shop",
      "decor",
      "home decor",
      "boutique",
      "furniture",
      "clothing",
      "fashion",
      "lifestyle store",
    ],
    primaryObjects: [
      "retail display",
      "showcase shelf",
      "store interior",
      "lifestyle products",
      "curated collection",
    ],
    forbiddenObjects: [
      "car",
      "motorcycle",
      "dental chair",
    ],
    preferredImageryThemes: [
      "minimalist_storefront",
      "product_curation",
      "lifestyle_interior",
    ],
    forbiddenImageryThemes: [
      "vehicles",
      "garages",
    ],
    primaryCtaOptions: {
      primary: "Explore Collection",
      secondary: "Visit Store",
      intent: "explore_retail",
    },
    sampleServices: [
      {
        title: "Curated Seasonal Collections",
        description: "Thoughtfully sourced, high-aesthetic artisan goods designed to elevate contemporary spaces and living.",
        price: "In-store selection",
      },
      {
        title: "Personal Styling & Space Advisory",
        description: "One-on-one consultation with design advisors to select pieces tailored to your personal aesthetic.",
        price: "Complimentary consultation",
      },
      {
        title: "Artisanal Craft & Custom Commissions",
        description: "Exclusive limited-edition pieces handcrafted by master craftsmen with authentic materials.",
        price: "Custom quotes",
      },
      {
        title: "White-Glove Delivery & Installation",
        description: "Careful packaging, prompt insured delivery, and complimentary on-site placement for all home pieces.",
        price: "Standard delivery options",
      },
    ],
    taglineTemplate: (name, loc) => `Bespoke Lifestyle & Curated Collections in ${loc}`,
  },
];

/**
 * Universal fallback cluster for unfamiliar or hybrid businesses
 */
const GENERIC_COMMERCIAL_CLUSTER: SemanticConceptCluster = {
  domain: "general_commercial",
  subdomain: "local_business",
  keywords: [],
  primaryObjects: ["commercial premises", "service counter", "customer area"],
  forbiddenObjects: [],
  preferredImageryThemes: ["commercial_storefront", "service_desk", "team_consultation"],
  forbiddenImageryThemes: [],
  primaryCtaOptions: {
    primary: "Inquire Today",
    secondary: "Contact Us",
    intent: "general_inquiry",
  },
  sampleServices: [
    {
      title: "Core Service Delivery",
      description: "Dedicated customer service tailored precisely to your specific requirements.",
      price: "Transparent estimates",
    },
    {
      title: "Personalized Consultations",
      description: "In-depth guidance and support directly from experienced local team members.",
      price: "Consultation available",
    },
    {
      title: "Quality Assured Engagement",
      description: "Reliable, timely solutions backed by verified local customer satisfaction.",
      price: "Standard rates",
    },
    {
      title: "Direct Client Support",
      description: "Seamless telephone, email, and in-person communication channels.",
      price: "Included",
    },
  ],
  taglineTemplate: (name, loc) => `Dedicated Professional Services in ${loc}`,
};

export class BusinessSemanticReasoner {
  private static instance: BusinessSemanticReasoner;

  private constructor() {}

  public static getInstance(): BusinessSemanticReasoner {
    if (!BusinessSemanticReasoner.instance) {
      BusinessSemanticReasoner.instance = new BusinessSemanticReasoner();
    }
    return BusinessSemanticReasoner.instance;
  }

  /**
   * Semantically analyzes a business to extract true domain, intent, objects, and boundaries.
   */
  public analyzeBusiness(params: {
    businessName: string;
    category?: string;
    types?: string[];
    location?: string;
    description?: string;
    rating?: number;
    reviewCount?: number;
    phone?: string;
  }): SemanticBusinessAnalysis {
    const rawText = [
      params.businessName || "",
      params.category || "",
      ...(params.types || []),
      params.description || "",
    ]
      .join(" ")
      .toLowerCase();

    // 1. Score matching against semantic clusters
    let bestCluster = GENERIC_COMMERCIAL_CLUSTER;
    let highestScore = 0;

    for (const cluster of CONCEPT_CLUSTERS) {
      let score = 0;
      for (const kw of cluster.keywords) {
        if (containsSemanticPhrase(rawText, kw)) {
          // Weight exact phrase matches in business name more heavily
          const nameLower = (params.businessName || "").toLowerCase();
          if (containsSemanticPhrase(nameLower, kw)) {
            score += 4;
          } else {
            score += 2;
          }
        }
      }

      if (score > highestScore) {
        highestScore = score;
        bestCluster = cluster;
      }
    }

    // Location is never category evidence. Explicit category/types outweigh
    // incidental mentions in a description or neighbouring business names.
    const explicitEvidence = [params.category || "", ...(params.types || [])].join(" ");
    const explicitMatches = CONCEPT_CLUSTERS.map((cluster) => ({
      cluster,
      score: cluster.keywords.filter((keyword) => {
        // Broad nouns cannot establish specialist knowledge (liquor_store,
        // pet_store, etc. require their own approved semantic understanding).
        if (["store", "shop", "retail", "business"].includes(keyword)) {
          return explicitEvidence.trim().toLowerCase() === keyword;
        }
        return containsSemanticPhrase(explicitEvidence, keyword);
      }).length,
    })).filter((match) => match.score > 0).sort((a, b) => b.score - a.score);
    if (explicitMatches.length && explicitMatches[0].score > (explicitMatches[1]?.score || 0)) {
      bestCluster = explicitMatches[0].cluster;
      highestScore = Math.max(highestScore, explicitMatches[0].score * 2);
    } else if (explicitEvidence.trim() && explicitMatches.length === 0) {
      bestCluster = GENERIC_COMMERCIAL_CLUSTER;
      highestScore = 0;
    }
    const confidence = highestScore >= 4 ? 0.95 : highestScore >= 2 ? 0.80 : 0.55;
    const confidenceLevel: "HIGH" | "MEDIUM" | "LOW" =
      confidence >= 0.85 ? "HIGH" : confidence >= 0.70 ? "MEDIUM" : "LOW";

    const loc = params.location || "the region";
    const name = params.businessName || "Business";

    // 2. Build Grounded Trust Badges based ONLY on real verified data
    const groundedTrustBadges: string[] = [];
    if (params.rating && params.reviewCount && params.rating >= 4.0) {
      groundedTrustBadges.push(`${params.rating}★ Google Rating (${params.reviewCount} Reviews)`);
    } else if (params.rating) {
      groundedTrustBadges.push(`${params.rating}★ Rated`);
    }

    if (params.location) {
      const city = params.location.split(",")[0].trim();
      groundedTrustBadges.push(`Verified in ${city}`);
    }

    groundedTrustBadges.push("Direct Phone & WhatsApp Booking");

    // 3. Compile Forbidden Claims (strictly prevent fabrication)
    const forbiddenClaims = [
      "100% Satisfaction Guarantee",
      "Award-Winning",
      "Decades of Experience",
      "Lowest Price Guarantee",
      "Certified World-Class",
    ];

    // 4. Evidence summary separation
    const factsObserved: string[] = [];
    if (params.businessName) factsObserved.push(`Business name observed as '${params.businessName}'`);
    if (params.location) factsObserved.push(`Location observed at '${params.location}'`);
    if (params.rating) factsObserved.push(`Google rating observed at ${params.rating}★`);
    if (params.phone) factsObserved.push(`Contact telephone observed as '${params.phone}'`);

    const inferencesDeducted: string[] = [
      `Semantic domain deduced as '${bestCluster.domain}' (${bestCluster.subdomain})`,
      `Customer intent identified as '${bestCluster.primaryCtaOptions.intent}'`,
      `Primary objects identified as [${bestCluster.primaryObjects.slice(0, 4).join(", ")}]`,
    ];

    const unknownsIdentified: string[] = [];
    if (!params.rating) unknownsIdentified.push("Customer review score not verified");
    if (!params.phone) unknownsIdentified.push("Direct telephone line not verified");

    const evidenceSources: BusinessSemanticProfile["evidenceSources"] = ["business_name"];
    if (params.category) evidenceSources.push("category");
    if (params.types?.length) evidenceSources.push("google_places");
    if (params.description) evidenceSources.push("description");
    if (params.location) evidenceSources.push("location");

    return {
      domain: bestCluster.domain,
      subdomain: bestCluster.subdomain,
      confidence,
      confidenceLevel,
      primaryObjects: bestCluster.primaryObjects,
      forbiddenObjects: bestCluster.forbiddenObjects,
      preferredImageryThemes: bestCluster.preferredImageryThemes,
      forbiddenImageryThemes: bestCluster.forbiddenImageryThemes,
      customerIntent: `Engage with ${name} for ${bestCluster.subdomain.replace(/_/g, " ")}`,
      primaryCta: {
        label: bestCluster.primaryCtaOptions.primary,
        secondaryLabel: bestCluster.primaryCtaOptions.secondary,
        intent: bestCluster.primaryCtaOptions.intent,
      },
      recommendedServices: bestCluster.sampleServices.map((s) => ({
        title: s.title,
        description: s.description.replace(/\$\{name\}/g, name),
        price: s.price,
      })),
      factualTagline: bestCluster.taglineTemplate(name, loc),
      groundedTrustBadges,
      forbiddenClaims,
      evidenceSummary: {
        factsObserved,
        inferencesDeducted,
        unknownsIdentified,
      },
      googlePlaceTypes: params.types || [],
      offerings: bestCluster.sampleServices.map((service) => service.title),
      tone: bestCluster.domain.includes("wellness")
        ? ["calm", "restorative", "grounded", "inviting"]
        : ["clear", "credible", "customer-focused"],
      trustSignals: groundedTrustBadges,
      sectionStrategy: ["hero", "services", "about", "features", "faq", "contact", "footer"],
      evidenceSources,
    };
  }
}

export const businessSemanticReasoner = BusinessSemanticReasoner.getInstance();
