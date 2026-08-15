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
  const p = prompt.trim();
  const lower = p.toLowerCase();

  // 1. Detect location
  let location = "";
  const locationMatch = lower.match(/(?:in|at|near|around|for)\s+([a-zA-Z\s]{3,25})/i);
  if (locationMatch && locationMatch[1]) {
    const rawLoc = locationMatch[1].trim();
    // Capitalize words
    location = rawLoc
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  // 2. Detect category
  let category = selectedCategory || "";
  if (!category) {
    for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (keywords.some((kw) => lower.includes(kw))) {
        category = cat;
        break;
      }
    }
  }
  if (!category) category = "Other";

  // 3. Extract Phone / WhatsApp
  const phoneMatch = p.match(/(?:\+?\d{1,4}[ -]?)?\(?\d{3,4}\)?[ -]?\d{3,4}[ -]?\d{3,4}/);
  const phone = phoneMatch ? phoneMatch[0].trim() : "";

  // 4. Extract Email
  const emailMatch = p.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch ? emailMatch[0].trim() : "";

  // 5. Generate Business Name
  let businessName = "";
  // Check if user specifically named it e.g. "for Sharma Dental Clinic" or "named Apex Fitness"
  const namePattern = lower.match(/(?:called|named|for)\s+([A-Za-z0-9\s'&]{3,30})(?:\s+in|\s+with|\s+and|\.|$)/i);
  if (namePattern && namePattern[1] && !["me", "a", "an", "the", "my"].includes(namePattern[1].trim().toLowerCase())) {
    businessName = namePattern[1]
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
