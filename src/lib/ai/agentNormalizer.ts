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
  const wantsToBuild = /generate|build|create my website|let's go|done|ready|yes.*generate|build now/i.test(userMessage);

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

  // Merge canonical facts: prior needs + fast extracted + model extracted
  const mergedNeeds: ExtractedUserNeeds = {
    businessName:
      (typeof rawExtracted.businessName === "string" && rawExtracted.businessName.trim()) ||
      priorNeeds.businessName ||
      (fastExtracted.businessName !== "My Business" ? fastExtracted.businessName : undefined),
    category:
      (typeof rawExtracted.category === "string" && rawExtracted.category.trim()) ||
      (typeof rawExtracted.businessType === "string" && rawExtracted.businessType.trim()) ||
      priorNeeds.category ||
      fastExtracted.category,
    description:
      (typeof rawExtracted.description === "string" && rawExtracted.description.trim()) ||
      priorNeeds.description ||
      fastExtracted.description,
    targetAudience:
      (typeof rawExtracted.targetAudience === "string" && rawExtracted.targetAudience.trim()) ||
      priorNeeds.targetAudience ||
      fastExtracted.targetAudience,
    services:
      Array.isArray(rawExtracted.services) && rawExtracted.services.length > 0
        ? rawExtracted.services.map(String)
        : priorNeeds.services && priorNeeds.services.length > 0
        ? priorNeeds.services
        : fastExtracted.services,
    features:
      Array.isArray(rawExtracted.features) && rawExtracted.features.length > 0
        ? rawExtracted.features.map(String)
        : priorNeeds.features && priorNeeds.features.length > 0
        ? priorNeeds.features
        : ["whatsapp", "contact_form", "testimonials", "google_maps"],
    style:
      (typeof rawExtracted.style === "string" && rawExtracted.style.trim()) ||
      (typeof rawExtracted.designStyle === "string" && rawExtracted.designStyle.trim()) ||
      priorNeeds.style ||
      fastExtracted.style,
    primaryColor:
      (typeof rawExtracted.primaryColor === "string" && rawExtracted.primaryColor.trim()) ||
      priorNeeds.primaryColor ||
      fastExtracted.primaryColor,
    secondaryColor:
      (typeof rawExtracted.secondaryColor === "string" && rawExtracted.secondaryColor.trim()) ||
      priorNeeds.secondaryColor ||
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

  // 7. Filter suggested replies
  const suggestedReplies = Array.isArray(parsed.suggestedReplies)
    ? parsed.suggestedReplies.filter((r): r is string => typeof r === "string" && r.trim().length > 0).slice(0, 4)
    : [];

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
