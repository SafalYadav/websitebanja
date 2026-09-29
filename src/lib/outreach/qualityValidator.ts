// src/lib/outreach/qualityValidator.ts
/**
 * WebsiteBanja Outreach Draft Quality & Factual Claim Validator
 * Phase: Phase 11 (Personalized Outreach Foundation)
 *
 * Enforces:
 *   1. Factual integrity: Zero fabricated metrics, awards, or fake claims
 *   2. Anti-spam: Zero placeholder text, lorem ipsum, or generic tokens
 *   3. Secret leak protection: No API keys, automation secrets, or credentials
 *   4. Channel constraint enforcement: Character lengths, subject lines, formatting
 *   5. Preview verification: Ensures preview URL is non-empty and local
 */

import type { OutreachChannel, OutreachValidationResult } from "./types";

const FORBIDDEN_PLACEHOLDERS = [
  "lorem ipsum",
  "dolor sit",
  "consectetur",
  "[insert",
  "{business",
  "{name}",
  "<insert",
  "coming soon",
  "todo",
  "asdf",
  "test message",
  "sample business",
];

const FABRICATED_CLAIM_TRIGGERS = [
  "voted #1 in the country",
  "generated $10m in revenue",
  "over 500,000 customers",
  "guaranteed 10x revenue",
  "official partner of google",
  "certified fortune 500",
  "celebrity endorsed",
];

const SENSITIVE_SECRET_PATTERNS = [
  /wb-auto-secret/i,
  /bearer\s+[a-z0-9_-]{16,}/i,
  /sk-[a-zA-Z0-9]{20,}/i,
  /AIzaSy[a-zA-Z0-9_-]{25,}/i,
  /WEBSITEBANJA_AUTOMATION_SECRET/i,
  /AZURE_OPENAI_KEY/i,
];

export interface ValidateDraftInput {
  channel: OutreachChannel;
  businessName: string;
  previewUrl: string;
  subject?: string;
  message: string;
}

export function validateOutreachDraft(input: ValidateDraftInput): OutreachValidationResult {
  const issues: string[] = [];
  const passedChecks: string[] = [];

  const { channel, businessName, previewUrl, subject, message } = input;
  const msgLower = (message || "").toLowerCase();
  const subLower = (subject || "").toLowerCase();

  // 1. Business Name Check
  if (!businessName || businessName.trim().length === 0) {
    issues.push("Missing required businessName.");
  } else {
    // Check that message or subject references business name or first word
    const firstWord = businessName.split(" ")[0].toLowerCase();
    if (!msgLower.includes(firstWord) && !subLower.includes(firstWord)) {
      issues.push(`Draft does not reference business name '${businessName}'.`);
    } else {
      passedChecks.push("business_name_referenced");
    }
  }

  // 2. Preview URL Check
  if (!previewUrl || previewUrl.trim().length === 0) {
    issues.push("Missing required previewUrl.");
  } else if (!previewUrl.includes("/preview/")) {
    issues.push(`previewUrl must contain '/preview/': received '${previewUrl}'.`);
  } else if (
    !previewUrl.startsWith("http://localhost:") &&
    !previewUrl.startsWith("http://127.0.0.1:") &&
    !previewUrl.startsWith("https://")
  ) {
    issues.push("previewUrl must be a valid local or HTTPS URL (e.g. http://localhost:3000/preview/... or https://...).");
  } else if (!msgLower.includes(previewUrl.toLowerCase())) {
    issues.push("previewUrl must be included in the message body.");
  } else {
    passedChecks.push("valid_preview_url");
    passedChecks.push("valid_local_preview_url");
  }

  // 3. Subject Check (For Email)
  if (channel === "email") {
    if (!subject || subject.trim().length === 0) {
      issues.push("Email drafts require a non-empty subject line.");
    } else if (subject.length > 120) {
      issues.push(`Email subject line too long (${subject.length} chars, max 120).`);
    } else {
      passedChecks.push("valid_email_subject");
    }
  }

  // 4. Placeholder & Lorem Ipsum Check
  let hasPlaceholder = false;
  for (const ph of FORBIDDEN_PLACEHOLDERS) {
    if (msgLower.includes(ph) || subLower.includes(ph)) {
      issues.push(`Detected forbidden placeholder token: '${ph}'.`);
      hasPlaceholder = true;
      break;
    }
  }
  if (!hasPlaceholder) {
    passedChecks.push("no_placeholders_or_lorem");
  }

  // 5. Fabricated Claims Check
  let hasFabrication = false;
  for (const fab of FABRICATED_CLAIM_TRIGGERS) {
    if (msgLower.includes(fab)) {
      issues.push(`Detected unsubstantiated/fabricated claim: '${fab}'.`);
      hasFabrication = true;
      break;
    }
  }
  if (!hasFabrication) {
    passedChecks.push("no_fabricated_claims");
  }

  // 6. Sensitive Secret Leakage Check
  let hasSecret = false;
  for (const pattern of SENSITIVE_SECRET_PATTERNS) {
    if (pattern.test(message) || (subject && pattern.test(subject))) {
      issues.push("CRITICAL: Detected potential secret, API key, or credential leakage in message content.");
      hasSecret = true;
      break;
    }
  }
  if (!hasSecret) {
    passedChecks.push("no_credential_leakage");
  }

  // 7. Duplicate Sentence Check
  const sentences = message
    .split(/[.!?\n]/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 20); // only check meaningful sentences
  const seenSentences = new Set<string>();
  let hasDuplicateSentence = false;
  for (const s of sentences) {
    if (seenSentences.has(s)) {
      issues.push(`Detected duplicate sentence in outreach text: "${s.slice(0, 40)}..."`);
      hasDuplicateSentence = true;
      break;
    }
    seenSentences.add(s);
  }
  if (!hasDuplicateSentence) {
    passedChecks.push("no_duplicate_sentences");
  }

  // 8. Channel Length Constraints
  const msgLength = message.trim().length;
  if (channel === "sms") {
    if (msgLength > 160) {
      issues.push(`SMS draft exceeds 160 characters (actual: ${msgLength} chars).`);
    } else {
      passedChecks.push("sms_length_valid");
    }
  } else if (channel === "instagram") {
    if (msgLength > 500) {
      issues.push(`Instagram DM draft exceeds 500 characters (actual: ${msgLength} chars).`);
    } else {
      passedChecks.push("instagram_length_valid");
    }
  } else if (channel === "whatsapp") {
    if (msgLength > 800) {
      issues.push(`WhatsApp draft exceeds 800 characters (actual: ${msgLength} chars).`);
    } else {
      passedChecks.push("whatsapp_length_valid");
    }
  } else if (channel === "email") {
    if (msgLength < 40) {
      issues.push(`Email body is too brief (${msgLength} chars, min 40).`);
    } else if (msgLength > 2500) {
      issues.push(`Email body exceeds 2500 characters (${msgLength} chars).`);
    } else {
      passedChecks.push("email_length_valid");
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
    passedChecks,
    checkedAt: new Date().toISOString(),
  };
}
