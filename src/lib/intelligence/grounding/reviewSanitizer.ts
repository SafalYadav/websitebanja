// src/lib/intelligence/grounding/reviewSanitizer.ts
// Phase 20A — Review Sanitization & Prompt Injection Defense
// Protects website generation and LLM context from untrusted external review text.

export interface ReviewSanitizationResult {
  isSafe: boolean;
  sanitizedText: string;
  sanitizedAuthor: string;
  flaggedPatterns: string[];
  rejectionReason?: string;
}

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
  /disregard\s+(all\s+)?(previous|prior|above)\s+instructions/i,
  /you\s+are\s+now\s+(an?|the)\b/i,
  /system\s*:\s*/i,
  /assistant\s*:\s*/i,
  /user\s*:\s*/i,
  /\[system\]/i,
  /\[instructions?\]/i,
  /```(json|xml|html|bash|javascript|typescript|python)?/i,
  /<script\b[^>]*>/i,
  /<iframe\b[^>]*>/i,
  /javascript\s*:/i,
  /eval\s*\(/i,
  /prompt\s*injection/i,
  /jailbreak/i,
];

/**
 * Sanitizes external review text to prevent prompt injection and XSS.
 * Returns safe text or flags unsafe review.
 */
export function sanitizeReview(
  rawText: string,
  rawAuthor?: string,
  maxLength: number = 360
): ReviewSanitizationResult {
  const text = (rawText || "").trim();
  const author = (rawAuthor || "Verified Customer").trim();
  const flagged: string[] = [];

  if (!text) {
    return {
      isSafe: false,
      sanitizedText: "",
      sanitizedAuthor: author,
      flaggedPatterns: ["EMPTY_TEXT"],
      rejectionReason: "Review text is empty",
    };
  }

  // Check for prompt injection patterns
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(text) || pattern.test(author)) {
      flagged.push(pattern.source);
    }
  }

  if (flagged.length > 0) {
    return {
      isSafe: false,
      sanitizedText: "",
      sanitizedAuthor: author,
      flaggedPatterns: flagged,
      rejectionReason: `Review flagged for potential prompt injection or malicious pattern: ${flagged.join(", ")}`,
    };
  }

  // Strip all HTML tags
  let cleanedText = text
    .replace(/<[^>]*>/g, "")
    .replace(/[\\`${}]/g, "") // Escape template string/formatting tokens
    .replace(/\s+/g, " ")
    .trim();

  // Strip HTML from author
  let cleanedAuthor = author
    .replace(/<[^>]*>/g, "")
    .replace(/[\\`${}]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleanedAuthor) {
    cleanedAuthor = "Verified Customer";
  }

  // Truncate to reasonable length with ellipsis
  if (cleanedText.length > maxLength) {
    cleanedText = cleanedText.slice(0, maxLength).trim() + "…";
  }

  return {
    isSafe: true,
    sanitizedText: cleanedText,
    sanitizedAuthor: cleanedAuthor,
    flaggedPatterns: [],
  };
}
