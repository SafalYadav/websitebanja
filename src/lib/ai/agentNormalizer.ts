import { z } from "zod";
import type { ExtractedUserNeeds, AgentTalkResponse } from "@/types/aiAgent";
import { extractBusinessDetailsFast } from "@/lib/promptExtractor";

/**
 * Sanitizes text to be spoken aloud by a voice layer.
 * Strips JSON, markdown formatting, bullet points, emojis, and URLs.
 */
export function cleanSpeechText(text?: string): string {
  if (!text) return "";

  let clean = text;

  // Strip code blocks or inline json
  clean = clean.replace(/```[\s\S]*?```/g, "");
  clean = clean.replace(/\{[\s\S]*?\}/g, "");

  // Strip markdown styling (bold, italic, strikethrough, backticks, headings, blockquotes)
  clean = clean.replace(/[*#_`~>]/g, " ");

  // Strip markdown bullet points and numbered list markers
  clean = clean.replace(/^\s*[-•*]\s+/gm, " ");
  clean = clean.replace(/^\s*\d+\.\s+/gm, " ");

  // Strip URLs
  clean = clean.replace(/https?:\/\/\S+/g, "");

  // Strip emojis so voice synthesizers don't speak out emoji descriptions
  clean = clean.replace(
    /[\u{1F600}-\u{1F64F}|\u{1F300}-\u{1F5FF}|\u{1F680}-\u{1F6FF}|\u{1F1E0}-\u{1F1FF}|\u{2600}-\u{26FF}|\u{2700}-\u{27BF}]/gu,
    ""
  );

  // Normalize multiple spaces and trim
  clean = clean.replace(/\s+/g, " ").trim();

  // If text is empty after sanitization, return a safe fallback
  if (!clean) {
    return "I'm ready to help design your website.";
  }

  return clean;
}

/**
 * Deterministically calculates project readiness based strictly on Project Knowledge facts.
 * Never allows an LLM hallucination to bypass validation criteria.
 */
export function calculateDeterministicReadiness(needs: ExtractedUserNeeds): {
  score: number;
  isReadyToBuild: boolean;
  nextMissingAspect?: string;
} {
  let score = 20;

  const hasCategory = Boolean(needs.category && needs.category !== "Other" && needs.category.trim().length > 0);
  const hasBusinessName = Boolean(
    needs.businessName &&
    !needs.businessName.toLowerCase().includes("my business") &&
    needs.businessName.trim().length > 0
  );
  const hasOfferings = Boolean(
    (needs.services && needs.services.length > 0) ||
    (needs.description && needs.description.trim().length > 15)
  );
  const hasAudienceOrFeatures = Boolean(
    (needs.targetAudience && needs.targetAudience.trim().length > 0) ||
    (needs.features && needs.features.length >= 3)
  );
  const hasDesignOrColor = Boolean(
    (needs.style && needs.style.trim().length > 0) ||
    (needs.primaryColor && needs.primaryColor !== "#7C3AED")
  );

  if (hasCategory) score += 20;
  if (hasBusinessName) score += 20;
  if (hasOfferings) score += 15;
  if (hasAudienceOrFeatures) score += 15;
  if (hasDesignOrColor) score += 10;

  const finalScore = Math.min(100, Math.max(20, score));

  // Minimum required criteria for ready_to_generate:
  // 1. Valid business name
  // 2. Valid category
  // 3. At least 1 offering/service or a concrete description
  // 4. Deterministic score >= 70
  const isReadyToBuild = finalScore >= 70 && hasBusinessName && hasCategory && hasOfferings;

  let nextMissingAspect: string | undefined;
  if (!hasBusinessName) {
    nextMissingAspect = "business_name";
  } else if (!hasCategory) {
    nextMissingAspect = "category";
  } else if (!hasOfferings) {
    nextMissingAspect = "key_services";
  } else if (!needs.style) {
    nextMissingAspect = "design_style";
  }

  return {
    score: finalScore,
    isReadyToBuild,
    nextMissingAspect,
  };
}

/**
 * Fast deterministic fallback detector for Indian languages and English.
 * Detects both native Indic Unicode scripts and common transliterated/phonetic phrases.
 */
export function detectLanguageFast(text?: string): { code: string; name: string; nativeName: string } {
  if (!text) {
    return { code: "en-IN", name: "English / Hinglish", nativeName: "English / Hinglish" };
  }

  const lower = text.toLowerCase();

  // Gujarati unicode or keywords (e.g. "mane cafe mate website barwani che")
  if (
    /[\u0A80-\u0AFF]/.test(text) ||
    /\b(mane|tame|banvvu|banavvu|banavva|mate|che|nathi|chho|aavo|khammaghani|kem|kevu|barwani)\b/i.test(lower)
  ) {
    return { code: "gu-IN", name: "Gujarati", nativeName: "ગુજરાતી" };
  }

  // Hindi / Devanagari unicode or keywords (e.g. "mujhe gym ke liye website banani hai")
  if (
    /[\u0900-\u097F]/.test(text) ||
    /\b(mujhe|humko|banaana|banani|chahiye|karna|hoga|kripya|namaste|shukriya|kaise|kaisa|kya|nahin)\b/i.test(lower)
  ) {
    return { code: "hi-IN", name: "Hindi", nativeName: "हिन्दी" };
  }

  // Marathi keywords
  if (
    /\b(aamhi|pahije|aahe|karaycha|aahet|kasa|kay|chhan|namaskar)\b/i.test(lower)
  ) {
    return { code: "mr-IN", name: "Marathi", nativeName: "मराठी" };
  }

  // Bengali unicode or keywords
  if (
    /[\u0980-\u09FF]/.test(text) ||
    /\b(aami|aamader|chai|bhalo|hobe|korbo|nomoshkar)\b/i.test(lower)
  ) {
    return { code: "bn-IN", name: "Bengali", nativeName: "বাংলা" };
  }

  // Tamil unicode or keywords
  if (
    /[\u0B80-\u0BFF]/.test(text) ||
    /\b(enakku|venum|nandri|vanakkam|pananum|thayavu|eppadi)\b/i.test(lower)
  ) {
    return { code: "ta-IN", name: "Tamil", nativeName: "தமிழ்" };
  }

  // Telugu unicode or keywords
  if (
    /[\u0C00-\u0C7F]/.test(text) ||
    /\b(naku|kavali|namaskaram|cheyandi|ela|enti)\b/i.test(lower)
  ) {
    return { code: "te-IN", name: "Telugu", nativeName: "తెలుగు" };
  }

  // Kannada unicode or keywords
  if (
    /[\u0C80-\u0CFF]/.test(text) ||
    /\b(nanage|beku|namaskara|hege|madabeku)\b/i.test(lower)
  ) {
    return { code: "kn-IN", name: "Kannada", nativeName: "ಕನ್ನಡ" };
  }

  // Malayalam unicode or keywords
  if (
    /[\u0D00-\u0D7F]/.test(text) ||
    /\b(enikku|venam|namaskaram|cheyyanam|engane)\b/i.test(lower)
  ) {
    return { code: "ml-IN", name: "Malayalam", nativeName: "മലയാളം" };
  }

  // Punjabi unicode or keywords
  if (
    /[\u0A00-\u0A7F]/.test(text) ||
    /\b(mainu|chahida|sat|sri|akal|hove|kiddan|karna)\b/i.test(lower)
  ) {
    return { code: "pa-IN", name: "Punjabi", nativeName: "ਪੰਜਾਬੀ" };
  }

  return { code: "en-IN", name: "English / Hinglish", nativeName: "English / Hinglish" };
}

const RawAgentSchema = z.object({
  reply: z.string().optional(),
  speechText: z.string().optional(),
  suggestedReplies: z.array(z.string()).optional(),
  extractedNeeds: z.record(z.string(), z.any()).optional(),
  readinessScore: z.number().optional(),
  isReadyToBuild: z.boolean().optional(),
  triggerImmediateBuild: z.boolean().optional(),
  nextMissingAspect: z.string().optional(),
  detectedLanguage: z
    .object({
      code: z.string().optional(),
      name: z.string().optional(),
      nativeName: z.string().optional(),
    })
    .optional(),
});

const CANONICAL_CATEGORIES: Record<string, string[]> = {
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

export function normalizeCategory(rawCategory?: string): string | undefined {
  if (!rawCategory) return undefined;
  const lower = rawCategory.toLowerCase();
  for (const [canonical, keywords] of Object.entries(CANONICAL_CATEGORIES)) {
    if (keywords.some((kw) => lower.includes(kw)) || lower.includes(canonical.toLowerCase())) {
      return canonical;
    }
  }
  return rawCategory;
}

export const COLOR_MAP: Record<string, string> = {
  "dark green": "#15803d",
  "forest green": "#166534",
  "emerald green": "#059669",
  "emerald": "#059669",
  "olive green": "#4d7c0f",
  "light green": "#86efac",
  "mint green": "#6ee7b7",
  "green": "#16a34a",
  "navy blue": "#1e3a8a",
  "royal blue": "#1d4ed8",
  "sky blue": "#0284c7",
  "ocean blue": "#0284c7",
  "blue": "#2563eb",
  "crimson red": "#b91c1c",
  "dark red": "#991b1b",
  "crimson": "#dc2626",
  "red": "#dc2626",
  "deep purple": "#581c87",
  "purple": "#7c3aed",
  "violet": "#7c3aed",
  "lavender": "#a855f7",
  "orange": "#ea580c",
  "dark orange": "#c2410c",
  "gold": "#d97706",
  "amber": "#d97706",
  "yellow": "#ca8a04",
  "teal": "#0d9488",
  "dark teal": "#0f766e",
  "cyan": "#06b6d4",
  "pink": "#db2777",
  "rose": "#e11d48",
  "black": "#18181b",
  "dark": "#18181b",
  "charcoal": "#27272a",
  "white": "#ffffff",
  "gray": "#4b5563",
  "grey": "#4b5563",
};

export function extractColorFromText(text: string): string | undefined {
  if (!text) return undefined;
  const lower = text.toLowerCase();

  // Check for hex code (e.g. #15803d)
  const hexMatch = text.match(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/);
  if (hexMatch) {
    return hexMatch[0].toLowerCase();
  }

  // Check for color phrases like "color to dark green", "primary color is navy blue", "make it crimson"
  for (const [colorName, hex] of Object.entries(COLOR_MAP)) {
    const pattern = new RegExp(
      `(?:(?:primary|secondary|theme|brand)?\\s*color(?:\\s+(?:to|is|as))?|make\\s+it|use|change\\s+to)\\s+${colorName}\\b|\\b${colorName}\\s+color\\b|\\b${colorName}\\b`,
      "i"
    );
    if (pattern.test(lower)) {
      return hex;
    }
  }

  return undefined;
}

export function extractFeaturesWithModifications(
  userMessage: string,
  rawExtractedFeatures?: unknown,
  priorFeatures?: string[]
): string[] {
  const msgLower = userMessage.toLowerCase();
  const existing = Array.isArray(rawExtractedFeatures) && rawExtractedFeatures.length > 0
    ? rawExtractedFeatures.map(String)
    : priorFeatures && priorFeatures.length > 0
    ? priorFeatures
    : ["whatsapp", "contact_form", "testimonials", "google_maps"];

  const featSet = new Set(existing);

  // Helper for negation / removal intent
  const isNegated = (targetKeyword: string): boolean => {
    const regex = new RegExp(
      `(?:remove|delete|without|drop|don't\\s+(?:want|need|include)|no\\s+|exclude|skip|hata\\s*do|hatao|mat\\s+rakh[oa])(?:\\s+(?:the|our))?(?:\\s+[a-z0-9_-]+)*?\\s+${targetKeyword}`,
      "i"
    );
    const postNegatedRegex = new RegExp(
      `${targetKeyword}(?:\\s+[a-z0-9_-]+)*?\\s+(?:ko\\s+hata\\s*do|hatao|remove|delete|mat\\s+rakh[oa])`,
      "i"
    );
    return regex.test(msgLower) || postNegatedRegex.test(msgLower);
  };

  // Helper for retention / keep intent
  const isRetained = (targetKeyword: string): boolean => {
    const regex = new RegExp(
      `(?:keep|retain|add\\s+back|rakho|re-add)\\s+(?:the\\s+)?${targetKeyword}`,
      "i"
    );
    return regex.test(msgLower);
  };

  // 1. WhatsApp
  if (msgLower.includes("whatsapp")) {
    if (isNegated("whatsapp")) {
      featSet.delete("whatsapp");
    } else {
      featSet.add("whatsapp");
    }
  }

  // 2. Testimonials / Reviews
  if (msgLower.includes("testimonial") || msgLower.includes("review")) {
    if (isNegated("testimonial") || isNegated("review")) {
      featSet.delete("testimonials");
    } else if (isRetained("testimonial") || isRetained("review") || !existing.includes("testimonials")) {
      featSet.add("testimonials");
    }
  }

  // 3. Pricing / Packages
  if (msgLower.includes("pricing") || msgLower.includes("price") || msgLower.includes("package")) {
    if (isRetained("pricing") || isRetained("price") || isRetained("package")) {
      featSet.add("pricing");
    } else if (isNegated("pricing") || isNegated("price") || isNegated("package")) {
      featSet.delete("pricing");
    } else if (msgLower.includes("add pricing")) {
      featSet.add("pricing");
    }
  }

  // 4. Contact Form / Contact
  if (msgLower.includes("contact") && (msgLower.includes("form") || msgLower.includes("section"))) {
    if (isNegated("contact")) {
      featSet.delete("contact_form");
    } else {
      featSet.add("contact_form");
    }
  }

  // 5. Maps
  if (msgLower.includes("map")) {
    if (isNegated("map")) {
      featSet.delete("google_maps");
    } else {
      featSet.add("google_maps");
    }
  }

  // 6. Appointments / Booking
  if (msgLower.includes("booking") || msgLower.includes("appointment")) {
    if (isNegated("booking") || isNegated("appointment")) {
      featSet.delete("appointments");
    } else {
      featSet.add("appointments");
    }
  }

  return Array.from(featSet);
}

/**
 * Normalizes raw LLM output into the strict AgentTalkResponse schema.
 * Safely parses JSON (stripping fences), applies schema validation,
 * merges extracted facts into Project Knowledge, and enforces deterministic readiness.
 */
export function normalizeAgentResponse(
  rawText: string,
  priorNeeds: ExtractedUserNeeds = {},
  userMessage: string = ""
): NonNullable<AgentTalkResponse["data"]> {
  const wantsToBuild = /\b(?:build|generate|create)\s+(?:it|my\s+website|the\s+website|site)\s+now\b|\bstart\s+building\b|\byes[,\s]+(?:generate|build|create)\b|\bready to build\b|\bbuild now\b|\bgenerate now\b/i.test(userMessage);

  let parsed: z.infer<typeof RawAgentSchema> = {};

  try {
    // 1. Strip markdown code fences if present (e.g. ```json ... ``` or ``` ...)
    let cleaned = rawText.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    }

    // 2. Locate innermost JSON object if extraneous text surrounds it
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }

    const rawJson = JSON.parse(cleaned);
    const validated = RawAgentSchema.safeParse(rawJson);
    if (validated.success) {
      parsed = validated.data;
    }
  } catch {
    // If JSON parsing fails, fall back to extracting business details directly from user text
    console.warn("[AgentNormalizer] Failed to parse model output as JSON. Using deterministic fallback.");
  }

  // 3. Fallback extraction if model did not extract structured needs
  const fastExtracted = extractBusinessDetailsFast(
    userMessage,
    priorNeeds.category,
    priorNeeds.features
  );

  const rawExtracted = (parsed.extractedNeeds || {}) as Record<string, any>;
  const extractedColorFromMsg = extractColorFromText(userMessage);

  // Merge canonical facts: prior needs + fast extracted + model extracted
  const mergedNeeds: ExtractedUserNeeds = {
    businessName:
      (typeof rawExtracted.businessName === "string" && rawExtracted.businessName.trim()) ||
      priorNeeds.businessName ||
      (fastExtracted.businessName !== "My Business" ? fastExtracted.businessName : undefined),
    category: normalizeCategory(
      (typeof rawExtracted.category === "string" && rawExtracted.category.trim()) ||
      (typeof rawExtracted.businessType === "string" && rawExtracted.businessType.trim()) ||
      priorNeeds.category ||
      fastExtracted.category
    ),
    description: (() => {
      const explicitDesc = typeof rawExtracted.description === "string" && rawExtracted.description.trim();
      const bName =
        (typeof rawExtracted.businessName === "string" && rawExtracted.businessName.trim()) ||
        priorNeeds.businessName ||
        (fastExtracted.businessName !== "My Business" ? fastExtracted.businessName : undefined);
      if (explicitDesc && (!bName || explicitDesc.toLowerCase().includes(bName.toLowerCase()))) {
        return explicitDesc;
      }
      if (priorNeeds.description && bName && priorNeeds.description.toLowerCase().includes(bName.toLowerCase())) {
        return priorNeeds.description;
      }
      return fastExtracted.description;
    })(),
    targetAudience:
      (typeof rawExtracted.targetAudience === "string" && rawExtracted.targetAudience.trim()) ||
      priorNeeds.targetAudience ||
      fastExtracted.targetAudience,
    services: (() => {
      const msgLower = userMessage.toLowerCase();
      let s = Array.isArray(rawExtracted.services) && rawExtracted.services.length > 0
        ? rawExtracted.services.map(String)
        : priorNeeds.services && priorNeeds.services.length > 0
        ? priorNeeds.services
        : fastExtracted.services;

      const isPricingNegated = /(?:remove|delete|without|drop|don't\s+(?:want|need|include)|no\s+|exclude|skip|hata\s*do|hatao|mat\s+rakh[oa])\s*(?:the\s*)?(?:pricing|prices?|packages?)/i.test(msgLower);
      const isPricingRetained = /(?:keep|retain|add\s+back|rakho|re-add)\s*(?:the\s*)?(?:pricing|prices?|packages?)/i.test(msgLower);

      if (isPricingNegated) {
        s = s.filter((item) => !/price|pricing|package/i.test(item));
      } else if (isPricingRetained && !s.some((item) => /price|pricing|package/i.test(item))) {
        s = [...s, "Essential Pricing & Consultations"];
      }
      return s;
    })(),
    features: extractFeaturesWithModifications(userMessage, rawExtracted.features, priorNeeds.features),
    style:
      (typeof rawExtracted.style === "string" && rawExtracted.style.trim()) ||
      (typeof rawExtracted.designStyle === "string" && rawExtracted.designStyle.trim()) ||
      priorNeeds.style ||
      fastExtracted.style,
    primaryColor:
      extractedColorFromMsg ||
      priorNeeds.primaryColor ||
      (typeof rawExtracted.primaryColor === "string" && rawExtracted.primaryColor.trim()) ||
      fastExtracted.primaryColor,
    secondaryColor:
      priorNeeds.secondaryColor ||
      (typeof rawExtracted.secondaryColor === "string" && rawExtracted.secondaryColor.trim()) ||
      fastExtracted.secondaryColor,
    phone:
      (typeof rawExtracted.phone === "string" && rawExtracted.phone.trim()) ||
      priorNeeds.phone ||
      fastExtracted.phone,
    email:
      (typeof rawExtracted.email === "string" && rawExtracted.email.trim()) ||
      priorNeeds.email ||
      fastExtracted.email,
    whatsappNumber:
      (typeof rawExtracted.whatsappNumber === "string" && rawExtracted.whatsappNumber.trim()) ||
      priorNeeds.whatsappNumber ||
      fastExtracted.whatsappNumber,
    location:
      (typeof rawExtracted.location === "string" && rawExtracted.location.trim()) ||
      priorNeeds.location ||
      fastExtracted.location,
  };

  // 4. Calculate deterministic readiness from Project Knowledge
  const readiness = calculateDeterministicReadiness(mergedNeeds);

  // 5. Clean reply text: ensure NO raw JSON or markdown fences remain
  let cleanReply = parsed.reply?.trim() || "";
  if (cleanReply.startsWith("```") || cleanReply.startsWith("{")) {
    try {
      const nested = JSON.parse(
        cleanReply.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim()
      );
      if (nested && typeof nested.reply === "string") {
        cleanReply = nested.reply;
      }
    } catch {
      // Leave as is if not parseable
    }
  }
  if (!cleanReply) {
    if (mergedNeeds.businessName) {
      cleanReply = `That sounds wonderful! Let's build out the perfect digital presence for ${mergedNeeds.businessName}. What key offerings or services should we highlight?`;
    } else {
      cleanReply = "I'd love to help design your website! What is your business name and what type of services do you offer?";
    }
  }

  // 6. Canonical Speech: Single Source of Truth for both visible UI text and spoken audio
  const canonicalSpeech = cleanSpeechText(cleanReply);

  // 7. Filter suggested replies, with robust defaults if model produces none
  const parsedReplies = Array.isArray(parsed.suggestedReplies)
    ? parsed.suggestedReplies.filter((r): r is string => typeof r === "string" && r.trim().length > 0).slice(0, 4)
    : [];
  const defaultSuggestions = [
    "Tell me about your services",
    "Choose brand colors",
    "Add contact & WhatsApp",
    "Generate my website",
  ];
  const suggestedReplies = parsedReplies.length > 0 ? parsedReplies : defaultSuggestions;

  const shouldTriggerImmediateBuild = Boolean(parsed.triggerImmediateBuild) || wantsToBuild;
  const isReady = readiness.isReadyToBuild || shouldTriggerImmediateBuild;

  const fallbackLang = detectLanguageFast(userMessage || cleanReply);
  const detectedLanguage = parsed.detectedLanguage?.name
    ? {
        code: parsed.detectedLanguage.code || fallbackLang.code,
        name: parsed.detectedLanguage.name,
        nativeName: parsed.detectedLanguage.nativeName || parsed.detectedLanguage.name,
      }
    : fallbackLang;

  return {
    reply: canonicalSpeech,
    speechText: canonicalSpeech,
    suggestedReplies: shouldTriggerImmediateBuild ? [] : suggestedReplies,
    extractedNeeds: mergedNeeds,
    readinessScore: readiness.score,
    isReadyToBuild: isReady,
    triggerImmediateBuild: shouldTriggerImmediateBuild,
    nextMissingAspect: readiness.nextMissingAspect,
    detectedLanguage,
  };
}
