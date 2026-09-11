export interface ExtractedBusinessDetails {
  businessName: string;
  category: string;
  description: string;
  services: string[];
  targetAudience: string;
  location: string;
  style: string;
  primaryColor: string;
  secondaryColor: string;
  phone: string;
  email: string;
  whatsappNumber: string;
}

/**
 * Upper bound on the input this parser will scan, to keep its regex work linear-ish.
 * Anything a real user types about their business is far shorter than this.
 */
const MAX_PARSE_CHARS = 4000;

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Gym: ["gym", "fitness", "workout", "crossfit", "trainer", "bodybuilding", "yoga", "pilates", "training"],
  Restaurant: ["restaurant", "food", "dining", "cuisine", "bistro", "eatery", "bar & grill"],
  Cafe: ["cafe", "coffee", "bakery", "pastry", "brew", "tea", "espresso"],
  Salon: ["salon", "spa", "hair", "beauty", "parlour", "barber", "skincare", "nails", "makeup"],
  Clinic: ["clinic", "hospital", "doctor", "dental", "dentist", "medical", "healthcare", "therapy", "pharma"],
  "Real Estate": ["real estate", "property", "realtor", "apartments", "villas", "housing", "builder"],
  Hotel: ["hotel", "resort", "homestay", "inn", "lodge", "stay", "guest house"],
  Agency: ["agency", "marketing", "digital", "seo", "design", "consulting", "software", "development"],
  Portfolio: ["portfolio", "freelancer", "developer", "designer", "photographer", "artist", "resume"],
  "E-commerce": ["shop", "store", "ecommerce", "e-commerce", "buy", "products", "fashion", "apparel"],
  Transport: ["transport", "car rental", "rental car", "cab", "taxi", "vehicle", "chauffeur", "fleet", "logistics"],
  "Local Service": ["plumber", "plumbing", "electrician", "carpenter", "repair", "handyman", "cleaning", "contractor", "maintenance"],
};

const CATEGORY_SERVICES: Record<string, string[]> = {
  Gym: ["Personal Training", "Strength & Conditioning", "Cardio Zone", "HIIT & Group Classes", "Nutrition Guidance"],
  Restaurant: ["Dine-In Experience", "Chef Specials", "Online Takeaway", "Catering & Private Events", "Custom Cocktails"],
  Cafe: ["Artisanal Specialty Coffee", "Fresh Pastries & Bakes", "Breakfast & Brunch", "Remote Work Friendly", "Custom Beverages"],
  Salon: ["Hair Styling & Cut", "Facial & Skin Treatments", "Bridal & Party Makeovers", "Nail Art & Manicure", "Relaxation Spa"],
  Clinic: ["Comprehensive Health Consultations", "Diagnostic & Screening Services", "Preventive Care", "Specialized Treatments", "Emergency Care Support"],
  "Real Estate": ["Luxury Residential Properties", "Commercial Real Estate", "Property Valuation", "Investment Consulting", "Leasing & Management"],
  Hotel: ["Luxury Suite Accommodations", "Fine Dining & Room Service", "Swimming Pool & Spa", "Conference & Event Halls", "24/7 Concierge"],
  Agency: ["Brand Identity & Strategy", "Custom Web & App Development", "Performance Marketing & SEO", "Social Media Growth", "Creative Content Production"],
  Portfolio: ["Custom Client Projects", "Interactive UI/UX Design", "Full-Stack Development", "Consulting & Strategy", "Creative Direction"],
  "E-commerce": ["Curated Product Collections", "Fast Express Delivery", "Secure Online Payments", "Hassle-Free Returns", "24/7 Customer Support"],
  Transport: ["Airport Transfers & Pickups", "Chauffeur & Executive Travel", "Self-Drive Vehicle Rentals", "Outstation Trips & Tours", "Corporate Fleet Solutions"],
  "Local Service": ["Emergency Diagnostic & Repair", "Professional Installation Services", "Preventative Maintenance & Inspection", "Same-Day Emergency Dispatch", "Licensed & Insured Guarantee"],
  Other: ["Custom Tailored Services", "Professional Consultations", "Premium Client Support", "End-to-End Solutions"],
};

const CATEGORY_THEMES: Record<string, { style: string; pColor: string; sColor: string }> = {
  Gym: { style: "Bold", pColor: "#DC2626", sColor: "#EA580C" },
  Restaurant: { style: "Vibrant", pColor: "#D97706", sColor: "#DC2626" },
  Cafe: { style: "Warm", pColor: "#B45309", sColor: "#78350F" },
  Salon: { style: "Luxury", pColor: "#DB2777", sColor: "#9333EA" },
  Clinic: { style: "Clean", pColor: "#0284C7", sColor: "#0D9488" },
  "Real Estate": { style: "Modern", pColor: "#0F766E", sColor: "#1E3A8A" },
  Hotel: { style: "Luxury", pColor: "#C2410C", sColor: "#B45309" },
  Agency: { style: "Modern", pColor: "#7C3AED", sColor: "#2563EB" },
  Portfolio: { style: "Minimal", pColor: "#18181B", sColor: "#6366F1" },
  "E-commerce": { style: "Vibrant", pColor: "#4F46E5", sColor: "#06B6D4" },
  Transport: { style: "Bold", pColor: "#1E3A8A", sColor: "#F59E0B" },
  "Local Service": { style: "Clean", pColor: "#0369A1", sColor: "#0D9488" },
  Other: { style: "Modern", pColor: "#7C3AED", sColor: "#2563EB" },
};

/**
 * Deterministic fast extractor that extracts business details from any natural language prompt.
 * Guaranteed to succeed without network dependencies.
 */
export function extractBusinessDetailsFast(
  prompt: string,
  selectedCategory?: string,
  selectedFeatures?: string[]
): ExtractedBusinessDetails {
  // SECURITY: several patterns below have adjacent unbounded character classes, which
  // makes them super-linear on long non-matching input (e.g. 100k 'a's with no '@').
  // Truncating here bounds the work regardless of how this function is called, and
  // callers already cap prompts far below this length.
  const p = prompt.slice(0, MAX_PARSE_CHARS).trim();
  const lower = p.toLowerCase();

  // 1. Detect location
  let location = "";
  const locationMatch = lower.match(/(?:located\s+in|based\s+in|\bin|\bat|\bnear|\baround)\s+([a-zA-Z\s]{3,25})(?:\.|$|,|\s+called|\s+named|\s+with|\s+and)/i);
  if (locationMatch && locationMatch[1]) {
    const rawLoc = locationMatch[1].trim();
    const isGenericWord = /\b(my|a|an|the|website|business|clinic|gym|cafe|restaurant|salon|hotel|agency|shop|store|company)\b/i.test(rawLoc);
    if (!isGenericWord) {
      // Capitalize words
      location = rawLoc
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    }
  }

  // 2. Detect category
  let category = selectedCategory || "";
  if (!category) {
    // 2a. Check direct canonical category name match with word boundary
    for (const cat of Object.keys(CATEGORY_KEYWORDS)) {
      const catRegex = new RegExp(`\\b${cat.toLowerCase()}\\b`, "i");
      if (catRegex.test(lower)) {
        category = cat;
        break;
      }
    }
  }
  if (!category) {
    // 2b. Check keywords with word boundaries, preferring longer/more specific matches
    let bestCat = "";
    let bestKwLen = 0;
    for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      for (const kw of keywords) {
        const kwRegex = new RegExp(`\\b${kw}\\b`, "i");
        if (kwRegex.test(lower) && kw.length > bestKwLen) {
          bestCat = cat;
          bestKwLen = kw.length;
        }
      }
    }
    if (bestCat) {
      category = bestCat;
    }
  }
  if (!category) category = "Other";

  // 3. Extract Phone / WhatsApp
  const phoneMatch = p.match(/(?:\+?\d{1,4}[ -]?)?\(?\d{3,4}\)?[ -]?\d{3,4}[ -]?\d{3,4}/);
  const phone = phoneMatch ? phoneMatch[0].trim() : "";

  // 4. Extract Email
  const emailMatch = p.includes("@")
    ? p.match(/[a-zA-Z0-9._%+-]{1,64}@[a-zA-Z0-9-]{1,63}(?:\.[a-zA-Z0-9-]{1,63}){0,4}\.[a-zA-Z]{2,24}/)
    : null;
  const email = emailMatch ? emailMatch[0].trim() : "";

  // 5. Generate Business Name
  let businessName = "";
  // Check if user specifically named it e.g. "called Apex Dental Care" or "named Apex Fitness" or "I run ZoomWheels Car Rental"
  const namePattern = lower.match(/(?:called|named|known\s+as)\s+([A-Za-z0-9\s'&]{3,30})(?:\s+in|\s+with|\s+and|\.|$|,)/i);
  const runPattern = lower.match(/\b(?:run|operate|own)\s+([A-Za-z0-9\s'&]{3,30})(?:\s+in|\s+with|\s+and|\.|$|,)/i);
  const forMatch = lower.match(/\bfor\s+([A-Za-z0-9\s'&]{3,30})(?:\s+in|\s+with|\s+and|\.|$|,)/i);
  const candidateMatch = namePattern || runPattern || (forMatch && !/\b(my|a|an|the|our)\b/i.test(forMatch[1]) ? forMatch : null);

  if (candidateMatch && candidateMatch[1] && !["me", "a", "an", "the", "my"].includes(candidateMatch[1].trim().toLowerCase())) {
    businessName = candidateMatch[1]
      .trim()
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  if (!businessName || businessName.length < 3) {
    if (location && category !== "Other") {
      businessName = `${location} ${category}`;
    } else if (category !== "Other") {
      businessName = `Prime ${category}`;
    } else {
      businessName = "Apex Studio";
    }
  }

  // 6. Generate rich description
  const locSuffix = location ? ` located in ${location}` : "";
  const featSuffix = selectedFeatures && selectedFeatures.length > 0
    ? ` featuring seamless ${selectedFeatures.map((f) => f.replace("_", " ")).join(", ")}.`
    : ".";

  const description = `${businessName} is a premier ${category.toLowerCase()} destination${locSuffix}, dedicated to delivering world-class experiences, exceptional quality, and customer satisfaction${featSuffix}`;

  // 7. Services
  const services = CATEGORY_SERVICES[category] || CATEGORY_SERVICES["Other"];

  // 8. Theme
  const theme = CATEGORY_THEMES[category] || CATEGORY_THEMES["Other"];

  return {
    businessName,
    category,
    description,
    services,
    targetAudience: `People and clients seeking high quality ${category.toLowerCase()} services${locSuffix}`,
    location,
    style: theme.style,
    primaryColor: theme.pColor,
    secondaryColor: theme.sColor,
    phone,
    email,
    whatsappNumber: phone,
  };
}
