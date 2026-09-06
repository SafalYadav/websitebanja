import type { GlobalKnowledgeEntry, WebsiteTypePayload } from "./types";

export const groceryWebsiteType: GlobalKnowledgeEntry<WebsiteTypePayload> = {
  metadata: {
    id: "wb:global:website_types:grocery:v1",
    category: "website_types",
    title: "Grocery, Supermarket & Kirana Stores",
    description: "Retail grocery, fresh produce markets, organic food marts, and local daily essentials stores",
    version: "1.0.0",
    status: "active",
    source: "src/knowledge/global/website-types.ts",
    schemaVersion: "1.0.0",
    updatedAt: "2026-09-05T00:00:00Z",
    tags: ["grocery", "supermarket", "kirana", "provisions", "organic", "retail", "food"]
  },
  data: {
    key: "grocery",
    displayName: "Grocery & Supermarket",
    industryKeywords: [
      "grocery", "supermarket", "kirana", "provision", "mart", 
      "veggie", "fruit", "fresh market", "organic store"
    ],
    recommendedSections: [
      "navbar", "hero", "about", "productsSection", "features", "faq", "contact", "footer"
    ],
    defaultServices: [
      "Fresh Farm Fruits & Vegetables",
      "Daily Dairy & Bakery Essentials",
      "Organic & Packaged Staples",
      "Same-Day Home Delivery"
    ],
    defaultStyle: "clean",
    defaultPrimaryColor: "#16A34A",
    defaultSecondaryColor: "#F59E0B",
    hasCatalog: true,
    catalogLabel: "Store Inventory & Fresh Items",
    defaultBackendRequirement: "managed_orders",
    targetAudienceArchetypes: [
      "Local neighborhood families", "Health-conscious organic shoppers", "Busy professionals seeking quick delivery"
    ],
    imageSet: {
      hero: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80",
      about: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=1000&q=80",
      services: [
        "https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1588964895597-cfccd6e2dbf9?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1506617420156-8e4536971650?auto=format&fit=crop&w=800&q=80"
      ],
      features: [
        "https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?auto=format&fit=crop&w=800&q=80"
      ]
    }
  }
};

export const cafeWebsiteType: GlobalKnowledgeEntry<WebsiteTypePayload> = {
  metadata: {
    id: "wb:global:website_types:cafe:v1",
    category: "website_types",
    title: "Cafes, Coffee Shops & Bakeries",
    description: "Artisan coffee roasters, cozy tea rooms, patisseries, and casual brunch spots",
    version: "1.0.0",
    status: "active",
    source: "src/knowledge/global/website-types.ts",
    schemaVersion: "1.0.0",
    updatedAt: "2026-09-05T00:00:00Z",
    tags: ["cafe", "coffee", "bakery", "roastery", "pastries", "espresso", "brunch"]
  },
  data: {
    key: "cafe",
    displayName: "Cafe & Artisan Bakery",
    industryKeywords: [
      "cafe", "coffee", "bakery", "roaster", "espresso", "pastry", "tea house"
    ],
    recommendedSections: [
      "navbar", "hero", "about", "productsSection", "services", "features", "faq", "contact", "footer"
    ],
    defaultServices: [
      "Single-Origin Pour-Over & Espresso",
      "Fresh Artisanal Sourdough & Croissants",
      "Signature Tea Blends & Smoothies",
      "Private Coffee Tasting Workshops"
    ],
    defaultStyle: "modern",
    defaultPrimaryColor: "#D97706",
    defaultSecondaryColor: "#9A3412",
    hasCatalog: true,
    catalogLabel: "Beverage & Bakery Menu",
    defaultBackendRequirement: "managed_orders",
    targetAudienceArchetypes: [
      "Coffee aficionados", "Remote workers seeking warm ambiance", "Weekend brunch gatherings"
    ],
    imageSet: {
      hero: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80",
      about: "https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=1000&q=80",
      services: [
        "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80"
      ],
      features: [
        "https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1497636577773-f1231844b336?auto=format&fit=crop&w=800&q=80"
      ]
    }
  }
};

export const restaurantWebsiteType: GlobalKnowledgeEntry<WebsiteTypePayload> = {
  metadata: {
    id: "wb:global:website_types:restaurant:v1",
    category: "website_types",
    title: "Restaurants, Fine Dining & Bistros",
    description: "Fine dining establishments, family bistros, pizzerias, grills, and gourmet eateries",
    version: "1.0.0",
    status: "active",
    source: "src/knowledge/global/website-types.ts",
    schemaVersion: "1.0.0",
    updatedAt: "2026-09-05T00:00:00Z",
    tags: ["restaurant", "dining", "bistro", "eatery", "chef", "culinary", "pizzeria", "food"]
  },
  data: {
    key: "restaurant",
    displayName: "Restaurant & Fine Dining",
    industryKeywords: [
      "restaurant", "dining", "bistro", "eatery", "chef", "culinary", "food", "pizzeria", "grill"
    ],
    recommendedSections: [
      "navbar", "hero", "about", "productsSection", "services", "features", "faq", "contact", "footer"
    ],
    defaultServices: [
      "Chef's Signature Tasting Menu",
      "Intimate Private Dining & Events",
      "Handcrafted Cocktails & Sommelier Pairings",
      "Gourmet Catering Services"
    ],
    defaultStyle: "luxury",
    defaultPrimaryColor: "#E11D48",
    defaultSecondaryColor: "#FB923C",
    hasCatalog: true,
    catalogLabel: "Chef's Menu Highlights",
    defaultBackendRequirement: "managed_orders",
    targetAudienceArchetypes: [
      "Culinary enthusiasts", "Couples celebrating milestones", "Corporate business dinners"
    ],
    imageSet: {
      hero: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
      about: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1000&q=80",
      services: [
        "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=800&q=80"
      ],
      features: [
        "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80"
      ]
    }
  }
};

export const gymWebsiteType: GlobalKnowledgeEntry<WebsiteTypePayload> = {
  metadata: {
    id: "wb:global:website_types:gym:v1",
    category: "website_types",
    title: "Gyms, Fitness Clubs & Training Studios",
    description: "Crossfit boxes, personal training studios, yoga spaces, and athletic health clubs",
    version: "1.0.0",
    status: "active",
    source: "src/knowledge/global/website-types.ts",
    schemaVersion: "1.0.0",
    updatedAt: "2026-09-05T00:00:00Z",
    tags: ["gym", "fitness", "crossfit", "yoga", "training", "workout", "athletics"]
  },
  data: {
    key: "gym",
    displayName: "Gym & Fitness Club",
    industryKeywords: [
      "gym", "fitness", "crossfit", "yoga", "workout", "trainer", "athletic"
    ],
    recommendedSections: [
      "navbar", "hero", "about", "services", "features", "faq", "contact", "footer"
    ],
    defaultServices: [
      "1-on-1 Elite Personal Coaching",
      "High-Intensity Functional Group Classes",
      "Strength & Conditioning Zones",
      "Nutritional Planning & Body Composition"
    ],
    defaultStyle: "bold",
    defaultPrimaryColor: "#EA580C",
    defaultSecondaryColor: "#4F46E5",
    hasCatalog: false,
    catalogLabel: "Membership Packages",
    defaultBackendRequirement: "static",
    targetAudienceArchetypes: [
      "Fitness beginners seeking guidance", "Athletes pursuing peak conditioning", "Busy professionals needing flexible hours"
    ],
    imageSet: {
      hero: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80",
      about: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1000&q=80",
      services: [
        "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=800&q=80"
      ],
      features: [
        "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&w=800&q=80"
      ]
    }
  }
};

export const salonWebsiteType: GlobalKnowledgeEntry<WebsiteTypePayload> = {
  metadata: {
    id: "wb:global:website_types:salon:v1",
    category: "website_types",
    title: "Salons, Spas & Beauty Studios",
    description: "Hair salons, luxury day spas, nail bars, esthetic clinics, and grooming lounges",
    version: "1.0.0",
    status: "active",
    source: "src/knowledge/global/website-types.ts",
    schemaVersion: "1.0.0",
    updatedAt: "2026-09-05T00:00:00Z",
    tags: ["salon", "spa", "beauty", "hair", "barber", "nails", "skincare"]
  },
  data: {
    key: "salon",
    displayName: "Beauty Salon & Spa Lounge",
    industryKeywords: [
      "salon", "spa", "beauty", "hair", "barber", "nail", "esthetic"
    ],
    recommendedSections: [
      "navbar", "hero", "about", "services", "features", "faq", "contact", "footer"
    ],
    defaultServices: [
      "Couture Hair Styling & Balayage",
      "Hydrating Organic Facial & Peels",
      "Therapeutic Aromatherapy Massage",
      "Bridal & Event Makeover Packages"
    ],
    defaultStyle: "luxury",
    defaultPrimaryColor: "#DB2777",
    defaultSecondaryColor: "#9333EA",
    hasCatalog: false,
    catalogLabel: "Service Menu & Treatments",
    defaultBackendRequirement: "managed_booking",
    targetAudienceArchetypes: [
      "Self-care enthusiasts", "Brides and event attendees", "Professionals seeking routine grooming"
    ],
    imageSet: {
      hero: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80",
      about: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1000&q=80",
      services: [
        "https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&w=800&q=80"
      ],
      features: [
        "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=800&q=80"
      ]
    }
  }
};

export const clinicWebsiteType: GlobalKnowledgeEntry<WebsiteTypePayload> = {
  metadata: {
    id: "wb:global:website_types:clinic:v1",
    category: "website_types",
    title: "Clinics, Medical Practices & Dental Care",
    description: "Doctor consultations, dental clinics, physiotherapy centers, and specialty healthcare practices",
    version: "1.0.0",
    status: "active",
    source: "src/knowledge/global/website-types.ts",
    schemaVersion: "1.0.0",
    updatedAt: "2026-09-05T00:00:00Z",
    tags: ["clinic", "dental", "medical", "doctor", "health", "hospital", "therapy"]
  },
  data: {
    key: "clinic",
    displayName: "Medical & Dental Clinic",
    industryKeywords: [
      "clinic", "dental", "dentist", "medical", "doctor", "health", "hospital", "therapy", "pharmacy"
    ],
    recommendedSections: [
      "navbar", "hero", "about", "services", "features", "faq", "contact", "footer"
    ],
    defaultServices: [
      "Comprehensive Diagnostic Health Screening",
      "Painless Cosmetic & Restorative Dentistry",
      "Specialized Preventive Care Consultations",
      "Minor Outpatient Procedures & Telemedicine"
    ],
    defaultStyle: "clean",
    defaultPrimaryColor: "#0284C7",
    defaultSecondaryColor: "#0D9488",
    hasCatalog: false,
    catalogLabel: "Healthcare Treatments",
    defaultBackendRequirement: "managed_booking",
    targetAudienceArchetypes: [
      "Local families seeking trusted practitioners", "Patients with specific chronic conditions", "Preventive wellness seekers"
    ],
    imageSet: {
      hero: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1200&q=80",
      about: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1000&q=80",
      services: [
        "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80"
      ],
      features: [
        "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=800&q=80"
      ]
    }
  }
};

export const architectureWebsiteType: GlobalKnowledgeEntry<WebsiteTypePayload> = {
  metadata: {
    id: "wb:global:website_types:architecture:v1",
    category: "website_types",
    title: "Architecture & Structural Design Firms",
    description: "Contemporary architectural studios, urban planners, interior designers, and construction consultants",
    version: "1.0.0",
    status: "active",
    source: "src/knowledge/global/website-types.ts",
    schemaVersion: "1.0.0",
    updatedAt: "2026-09-05T00:00:00Z",
    tags: ["architecture", "architect", "interior design", "structural", "construction"]
  },
  data: {
    key: "architecture",
    displayName: "Architecture & Urban Studio",
    industryKeywords: [
      "architecture", "architect", "building design", "interior design", "structural"
    ],
    recommendedSections: [
      "navbar", "hero", "about", "services", "features", "faq", "contact", "footer"
    ],
    defaultServices: [
      "Bespoke Residential Villa Architecture",
      "Sustainable Commercial & Workspace Design",
      "High-End Interior Spatial Planning",
      "3D BIM Modeling & Feasibility Studies"
    ],
    defaultStyle: "minimal",
    defaultPrimaryColor: "#2563EB",
    defaultSecondaryColor: "#4F46E5",
    hasCatalog: false,
    catalogLabel: "Selected Architecture Projects",
    defaultBackendRequirement: "static",
    targetAudienceArchetypes: [
      "Luxury home builders", "Commercial property developers", "Institutions requiring sustainable design"
    ],
    imageSet: {
      hero: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80",
      about: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80",
      services: [
        "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?auto=format&fit=crop&w=800&q=80"
      ],
      features: [
        "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80"
      ]
    }
  }
};

export const realEstateWebsiteType: GlobalKnowledgeEntry<WebsiteTypePayload> = {
  metadata: {
    id: "wb:global:website_types:real_estate:v1",
    category: "website_types",
    title: "Real Estate, Realtors & Property Agencies",
    description: "Property brokers, real estate agencies, luxury residential sales, and commercial leasing",
    version: "1.0.0",
    status: "active",
    source: "src/knowledge/global/website-types.ts",
    schemaVersion: "1.0.0",
    updatedAt: "2026-09-05T00:00:00Z",
    tags: ["real estate", "property", "realtor", "homes", "apartments", "villas", "realty"]
  },
  data: {
    key: "real estate",
    displayName: "Real Estate & Property Advisory",
    industryKeywords: [
      "real estate", "property", "realtor", "estate", "homes", "housing", "realty"
    ],
    recommendedSections: [
      "navbar", "hero", "about", "services", "features", "faq", "contact", "footer"
    ],
    defaultServices: [
      "Exclusive Prime Residential Acquisitions",
      "Commercial Asset Leasing & Portfolios",
      "Property Valuation & Market Advisory",
      "End-to-End Escrow & Legal Transaction Management"
    ],
    defaultStyle: "clean",
    defaultPrimaryColor: "#2563EB",
    defaultSecondaryColor: "#4F46E5",
    hasCatalog: false,
    catalogLabel: "Featured Property Listings",
    defaultBackendRequirement: "managed_booking",
    targetAudienceArchetypes: [
      "High-net-worth property investors", "First-time home buyers", "Commercial tenants seeking corporate space"
    ],
    imageSet: {
      hero: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80",
      about: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80",
      services: [
        "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?auto=format&fit=crop&w=800&q=80"
      ],
      features: [
        "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80"
      ]
    }
  }
};

export const hotelWebsiteType: GlobalKnowledgeEntry<WebsiteTypePayload> = {
  metadata: {
    id: "wb:global:website_types:hotel:v1",
    category: "website_types",
    title: "Hotels, Resorts & Hospitality Stays",
    description: "Boutique hotels, luxury beachfront resorts, vacation lodges, and executive serviced apartments",
    version: "1.0.0",
    status: "active",
    source: "src/knowledge/global/website-types.ts",
    schemaVersion: "1.0.0",
    updatedAt: "2026-09-05T00:00:00Z",
    tags: ["hotel", "resort", "hospitality", "suites", "stay", "lodge", "travel"]
  },
  data: {
    key: "hotel",
    displayName: "Hotel, Resort & Luxury Suites",
    industryKeywords: [
      "hotel", "resort", "hospitality", "suites", "stay", "lodge"
    ],
    recommendedSections: [
      "navbar", "hero", "about", "services", "features", "faq", "contact", "footer"
    ],
    defaultServices: [
      "Luxury Oceanview Suite Accommodations",
      "All-Inclusive Gourmet Dining & Room Service",
      "Wellness Hydrotherapy & Spa Center",
      "VIP Airport Concierge & Excursion Transfers"
    ],
    defaultStyle: "luxury",
    defaultPrimaryColor: "#D97706",
    defaultSecondaryColor: "#9333EA",
    hasCatalog: false,
    catalogLabel: "Room & Suite Collection",
    defaultBackendRequirement: "managed_booking",
    targetAudienceArchetypes: [
      "Vacationing families", "Couples on romantic getaways", "Business travelers requiring executive amenities"
    ],
    imageSet: {
      hero: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
      about: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1000&q=80",
      services: [
        "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=800&q=80"
      ],
      features: [
        "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80"
      ]
    }
  }
};

export const agencyWebsiteType: GlobalKnowledgeEntry<WebsiteTypePayload> = {
  metadata: {
    id: "wb:global:website_types:agency:v1",
    category: "website_types",
    title: "Digital Agencies, Marketing & Design Studios",
    description: "Creative agencies, growth marketing consultancies, branding studios, and web development shops",
    version: "1.0.0",
    status: "active",
    source: "src/knowledge/global/website-types.ts",
    schemaVersion: "1.0.0",
    updatedAt: "2026-09-05T00:00:00Z",
    tags: ["agency", "marketing", "branding", "creative", "design", "growth", "consulting"]
  },
  data: {
    key: "agency",
    displayName: "Creative & Digital Agency",
    industryKeywords: [
      "agency", "marketing", "advertising", "branding", "consulting", "creative studio"
    ],
    recommendedSections: [
      "navbar", "hero", "about", "services", "features", "faq", "contact", "footer"
    ],
    defaultServices: [
      "Holistic Brand Identity & System Design",
      "Full-Funnel Performance Digital Marketing",
      "Bespoke High-Conversion Web & App Development",
      "SEO & Search Visibility Acceleration"
    ],
    defaultStyle: "bold",
    defaultPrimaryColor: "#7C3AED",
    defaultSecondaryColor: "#EC4899",
    hasCatalog: false,
    catalogLabel: "Client Case Studies",
    defaultBackendRequirement: "static",
    targetAudienceArchetypes: [
      "Seed to Series B startup founders", "SMEs scaling their digital revenue", "Enterprise marketing directors"
    ],
    imageSet: {
      hero: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80",
      about: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1000&q=80",
      services: [
        "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=800&q=80"
      ],
      features: [
        "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=800&q=80"
      ]
    }
  }
};

export const techWebsiteType: GlobalKnowledgeEntry<WebsiteTypePayload> = {
  metadata: {
    id: "wb:global:website_types:tech:v1",
    category: "website_types",
    title: "Technology, SaaS & Software Platforms",
    description: "SaaS startups, cloud services, developer tools, AI platforms, and enterprise software vendors",
    version: "1.0.0",
    status: "active",
    source: "src/knowledge/global/website-types.ts",
    schemaVersion: "1.0.0",
    updatedAt: "2026-09-05T00:00:00Z",
    tags: ["tech", "saas", "software", "ai", "platform", "cloud", "developer"]
  },
  data: {
    key: "tech",
    displayName: "Technology & Software Platform",
    industryKeywords: [
      "tech", "saas", "software", "ai", "platform", "automation", "cloud", "cyber"
    ],
    recommendedSections: [
      "navbar", "hero", "about", "services", "features", "faq", "contact", "footer"
    ],
    defaultServices: [
      "Intelligent Autonomous Workflow Automation",
      "Enterprise Cloud Scalability & Zero Trust Security",
      "Developer-First REST & GraphQL APIs",
      "Real-Time Analytics & Telemetry Dashboards"
    ],
    defaultStyle: "modern",
    defaultPrimaryColor: "#4F46E5",
    defaultSecondaryColor: "#06B6D4",
    hasCatalog: false,
    catalogLabel: "Product Modules & Pricing",
    defaultBackendRequirement: "static",
    targetAudienceArchetypes: [
      "CTOs and engineering managers", "Product managers seeking automation", "Data science and DevOps teams"
    ],
    imageSet: {
      hero: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80",
      about: "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1000&q=80",
      services: [
        "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?auto=format&fit=crop&w=800&q=80"
      ],
      features: [
        "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80"
      ]
    }
  }
};

export const ecommerceWebsiteType: GlobalKnowledgeEntry<WebsiteTypePayload> = {
  metadata: {
    id: "wb:global:website_types:ecommerce:v1",
    category: "website_types",
    title: "E-commerce, Retail & Online Boutiques",
    description: "Online stores, direct-to-consumer lifestyle brands, fashion apparel boutiques, and specialty retailers",
    version: "1.0.0",
    status: "active",
    source: "src/knowledge/global/website-types.ts",
    schemaVersion: "1.0.0",
    updatedAt: "2026-09-05T00:00:00Z",
    tags: ["ecommerce", "shop", "store", "retail", "fashion", "boutique", "apparel"]
  },
  data: {
    key: "e-commerce",
    displayName: "E-commerce & Lifestyle Boutique",
    industryKeywords: [
      "shop", "store", "ecommerce", "e-commerce", "retail", "boutique", "fashion", "apparel"
    ],
    recommendedSections: [
      "navbar", "hero", "about", "productsSection", "features", "faq", "contact", "footer"
    ],
    defaultServices: [
      "Curated Seasonal Fashion & Apparel",
      "Express Nationwide Shipping & Returns",
      "Instant WhatsApp Order Verification",
      "Secure Encrypted Card & UPI Checkout"
    ],
    defaultStyle: "modern",
    defaultPrimaryColor: "#16A34A",
    defaultSecondaryColor: "#F59E0B",
    hasCatalog: true,
    catalogLabel: "Featured Product Collection",
    defaultBackendRequirement: "managed_orders",
    targetAudienceArchetypes: [
      "Trend-focused online shoppers", "Direct-to-consumer brand followers", "Gift and lifestyle buyers"
    ],
    imageSet: {
      hero: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80",
      about: "https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=1000&q=80",
      services: [
        "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80"
      ],
      features: [
        "https://images.unsplash.com/photo-1556742049-0a67e557224f?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1556740758-90de374c12ad?auto=format&fit=crop&w=800&q=80"
      ]
    }
  }
};

export const educationWebsiteType: GlobalKnowledgeEntry<WebsiteTypePayload> = {
  metadata: {
    id: "wb:global:website_types:education:v1",
    category: "website_types",
    title: "Education, Academies & Coaching Institutes",
    description: "Private schools, online academies, certification institutes, tutoring centers, and vocational programs",
    version: "1.0.0",
    status: "active",
    source: "src/knowledge/global/website-types.ts",
    schemaVersion: "1.0.0",
    updatedAt: "2026-09-05T00:00:00Z",
    tags: ["education", "school", "academy", "learning", "courses", "tutoring", "training"]
  },
  data: {
    key: "education",
    displayName: "Education & Learning Academy",
    industryKeywords: [
      "education", "school", "academy", "learning", "course", "tutor", "institute"
    ],
    recommendedSections: [
      "navbar", "hero", "about", "services", "features", "faq", "contact", "footer"
    ],
    defaultServices: [
      "Industry-Aligned Certification Curriculums",
      "Live Interactive Mentorship & Cohort Learning",
      "Hands-On Project Labs & Code Reviews",
      "Career Placement & Resume Advisory"
    ],
    defaultStyle: "clean",
    defaultPrimaryColor: "#0284C7",
    defaultSecondaryColor: "#8B5CF6",
    hasCatalog: false,
    catalogLabel: "Course Catalog & Programs",
    defaultBackendRequirement: "static",
    targetAudienceArchetypes: [
      "Students advancing their technical careers", "Parents seeking quality tutoring", "Working professionals upskilling"
    ],
    imageSet: {
      hero: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80",
      about: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1000&q=80",
      services: [
        "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80"
      ],
      features: [
        "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=800&q=80"
      ]
    }
  }
};

export const portfolioWebsiteType: GlobalKnowledgeEntry<WebsiteTypePayload> = {
  metadata: {
    id: "wb:global:website_types:portfolio:v1",
    category: "website_types",
    title: "Personal Portfolios, Creatives & Freelancers",
    description: "Independent designers, photographers, consultants, artists, and software engineers",
    version: "1.0.0",
    status: "active",
    source: "src/knowledge/global/website-types.ts",
    schemaVersion: "1.0.0",
    updatedAt: "2026-09-05T00:00:00Z",
    tags: ["portfolio", "freelancer", "creator", "designer", "photography", "artist", "personal"]
  },
  data: {
    key: "portfolio",
    displayName: "Creative Portfolio & Personal Showcase",
    industryKeywords: [
      "portfolio", "photography", "photographer", "freelance", "artist", "personal"
    ],
    recommendedSections: [
      "navbar", "hero", "about", "services", "features", "faq", "contact", "footer"
    ],
    defaultServices: [
      "Bespoke Brand Identity & Visual Art",
      "Editorial Photography & Direction",
      "UX Design & Rapid Interactive Prototyping",
      "Technical Advisory & Strategic Consulting"
    ],
    defaultStyle: "minimal",
    defaultPrimaryColor: "#3B82F6",
    defaultSecondaryColor: "#8B5CF6",
    hasCatalog: false,
    catalogLabel: "Curated Works & Projects",
    defaultBackendRequirement: "static",
    targetAudienceArchetypes: [
      "Hiring managers seeking senior talent", "Agencies looking for freelance collaboration", "Private art collectors and commissioners"
    ],
    imageSet: {
      hero: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1200&q=80",
      about: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1000&q=80",
      services: [
        "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1500462918059-b1a0cb512f1d?auto=format&fit=crop&w=800&q=80"
      ],
      features: [
        "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80"
      ]
    }
  }
};

export const generalWebsiteType: GlobalKnowledgeEntry<WebsiteTypePayload> = {
  metadata: {
    id: "wb:global:website_types:general:v1",
    category: "website_types",
    title: "General Professional Business & Corporate",
    description: "Versatile corporate footprint for legal, consulting, logistics, trade, and general commercial enterprises",
    version: "1.0.0",
    status: "active",
    source: "src/knowledge/global/website-types.ts",
    schemaVersion: "1.0.0",
    updatedAt: "2026-09-05T00:00:00Z",
    tags: ["general", "business", "corporate", "services", "commercial", "enterprise"]
  },
  data: {
    key: "general",
    displayName: "Professional Business & Enterprise",
    industryKeywords: [
      "business", "company", "corporate", "professional", "consulting", "services"
    ],
    recommendedSections: [
      "navbar", "hero", "about", "services", "features", "faq", "contact", "footer"
    ],
    defaultServices: [
      "Comprehensive Business Consultation & Audits",
      "Operational Excellence & Process Automation",
      "Client Relationship & Lifecycle Management",
      "Strategic Growth & Market Expansion"
    ],
    defaultStyle: "clean",
    defaultPrimaryColor: "#3B82F6",
    defaultSecondaryColor: "#8B5CF6",
    hasCatalog: false,
    catalogLabel: "Company Offerings",
    defaultBackendRequirement: "static",
    targetAudienceArchetypes: [
      "Corporate partners", "Institutional procurement teams", "Consumers seeking dependable commercial services"
    ],
    imageSet: {
      hero: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80",
      about: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1000&q=80",
      services: [
        "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=80"
      ],
      features: [
        "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=800&q=80"
      ]
    }
  }
};

export const GLOBAL_WEBSITE_TYPES: GlobalKnowledgeEntry<WebsiteTypePayload>[] = [
  groceryWebsiteType,
  cafeWebsiteType,
  restaurantWebsiteType,
  gymWebsiteType,
  salonWebsiteType,
  clinicWebsiteType,
  architectureWebsiteType,
  realEstateWebsiteType,
  hotelWebsiteType,
  agencyWebsiteType,
  techWebsiteType,
  ecommerceWebsiteType,
  educationWebsiteType,
  portfolioWebsiteType,
  generalWebsiteType,
];
