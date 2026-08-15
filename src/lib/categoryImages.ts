/**
 * Curated, reliable public Unsplash images by industry category.
 * Deterministic, high-resolution photography tailored to exact business domains.
 */

export interface CategoryImageSet {
  hero: string;
  about: string;
  services: string[];
  features: string[];
}

const CATEGORY_MAP: Record<string, CategoryImageSet> = {
  grocery: {
    hero: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80", // Fresh organic grocery produce
    about: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=1000&q=80", // Supermarket aisles & shelves
    services: [
      "https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=800&q=80", // Fresh fruits & veggies
      "https://images.unsplash.com/photo-1588964895597-cfccd6e2dbf9?auto=format&fit=crop&w=800&q=80", // Dairy & packaged goods
      "https://images.unsplash.com/photo-1506617420156-8e4536971650?auto=format&fit=crop&w=800&q=80", // Grocery shopping cart
    ],
    features: [
      "https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=800&q=80", // Farm to table fresh
      "https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?auto=format&fit=crop&w=800&q=80", // Supermarket counter
    ],
  },
  cafe: {
    hero: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80", // Cafe interior with warm lighting
    about: "https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=1000&q=80", // Artisan coffee pouring
    services: [
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80", // Specialty coffee latte art
      "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=800&q=80", // Fresh pastries & bakery
      "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80", // Roasted coffee beans
    ],
    features: [
      "https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=800&q=80", // Cafe table ambiance
      "https://images.unsplash.com/photo-1497636577773-f1231844b336?auto=format&fit=crop&w=800&q=80", // Barista brewing
    ],
  },
  restaurant: {
    hero: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80", // Fine dining restaurant interior
    about: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1000&q=80", // Master chef kitchen preparation
    services: [
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80", // Gourmet culinary dishes
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=80", // Wine & dining table setup
      "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=800&q=80", // Plated signature course
    ],
    features: [
      "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=800&q=80", // Fresh farm ingredients
      "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80", // Premium grilled dishes
    ],
  },
  gym: {
    hero: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80", // Modern gym equipment studio
    about: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1000&q=80", // Athlete strength training
    services: [
      "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=800&q=80", // Weight training dumbbells
      "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=800&q=80", // Personal fitness coaching
      "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=800&q=80", // Yoga & stretching studio
    ],
    features: [
      "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&w=800&q=80", // Gym cardio machines
      "https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&w=800&q=80", // Crossfit functional area
    ],
  },
  salon: {
    hero: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80", // Luxury beauty salon interior
    about: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1000&q=80", // Hair styling specialist
    services: [
      "https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=800&q=80", // Precision hair cutting
      "https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?auto=format&fit=crop&w=800&q=80", // Organic skincare & spa
      "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&w=800&q=80", // Makeup and cosmetic artistry
    ],
    features: [
      "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=800&q=80", // Boutique salon chair setup
      "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=800&q=80", // Beauty wellness care
    ],
  },
  clinic: {
    hero: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1200&q=80", // Modern clinic reception & lobby
    about: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1000&q=80", // Compassionate doctor consultation
    services: [
      "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80", // Advanced medical diagnostics
      "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=800&q=80", // Dental care & hygiene
      "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80", // Preventive wellness checkups
    ],
    features: [
      "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=800&q=80", // Patient-first care
      "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=800&q=80", // Modern laboratory clinic
    ],
  },
  architecture: {
    hero: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80", // Contemporary architectural facade
    about: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80", // Modern villa architecture
    services: [
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80", // Architectural planning & drafting
      "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=800&q=80", // Interior architectural design
      "https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?auto=format&fit=crop&w=800&q=80", // Sustainable residential concept
    ],
    features: [
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80", // Luxury modern structure
      "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80", // Minimalist architecture lines
    ],
  },
  "real estate": {
    hero: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80", // Luxury property exterior
    about: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80", // High-end residential interior
    services: [
      "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=800&q=80", // Property sales & acquisition
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=800&q=80", // Luxury villa leasing
      "https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?auto=format&fit=crop&w=800&q=80", // Commercial real estate
    ],
    features: [
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80", // Premium estates
      "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80", // Prime location assets
    ],
  },
  hotel: {
    hero: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80", // Luxury resort pool & suite
    about: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1000&q=80", // Boutique hotel suite room
    services: [
      "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80", // Concierge & guest experience
      "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80", // Executive suites & dining
      "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=800&q=80", // Resort spa & pool
    ],
    features: [
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80", // Hospitality excellence
      "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80", // Luxury amenities
    ],
  },
  agency: {
    hero: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80", // Modern agency creative office
    about: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1000&q=80", // Collaborative creative agency team
    services: [
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80", // Digital branding & UI/UX
      "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=80", // Growth marketing & strategy
      "https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=800&q=80", // Product design & prototyping
    ],
    features: [
      "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=800&q=80", // High-impact results
      "https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=800&q=80", // Enterprise-grade delivery
    ],
  },
  tech: {
    hero: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80", // SaaS analytics & data dashboard
    about: "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1000&q=80", // Engineering & product development
    services: [
      "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=80", // Cloud workflow automation
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80", // AI & intelligent platforms
      "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?auto=format&fit=crop&w=800&q=80", // Cyber security & infrastructure
    ],
    features: [
      "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80", // Global low latency network
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80", // Advanced chip architecture
    ],
  },
  "e-commerce": {
    hero: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80", // Retail boutique shop
    about: "https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=1000&q=80", // Curated retail store
    services: [
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80", // Fashion & lifestyle curation
      "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80", // Fast delivery & packaging
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80", // Premium accessories & tech
    ],
    features: [
      "https://images.unsplash.com/photo-1556742049-0a67e557224f?auto=format&fit=crop&w=800&q=80", // Secure checkout
      "https://images.unsplash.com/photo-1556740758-90de374c12ad?auto=format&fit=crop&w=800&q=80", // Customer loyalty rewards
    ],
  },
  education: {
    hero: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80", // Modern campus students learning
    about: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1000&q=80", // Interactive workshop & mentorship
    services: [
      "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=800&q=80", // Comprehensive curriculum
      "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=800&q=80", // Personalized coaching
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80", // Online learning portal
    ],
    features: [
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=80", // Peer community
      "https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=800&q=80", // Career placement
    ],
  },
  portfolio: {
    hero: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1200&q=80", // Creative designer workspace
    about: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1000&q=80", // Artist & creator portrait
    services: [
      "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=800&q=80", // Brand identity & copywriting
      "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=800&q=80", // Visual art & illustration
      "https://images.unsplash.com/photo-1500462918059-b1a0cb512f1d?auto=format&fit=crop&w=800&q=80", // Art direction & photography
    ],
    features: [
      "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=800&q=80", // Creative execution
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80", // Bespoke client focus
    ],
  },
  general: {
    hero: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80", // Modern business office
    about: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1000&q=80", // Dedicated professional team
    services: [
      "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=80", // Professional consultation
      "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80", // Strategic business advisory
      "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=80", // Quality customer experience
    ],
    features: [
      "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=800&q=80", // Rapid turnaround
      "https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=800&q=80", // Guaranteed satisfaction
    ],
  },
};

/**
 * Robust Category + Business Name/Context Resolver:
 * Inspects category string, business name, and optional description
 * to deterministically find the exact matching image set.
 */
export function getCategoryImages(
  category?: string | null,
  businessName?: string | null,
  description?: string | null
): CategoryImageSet {
  const combined = `${category || ""} ${businessName || ""} ${description || ""}`.toLowerCase();

  // 1. Check Grocery / Supermarket / Kirana / Food Store
  if (
    combined.includes("grocery") ||
    combined.includes("supermarket") ||
    combined.includes("kirana") ||
    combined.includes("provision") ||
    combined.includes("mart") ||
    combined.includes("veggie") ||
    combined.includes("fruit") ||
    combined.includes("fresh market") ||
    combined.includes("organic store")
  ) {
    return CATEGORY_MAP.grocery;
  }

  // 2. Check Cafe / Coffee / Bakery / Roastery
  if (
    combined.includes("cafe") ||
    combined.includes("coffee") ||
    combined.includes("bakery") ||
    combined.includes("roaster") ||
    combined.includes("espresso") ||
    combined.includes("pastry") ||
    combined.includes("tea house")
  ) {
    return CATEGORY_MAP.cafe;
  }

  // 3. Check Restaurant / Dining / Food / Bistro / Bar / Kitchen
  if (
    combined.includes("restaurant") ||
    combined.includes("dining") ||
    combined.includes("bistro") ||
    combined.includes("eatery") ||
    combined.includes("chef") ||
    combined.includes("culinary") ||
    combined.includes("food") ||
    combined.includes("pizzeria") ||
    combined.includes("grill")
  ) {
    return CATEGORY_MAP.restaurant;
  }

  // 4. Check Gym / Fitness / CrossFit / Yoga / Training / Workout
  if (
    combined.includes("gym") ||
    combined.includes("fitness") ||
    combined.includes("crossfit") ||
    combined.includes("yoga") ||
    combined.includes("workout") ||
    combined.includes("trainer") ||
    combined.includes("athletic")
  ) {
    return CATEGORY_MAP.gym;
  }

  // 5. Check Salon / Spa / Beauty / Hair / Nails / Barber / Cosmetic
  if (
    combined.includes("salon") ||
    combined.includes("spa") ||
    combined.includes("beauty") ||
    combined.includes("hair") ||
    combined.includes("barber") ||
    combined.includes("nail") ||
    combined.includes("esthetic")
  ) {
    return CATEGORY_MAP.salon;
  }

  // 6. Check Clinic / Dental / Medical / Doctor / Healthcare / Hospital / Pharmacy
  if (
    combined.includes("clinic") ||
    combined.includes("dental") ||
    combined.includes("dentist") ||
    combined.includes("medical") ||
    combined.includes("doctor") ||
    combined.includes("health") ||
    combined.includes("hospital") ||
    combined.includes("therapy") ||
    combined.includes("pharmacy")
  ) {
    return CATEGORY_MAP.clinic;
  }

  // 7. Check Architecture / Blueprint / Construction / Interior Designer
  if (
    combined.includes("architecture") ||
    combined.includes("architect") ||
    combined.includes("building design") ||
    combined.includes("interior design") ||
    combined.includes("structural")
  ) {
    return CATEGORY_MAP.architecture;
  }

  // 8. Check Real Estate / Property / Realtor / Homes / Apartments / Villas
  if (
    combined.includes("real estate") ||
    combined.includes("property") ||
    combined.includes("realtor") ||
    combined.includes("estate") ||
    combined.includes("homes") ||
    combined.includes("housing") ||
    combined.includes("realty")
  ) {
    return CATEGORY_MAP["real estate"];
  }

  // 9. Check Hotel / Resort / Hospitality / Suites / Lodge / Motel / Stay
  if (
    combined.includes("hotel") ||
    combined.includes("resort") ||
    combined.includes("hospitality") ||
    combined.includes("suites") ||
    combined.includes("stay") ||
    combined.includes("lodge")
  ) {
    return CATEGORY_MAP.hotel;
  }

  // 10. Check Agency / Creative / Marketing / Advertising / Design Studio
  if (
    combined.includes("agency") ||
    combined.includes("marketing") ||
    combined.includes("advertising") ||
    combined.includes("branding") ||
    combined.includes("consulting") ||
    combined.includes("creative studio")
  ) {
    return CATEGORY_MAP.agency;
  }

  // 11. Check Tech / SaaS / Software / AI / Startup / Platform / App
  if (
    combined.includes("tech") ||
    combined.includes("saas") ||
    combined.includes("software") ||
    combined.includes("ai ") ||
    combined.includes("platform") ||
    combined.includes("automation") ||
    combined.includes("cloud") ||
    combined.includes("cyber")
  ) {
    return CATEGORY_MAP.tech;
  }

  // 12. Check E-commerce / Shop / Store / Retail / Fashion / Boutique
  if (
    combined.includes("shop") ||
    combined.includes("store") ||
    combined.includes("ecommerce") ||
    combined.includes("e-commerce") ||
    combined.includes("retail") ||
    combined.includes("boutique") ||
    combined.includes("fashion") ||
    combined.includes("apparel")
  ) {
    return CATEGORY_MAP["e-commerce"];
  }

  // 13. Check Education / School / Academy / Learning / Institute / Tutoring
  if (
    combined.includes("education") ||
    combined.includes("school") ||
    combined.includes("academy") ||
    combined.includes("learning") ||
    combined.includes("course") ||
    combined.includes("tutor") ||
    combined.includes("institute")
  ) {
    return CATEGORY_MAP.education;
  }

  // 14. Check Portfolio / Freelancer / Photography / Artist / Musician
  if (
    combined.includes("portfolio") ||
    combined.includes("photography") ||
    combined.includes("photographer") ||
    combined.includes("freelance") ||
    combined.includes("artist") ||
    combined.includes("personal")
  ) {
    return CATEGORY_MAP.portfolio;
  }

  // Default fallback to general professional business
  return CATEGORY_MAP.general;
}
