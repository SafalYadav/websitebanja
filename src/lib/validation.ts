/**
 * Validation utilities for phone and email addresses.
 */

export function validatePhone(phone: string): { isValid: boolean; error?: string; normalized: string } {
  const trimmed = phone.trim();
  if (!trimmed) {
    return { isValid: false, error: "Phone number is required.", normalized: "" };
  }

  // If missing '+', check if standard 10-digit or valid digits
  let formatted = trimmed;
  if (!formatted.startsWith("+")) {
    const rawDigits = formatted.replace(/[\s\-().]/g, "");
    if (/^[6-9]\d{9}$/.test(rawDigits)) {
      formatted = `+91${rawDigits}`;
    } else if (/^\d{10,14}$/.test(rawDigits)) {
      formatted = `+${rawDigits}`;
    } else {
      return {
        isValid: false,
        error: "Phone number must include country code starting with '+' (e.g. +919876543210, +14155552671).",
        normalized: trimmed,
      };
    }
  }

  // Normalize: remove internal spaces, hyphens, dots, parentheses
  const normalized = "+" + formatted.slice(1).replace(/[\s\-().]/g, "");

  // Check that all remaining characters are digits
  if (!/^\+[0-9]+$/.test(normalized)) {
    return {
      isValid: false,
      error: "Phone number can only contain digits after the '+' country code.",
      normalized,
    };
  }

  // E.164 ITU standard: minimum 7 digits (e.g. +1234567), maximum 15 digits
  const digitsOnly = normalized.slice(1);
  if (digitsOnly.length < 7 || digitsOnly.length > 15) {
    return {
      isValid: false,
      error: "Phone number must be between 7 and 15 digits including country code.",
      normalized,
    };
  }

  return { isValid: true, normalized };
}

export function validateEmail(email: string): { isValid: boolean; error?: string; normalized: string } {
  const normalized = email.trim().toLowerCase();
  if (!normalized) {
    return { isValid: false, error: "Email address is required.", normalized: "" };
  }

  // Robust email pattern checking local part, @, domain name, and valid TLD
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

  if (!emailRegex.test(normalized)) {
    return {
      isValid: false,
      error: "Please enter a valid email address (e.g. hello@business.com).",
      normalized,
    };
  }

  return { isValid: true, normalized };
}

export function validateUrl(url: string): { isValid: boolean; error?: string; normalized: string } {
  const trimmed = url.trim();
  if (!trimmed) {
    return { isValid: true, normalized: "" };
  }

  const lower = trimmed.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:") || lower.startsWith("vbscript:")) {
    return { isValid: false, error: "Unsafe URL format.", normalized: "" };
  }

  let testUrl = trimmed;
  if (!/^https?:\/\//i.test(trimmed)) {
    testUrl = "https://" + trimmed;
  }

  try {
    const parsed = new URL(testUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { isValid: false, error: "URL must use http or https protocol.", normalized: "" };
    }
    if (!parsed.hostname || !parsed.hostname.includes(".")) {
      return { isValid: false, error: "Please enter a valid website domain.", normalized: "" };
    }
    return { isValid: true, normalized: parsed.href };
  } catch {
    return { isValid: false, error: "Invalid website URL format.", normalized: "" };
  }
}

export interface SanitizedBusinessInputs {
  businessName: string;
  category: string;
  description: string;
  targetAudience?: string;
  style?: string;
  primaryColor?: string;
  secondaryColor?: string;
  phone?: string;
  email?: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  address?: string;
}

export function validateBusinessInputs(raw: unknown): { isValid: boolean; error?: string; data?: SanitizedBusinessInputs } {
  if (!raw || typeof raw !== "object") {
    return { isValid: false, error: "Invalid JSON request payload." };
  }

  const obj = raw as Record<string, unknown>;

  const businessName = typeof obj.businessName === "string" ? obj.businessName.trim() : "";
  if (!businessName) {
    return { isValid: false, error: "Business name is required." };
  }
  if (businessName.length > 200) {
    return { isValid: false, error: "Business name cannot exceed 200 characters." };
  }

  const category = typeof obj.category === "string" ? obj.category.trim() : "";
  if (!category) {
    return { isValid: false, error: "Business category is required." };
  }
  if (category.length > 100) {
    return { isValid: false, error: "Business category cannot exceed 100 characters." };
  }

  const description = typeof obj.description === "string" ? obj.description.trim() : "";
  if (!description) {
    return { isValid: false, error: "Business description is required." };
  }
  if (description.length > 3000) {
    return { isValid: false, error: "Business description cannot exceed 3000 characters." };
  }

  const targetAudience = typeof obj.targetAudience === "string" ? obj.targetAudience.trim().slice(0, 500) : "";
  const style = typeof obj.style === "string" ? obj.style.trim().slice(0, 100) : "";
  const primaryColor = typeof obj.primaryColor === "string" ? obj.primaryColor.trim().slice(0, 100) : "";
  const secondaryColor = typeof obj.secondaryColor === "string" ? obj.secondaryColor.trim().slice(0, 100) : "";
  const website = typeof obj.website === "string" ? obj.website.trim().slice(0, 300) : "";
  const instagram = typeof obj.instagram === "string" ? obj.instagram.trim().slice(0, 100) : "";
  const facebook = typeof obj.facebook === "string" ? obj.facebook.trim().slice(0, 100) : "";
  const address = typeof obj.address === "string" ? obj.address.trim().slice(0, 500) : "";

  let normalizedPhone = "";
  if (typeof obj.phone === "string" && obj.phone.trim()) {
    const phoneCheck = validatePhone(obj.phone);
    if (!phoneCheck.isValid) {
      return { isValid: false, error: phoneCheck.error };
    }
    normalizedPhone = phoneCheck.normalized;
  }

  let normalizedEmail = "";
  if (typeof obj.email === "string" && obj.email.trim()) {
    const emailCheck = validateEmail(obj.email);
    if (!emailCheck.isValid) {
      return { isValid: false, error: emailCheck.error };
    }
    normalizedEmail = emailCheck.normalized;
  }

  return {
    isValid: true,
    data: {
      businessName,
      category,
      description,
      targetAudience,
      style,
      primaryColor,
      secondaryColor,
      phone: normalizedPhone,
      email: normalizedEmail,
      website,
      instagram,
      facebook,
      address,
    },
  };
}
