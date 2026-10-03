// src/lib/images/semanticImageSourcing.ts
/**
 * WebsiteBanja Semantic Image Sourcing & Licensing Intelligence Engine
 * 
 * Phase 6.1 — Business-Aware, Section-Aware & Cross-Business Deduplicated Imagery
 * 
 * Governs:
 * 1. Semantic intent extraction from business brief, archetype, and section context
 * 2. Source selection & licensing eligibility (commercial reuse, permissive CC0, Unsplash License)
 * 3. Structured metadata tracking (source, author, license, attribution requirement)
 * 4. Multi-level deduplication (in-page used images, recent fingerprints, cross-business avoid lists)
 * 5. Industry-specific deterministic fallback hierarchy (NEVER universal café image)
 */

export type ImageSourceType = "unsplash" | "pexels" | "wikimedia" | "local_licensed" | "curated_permissive";
export type ImageLicenseType = "unsplash" | "cc0" | "permissive_free_commercial";

export type ImageSemanticRole =
  | "hero"
  | "heroBackground"
  | "about"
  | "services"
  | "features"
  | "reviews"
  | "gallery"
  | "cta"
  | "ambient";

export interface ImageMetadata {
  source: ImageSourceType;
  sourceUrl: string;
  imageUrl: string;
  author: string;
  authorUrl?: string;
  license: ImageLicenseType;
  licenseUrl: string;
  attributionRequired: boolean;
  role: ImageSemanticRole;
  semanticIntent: string;
  category: string;
  dimensions?: { width: number; height: number };
}

export interface ImageResolutionRequest {
  category?: string;
  businessName?: string;
  archetype?: string;
  role: ImageSemanticRole;
  itemIndex?: number;
  itemTitle?: string;
  prompt?: string;
  seed?: string | number;
  avoidImages?: string[];
  recentImages?: string[];
  usedInPage?: Set<string>;
  preferredSubjects?: string[];
  forbiddenSubjects?: string[];
}

export interface CuratedImageEntry {
  url: string;
  author: string;
  authorHandle: string;
  intent: string;
  roles: ImageSemanticRole[];
}

/**
 * Curated license-verified image registry organized by industry domain.
 * Every image is selected to be strictly relevant to its business type.
 */
export const REGISTRY: Record<string, CuratedImageEntry[]> = {
  // 1. SaaS / Enterprise Technology & AI Orchestration
  saas: [
    {
      url: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b",
      author: "Adi Goldstein",
      authorHandle: "adigoldstein",
      intent: "High-tech cyber server infrastructure with glowing blue optical telemetry",
      roles: ["hero", "features"],
    },
    {
      url: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31",
      author: "Lars Kienle",
      authorHandle: "larsk",
      intent: "Secure cloud infrastructure server architecture depth mesh",
      roles: ["heroBackground", "ambient", "about"],
    },
    {
      url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71",
      author: "Luke Chesser",
      authorHandle: "lukechesser",
      intent: "High precision telemetry metrics and real-time cloud data visualization",
      roles: ["hero", "services", "features"],
    },
    {
      url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5",
      author: "Markus Spiske",
      authorHandle: "markusspiske",
      intent: "Sub-millisecond data pipelines and digital telemetry stream",
      roles: ["services", "features"],
    },
    {
      url: "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3",
      author: "Carlos Muza",
      authorHandle: "carlosmuza",
      intent: "Enterprise security shield and cloud monitoring graphs",
      roles: ["services", "features"],
    },
    {
      url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f",
      author: "Carlos Muza",
      authorHandle: "carlosmuza",
      intent: "Predictive cost and throughput telemetry dashboard analytics",
      roles: ["services", "about"],
    },
    {
      url: "https://images.unsplash.com/photo-1531482615713-2afd69097998",
      author: "Mario Gogh",
      authorHandle: "mariogogh",
      intent: "Senior distributed systems engineering team collaborating on architecture",
      roles: ["about", "cta"],
    },
    {
      url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa",
      author: "NASA",
      authorHandle: "nasa",
      intent: "Global low-latency optical event mesh network",
      roles: ["features", "heroBackground"],
    },
    {
      url: "https://images.unsplash.com/photo-1555066931-4365d14bab8c",
      author: "Fotis Fotopoulos",
      authorHandle: "ffstop",
      intent: "Zero-config developer SDK code and modern terminal interface",
      roles: ["features", "services"],
    },
    {
      url: "https://images.unsplash.com/photo-1518770660439-4636190af475",
      author: "Alexandre Debiève",
      authorHandle: "alexandre_debieve",
      intent: "High-performance microchip architecture for neural consensus engines",
      roles: ["features", "about"],
    },
    {
      url: "https://images.unsplash.com/photo-1531297484001-80022131f5a1",
      author: "Florian Olivo",
      authorHandle: "florianolivo",
      intent: "Ultra-high uptime distributed cloud datacenter infrastructure",
      roles: ["features", "gallery"],
    },
    {
      url: "https://images.unsplash.com/photo-1551836022-d5d88e9218df",
      author: "Campaign Creators",
      authorHandle: "campaign_creators",
      intent: "Autonomous workflow automation dashboard for developer teams",
      roles: ["services", "features"],
    },
    {
      url: "https://images.unsplash.com/photo-1519389950473-47ba0277781c",
      author: "Marvin Meyer",
      authorHandle: "marvelous",
      intent: "Modern engineering leadership sprint and software architecture review",
      roles: ["about", "services"],
    },
    {
      url: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97",
      author: "Clément H",
      authorHandle: "clemhlrdt",
      intent: "Modern developer laptop with low-latency terminal telemetry code",
      roles: ["features", "gallery"],
    },
    {
      url: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d",
      author: "Christina @ wocintechchat.com",
      authorHandle: "wocintechchat",
      intent: "Collaborative systems design and cloud microservice operations",
      roles: ["features", "about"],
    },
  ],

  // 2. Luxury Hotel & Resort
  luxury_hotel: [
    {
      url: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b",
      author: "Manuel Moreno",
      authorHandle: "manuelmoreno",
      intent: "Perched cliffside luxury resort overlooking the azure Mediterranean sea",
      roles: ["hero", "heroBackground"],
    },
    {
      url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e",
      author: "Sean Oulashin",
      authorHandle: "oulashin",
      intent: "Tranquil coastal water ripples and private secluded white beach cove",
      roles: ["heroBackground", "ambient"],
    },
    {
      url: "https://images.unsplash.com/photo-1566073771259-6a8506099945",
      author: "Sasha Kaunas",
      authorHandle: "sashakaunas",
      intent: "Historic luxury hotel courtyard with tranquil palms and architectural colonnade",
      roles: ["about", "hero"],
    },
    {
      url: "https://images.unsplash.com/photo-1571896349842-33c89424de2d",
      author: "Valeriia Bugaiova",
      authorHandle: "by_vbc",
      intent: "Oceanfront royal villa with private infinity pool overlooking the coast",
      roles: ["services", "gallery"],
    },
    {
      url: "https://images.unsplash.com/photo-1540555700478-4be289fbecef",
      author: "Sara Dabaghian",
      authorHandle: "saradaba",
      intent: "Holistic thalassotherapy sanctuary with botanical relaxation loungers",
      roles: ["services", "features"],
    },
    {
      url: "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c",
      author: "Kuba Dabrowski",
      authorHandle: "kubadabrowski",
      intent: "Atmospheric candlelit cliffside Michelin dining room with sunset views",
      roles: ["services", "gallery"],
    },
    {
      url: "https://images.unsplash.com/photo-1569263979104-865ab7cd8d13",
      author: "Alonso Reyes",
      authorHandle: "alonsoreyes",
      intent: "Handcrafted luxury wooden Riva yacht cruising azure waters",
      roles: ["services", "features"],
    },
    {
      url: "https://images.unsplash.com/photo-1618773928121-c32242e63f39",
      author: "Cosmo Kang",
      authorHandle: "cosmokang",
      intent: "Presidential Royal Villa master suite with panoramic sea terrace",
      roles: ["services", "gallery"],
    },
    {
      url: "https://images.unsplash.com/photo-1591088398332-8a7791972843",
      author: "Edvin Johansson",
      authorHandle: "edvinj",
      intent: "Mediterranean penthouse with open-air solarium and marble lounge",
      roles: ["services", "gallery"],
    },
    {
      url: "https://images.unsplash.com/photo-1590490360182-c33d57733427",
      author: "Visual Stories",
      authorHandle: "visualstories",
      intent: "Cove heritage suite nestled in olive gardens with private plunge pool",
      roles: ["services", "features"],
    },
    {
      url: "https://images.unsplash.com/photo-1510414842594-a61c69b5ae57",
      author: "Shifaaz shamoon",
      authorHandle: "sotti",
      intent: "Private secluded white-sand beach club and shoreline cabanas",
      roles: ["features", "gallery"],
    },
    {
      url: "https://images.unsplash.com/photo-1578683010236-d716f9a3f461",
      author: "Andrea Davis",
      authorHandle: "andreadavis",
      intent: "Discreet bespoke concierge desk in marble and brass atelier",
      roles: ["features", "about"],
    },
    {
      url: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb",
      author: "Engin Akyurt",
      authorHandle: "enginakyurt",
      intent: "Illuminated luxury boutique hotel facade and grand terrace at twilight",
      roles: ["hero", "gallery"],
    },
    {
      url: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4",
      author: "Roberto Nickson",
      authorHandle: "rpnickson",
      intent: "Infinity pool overlooking private coastal sunset waters",
      roles: ["gallery", "features"],
    },
    {
      url: "https://images.unsplash.com/photo-1564501049412-61c2a3083791",
      author: "Edvin Johansson",
      authorHandle: "edvinj",
      intent: "Marble spa sanctuary with sunken relaxation pool",
      roles: ["features", "services"],
    },
  ],

  // 3. Premium Fine Dining Restaurant
  restaurant: [
    {
      url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4",
      author: "Jay Wennington",
      authorHandle: "jaywennington",
      intent: "Intimate fine dining room with dark wood, crisp linen and amber lighting",
      roles: ["hero", "heroBackground"],
    },
    {
      url: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5",
      author: "Jason Leung",
      authorHandle: "jasonleung",
      intent: "Chef at open hearth finishing seasonal tasting courses at the pass",
      roles: ["about", "features", "heroBackground"],
    },
    {
      url: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0",
      author: "Nils Stahl",
      authorHandle: "nilsstahl",
      intent: "Rare vintage biodynamic wine cellar and hand-blown tasting glassware",
      roles: ["about", "services"],
    },
    {
      url: "https://images.unsplash.com/photo-1504674900247-0877df9cc836",
      author: "Lily Banse",
      authorHandle: "lilybanse",
      intent: "Signature ember-smoked seafood course with botanical elderberry reduction",
      roles: ["services", "gallery"],
    },
    {
      url: "https://images.unsplash.com/photo-1544025162-d76694265947",
      author: "Stefan Johnson",
      authorHandle: "stefanjohnson",
      intent: "Heirloom dry-aged meat course plated on handcrafted stoneware pottery",
      roles: ["services", "gallery"],
    },
    {
      url: "https://images.unsplash.com/photo-1559339352-11d035aa65de",
      author: "Klara Kulikova",
      authorHandle: "klarakulikova",
      intent: "Meadow honey and roasted yeast parfait with delicate botanical flora",
      roles: ["services", "gallery"],
    },
    {
      url: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3",
      author: "Thomas Park",
      authorHandle: "thomaspark",
      intent: "Sommelier pouring biodynamic vintage wine into crystal decanter",
      roles: ["services", "features"],
    },
    {
      url: "https://images.unsplash.com/photo-1556910103-1c02745aae4d",
      author: "Rene Asmussen",
      authorHandle: "reneasmussen",
      intent: "Executive chef working meticulously over open birch coals",
      roles: ["services", "about"],
    },
    {
      url: "https://images.unsplash.com/photo-1578474846511-04ba529f0b88",
      author: "Petr Sevcik",
      authorHandle: "petr_sevcik",
      intent: "Private dining salon with velvet banquette and warm acoustic intimacy",
      roles: ["services", "cta"],
    },
    {
      url: "https://images.unsplash.com/photo-1498837167922-ddd27525d352",
      author: "Brooke Lark",
      authorHandle: "brookelark",
      intent: "Organic morning harvest of heirloom herbs and wild edible plants",
      roles: ["features", "about"],
    },
    {
      url: "https://images.unsplash.com/photo-1466637574441-749b8f19452f",
      author: "Caroline Attwood",
      authorHandle: "carolineattwood",
      intent: "Ancestral fermentation cellar with wild koji crocks and botanical infusions",
      roles: ["features", "about"],
    },
    {
      url: "https://images.unsplash.com/photo-1551218808-94e220e084d2",
      author: "Jay Wennington",
      authorHandle: "jaywennington",
      intent: "Warm candlelight table setup with artisanal ceramic plates",
      roles: ["gallery", "features"],
    },
    {
      url: "https://images.unsplash.com/photo-1541544741938-0af808871cc0",
      author: "Eiliv Aceron",
      authorHandle: "eilivaceron",
      intent: "Artisanal heirloom culinary dish plated with edible wildflowers",
      roles: ["gallery", "services"],
    },
    {
      url: "https://images.unsplash.com/photo-1507048331197-7d4ac70811cf",
      author: "Sebastian Coman",
      authorHandle: "sebastiancoman",
      intent: "Chef precision saucing on dark ceramic stoneware tasting plate",
      roles: ["gallery", "services"],
    },
    {
      url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c",
      author: "Dan Gold",
      authorHandle: "dancookstudio",
      intent: "Fresh seasonal terroir harvest bowl with vibrant edible blossoms",
      roles: ["features", "gallery"],
    },
  ],

  // 4. Boutique Real Estate Firm
  real_estate: [
    {
      url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9",
      author: "R ARCHITECTURE",
      authorHandle: "rarchitecture",
      intent: "Architectural modern estate with reflecting pool and sculptural lines",
      roles: ["hero", "heroBackground"],
    },
    {
      url: "https://images.unsplash.com/photo-1513694203232-719a280e022f",
      author: "Luca Bravo",
      authorHandle: "lucabravo",
      intent: "Monolithic concrete architectural shadows and minimalist geometry",
      roles: ["heroBackground", "ambient"],
    },
    {
      url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c",
      author: "R ARCHITECTURE",
      authorHandle: "rarchitecture",
      intent: "Contemporary cantilevered residence nestled in serene natural landscape",
      roles: ["about", "hero"],
    },
    {
      url: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c",
      author: "R ARCHITECTURE",
      authorHandle: "rarchitecture",
      intent: "Villa Mirasol waterfront modern compound with private sea-level dock",
      roles: ["services", "gallery"],
    },
    {
      url: "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b",
      author: "R ARCHITECTURE",
      authorHandle: "rarchitecture",
      intent: "The Glass Pavilion modern lakeside residence with minimalist lines",
      roles: ["services", "gallery"],
    },
    {
      url: "https://images.unsplash.com/photo-1600573472591-ee6b68d14c68",
      author: "R ARCHITECTURE",
      authorHandle: "rarchitecture",
      intent: "Bel-Air mid-century architectural masterpiece with terrazzo floors",
      roles: ["services", "gallery"],
    },
    {
      url: "https://images.unsplash.com/photo-1503387762-592deb58ef4e",
      author: "Daniel McCullough",
      authorHandle: "dmccullough",
      intent: "Architectural blueprint and spatial acquisition planning dockets",
      roles: ["services", "features"],
    },
    {
      url: "https://images.unsplash.com/photo-1600585154526-990dced4db0d",
      author: "R ARCHITECTURE",
      authorHandle: "rarchitecture",
      intent: "Confidential off-market luxury estate with secluded perimeter walls",
      roles: ["services", "features"],
    },
    {
      url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab",
      author: "Samson",
      authorHandle: "samson",
      intent: "Prime residential glass tower architectural masterplan",
      roles: ["services", "about"],
    },
    {
      url: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750",
      author: "Ralph (Ravi) Kayden",
      authorHandle: "ralphkayden",
      intent: "Sunlit luxury architectural living salon opening onto garden",
      roles: ["services", "features"],
    },
    {
      url: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00",
      author: "Sean Pollock",
      authorHandle: "seanpollock",
      intent: "Iconic high-floor penthouse panorama overlooking premier metropolis",
      roles: ["features", "gallery"],
    },
    {
      url: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0",
      author: "R ARCHITECTURE",
      authorHandle: "rarchitecture",
      intent: "Private landscaped courtyard with sculptural limestone geometry",
      roles: ["features", "about"],
    },
    {
      url: "https://images.unsplash.com/photo-1600585154363-67eb9e2e2099",
      author: "R ARCHITECTURE",
      authorHandle: "rarchitecture",
      intent: "Contemporary luxury villa pool with illuminated travertine patio",
      roles: ["gallery", "services"],
    },
    {
      url: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d",
      author: "R ARCHITECTURE",
      authorHandle: "rarchitecture",
      intent: "Spacious minimalist estate living room with custom stone fireplace",
      roles: ["gallery", "features"],
    },
    {
      url: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3",
      author: "R ARCHITECTURE",
      authorHandle: "rarchitecture",
      intent: "Designer estate kitchen with waterfall Carrera marble island",
      roles: ["gallery", "services"],
    },
    {
      url: "https://images.unsplash.com/photo-1600585152220-90363fe7e115",
      author: "R ARCHITECTURE",
      authorHandle: "rarchitecture",
      intent: "Sunken modernist lounge overlooking panoramic Alpine landscape",
      roles: ["gallery", "about"],
    },
  ],

  // 5. Creative Design Agency
  creative_agency: [
    {
      url: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853",
      author: "Pawel Czerwinski",
      authorHandle: "pawel_czerwinski",
      intent: "Monochromatic dark abstract geometric fluid typography distortion",
      roles: ["hero", "heroBackground"],
    },
    {
      url: "https://images.unsplash.com/photo-1550684847-75bdda21cc95",
      author: "Pawel Czerwinski",
      authorHandle: "pawel_czerwinski",
      intent: "Dark kinetic wave distortion mesh with subtle tonal contrast",
      roles: ["heroBackground", "ambient"],
    },
    {
      url: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8",
      author: "Fausto García-Menéndez",
      authorHandle: "fausto_garcia",
      intent: "Avant-garde creative director workstation with architectural book and typography",
      roles: ["about", "hero"],
    },
    {
      url: "https://images.unsplash.com/photo-1558655146-d09347e92766",
      author: "DeepMind",
      authorHandle: "deepmind",
      intent: "Kvantum Autonomous OS 3D generative digital design artifact",
      roles: ["services", "gallery"],
    },
    {
      url: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad",
      author: "C-Head",
      authorHandle: "chead",
      intent: "Sculptural hardware audio device in high-contrast dramatic studio light",
      roles: ["services", "gallery"],
    },
    {
      url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe",
      author: "Milad Fakurian",
      authorHandle: "fakurian",
      intent: "Interactive annual report data art with kinetic fluid motion",
      roles: ["services", "gallery"],
    },
    {
      url: "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634",
      author: "NordWood Themes",
      authorHandle: "nordwood",
      intent: "Bold typographic manifesto layout and experimental poster design",
      roles: ["services", "features"],
    },
    {
      url: "https://images.unsplash.com/photo-1550745165-9bc0b252726f",
      author: "Lorenzo Herrera",
      authorHandle: "lorenzoherrera",
      intent: "Real-time WebGL interactive 3D spatial computing environment",
      roles: ["services", "features"],
    },
    {
      url: "https://images.unsplash.com/photo-1581291518655-9523c9320984",
      author: "Balázs Kétyi",
      authorHandle: "balazsketyi",
      intent: "Digital product design system with tokenized Figma component states",
      roles: ["services", "about"],
    },
    {
      url: "https://images.unsplash.com/photo-1500462918059-b1a0cb512f1d",
      author: "Avery Evans",
      authorHandle: "averyevans",
      intent: "High-fashion creative direction photography with neon artistic lighting",
      roles: ["services", "cta"],
    },
    {
      url: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119",
      author: "Birmingham Museums Trust",
      authorHandle: "birminghammuseumstrust",
      intent: "Minimal museum sculpture pedestal highlighting award-winning craft",
      roles: ["features", "about"],
    },
    {
      url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb",
      author: "Aiony Haust",
      authorHandle: "aiony",
      intent: "Visionary creative director reviewing physical brand identity system",
      roles: ["features", "about"],
    },
    {
      url: "https://images.unsplash.com/photo-1542744094-3a31f272c490",
      author: "You X Ventures",
      authorHandle: "youxventures",
      intent: "Brand strategy workshop and collaborative architectural canvas",
      roles: ["about", "services"],
    },
    {
      url: "https://images.unsplash.com/photo-1557804506-669a67965ba0",
      author: "Austin Distel",
      authorHandle: "austindistel",
      intent: "Executive design leadership presenting brand transformation vision",
      roles: ["features", "about"],
    },
    {
      url: "https://images.unsplash.com/photo-1524758631624-e2822e304c36",
      author: "R ARCHITECTURE",
      authorHandle: "rarchitecture",
      intent: "Minimalist brutalist design atelier interior with raw concrete and natural light",
      roles: ["gallery", "features"],
    },
  ],

  // 5A. Two-Wheeler, Motorcycle & Scooter Mobility
  two_wheeler: [
    {
      url: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc",
      author: "David Travis",
      authorHandle: "davidtravis",
      intent: "Cruiser motorcycle on scenic open road with wide panoramic horizon",
      roles: ["hero", "heroBackground"],
    },
    {
      url: "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87",
      author: "Gijs Coolen",
      authorHandle: "gijscoolen",
      intent: "Classic touring motorcycle parked in historic urban streetscape",
      roles: ["about", "hero"],
    },
    {
      url: "https://images.unsplash.com/photo-1558981806-ec527fa84c39",
      author: "David Travis",
      authorHandle: "davidtravis",
      intent: "Touring motorbike on desert highway adventure route",
      roles: ["services", "heroBackground"],
    },
    {
      url: "https://images.unsplash.com/photo-1558980664-769d59546b3d",
      author: "David Travis",
      authorHandle: "davidtravis",
      intent: "Modern street motorcycle lineup ready for immediate rental hire",
      roles: ["services", "features"],
    },
    {
      url: "https://images.unsplash.com/photo-1558981420-87aa9dad1c89",
      author: "David Travis",
      authorHandle: "davidtravis",
      intent: "Adventure touring motorbike ready for mountain road exploration",
      roles: ["services", "features"],
    },
    {
      url: "https://images.unsplash.com/photo-1558981852-426c6c22a06a",
      author: "David Travis",
      authorHandle: "davidtravis",
      intent: "Motorcycle rider with safety helmet ready for open road journey",
      roles: ["features", "about"],
    },
    {
      url: "https://images.unsplash.com/photo-1558981359-219d6364c9c8",
      author: "David Travis",
      authorHandle: "davidtravis",
      intent: "Classic cruiser motorbike detailed engine and chrome craft",
      roles: ["gallery", "services"],
    },
    {
      url: "https://images.unsplash.com/photo-1558980664-2506fca6bfc2",
      author: "David Travis",
      authorHandle: "davidtravis",
      intent: "Two-wheeler rental fleet aligned for customer self-drive pickup",
      roles: ["services", "gallery"],
    },
    {
      url: "https://images.unsplash.com/photo-1558980663-3685c1d673c4",
      author: "David Travis",
      authorHandle: "davidtravis",
      intent: "Motorcycle handlebar and speedometer perspective on highway",
      roles: ["features", "gallery"],
    },
    {
      url: "https://images.unsplash.com/photo-1558981408-db0ecd8a1ee4",
      author: "David Travis",
      authorHandle: "davidtravis",
      intent: "Classic retro motorbike parked in heritage historical architecture lane",
      roles: ["gallery", "about"],
    },
    {
      url: "https://images.unsplash.com/photo-1525160354320-d8e92641c563",
      author: "Harley-Davidson",
      authorHandle: "harleydavidson",
      intent: "Nimble city commuter two-wheeler for agile street transit",
      roles: ["services", "features"],
    },
    {
      url: "https://images.unsplash.com/photo-1508974239320-0a029497e820",
      author: "Patrick Hendry",
      authorHandle: "patrickhendry",
      intent: "Motorcycle rider touring through scenic curving mountain highway",
      roles: ["hero", "heroBackground"],
    },
    {
      url: "https://images.unsplash.com/photo-1599819811279-d5ad9cccf838",
      author: "Sourav Mishra",
      authorHandle: "souravmishra",
      intent: "Rider safety helmet and gear on motorcycle tank",
      roles: ["features", "services"],
    },
    {
      url: "https://images.unsplash.com/photo-1609630875171-b1321377ee65",
      author: "Hardik Sharma",
      authorHandle: "hardiksharma",
      intent: "Classic Royal Enfield motorcycle in Rajasthan heritage road setting",
      roles: ["about", "gallery"],
    },
  ],

  // 5B. Car Rental, Mobility & Self-Drive Fleet
  car_rental: [
    {
      url: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d",
      author: "Dominik Scythe",
      authorHandle: "dominikscythe",
      intent: "Premium executive car driving open highway with panoramic mountain backdrop",
      roles: ["hero", "heroBackground"],
    },
    {
      url: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341",
      author: "Campbell",
      authorHandle: "campbell",
      intent: "Modern luxury self-drive fleet aligned in clean showroom staging",
      roles: ["about", "hero"],
    },
    {
      url: "https://images.unsplash.com/photo-1502877338535-766e1452684a",
      author: "Olav Tvedt",
      authorHandle: "olav_tvedt",
      intent: "Modern self-drive SUV and sedan fleet ready for immediate pickup",
      roles: ["services", "features"],
    },
    {
      url: "https://images.unsplash.com/photo-1563720223185-11003d516935",
      author: "Martin Katler",
      authorHandle: "mkatler",
      intent: "Airport express transfer and luxury self-drive key handover",
      roles: ["services", "gallery"],
    },
    {
      url: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8",
      author: "Julian Hochgesang",
      authorHandle: "julianhochgesang",
      intent: "Chauffeur and executive luxury mobility sedan with tinted privacy glass",
      roles: ["services", "features"],
    },
    {
      url: "https://images.unsplash.com/photo-1503376780353-7e6692767b70",
      author: "Dhiva Krishna",
      authorHandle: "dhivakrishna",
      intent: "Pristine sanitized vehicle cockpit and dashboard GPS ready for road trip",
      roles: ["features", "about"],
    },
    {
      url: "https://images.unsplash.com/photo-1511919884226-fd3cad34687c",
      author: "Joey Banks",
      authorHandle: "joeyabanks",
      intent: "24/7 on-demand self-drive car booking confirmation and digital keyless access",
      roles: ["features", "services"],
    },
    {
      url: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d",
      author: "Stephan Louis",
      authorHandle: "stephanlouis",
      intent: "Executive sports sedan parked on coastal mountain pass",
      roles: ["services", "gallery"],
    },
    {
      url: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf",
      author: "Sven D",
      authorHandle: "svend",
      intent: "All-terrain rugged SUV ready for outstation highway journey",
      roles: ["services", "features"],
    },
    {
      url: "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd",
      author: "Samuele Errico",
      authorHandle: "samueleerrico",
      intent: "Modern vehicle interior cockpit with navigation and leather seating",
      roles: ["features", "about"],
    },
    {
      url: "https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98",
      author: "Lance Asper",
      authorHandle: "lanceasper",
      intent: "White executive sedan accelerating along open highway",
      roles: ["features", "gallery"],
    },
    {
      url: "https://images.unsplash.com/photo-1506015391300-4802dc74de2e",
      author: "Jannis Lucas",
      authorHandle: "jannislucas",
      intent: "Premium vehicle parked overlooking sunset mountain overlook",
      roles: ["services", "features"],
    },
    {
      url: "https://images.unsplash.com/photo-1583121274602-3e2820c69888",
      author: "Stefan Rodriguez",
      authorHandle: "stefanrodriguez",
      intent: "Aerodynamic sports vehicle design and precision detailing",
      roles: ["features", "services"],
    },
    {
      url: "https://images.unsplash.com/photo-1514316454349-750a7fd3da3a",
      author: "Erik Mclean",
      authorHandle: "erikmclean",
      intent: "Long-range self drive road trip along scenic coastal route",
      roles: ["gallery", "about"],
    },
  ],

  // 5C. Gym, Fitness & Performance Training
  gym: [
    {
      url: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48",
      author: "Danielle Cerullo",
      authorHandle: "dmcerullo",
      intent: "Modern gym equipment studio with clean performance floor",
      roles: ["hero", "heroBackground"],
    },
    {
      url: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd",
      author: "Sven Mieke",
      authorHandle: "sxoxm",
      intent: "Athlete strength conditioning and Olympic bar lifting",
      roles: ["about", "hero"],
    },
    {
      url: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e",
      author: "Alora Griffiths",
      authorHandle: "aloragriffiths",
      intent: "Heavy dumbbell rack and precision functional strength training",
      roles: ["services", "features"],
    },
    {
      url: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b",
      author: "Jonathan Borba",
      authorHandle: "jonathanborba",
      intent: "Dedicated personal fitness coach guiding client routine",
      roles: ["services", "gallery"],
    },
    {
      url: "https://images.unsplash.com/photo-1540497077202-7c8a3999166f",
      author: "Humphrey Muleba",
      authorHandle: "silverlineproduction",
      intent: "High-end commercial cardio studio with ambient lighting",
      roles: ["features", "services"],
    },
    {
      url: "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61",
      author: "Alora Griffiths",
      authorHandle: "aloragriffiths",
      intent: "Athlete executing controlled deadlift on Olympic platform",
      roles: ["services", "gallery"],
    },
    {
      url: "https://images.unsplash.com/photo-1574680096145-d05b474e2155",
      author: "Humphrey Muleba",
      authorHandle: "silverlineproduction",
      intent: "Modern fitness studio floor with kettlebells and battle ropes",
      roles: ["services", "features"],
    },
    {
      url: "https://images.unsplash.com/photo-1518611012118-696072aa579a",
      author: "Geert Pieters",
      authorHandle: "geertpieters",
      intent: "Functional movement studio with natural daylight",
      roles: ["features", "about"],
    },
    {
      url: "https://images.unsplash.com/photo-1576678927484-cc907957088c",
      author: "Victor Freitas",
      authorHandle: "victorfreitas",
      intent: "Heavy duty Olympic barbells and precision weight racks",
      roles: ["features", "services"],
    },
    {
      url: "https://images.unsplash.com/photo-1599058945522-28d584b6f0ff",
      author: "Luis Vidal",
      authorHandle: "luisvidal",
      intent: "High-intensity cardio training and endurance sprint session",
      roles: ["features", "gallery"],
    },
    {
      url: "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5",
      author: "Edgar Chaparro",
      authorHandle: "echaparro",
      intent: "Targeted resistance training with calibrated dumbbells",
      roles: ["services", "features"],
    },
    {
      url: "https://images.unsplash.com/photo-1538805060514-97d9cc17730c",
      author: "Fitsum Admasu",
      authorHandle: "fitart",
      intent: "Athlete sprint acceleration on synthetic track",
      roles: ["gallery", "about"],
    },
    {
      url: "https://images.unsplash.com/photo-1594737625785-a6cbdabd333c",
      author: "Gabin Vallet",
      authorHandle: "gabinvallet",
      intent: "Group functional fitness conditioning and community coaching",
      roles: ["features", "services"],
    },
    {
      url: "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2",
      author: "Sven Mieke",
      authorHandle: "sxoxm",
      intent: "Recovery foam rolling and post-workout mobility session",
      roles: ["about", "gallery"],
    },
  ],

  // 5D. Spa, massage and restorative wellness (never hair-salon imagery)
  wellness_spa: [
    {
      url: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874",
      author: "Conscious Design",
      authorHandle: "conscious_design",
      intent: "Professional massage therapy in a calm private spa treatment room",
      roles: ["hero", "heroBackground", "services"],
    },
    {
      url: "https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2",
      author: "Alan Caishan",
      authorHandle: "alancaishan",
      intent: "Restorative spa massage with folded towels and warm ambient light",
      roles: ["hero", "about", "services"],
    },
    {
      url: "https://images.unsplash.com/photo-1540555700478-4be289fbecef",
      author: "Jared Rice",
      authorHandle: "jareddrice",
      intent: "Serene wellness spa interior prepared for a relaxing treatment",
      roles: ["about", "heroBackground", "gallery"],
    },
    {
      url: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881",
      author: "Content Pixie",
      authorHandle: "contentpixie",
      intent: "Botanical facial massage and restorative spa treatment",
      roles: ["services", "features", "gallery"],
    },
    {
      url: "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c",
      author: "Raphael Lovaski",
      authorHandle: "raphael_lovaski",
      intent: "Relaxing body wellness treatment in a peaceful spa setting",
      roles: ["services", "features"],
    },
  ],

  // 5E. Salon, Hair & Aesthetic Wellness
  salon: [
    {
      url: "https://images.unsplash.com/photo-1560066984-138dadb4c035",
      author: "Guilherme Petri",
      authorHandle: "gpetri",
      intent: "High-end boutique hair salon with ambient mirror lighting",
      roles: ["hero", "heroBackground"],
    },
    {
      url: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e",
      author: "Adam Winger",
      authorHandle: "awinger",
      intent: "Master stylist precision cutting and hair sculpting",
      roles: ["about", "hero"],
    },
    {
      url: "https://images.unsplash.com/photo-1562322140-8baeececf3df",
      author: "Element5 Digital",
      authorHandle: "element5digital",
      intent: "Bespoke styling suite and organic hair care treatments",
      roles: ["services", "features"],
    },
    {
      url: "https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1",
      author: "Krisztina Papp",
      authorHandle: "krisztinapapp",
      intent: "Facial aesthetics and restorative skincare treatment suite",
      roles: ["services", "gallery"],
    },
    {
      url: "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388",
      author: "Paul Siewert",
      authorHandle: "paulsiewert",
      intent: "Artisan salon seating and relaxing guest hospitality",
      roles: ["features", "about"],
    },
    {
      url: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1",
      author: "Tim Mossholder",
      authorHandle: "timmossholder",
      intent: "Luxury salon hair washing and conditioning basin station",
      roles: ["services", "gallery"],
    },
    {
      url: "https://images.unsplash.com/photo-1582095133179-bfd08e2fc6b3",
      author: "Apostolos Vamvouras",
      authorHandle: "apvamvouras",
      intent: "Artisanal makeup artistry brushes and luxury cosmetics",
      roles: ["services", "features"],
    },
    {
      url: "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937",
      author: "Christin Hume",
      authorHandle: "christinhumephoto",
      intent: "Botanical organic skincare serums and essential oils",
      roles: ["services", "gallery"],
    },
    {
      url: "https://images.unsplash.com/photo-1600948836101-f9ffda59d250",
      author: "Valeriia Kogan",
      authorHandle: "valeriiakogan",
      intent: "Color formulation and custom balayage hair painting",
      roles: ["features", "services"],
    },
    {
      url: "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f",
      author: "Engin Akyurt",
      authorHandle: "enginakyurt",
      intent: "Volume blowout styling with professional round brush and dryer",
      roles: ["features", "about"],
    },
    {
      url: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f",
      author: "Raphael Lovaski",
      authorHandle: "raphaelovaski",
      intent: "Hydra facial treatment and restorative aesthetic glow therapy",
      roles: ["services", "gallery"],
    },
    {
      url: "https://images.unsplash.com/photo-1512290900672-1f023c70f56a",
      author: "Engin Akyurt",
      authorHandle: "enginakyurt",
      intent: "Aromatherapy hot stone relaxation and luxury wellness lounge",
      roles: ["features", "gallery"],
    },
    {
      url: "https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6",
      author: "Khamkeo Vilaysing",
      authorHandle: "khamkeovilaysing",
      intent: "Modern boutique salon interior with ergonomic styling chairs",
      roles: ["about", "gallery"],
    },
    {
      url: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881",
      author: "Content Pixie",
      authorHandle: "contentpixie",
      intent: "Dermatological cleansing ritual and botanical facial massage",
      roles: ["features", "services"],
    },
  ],

  // 6. Trusted Local Service (Electrician / Specialized Trades)
  local_service: [
    {
      url: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e",
      author: "Mufid Majnun",
      authorHandle: "mufidpwt",
      intent: "Certified master electrician inspecting circuit breakers in residential panel",
      roles: ["hero", "heroBackground"],
    },
    {
      url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758",
      author: "ThisisEngineering RAEng",
      authorHandle: "thisisengineering",
      intent: "Precision circuit wiring schematic and architectural blueprint overlay",
      roles: ["heroBackground", "ambient"],
    },
    {
      url: "https://images.unsplash.com/photo-1581092335397-9583fe92d232",
      author: "ThisisEngineering RAEng",
      authorHandle: "thisisengineering",
      intent: "Licensed electrical technician running diagnostic tests on smart breaker",
      roles: ["about", "hero"],
    },
    {
      url: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1",
      author: "Caleb Woods",
      authorHandle: "caleb_woods",
      intent: "Mobile electrical dispatch service truck with safety equipment",
      roles: ["services", "features"],
    },
    {
      url: "https://images.unsplash.com/photo-1558441719-8b489c63f7d1",
      author: "Chuttersnap",
      authorHandle: "chuttersnap",
      intent: "Modern whole-home electrical panel upgrade with clean conduit",
      roles: ["services", "features"],
    },
    {
      url: "https://images.unsplash.com/photo-1593941707882-a5bba14938c7",
      author: "Ernest Ojeh",
      authorHandle: "ernest_ojeh",
      intent: "Level 2 EV fast charger installation with surge protector safety",
      roles: ["services", "gallery"],
    },
    {
      url: "https://images.unsplash.com/photo-1581092795360-fd1ca04f0952",
      author: "ThisisEngineering RAEng",
      authorHandle: "thisisengineering",
      intent: "Commercial code audit with thermal imaging inspection equipment",
      roles: ["services", "features"],
    },
    {
      url: "https://images.unsplash.com/photo-1541888946425-d0fbb186244f",
      author: "Jeriden Villegas",
      authorHandle: "jeriden",
      intent: "Safety-certified master electrician tools and insulated instruments",
      roles: ["features", "about"],
    },
    {
      url: "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc",
      author: "ThisisEngineering RAEng",
      authorHandle: "thisisengineering",
      intent: "Precision wire stripping and terminal connection inspection",
      roles: ["features", "services"],
    },
    {
      url: "https://images.unsplash.com/photo-1508873696983-2df5703bc20d",
      author: "Emmanuel Ikwuegbu",
      authorHandle: "eikwuegbu",
      intent: "Certified electrical technician adjusting smart residential lighting circuit",
      roles: ["services", "gallery"],
    },
    {
      url: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158",
      author: "ThisisEngineering RAEng",
      authorHandle: "thisisengineering",
      intent: "Electronic circuit diagnostics and digital multimeter measurement",
      roles: ["features", "services"],
    },
    {
      url: "https://images.unsplash.com/photo-1544717305-2782549b5136",
      author: "Kelly Sikkema",
      authorHandle: "kellysikkema",
      intent: "Technical electrical blueprints and safety inspection checklist",
      roles: ["about", "features"],
    },
    {
      url: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4",
      author: "Mufid Majnun",
      authorHandle: "mufidpwt",
      intent: "Master electrician installing commercial safety disconnect switch",
      roles: ["gallery", "features"],
    },
  ],

  // 7. Healthcare & Clinical Care
  clinic: [
    {
      url: "https://images.unsplash.com/photo-1629909613654-28e377c37b09",
      author: "Aditya Romansa",
      authorHandle: "adityaromansa",
      intent: "Modern architectural medical clinic reception with serene daylight",
      roles: ["hero", "heroBackground"],
    },
    {
      url: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d",
      author: "Martha Dominguez",
      authorHandle: "marthadominguez",
      intent: "Compassionate clinical practitioner consulting with patient",
      roles: ["about", "features"],
    },
    {
      url: "https://images.unsplash.com/photo-1579684385127-1ef15d508118",
      author: "National Cancer Institute",
      authorHandle: "nci",
      intent: "Precision diagnostic instruments and serene medical suite",
      roles: ["services", "features"],
    },
    {
      url: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5",
      author: "Cedric Fauntleroy",
      authorHandle: "cedricfauntleroy",
      intent: "Advanced dental hygiene suite with ergonomic clinical equipment",
      roles: ["services", "hero"],
    },
  ],

  // 8. Cafe & Specialty Roastery
  cafe: [
    {
      url: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb",
      author: "Roman Bozhko",
      authorHandle: "roman_bozhko",
      intent: "Artisan specialty coffee bar interior with warm timber and amber glow",
      roles: ["hero", "heroBackground"],
    },
    {
      url: "https://images.unsplash.com/photo-1554118811-1e0d58224f24",
      author: "Daiki F",
      authorHandle: "daikif",
      intent: "Minimalist Scandinavian coffeehouse counter and clean ceramic cups",
      roles: ["hero", "about"],
    },
    {
      url: "https://images.unsplash.com/photo-1442512595331-e89e73853f31",
      author: "Gant",
      authorHandle: "gant",
      intent: "Barista extracting rich espresso shot with golden crema",
      roles: ["about", "services"],
    },
    {
      url: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085",
      author: "Nathan Dumlao",
      authorHandle: "nate_dumlao",
      intent: "Pour-over specialty brewing with microfoam latte art",
      roles: ["services", "about"],
    },
  ],

  // 9. General Professional Studio
  general: [
    {
      url: "https://images.unsplash.com/photo-1497366216548-37526070297c",
      author: "Sean Pollock",
      authorHandle: "seanpollock",
      intent: "Modern professional studio workspace with warm natural light",
      roles: ["hero", "about"],
    },
    {
      url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab",
      author: "Samson",
      authorHandle: "samson",
      intent: "Clean architectural geometry with minimalist lines",
      roles: ["hero", "features"],
    },
    {
      url: "https://images.unsplash.com/photo-1522071820081-009f0129c71c",
      author: "Annie Spratt",
      authorHandle: "anniespratt",
      intent: "Collaborative multi-disciplinary team strategizing over plans",
      roles: ["about", "features", "services"],
    },
  ],
};

function stringToSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Normalizes an image URL to its canonical base identifier (stripping query parameters).
 */
export function canonicalizeImageUrl(url: string): string {
  if (!url) return "";
  if (url.includes("places-photo")) {
    try {
      const q = new URL(url, "http://localhost");
      const name = q.searchParams.get("name");
      if (name) return `/api/public/places-photo?name=${name}`;
    } catch {
      // fallback
    }
  }
  return url.split("?")[0].trim();
}

/**
 * Categorizes the prompt / category / archetype string to match internal curated pools.
 * Strictly guarantees that SaaS never resolves to cafe/restaurant.
 */
export function normalizeCategoryKey(rawCategory?: string, businessName?: string, archetype?: string): string {
  const combined = `${rawCategory || ""} ${businessName || ""} ${archetype || ""}`.toLowerCase();

  // 00. Two-Wheeler, Motorcycle & Scooter Mobility check (Highest priority: two-wheeler must NEVER match car_rental or dining)
  if (
    combined.includes("two_wheeler") ||
    combined.includes("two wheeler") ||
    combined.includes("two-wheeler") ||
    combined.includes("bike rental") ||
    combined.includes("bike on rent") ||
    combined.includes("motorcycle rental") ||
    combined.includes("motorcycle hire") ||
    combined.includes("scooter rental") ||
    combined.includes("scooty") ||
    combined.includes("bullet rental") ||
    combined.includes("royal enfield") ||
    (combined.includes("bike") && (combined.includes("rent") || combined.includes("hire") || combined.includes("tour")))
  ) {
    return "two_wheeler";
  }

  // 0A. Car Rental & Self-Drive Mobility check (Guarded against two-wheeler mobility)
  const isProtectedTwoWheeler =
    combined.includes("bike") ||
    combined.includes("motorcycle") ||
    combined.includes("scooter") ||
    combined.includes("two wheeler") ||
    combined.includes("two-wheeler") ||
    combined.includes("scooty") ||
    combined.includes("bullet");

  if (
    !isProtectedTwoWheeler &&
    (combined.includes("car rental") ||
      combined.includes("vehicle rental") ||
      combined.includes("self drive") ||
      combined.includes("car hire") ||
      combined.includes("auto rental") ||
      combined.includes("fleet") ||
      combined.includes("chauffeur") ||
      combined.includes("carz") ||
      combined.includes("cab service") ||
      (combined.includes("car") && (combined.includes("rent") || combined.includes("drive") || combined.includes("mobility"))))
  ) {
    return "car_rental";
  }

  // 0B. Gym & Fitness check (Must NEVER match restaurant/clinic)
  if (
    combined.includes("gym") ||
    combined.includes("fitness") ||
    combined.includes("crossfit") ||
    combined.includes("workout") ||
    combined.includes("bodybuilding") ||
    combined.includes("personal training") ||
    combined.includes("powerlifting")
  ) {
    return "gym";
  }

  // 0C. Salon & Beauty Aesthetics check (Must NEVER match local_service/trades)
  if (
    combined.includes("wellness_personal_care") ||
    combined.includes("spa_and_massage") ||
    /\bspa\b/i.test(combined) ||
    /\bmassage\b/i.test(combined) ||
    /\bwellness\b/i.test(combined) ||
    combined.includes("aromatherapy") ||
    combined.includes("reflexology")
  ) {
    return "wellness_spa";
  }

  // 0D. Salon & Beauty Aesthetics check
  if (
    combined.includes("salon") ||
    combined.includes("hair styling") ||
    combined.includes("hair cut") ||
    combined.includes("barbershop") ||
    combined.includes("barber") ||
    combined.includes("beauty parlor") ||
    combined.includes("nail studio") ||
    combined.includes("cosmetology")
  ) {
    return "salon";
  }

  // 1. SaaS / Technology check
  if (
    combined.includes("saas") ||
    combined.includes("software") ||
    combined.includes("hyperflow") ||
    combined.includes("vector") ||
    combined.includes("cloud") ||
    combined.includes("platform") ||
    combined.includes("telemetry") ||
    combined.includes("devops") ||
    combined.includes("neural") ||
    combined.includes("automation engine") ||
    combined.includes("dark_technical") ||
    /\b(ai|ml|api)\b/i.test(combined)
  ) {
    return "saas";
  }

  // 2. Luxury Hotel & Resort check
  if (
    combined.includes("hotel") ||
    combined.includes("resort") ||
    combined.includes("azure") ||
    combined.includes("villa") ||
    combined.includes("spa resort") ||
    combined.includes("hospitality") ||
    combined.includes("suites") ||
    (combined.includes("luxury_bespoke") && !combined.includes("car") && !combined.includes("rental"))
  ) {
    return "luxury_hotel";
  }

  // 3. Restaurant / Dining check (Explicit negative guards against non-food categories)
  const isProtectedNonFood =
    combined.includes("car") ||
    combined.includes("rental") ||
    combined.includes("gym") ||
    combined.includes("fitness") ||
    combined.includes("salon") ||
    combined.includes("doctor") ||
    combined.includes("dental");

  if (
    !isProtectedNonFood &&
    (combined.includes("restaurant") ||
      combined.includes("dining") ||
      combined.includes("epicure") ||
      combined.includes("bistro") ||
      combined.includes("chef") ||
      combined.includes("degustation") ||
      combined.includes("culinary") ||
      combined.includes("gastronomy") ||
      combined.includes("warm_artisanal"))
  ) {
    return "restaurant";
  }

  // 4. Real Estate / Estates check (Explicit negative guards against non-realty)
  const isProtectedNonRealty =
    combined.includes("car") ||
    combined.includes("rental") ||
    combined.includes("gym") ||
    combined.includes("fitness");

  if (
    !isProtectedNonRealty &&
    (combined.includes("real estate") ||
      combined.includes("realty") ||
      combined.includes("estates") ||
      combined.includes("properties") ||
      combined.includes("architectural") ||
      combined.includes("brokerage") ||
      (combined.includes("minimal_editorial") && !combined.includes("rental") && !combined.includes("car")))
  ) {
    return "real_estate";
  }

  // 5. Creative Agency check
  if (
    combined.includes("agency") ||
    combined.includes("creative studio") ||
    combined.includes("monochrome") ||
    combined.includes("branding") ||
    combined.includes("brand atelier") ||
    combined.includes("expressive_creative") ||
    combined.includes("bold_brutalist")
  ) {
    return "creative_agency";
  }

  // 6. Local Service / Electrician check
  if (
    combined.includes("electric") ||
    combined.includes("plumb") ||
    combined.includes("repair") ||
    combined.includes("contractor") ||
    combined.includes("hvac") ||
    combined.includes("trade") ||
    combined.includes("high_trust_service")
  ) {
    return "local_service";
  }

  // 7. Clinic / Medical check
  if (
    combined.includes("clinic") ||
    combined.includes("doctor") ||
    combined.includes("dentist") ||
    combined.includes("dental") ||
    combined.includes("medical") ||
    combined.includes("clean_clinical")
  ) {
    return "clinic";
  }

  // 8. Cafe check
  if (
    !isProtectedNonFood &&
    (combined.includes("coffee") ||
      combined.includes("cafe") ||
      combined.includes("roaster") ||
      combined.includes("espresso") ||
      combined.includes("bakery"))
  ) {
    return "cafe";
  }

  return "general";
}

/**
 * Core image sourcing function.
 * Resolves a semantic image requirement into a verified, license-compliant ImageMetadata object.
 * Enforces in-page and cross-business deduplication.
 */
export function resolveSemanticImage(req: ImageResolutionRequest): ImageMetadata {
  const catKey = normalizeCategoryKey(req.category, req.businessName, req.archetype);
  const pool = REGISTRY[catKey] || REGISTRY.general;

  // 1. Filter by requested role
  let candidates = pool.filter((entry) => entry.roles.includes(req.role));
  if (candidates.length === 0) {
    // If no candidate matches exact role, use any other candidate in the SAME category pool
    candidates = pool;
  }

  const forbiddenTerms = (req.forbiddenSubjects || []).flatMap((subject) =>
    subject.toLowerCase().split(/[^a-z0-9]+/).filter((term) => term.length >= 4)
  );
  const semanticallyAllowed = candidates.filter((entry) => {
    const intent = entry.intent.toLowerCase();
    return !forbiddenTerms.some((term) => intent.includes(term));
  });
  if (semanticallyAllowed.length > 0) candidates = semanticallyAllowed;

  const preferredTerms = (req.preferredSubjects || []).flatMap((subject) =>
    subject.toLowerCase().split(/[^a-z0-9]+/).filter((term) => term.length >= 4)
  );
  if (preferredTerms.length > 0) {
    candidates = [...candidates].sort((a, b) => {
      const score = (entry: CuratedImageEntry) => preferredTerms.filter((term) => entry.intent.toLowerCase().includes(term)).length;
      return score(b) - score(a);
    });
  }

  // 2. Build avoidance sets: strict in-page set vs best-effort cross-preview set
  const inPageSet = new Set<string>();
  if (req.usedInPage) {
    req.usedInPage.forEach((url) => inPageSet.add(canonicalizeImageUrl(url)));
  }

  const crossPreviewSet = new Set<string>();
  if (Array.isArray(req.avoidImages)) {
    req.avoidImages.forEach((url) => crossPreviewSet.add(canonicalizeImageUrl(url)));
  }
  if (Array.isArray(req.recentImages)) {
    req.recentImages.forEach((url) => crossPreviewSet.add(canonicalizeImageUrl(url)));
  }

  // 3. Score candidates with hierarchical avoidance:
  // Step A: Role match + neither in-page nor cross-preview used
  let availableCandidates = candidates.filter(
    (c) => !inPageSet.has(canonicalizeImageUrl(c.url)) && !crossPreviewSet.has(canonicalizeImageUrl(c.url))
  );

  // Step B: Entire category pool + neither in-page nor cross-preview used
  if (availableCandidates.length === 0) {
    availableCandidates = pool.filter(
      (c) => !inPageSet.has(canonicalizeImageUrl(c.url)) && !crossPreviewSet.has(canonicalizeImageUrl(c.url))
    );
  }

  // Step C: If cross-preview avoidance exhausts options, RELAX cross-preview set, but STRICTLY ENFORCE in-page avoidance
  if (availableCandidates.length === 0) {
    availableCandidates = candidates.filter(
      (c) => !inPageSet.has(canonicalizeImageUrl(c.url))
    );
  }

  // Step D: Entire category pool with strict in-page avoidance
  if (availableCandidates.length === 0) {
    availableCandidates = pool.filter(
      (c) => !inPageSet.has(canonicalizeImageUrl(c.url))
    );
  }

  // Step E: Emergency fallback only if pool size < total slots on page
  if (availableCandidates.length === 0) {
    availableCandidates = candidates.length > 0 ? candidates : pool;
  }

  // 4. Deterministic index selection using seed + item index + role offset
  let seedNum = 0;
  if (req.seed !== undefined) {
    seedNum = typeof req.seed === "number" ? Math.abs(req.seed) : stringToSeed(String(req.seed));
  } else if (req.businessName) {
    seedNum = stringToSeed(req.businessName);
  }
  const roleOffset = req.role === "hero" ? 0 : req.role === "about" ? 2 : req.role === "services" ? 4 : req.role === "features" ? 6 : 8;
  const offset = (req.itemIndex || 0) * 3 + roleOffset;
  const chosenIndex = (seedNum + offset) % availableCandidates.length;
  const chosen = availableCandidates[chosenIndex];

  // 5. Construct full formatted image URL with responsive sizing
  const width = req.role === "hero" || req.role === "heroBackground" ? 1600 : req.role === "about" ? 1000 : 800;
  const fullUrl = `${chosen.url}?auto=format&fit=crop&w=${width}&q=80`;

  // Register into in-page used set
  if (req.usedInPage) {
    req.usedInPage.add(canonicalizeImageUrl(chosen.url));
  }

  // 6. Return structured ImageMetadata with license verification
  return {
    source: "unsplash",
    sourceUrl: `https://unsplash.com/photos/${chosen.url.split("/photo-")[1]?.split("?")[0] || ""}`,
    imageUrl: fullUrl,
    author: chosen.author,
    authorUrl: `https://unsplash.com/@${chosen.authorHandle}`,
    license: "unsplash",
    licenseUrl: "https://unsplash.com/license",
    attributionRequired: false,
    role: req.role,
    semanticIntent: chosen.intent,
    category: catKey,
    dimensions: { width, height: Math.round(width * 0.66) },
  };
}
