// src/lib/ai/mitraLanguageDetector.ts

export type SupportedLanguageCode =
  | "mr-IN"
  | "hi-IN"
  | "en-IN"
  | "gu-IN"
  | "bn-IN"
  | "ta-IN"
  | "te-IN"
  | "kn-IN"
  | "ml-IN"
  | "pa-IN"
  | "or-IN"
  | "as-IN"
  | "ur-IN";

export interface LanguageDetectionResult {
  code: SupportedLanguageCode;
  name: string;
  nativeName: string;
  confidence: number;
  isMixed: boolean;
  detectedSignals: string[];
}

/**
 * 40+ Technical web design terms that must NEVER trigger language switching.
 * Users naturally use these English terms while speaking Marathi, Hindi, or Gujarati.
 */
export const TECHNICAL_ENGLISH_TERMS = new Set([
  "website",
  "web",
  "site",
  "hero",
  "section",
  "navbar",
  "nav",
  "menu",
  "header",
  "footer",
  "cta",
  "button",
  "card",
  "cards",
  "bento",
  "grid",
  "layout",
  "design",
  "animation",
  "animations",
  "color",
  "colors",
  "palette",
  "theme",
  "font",
  "fonts",
  "typography",
  "responsive",
  "mobile",
  "desktop",
  "dashboard",
  "domain",
  "hosting",
  "seo",
  "backend",
  "database",
  "api",
  "form",
  "contact",
  "gallery",
  "slider",
  "banner",
  "premium",
  "modern",
  "minimal",
  "minimalist",
  "creative",
  "luxury",
  "whatsapp",
  "booking",
  "appointment",
  "ecommerce",
  "shop",
  "cart",
  "checkout",
  "logo",
  "brand",
  "service",
  "services",
  "feature",
  "features",
  "page",
  "pages",
  "homepage",
]);

/**
 * Marathi grammatical particles, auxiliaries, pronouns, and inflection markers.
 * High-confidence discriminating signals for Marathi vs Hindi.
 */
const MARATHI_DEVANAGARI_SIGNALS = [
  "आहे", "आहेत", "नाही", "नाहीत", "मला", "तुम्ही", "आम्ही", "आपण",
  "कसं", "कसा", "कशी", "काय", "कुठे", "केव्हा", "कधी", "करू", "करा",
  "करायचं", "करायचे", "करायची", "करायचा", "पाहिजे", "हवे", "हवी", "हवा",
  "ठेव", "ठेवा", "बनवायची", "बनवायचा", "बनवायचे", "बनवा", "द्या", "द्यावे",
  "सांगा", "होतं", "होती", "होता", "होते", "आहोत", "आमच्या", "तुमच्या",
  "त्यांच्या", "माझ्या", "आपल्या", "नको", "मित्रा", "छान", "धन्यवाद",
  "मध्ये", "साठी", "वरून", "कडे", "जवळ", "येथे", "तिथे", "करायला",
  "घेऊन", "सांगतो", "सांगते", "बघू", "दाखवा", "जोडा", "टाका", "करायचेय"
];

const MARATHI_LATIN_SIGNALS = [
  "aahe", "aahet", "nahit", "nahi", "mala", "tumhi", "aamhi", "aapan",
  "kasa", "kashi", "kasam", "kay", "kuthe", "kadhi", "karu", "kara",
  "karaycha", "karaychi", "karayche", "pahije", "have", "havi", "hawa",
  "thev", "theva", "banvaychi", "banvaycha", "banvayche", "banva", "dya",
  "saanga", "sanga", "hotam", "hota", "hoti", "hote", "aahot", "aamchya",
  "tumchya", "tyanchya", "maajhya", "majhya", "nako", "chhan", "dhanyavaad",
  "madhe", "sathi", "varun", "kade", "karayla", "dakhva", "joda", "taka"
];

/**
 * Hindi grammatical particles, auxiliaries, pronouns, and inflection markers.
 */
const HINDI_DEVANAGARI_SIGNALS = [
  "मुझे", "मुझको", "हमको", "हमें", "आप", "तुम", "चाहिए", "करना",
  "करनी", "करना", "करेंगे", "होगी", "होगा", "होंगे", "सकते", "सकती",
  "सकता", "नमस्ते", "रखना", "रखो", "रखिए", "बनाना", "बनानी", "बनाओ",
  "बनाइए", "है", "हैं", "था", "थी", "थे", "किरपा", "कृपया", "कैसा",
  "कैसी", "कैसे", "क्या", "नहीं", "दीजिए", "बताइए", "हमारे", "आपके",
  "मेरे", "वाला", "वाली", "वाले", "बहुत", "अच्छा", "चाहता", "चाहती"
];

const HINDI_LATIN_SIGNALS = [
  "mujhe", "mujhko", "humko", "hamein", "aap", "tum", "chahiye", "karna",
  "karni", "karenge", "hogi", "hoga", "honge", "sakte", "sakti", "sakta",
  "namaste", "rakhna", "rakho", "rakhiye", "banaana", "banani", "banao",
  "banaiye", "hai", "hain", "tha", "thi", "the", "kripya", "kaisa", "kaisi",
  "kaise", "kya", "nahin", "nahi", "dijiye", "bataiye", "hamare", "aapke",
  "mere", "wala", "wali", "wale", "bahut", "achha", "chahta", "chahti"
];

/**
 * Strips technical web words and punctuation to isolate language-bearing grammar tokens.
 */
function extractGrammarTokens(text: string): { originalTokens: string[]; cleanTokens: string[] } {
  const originalTokens = text.trim().split(/\s+/).filter(Boolean);
  const cleanTokens = originalTokens
    .map((t) => t.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()?"'<>]/g, ""))
    .filter((t) => t.length > 0 && !TECHNICAL_ENGLISH_TERMS.has(t));

  return { originalTokens, cleanTokens };
}

/**
 * Detects the language of a spoken or typed utterance with high Marathi & Hindi precision.
 * Distinguishes Devanagari Marathi from Devanagari Hindi using grammatical particles and morphology.
 */
export function detectLanguagePrecise(
  text?: string,
  previousLanguageCode?: string
): LanguageDetectionResult {
  const normPrev: SupportedLanguageCode | undefined = previousLanguageCode
    ? previousLanguageCode.toLowerCase().startsWith("mr")
      ? "mr-IN"
      : previousLanguageCode.toLowerCase().startsWith("hi")
      ? "hi-IN"
      : previousLanguageCode.toLowerCase().startsWith("gu")
      ? "gu-IN"
      : previousLanguageCode.toLowerCase().startsWith("bn")
      ? "bn-IN"
      : previousLanguageCode.toLowerCase().startsWith("ta")
      ? "ta-IN"
      : previousLanguageCode.toLowerCase().startsWith("te")
      ? "te-IN"
      : previousLanguageCode.toLowerCase().startsWith("kn")
      ? "kn-IN"
      : previousLanguageCode.toLowerCase().startsWith("ml")
      ? "ml-IN"
      : previousLanguageCode.toLowerCase().startsWith("pa")
      ? "pa-IN"
      : previousLanguageCode.toLowerCase().startsWith("or")
      ? "or-IN"
      : previousLanguageCode.toLowerCase().startsWith("as")
      ? "as-IN"
      : previousLanguageCode.toLowerCase().startsWith("ur")
      ? "ur-IN"
      : "en-IN"
    : undefined;

  if (!text || !text.trim()) {
    const fallbackCode = normPrev || "en-IN";
    return {
      code: fallbackCode,
      name: fallbackCode === "mr-IN" ? "Marathi" : fallbackCode === "hi-IN" ? "Hindi" : "English",
      nativeName: fallbackCode === "mr-IN" ? "मराठी" : fallbackCode === "hi-IN" ? "हिन्दी" : "English",
      confidence: 1.0,
      isMixed: false,
      detectedSignals: [],
    };
  }

  const raw = text.trim();
  const lower = raw.toLowerCase();
  const { cleanTokens } = extractGrammarTokens(raw);
  const detectedSignals: string[] = [];

  // Check other non-Devanagari Indic scripts first
  if (/[\u0A80-\u0AFF]/.test(raw) || /\b(mane|tame|banvvu|banavvu|mate|che|nathi|kem)\b/i.test(lower)) {
    return {
      code: "gu-IN",
      name: "Gujarati",
      nativeName: "ગુજરાતી",
      confidence: 0.95,
      isMixed: false,
      detectedSignals: ["gujarati_script_or_tokens"],
    };
  }

  if (/[\u0980-\u09FF]/.test(raw) || /\b(aami|aamader|chai|bhalo|hobe|korbo)\b/i.test(lower)) {
    return {
      code: "bn-IN",
      name: "Bengali",
      nativeName: "বাংলা",
      confidence: 0.95,
      isMixed: false,
      detectedSignals: ["bengali_script_or_tokens"],
    };
  }

  if (/[\u0B80-\u0BFF]/.test(raw) || /\b(enakku|venum|nandri|vanakkam|pananum)\b/i.test(lower)) {
    return {
      code: "ta-IN",
      name: "Tamil",
      nativeName: "தமிழ்",
      confidence: 0.95,
      isMixed: false,
      detectedSignals: ["tamil_script_or_tokens"],
    };
  }

  if (/[\u0C00-\u0C7F]/.test(raw) || /\b(naku|kavali|namaskaram|cheyandi)\b/i.test(lower)) {
    return {
      code: "te-IN",
      name: "Telugu",
      nativeName: "తెలుగు",
      confidence: 0.95,
      isMixed: false,
      detectedSignals: ["telugu_script_or_tokens"],
    };
  }

  if (/[\u0C80-\u0CFF]/.test(raw) || /\b(nanage|beku|namaskara|madabeku)\b/i.test(lower)) {
    return {
      code: "kn-IN",
      name: "Kannada",
      nativeName: "ಕನ್ನಡ",
      confidence: 0.95,
      isMixed: false,
      detectedSignals: ["kannada_script_or_tokens"],
    };
  }

  if (/[\u0D00-\u0D7F]/.test(raw) || /\b(enikku|venam|namaskaram)\b/i.test(lower)) {
    return {
      code: "ml-IN",
      name: "Malayalam",
      nativeName: "മലയാളം",
      confidence: 0.95,
      isMixed: false,
      detectedSignals: ["malayalam_script_or_tokens"],
    };
  }

  if (/[\u0A00-\u0A7F]/.test(raw) || /\b(mainu|chahida|sat\s+sri\s+akal)\b/i.test(lower)) {
    return {
      code: "pa-IN",
      name: "Punjabi",
      nativeName: "ਪੰਜਾਬੀ",
      confidence: 0.95,
      isMixed: false,
      detectedSignals: ["punjabi_script_or_tokens"],
    };
  }

  // DISAMBIGUATION: Devanagari script and Latin transliterated Hindi / Marathi
  let marathiScore = 0;
  let hindiScore = 0;
  let englishScore = 0;

  // 1. Check Marathi Devanagari signals
  for (const sig of MARATHI_DEVANAGARI_SIGNALS) {
    if (raw.includes(sig)) {
      marathiScore += 3;
      detectedSignals.push(`mr_devanagari:${sig}`);
    }
  }

  // 2. Check Marathi Latin signals
  for (const sig of MARATHI_LATIN_SIGNALS) {
    const regex = new RegExp(`\\b${sig}\\b`, "i");
    if (regex.test(lower)) {
      marathiScore += 2.5;
      detectedSignals.push(`mr_latin:${sig}`);
    }
  }

  // 3. Check Hindi Devanagari signals
  for (const sig of HINDI_DEVANAGARI_SIGNALS) {
    if (raw.includes(sig)) {
      hindiScore += 3;
      detectedSignals.push(`hi_devanagari:${sig}`);
    }
  }

  // 4. Check Hindi Latin signals
  for (const sig of HINDI_LATIN_SIGNALS) {
    const regex = new RegExp(`\\b${sig}\\b`, "i");
    if (regex.test(lower)) {
      hindiScore += 2.5;
      detectedSignals.push(`hi_latin:${sig}`);
    }
  }

  // 5. Check Pure English tokens (ignoring technical web terms)
  const nonTechEnglishWords = cleanTokens.filter((token) => /^[a-z]+$/i.test(token));
  for (const w of nonTechEnglishWords) {
    if (
      [
        "i", "want", "to", "make", "create", "a", "for", "my", "our",
        "please", "can", "you", "we", "need", "like", "the", "and", "with",
        "is", "are", "this", "that", "more", "less", "put", "give"
      ].includes(w)
    ) {
      englishScore += 2;
      detectedSignals.push(`en_word:${w}`);
    }
  }

  const isDevanagari = /[\u0900-\u097F]/.test(raw);

  // DECISION LOGIC:
  // If Devanagari is present:
  if (isDevanagari) {
    // If Marathi signals dominate or exist with no Hindi signals
    if (marathiScore > hindiScore) {
      return {
        code: "mr-IN",
        name: "Marathi",
        nativeName: "मराठी",
        confidence: Math.min(0.98, 0.75 + marathiScore * 0.05),
        isMixed: cleanTokens.some((t) => TECHNICAL_ENGLISH_TERMS.has(t) || /^[a-z]+$/i.test(t)),
        detectedSignals,
      };
    }

    if (hindiScore > marathiScore) {
      return {
        code: "hi-IN",
        name: "Hindi",
        nativeName: "हिन्दी",
        confidence: Math.min(0.98, 0.75 + hindiScore * 0.05),
        isMixed: cleanTokens.some((t) => TECHNICAL_ENGLISH_TERMS.has(t) || /^[a-z]+$/i.test(t)),
        detectedSignals,
      };
    }

    // Tie or no strong keyword in Devanagari:
    // If user previously spoke Marathi, lock to Marathi!
    if (normPrev === "mr-IN") {
      return {
        code: "mr-IN",
        name: "Marathi",
        nativeName: "मराठी",
        confidence: 0.85,
        isMixed: false,
        detectedSignals: ["context_preserved_marathi"],
      };
    }

    if (normPrev === "hi-IN") {
      return {
        code: "hi-IN",
        name: "Hindi",
        nativeName: "हिन्दी",
        confidence: 0.85,
        isMixed: false,
        detectedSignals: ["context_preserved_hindi"],
      };
    }

    // Default Devanagari fallback: Hindi
    return {
      code: "hi-IN",
      name: "Hindi",
      nativeName: "हिन्दी",
      confidence: 0.7,
      isMixed: false,
      detectedSignals: ["devanagari_default_hindi"],
    };
  }

  // Latin / Transliterated text:
  if (marathiScore > hindiScore && marathiScore > englishScore) {
    return {
      code: "mr-IN",
      name: "Marathi",
      nativeName: "मराठी",
      confidence: Math.min(0.95, 0.65 + marathiScore * 0.08),
      isMixed: true,
      detectedSignals,
    };
  }

  if (hindiScore > marathiScore && hindiScore > englishScore) {
    return {
      code: "hi-IN",
      name: "Hindi",
      nativeName: "हिन्दी",
      confidence: Math.min(0.95, 0.65 + hindiScore * 0.08),
      isMixed: true,
      detectedSignals,
    };
  }

  if (englishScore > 0 && englishScore >= marathiScore && englishScore >= hindiScore) {
    return {
      code: "en-IN",
      name: "English",
      nativeName: "English",
      confidence: Math.min(0.98, 0.7 + englishScore * 0.05),
      isMixed: false,
      detectedSignals,
    };
  }

  // If mostly technical terms (e.g. "hero section dark and minimal animations")
  // and no strong Indic grammar:
  if (cleanTokens.length === 0 || cleanTokens.every((t) => TECHNICAL_ENGLISH_TERMS.has(t) || t.length < 3)) {
    // PRESERVE previous language state! Technical terms never switch languages!
    if (normPrev) {
      return {
        code: normPrev,
        name: normPrev === "mr-IN" ? "Marathi" : normPrev === "hi-IN" ? "Hindi" : "English",
        nativeName: normPrev === "mr-IN" ? "मराठी" : normPrev === "hi-IN" ? "हिन्दी" : "English",
        confidence: 0.9,
        isMixed: true,
        detectedSignals: ["technical_terms_language_lock"],
      };
    }
    return {
      code: "en-IN",
      name: "English",
      nativeName: "English",
      confidence: 0.8,
      isMixed: false,
      detectedSignals: ["english_technical_default"],
    };
  }

  // Fallback: If previous language was provided, lock to it
  if (previousLanguageCode) {
    const lockedCode = (normPrev || "en-IN") as SupportedLanguageCode;
    return {
      code: lockedCode,
      name: lockedCode === "mr-IN" ? "Marathi" : lockedCode === "hi-IN" ? "Hindi" : "English",
      nativeName: lockedCode === "mr-IN" ? "मराठी" : lockedCode === "hi-IN" ? "हिन्दी" : "English",
      confidence: 0.75,
      isMixed: false,
      detectedSignals: ["low_confidence_previous_lock"],
    };
  }

  return {
    code: "en-IN",
    name: "English",
    nativeName: "English",
    confidence: 0.6,
    isMixed: false,
    detectedSignals: ["default_fallback"],
  };
}
