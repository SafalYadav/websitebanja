// src/lib/intelligence/learningLoop/promptInjectionGuard.ts
// Phase 27 — Learning Loop: Prompt Injection Defense
//
// Invariant: External website text, reviews, user feedback, and model outputs
// are raw data payloads only, NEVER executive meta-instructions.
//
// This guard detects and strips adversarial prompts, prompt overrides,
// jailbreaks, and executable script payloads before they can enter the
// learning loop or candidate lessons.

import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";

export interface SanitizedContentResult {
  safeText: string;
  injectionDetected: boolean;
  patternsNeutralized: string[];
}

const INJECTION_PATTERNS: Array<{ pattern: RegExp; description: string }> = [
  { pattern: /ignore\s+(?:all\s+)?(?:previous|prior)\s+instructions/gi, description: "instruction_override" },
  { pattern: /system\s*(?:prompt|directive|override|command)\s*:/gi, description: "system_prompt_spoofing" },
  { pattern: /you\s+are\s+now\s+(?:an?\s+)?(?:admin|root|godmode|dan|unrestricted|jailbreak)/gi, description: "persona_hijack" },
  { pattern: /\[(?:admin|system|root|override|bypass)\]/gi, description: "meta_tag_injection" },
  { pattern: /prompt\s*injection/gi, description: "injection_keyword" },
  { pattern: /disregard\s+(?:safety|rules|constraints|policy)/gi, description: "constraint_bypass" },
  { pattern: /<script[\s\S]*?>[\s\S]*?<\/script>/gi, description: "script_tag" },
  { pattern: /javascript\s*:/gi, description: "javascript_uri" },
  { pattern: /exec\s*\([\s\S]*?\)/gi, description: "code_execution" },
  { pattern: /eval\s*\([\s\S]*?\)/gi, description: "eval_call" },
  { pattern: /drop\s+table|delete\s+from\s+strategies/gi, description: "sql_destructive_command" },
];

/**
 * Sanitizes external text to prevent prompt injection and scrubs sensitive tokens.
 */
export function sanitizeLearningInput(rawText: string | undefined | null): SanitizedContentResult {
  if (!rawText || typeof rawText !== "string") {
    return {
      safeText: "",
      injectionDetected: false,
      patternsNeutralized: [],
    };
  }

  // 1. Scrub API keys, bearer tokens, passwords
  let sanitized = sanitizeErrorOutput(rawText);

  const neutralized: string[] = [];
  let injectionDetected = false;

  // 2. Scan for and neutralize prompt injection attempts
  for (const { pattern, description } of INJECTION_PATTERNS) {
    if (pattern.test(sanitized)) {
      injectionDetected = true;
      neutralized.push(description);
      sanitized = sanitized.replace(pattern, `[NEUTRALIZED_${description.toUpperCase()}]`);
    }
  }

  // 3. Strip raw HTML tags
  sanitized = sanitized.replace(/<[^>]+>/g, " ");

  // 4. Normalize multiple whitespaces
  sanitized = sanitized.replace(/\s+/g, " ").trim();

  return {
    safeText: sanitized,
    injectionDetected,
    patternsNeutralized: neutralized,
  };
}
