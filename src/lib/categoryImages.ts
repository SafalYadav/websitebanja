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

export const CATEGORY_MAP: Record<string, CategoryImageSet> = {
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
      "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=800&q=80", // Architectural planning & drafting
      "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=800&q=80", // Interior architectural design
      "https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?auto=format&fit=crop&w=800&q=80", // Sustainable residential concept
    ],
    features: [
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80", // Luxury modern structure
      "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80", // Minimalist architecture lines
    ],
  },
  dental: {
    hero: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1200&q=80", // Modern bright dental clinical suite
    about: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=1000&q=80", // Dentist caring consultation
    services: [
      "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&w=800&q=80", // Advanced 3D dental diagnostics
      "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80", // Pain-free sedation dentistry
      "https://images.unsplash.com/photo-1598256989800-fe5f95da9787?auto=format&fit=crop&w=800&q=80", // Cosmetic porcelain smile restoration
      "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=800&q=80", // Modern dental operatory & hygiene
    ],
    features: [
      "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80", // Spa-like clinical tranquility
      "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=800&q=80", // Board-certified dental specialists
    ],
  },
  electrician: {
    hero: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1200&q=80", // Master electrician inspecting breaker panel
    about: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1000&q=80", // Electrical technician with precision tools
    services: [
      "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80", // 24/7 Emergency electrical panel outage repair
      "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=800&q=80", // Residential electrical panel upgrades
      "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=800&q=80", // EV fast charger installations
      "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80", // Commercial surge protection & industrial wiring
    ],
    features: [
      "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80", // Master engineer safety compliance
      "https://images.unsplash.com/photo-1505798577917-a65157d3320a?auto=format&fit=crop&w=800&q=80", // Licensed, bonded & insured master electricians
    ],
  },
  ceramics: {
    hero: "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=1200&q=80", // Handcrafted stoneware & ceramic studio pottery
    about: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=1000&q=80", // Master artisan wheel-thrown pottery workshop
    services: [
      "https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=800&q=80", // Artisanal stoneware tableware & plates
      "https://images.unsplash.com/photo-1590736969955-71cc94801759?auto=format&fit=crop&w=800&q=80", // Architectural & sculptural ceramic vessels
      "https://images.unsplash.com/photo-1576020799627-aeac74d58064?auto=format&fit=crop&w=800&q=80", // Bespoke custom pottery commissions
      "https://images.unsplash.com/photo-1493106819501-66d381c466f1?auto=format&fit=crop&w=800&q=80", // Wood-fired kiln clay creations
    ],
    features: [
      "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80", // Handcrafted ceramic collection
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80", // Sustainably sourced natural clay & mineral glazes
    ],
  },
  fashion: {
    hero: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=80", // Haute couture luxury atelier
    about: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=1000&q=80", // Artisanal tailor craftsmanship & textiles
    services: [
      "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=800&q=80", // Bespoke cashmere couture commissions
      "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=800&q=80", // Private showings & atelier consultations
      "https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=800&q=80", // Garment preservation & circular sustainability
      "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80", // Hand-embroidered luxury garments
    ],
    features: [
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80", // Generational European master craftsmanship
      "https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?auto=format&fit=crop&w=800&q=80", // Zero-waste pure natural textiles
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
      "https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=800&q=80", // Strategic brand consulting
    ],
    features: [
      "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=800&q=80", // High-impact results
      "https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=800&q=80", // Enterprise-grade delivery
      "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80", // Leadership & execution
    ],
  },
  tech: {
    hero: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80", // SaaS analytics & data dashboard
    about: "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1000&q=80", // Engineering & product development
    services: [
      "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=80", // Cloud workflow automation
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80", // AI & intelligent platforms
      "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?auto=format&fit=crop&w=800&q=80", // Cyber security & infrastructure
      "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80", // Automated data pipelines
    ],
    features: [
      "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80", // Global low latency network
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80", // Advanced chip architecture
      "https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&w=800&q=80", // Scalable cloud infrastructure
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

export const TRANSPORT_IMAGE_SET: CategoryImageSet = {
  hero: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=1200&q=80", // Premium car driving highway
  about: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1000&q=80", // Luxury vehicle fleet
  services: [
    "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80", // Airport VIP transfer
    "https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=800&q=80", // Modern SUV & sedan rental
    "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=800&q=80", // Chauffeur executive transport
  ],
  features: [
    "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80", // Verified clean cars
    "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=800&q=80", // 24/7 on-demand pickup
  ],
};

export const LOCAL_SERVICE_IMAGE_SET: CategoryImageSet = {
  hero: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80", // Professional cleaning & home maintenance
  about: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1000&q=80", // Electrician & technical maintenance
  services: [
    "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=800&q=80", // Plumbing & fixture repair
    "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80", // Specialized equipment installation
    "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80", // Diagnostic & troubleshooting
  ],
  features: [
    "https://images.unsplash.com/photo-1505798577917-a65157d3320a?auto=format&fit=crop&w=800&q=80", // Licensed technician guarantee
    "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80", // Transparent pricing
  ],
};

function hasTokens(text: string, patterns: (string | RegExp)[]): boolean {
  for (const p of patterns) {
    if (typeof p === "string") {
      const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const rx = new RegExp(`\\b${escaped}\\b`, "i");
      if (rx.test(text)) return true;
    } else {
      if (p.test(text)) return true;
    }
  }
  return false;
}

/**
 * Robust Category + Business Name/Context Resolver:
 * Uses strict tokenization and word boundaries to prevent substring poisoning
 * (e.g. "spatial" or "dispatch" incorrectly triggering "spa" -> salon).
 */
export function getCategoryImages(
  category?: string | null,
  businessName?: string | null,
  description?: string | null
): CategoryImageSet {
  const combined = `${category || ""} ${businessName || ""} ${description || ""}`.toLowerCase();

  // 1. Check Dental & Aesthetic Dentistry (Dedicated dental clinical care — must precede ceramics to prevent "ceramic braces" matching tableware)
  if (
    hasTokens(combined, [
      "dental",
      "dentist",
      "dentistry",
      "smile design",
      "porcelain veneers",
      "dental implants",
      "sedation dentistry",
      "orthodontics",
      "orthodontic",
      "clear aligners",
      "aligner",
      "teeth",
      "oral care",
    ])
  ) {
    return CATEGORY_MAP.dental;
  }

  // 2. Check Electricians & Specialized Trades (Prevent dispatch matching salon)
  if (
    hasTokens(combined, [
      "electrician",
      "electricians",
      "electrical",
      "voltcraft",
      "circuit breaker",
      "panel upgrade",
      "surge protection",
      "ev charger",
      "wiring",
    ])
  ) {
    return CATEGORY_MAP.electrician;
  }

  // 3. Check Specialized Artisanal Ceramics & Pottery (Explicitly exclude medical/dental contexts)
  const isDentalContext = hasTokens(combined, ["dental", "dentist", "orthodont", "teeth", "clinic", "braces", "aligner"]);
  if (
    !isDentalContext &&
    hasTokens(combined, [
      "ceramics",
      "ceramic",
      "pottery",
      "stoneware",
      "terracotta",
      "kiln",
      "potter",
      "clay",
      "wheel-thrown",
      "ceramicist",
      "ceramicists",
      "tableware",
      "raku",
    ])
  ) {
    return CATEGORY_MAP.ceramics;
  }

  // 4. Check Architecture Studio / Spatial Atelier (Prevent "spatial" matching "spa")
  if (
    hasTokens(combined, [
      "architecture",
      "architectural",
      "architect",
      "architects",
      "spatial atelier",
      "spatial design",
      "passive solar",
      "mass timber",
      "bioclimatic",
      "building design",
      "structural design",
    ])
  ) {
    return CATEGORY_MAP.architecture;
  }

  // 5. Check Luxury Fashion & Bespoke Atelier
  if (
    hasTokens(combined, [
      "haute couture",
      "couture",
      "cashmere",
      "bespoke tailoring",
      "tailored coats",
      "evening cloaks",
      "silk garments",
      "luxury maison",
      "sartorial",
      "fashion atelier",
    ])
  ) {
    return CATEGORY_MAP.fashion;
  }

  // 6. Check Creative Agency & Brand Direction
  if (
    hasTokens(combined, [
      "creative agency",
      "brand direction",
      "kinetic brand",
      "brand identity",
      "design studio",
      "advertising agency",
      "creative studio",
      "media agency",
      "spatial web",
    ])
  ) {
    return CATEGORY_MAP.agency;
  }

  // 7. Check Tech / SaaS / Software / AI Infrastructure
  if (
    hasTokens(combined, [
      "saas",
      "software",
      "vector database",
      "vector retrieval",
      "semantic caching",
      "rag",
      "llm",
      "cloud platform",
      "telemetry",
      "devops",
      "api infrastructure",
      "automation engine",
      "cyber",
    ]) ||
    combined.includes("vectorpulse") ||
    combined.includes("artificial intelligence") ||
    /\b(ai|ml)\b/i.test(combined)
  ) {
    return CATEGORY_MAP.tech;
  }

  // 8. Check Cafe / Coffee / Roastery / Bakery
  if (
    hasTokens(combined, [
      "cafe",
      "coffee",
      "roastery",
      "roaster",
      "espresso",
      "pour-over",
      "bakery",
      "pastries",
      "sourdough",
      "tea house",
      "barista",
    ])
  ) {
    return CATEGORY_MAP.cafe;
  }

  // 9. Check Restaurant / Dining / Bistro / Brunch / Food
  if (
    hasTokens(combined, [
      "restaurant",
      "dining",
      "bistro",
      "brunch",
      "culinary",
      "chef",
      "pizzeria",
      "eatery",
      "gastropub",
      "small plates",
      "farm-to-table",
    ])
  ) {
    return CATEGORY_MAP.restaurant;
  }

  // 10. Check Grocery / Kirana / Supermarket
  if (
    hasTokens(combined, [
      "grocery",
      "supermarket",
      "kirana",
      "provision",
      "fresh market",
      "organic produce",
    ])
  ) {
    return CATEGORY_MAP.grocery;
  }

  // 11. Check Gym / Fitness / Training
  if (
    hasTokens(combined, [
      "gym",
      "fitness",
      "crossfit",
      "workout",
      "athletic",
      "personal trainer",
      "pilates",
      "yoga",
    ])
  ) {
    return CATEGORY_MAP.gym;
  }

  // 12. Check Salon / Barber / Hair / Beauty (Strict Tokenization + Negative Guards)
  // CRITICAL: Must NEVER match "spatial" or "dispatch" or dental "spa atmosphere"
  const isProtectedOtherCategory = hasTokens(combined, [
    "spatial",
    "dispatch",
    "architect",
    "architecture",
    "electrician",
    "electrical",
    "dental",
    "dentist",
    "saas",
    "software",
    "ceramics",
  ]);

  if (!isProtectedOtherCategory) {
    if (
      hasTokens(combined, [
        "salon",
        "salons",
        "hair",
        "haircut",
        "hairstyling",
        "hairdresser",
        "barber",
        "barbershop",
        "nail salon",
        "cosmetics",
        "cosmetology",
        "esthetician",
        "beauty salon",
      ]) ||
      /\b(day\s*spa|medical\s*spa|medspa|wellness\s*spa|spa\s*resort|spa\s*treatment)\b/i.test(combined) ||
      (/\bspa\b/i.test(combined) && !combined.includes("spa-like") && !combined.includes("spa atmosphere"))
    ) {
      return CATEGORY_MAP.salon;
    }
  }

  // 13. Check General Clinic / Healthcare (Non-dental)
  if (
    hasTokens(combined, [
      "clinic",
      "medical",
      "doctor",
      "healthcare",
      "hospital",
      "physician",
      "pharmacy",
      "therapy",
    ])
  ) {
    return CATEGORY_MAP.clinic;
  }

  // 14. Check Real Estate / Properties
  if (
    hasTokens(combined, [
      "real estate",
      "realtor",
      "property",
      "properties",
      "villas",
      "estates",
      "realty",
    ])
  ) {
    return CATEGORY_MAP["real estate"];
  }

  // 15. Check Hotel & Hospitality
  if (
    hasTokens(combined, [
      "hotel",
      "resort",
      "hospitality",
      "boutique hotel",
      "suites",
      "lodge",
    ])
  ) {
    return CATEGORY_MAP.hotel;
  }

  // 16. Check General E-commerce / Boutique Retail
  if (
    hasTokens(combined, [
      "ecommerce",
      "e-commerce",
      "online store",
      "retail shop",
      "boutique",
      "apparel",
    ])
  ) {
    return CATEGORY_MAP["e-commerce"];
  }

  // 17. Check Education
  if (
    hasTokens(combined, [
      "education",
      "school",
      "academy",
      "tutoring",
      "courses",
      "institute",
    ])
  ) {
    return CATEGORY_MAP.education;
  }

  // 18. Check Transport
  if (
    hasTokens(combined, [
      "transport",
      "car rental",
      "rental car",
      "chauffeur",
      "fleet",
      "taxi",
    ])
  ) {
    return TRANSPORT_IMAGE_SET;
  }

  // 19. Check General Local Trades
  if (
    hasTokens(combined, [
      "plumber",
      "plumbing",
      "handyman",
      "contractor",
      "cleaning",
      "repair",
    ])
  ) {
    return LOCAL_SERVICE_IMAGE_SET;
  }

  return CATEGORY_MAP.general;
}

import type { ImageIntentConfig } from "@/types/website";

export function getImageIntentForSection(
  category?: string | null,
  sectionKey?: string | null,
  businessName?: string | null
): ImageIntentConfig {
  const cat = (category || "").toLowerCase();

  if (cat.includes("restaurant") || cat.includes("cafe") || cat.includes("coffee") || cat.includes("dining")) {
    return {
      subject: `Artisanal culinary preparation, warm dining atmosphere or beverage for ${businessName || "the restaurant"}`,
      visualStyle: "cinematic warm lighting, organic textures, natural depth of field",
      aspectRatio: sectionKey === "hero" ? "16:9" : "4:3",
      composition: "center-weighted food photography with clean negative space",
      crop: "close-up gourmet plating or wide ambient dining room",
      purpose: "Establish sensory appetite and dining prestige",
      fallbackType: "tonal_composition",
    };
  }

  if (cat.includes("dental") || cat.includes("clinic") || cat.includes("doctor") || cat.includes("medical")) {
    return {
      subject: `Modern clinical interior, reassuring doctor or dental hygiene suite for ${businessName || "the clinic"}`,
      visualStyle: "bright natural daylight, sterile calm, reassuring professional demeanor",
      aspectRatio: "16:9",
      composition: "clean, uncluttered clinical environment with welcoming human presence",
      crop: "patient perspective consultation view",
      purpose: "Alleviate clinical anxiety and reinforce hygiene and board-certified credibility",
      fallbackType: "svg_geometric",
    };
  }

  if (cat.includes("architect") || cat.includes("villa") || cat.includes("interior")) {
    return {
      subject: `Striking contemporary architectural facade or interior volume by ${businessName || "the studio"}`,
      visualStyle: "golden-hour architectural documentation, sharp geometric lines, dramatic material texture",
      aspectRatio: "16:9",
      composition: "monumental landscape framing with strict horizontal and vertical alignment",
      crop: "wide cinematic structural crop",
      purpose: "Demonstrate spatial elegance and architectural pedigree",
      fallbackType: "abstract_mesh",
    };
  }

  if (cat.includes("saas") || cat.includes("software") || cat.includes("tech") || cat.includes("ai")) {
    return {
      subject: `High-velocity software dashboard, interactive data graphs, glowing telemetry for ${businessName || "the platform"}`,
      visualStyle: "dark sleek UI, crisp neon accent glows, clean modular typography",
      aspectRatio: "16:10",
      composition: "multi-layered interface depth showcase with floating metric chips",
      crop: "browser window or floating product canvas",
      purpose: "Communicate velocity, automated intelligence, and developer-grade polish",
      fallbackType: "abstract_mesh",
    };
  }

  if (cat.includes("fashion") || cat.includes("luxury") || cat.includes("apparel") || cat.includes("jewelry")) {
    return {
      subject: `High-end editorial fashion photography or luxury product showcase for ${businessName || "the brand"}`,
      visualStyle: "high-contrast studio lighting, neutral muted palette, tactile fabric textures",
      aspectRatio: "4:5",
      composition: "vertical editorial lookbook framing",
      crop: "fashion portrait or jewelry macro crop",
      purpose: "Project luxury exclusivity, craftsmanship, and couture prestige",
      fallbackType: "tonal_composition",
    };
  }

  // Default
  return {
    subject: `Professional quality service and customer excellence for ${businessName || "this business"}`,
    visualStyle: "clean authentic commercial photography, natural daylight",
    aspectRatio: "16:9",
    composition: "balanced professional composition",
    crop: "medium action framing",
    purpose: "Provide visual reassurance and establish trust",
    fallbackType: "svg_geometric",
  };
}

/**
 * Curated, low-noise atmospheric background imagery.
 * Used exclusively for the subtle contextual watermark/atmosphere layer behind hero typography.
 */
export function getHeroAtmosphereImage(category?: string, archetype?: string): string {
  const cat = (category || "").toLowerCase();
  const arch = (archetype || "").toLowerCase();

  if (cat.includes("restaurant") || cat.includes("cafe") || cat.includes("coffee") || cat.includes("dining") || arch === "warm_artisanal") {
    return "https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=1600&q=80"; // Macro roasted coffee crema & warm steam texture
  }

  if (cat.includes("dental") || cat.includes("dentist") || cat.includes("clinic") || arch === "clean_clinical") {
    return "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=1600&q=80"; // Soft serene cyan clinical instruments & translucent medical lighting
  }

  if (cat.includes("saas") || cat.includes("tech") || cat.includes("software") || cat.includes("ai") || arch === "dark_technical") {
    return "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1600&q=80"; // Abstract obsidian telemetry server mesh with neon cyan/sky depth
  }

  if (cat.includes("architect") || cat.includes("interior") || arch === "minimal_editorial") {
    return "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1600&q=80"; // Crisp architectural shadow geometry across concrete facade
  }

  if (cat.includes("fashion") || cat.includes("luxury") || cat.includes("couture") || arch === "luxury_bespoke") {
    return "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1600&q=80"; // Flowing soft silk fabric folds with elegant light and tactile atelier texture
  }

  if (cat.includes("electric") || cat.includes("plumb") || cat.includes("repair") || arch === "high_trust_service") {
    return "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1600&q=80"; // Precision copper wiring and blueprint schematic lines
  }

  if (cat.includes("ceramic") || cat.includes("pottery") || cat.includes("stoneware")) {
    return "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=1600&q=80"; // Handcrafted stoneware clay texture and mineral glaze grain
  }

  if (cat.includes("agency") || cat.includes("creative") || arch === "expressive_creative") {
    return "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1600&q=80"; // Monochromatic dark abstract geometric fluid distortion
  }

  return "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1600&q=80"; // Universal subtle ambient fluid mesh
}

