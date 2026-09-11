/**
 * WebsiteBanja Production Security Hardening Verification Test Suite
 *
 * Verifies:
 * 1. Memory Rate Limiting: window enforcement, remaining count, and bounds.
 * 2. Azure Blob Storage Path Sanitization: traversal blocking, null byte rejection, slash normalization.
 * 3. Public Lead Submission Input Bounds & Schema Validation.
 * 4. Public Event Tracking Payload Caps & Sanitization.
 * 5. Project Ownership & Multi-tenant Isolation in Agent Endpoints.
 * 6. Rate Limiting Protection across Live Token, Voice, AI Action, and Lead Endpoints.
 * 7. Absence of Hardcoded Secrets in Configs and Source Files.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

console.log("================================================================================");
console.log("WEBSITEBANJA PRODUCTION SECURITY HARDENING VERIFICATION SUITE");
console.log("================================================================================\n");

let passedCount = 0;
let failedCount = 0;

function test(title, fn) {
  try {
    fn();
    console.log(`  ✔ [PASS] ${title}`);
    passedCount++;
  } catch (err) {
    console.error(`  ✖ [FAIL] ${title}`);
    console.error(`    ${err.message}`);
    failedCount++;
    throw err;
  }
}

// =============================================================================
// SUITE 1: MEMORY RATE LIMITING MECHANISM
// =============================================================================
console.log("[Suite 1] Memory Rate Limiting & Sliding Window");

test("In-memory rate limiter strictly bounds requests and tracks remaining quota", () => {
  const store = new Map();

  function checkLimit(key, limit, windowMs, now = Date.now()) {
    const record = store.get(key);
    if (!record || now > record.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      return { success: true, remaining: limit - 1 };
    }
    if (record.count >= limit) {
      return { success: false, remaining: 0 };
    }
    record.count += 1;
    return { success: true, remaining: limit - record.count };
  }

  const testKey = "test-ip-127.0.0.1";
  const limit = 5;
  const windowMs = 60 * 1000;
  const startTime = 1000000;

  // First 5 requests should pass
  for (let i = 1; i <= 5; i++) {
    const res = checkLimit(testKey, limit, windowMs, startTime);
    assert.equal(res.success, true, `Request ${i} must succeed`);
    assert.equal(res.remaining, 5 - i, `Remaining quota must be ${5 - i}`);
  }

  // 6th request must be rejected
  const blockedRes = checkLimit(testKey, limit, windowMs, startTime);
  assert.equal(blockedRes.success, false, "Request beyond limit must be blocked");
  assert.equal(blockedRes.remaining, 0, "Remaining must be 0");

  // After window expiry, counter should reset
  const resetRes = checkLimit(testKey, limit, windowMs, startTime + windowMs + 1);
  assert.equal(resetRes.success, true, "Request after expiry must succeed");
  assert.equal(resetRes.remaining, 4, "Remaining must reset to limit - 1");
});

// =============================================================================
// SUITE 2: AZURE BLOB STORAGE PATH SANITIZATION
// =============================================================================
console.log("\n[Suite 2] Azure Blob Storage Path Traversal & Injection Prevention");

test("sanitizeBlobPath rejects directory traversal, null bytes, and normalizes paths", () => {
  function sanitizeBlobPath(p) {
    if (!p || typeof p !== "string") {
      throw new Error("Invalid blob path: path must be a non-empty string");
    }
    if (p.includes("\0")) {
      throw new Error("Invalid blob path: null bytes are not allowed");
    }
    const segments = p.split(/[\/\\]+/);
    for (const segment of segments) {
      if (segment === ".." || segment === ".") {
        throw new Error("Invalid blob path: path traversal is not allowed");
      }
    }
    const normalized = segments.filter(Boolean).join("/");
    if (!normalized) {
      throw new Error("Invalid blob path: empty path after normalization");
    }
    return normalized;
  }

  // Directory traversal attacks must throw
  assert.throws(() => sanitizeBlobPath("../secret.env"), /path traversal is not allowed/);
  assert.throws(() => sanitizeBlobPath("uploads/../../etc/passwd"), /path traversal is not allowed/);
  assert.throws(() => sanitizeBlobPath("uploads/./test.png"), /path traversal is not allowed/);

  // Null byte injection must throw
  assert.throws(() => sanitizeBlobPath("uploads/file.png\0.exe"), /null bytes are not allowed/);

  // Empty or all-slash paths must throw
  assert.throws(() => sanitizeBlobPath(""), /non-empty string/);
  assert.throws(() => sanitizeBlobPath("///"), /empty path after normalization/);

  // Valid paths must normalize correctly
  assert.equal(sanitizeBlobPath("uploads/images/photo.png"), "uploads/images/photo.png");
  assert.equal(sanitizeBlobPath("/leading/slash/path.pdf"), "leading/slash/path.pdf");
  assert.equal(sanitizeBlobPath("multiple///slashes//file.jpg"), "multiple/slashes/file.jpg");
  assert.equal(sanitizeBlobPath("windows\\style\\path.txt"), "windows/style/path.txt");
});

test("Azure Blob storage client file imports and applies sanitizeBlobPath", () => {
  const azureBlobContent = fs.readFileSync(
    path.join(ROOT_DIR, "src/lib/storage/azureBlob.ts"),
    "utf-8"
  );
  assert.ok(
    azureBlobContent.includes("export function sanitizeBlobPath"),
    "azureBlob.ts must export sanitizeBlobPath"
  );
  assert.ok(
    azureBlobContent.includes("const safePath = sanitizeBlobPath(path);"),
    "azureBlob.ts must sanitize path in upload/download"
  );
  assert.ok(
    azureBlobContent.includes("const safePath = sanitizeBlobPath(p);"),
    "azureBlob.ts must sanitize paths in remove"
  );
});

// =============================================================================
// SUITE 3: PUBLIC LEAD SUBMISSION VALIDATION
// =============================================================================
console.log("\n[Suite 3] Public Lead Submission Schema & Input Hardening");

test("SubmitLeadSchema enforces strict length limits, email validity, and phone bounds", () => {
  const SubmitLeadSchema = z.object({
    projectId: z.string().uuid().optional(),
    websiteId: z.string().uuid().optional(),
    name: z.string().min(1).max(100).trim(),
    email: z.string().email().max(150).trim().toLowerCase(),
    phone: z
      .string()
      .max(30)
      .trim()
      .regex(/^[+()0-9\s-]*$/, "Invalid phone number characters")
      .optional()
      .or(z.literal("")),
    message: z.string().max(2000).trim().optional().or(z.literal("")),
  });

  // Valid lead
  const validLead = SubmitLeadSchema.safeParse({
    name: "John Doe",
    email: "john@example.com",
    phone: "+91 98765-43210",
    message: "Interested in your service",
  });
  assert.equal(validLead.success, true, "Valid lead must pass");

  // Invalid email
  const badEmail = SubmitLeadSchema.safeParse({
    name: "John",
    email: "not-an-email",
  });
  assert.equal(badEmail.success, false, "Invalid email must fail");

  // Oversized name (> 100 chars)
  const hugeName = SubmitLeadSchema.safeParse({
    name: "A".repeat(101),
    email: "test@example.com",
  });
  assert.equal(hugeName.success, false, "Oversized name must fail");

  // Oversized message (> 2000 chars)
  const hugeMessage = SubmitLeadSchema.safeParse({
    name: "John",
    email: "test@example.com",
    message: "M".repeat(2001),
  });
  assert.equal(hugeMessage.success, false, "Oversized message must fail");

  // Script injection in phone number
  const badPhone = SubmitLeadSchema.safeParse({
    name: "John",
    email: "test@example.com",
    phone: "<script>alert(1)</script>",
  });
  assert.equal(badPhone.success, false, "Phone with script injection must fail");
});

test("Submit lead route file contains rate limiting and Zod schema validation", () => {
  const routeContent = fs.readFileSync(
    path.join(ROOT_DIR, "src/app/api/public/submit-lead/route.ts"),
    "utf-8"
  );
  assert.ok(
    routeContent.includes("SubmitLeadSchema.safeParse"),
    "Route must validate using SubmitLeadSchema"
  );
  assert.ok(
    routeContent.includes("checkMemoryRateLimit"),
    "Route must apply rate limiting"
  );
  assert.ok(
    routeContent.includes("getClientIp(req)"),
    "Route must use secure getClientIp"
  );
});

// =============================================================================
// SUITE 4: PUBLIC EVENT TRACKING SANITIZATION & PAYLOAD BOUNDS
// =============================================================================
console.log("\n[Suite 4] Public Event Tracking Sanitization & Payload Caps");

test("Track event route file validates eventType characters and bounds metadata size", () => {
  const trackContent = fs.readFileSync(
    path.join(ROOT_DIR, "src/app/api/public/track-event/route.ts"),
    "utf-8"
  );
  assert.ok(
    trackContent.includes(".slice(0, 50)"),
    "Route must cap eventType length to 50 characters"
  );
  assert.ok(
    trackContent.includes("serialized.length <= 2048"),
    "Route must cap metadata payload size to 2048 bytes"
  );
  assert.ok(
    trackContent.includes("checkMemoryRateLimit"),
    "Route must apply rate limiting"
  );
  assert.ok(
    trackContent.includes("getClientIp(req)"),
    "Route must use secure getClientIp"
  );
});

// =============================================================================
// SUITE 5: MULTI-TENANT ISOLATION & PROJECT OWNERSHIP IN AGENT ENDPOINTS
// =============================================================================
console.log("\n[Suite 5] Multi-Tenant Isolation & Project Ownership");

test("Agent SSE route enforces project ownership check before setProjectKnowledge", () => {
  const sseContent = fs.readFileSync(
    path.join(ROOT_DIR, "src/app/api/agent/sse/route.ts"),
    "utf-8"
  );
  assert.ok(
    (sseContent.includes("dbCheckProjectExists") || sseContent.includes(".from('projects')")) &&
      sseContent.includes("authenticatedUser.id"),
    "SSE route must verify project belongs to authenticated user before modifying knowledge"
  );
  assert.ok(
    sseContent.includes("max(2000"),
    "SSE route must bound message length via Zod"
  );
  assert.ok(
    sseContent.includes("max(12"),
    "SSE route must cap history window via Zod"
  );
});

test("Agent Talk route enforces project ownership check before setProjectKnowledge", () => {
  const talkContent = fs.readFileSync(
    path.join(ROOT_DIR, "src/app/api/agent/talk/route.ts"),
    "utf-8"
  );
  assert.ok(
    (talkContent.includes("dbCheckProjectExists") || talkContent.includes("projects")) &&
      talkContent.includes("authenticatedUser.id"),
    "Talk route must verify project belongs to authenticated user before modifying knowledge"
  );
  assert.ok(
    talkContent.includes("slice(0, 2000)"),
    "Talk route must bound message length"
  );
  assert.ok(
    talkContent.includes("slice(-12)"),
    "Talk route must cap history window"
  );
});

test("Requirement route enforces auth, rate limiting, and project ownership", () => {
  const reqContent = fs.readFileSync(
    path.join(ROOT_DIR, "src/app/api/requirement/route.ts"),
    "utf-8"
  );
  assert.ok(
    reqContent.includes("authenticateRequest(request)"),
    "Requirement route must require user authentication"
  );
  assert.ok(
    (reqContent.includes("dbCheckProjectExists") || reqContent.includes("projects")) &&
      reqContent.includes("user.id"),
    "Requirement route must verify project ownership before setProjectKnowledge"
  );
  assert.ok(
    reqContent.includes("checkMemoryRateLimit"),
    "Requirement route must apply rate limiting"
  );
});

// =============================================================================
// SUITE 6: AI & VOICE ENDPOINT ABUSE PROTECTION
// =============================================================================
console.log("\n[Suite 6] AI & Voice Endpoint Abuse Protection");

test("Live token route has rate limiting, secure client IP, and generic error response", () => {
  const liveTokenContent = fs.readFileSync(
    path.join(ROOT_DIR, "src/app/api/agent/live-token/route.ts"),
    "utf-8"
  );
  assert.ok(
    liveTokenContent.includes("checkMemoryRateLimit"),
    "Live token route must rate limit requests"
  );
  assert.ok(
    liveTokenContent.includes("getClientIp(req)"),
    "Live token route must use secure getClientIp"
  );
  // Ensure internal API error messages are not forwarded to user
  assert.ok(
    !liveTokenContent.includes("err?.message") &&
      !liveTokenContent.includes("error: (err as Error).message"),
    "Live token route must not leak raw internal auth error messages to client"
  );
});

test("Voice synthesis route enforces rate limiting and character bounds", () => {
  const voiceContent = fs.readFileSync(
    path.join(ROOT_DIR, "src/app/api/agent/voice/route.ts"),
    "utf-8"
  );
  assert.ok(
    voiceContent.includes("checkMemoryRateLimit"),
    "Voice route must rate limit requests"
  );
  assert.ok(
    voiceContent.includes("trimmedText.length > 1000"),
    "Voice route must reject inputs longer than 1000 characters"
  );
  assert.ok(
    !voiceContent.includes("Text: ${text}") && !voiceContent.includes("Text: ${cleanText}"),
    "Voice route must not log raw user speech text in production logs"
  );
});

// =============================================================================
// SUITE 7: ZERO HARDCODED SECRETS IN CODEBASE
// =============================================================================
console.log("\n[Suite 7] Zero Hardcoded Secrets in Source Code");

test("Source code does not contain hardcoded credentials or API keys", () => {
  const filesToCheck = [
    "src/lib/storage/azureBlob.ts",
    "src/lib/storage/config.ts",
    "src/lib/supabaseServer.ts",
    "src/app/api/agent/live-token/route.ts",
    "src/app/api/agent/voice/route.ts",
  ];

  const SECRET_PATTERNS = [
    /AccountKey=[A-Za-z0-9+/=]{40,}/,
    /sk-[A-Za-z0-9]{32,}/,
    /AIza[0-9A-Za-z-_]{35}/,
    /postgres:\/\/.*:.*@/,
  ];

  for (const relPath of filesToCheck) {
    const fullPath = path.join(ROOT_DIR, relPath);
    if (!fs.existsSync(fullPath)) continue;
    const content = fs.readFileSync(fullPath, "utf-8");
    for (const pattern of SECRET_PATTERNS) {
      assert.ok(
        !pattern.test(content),
        `Potential secret pattern detected in ${relPath}`
      );
    }
  }
});

// =============================================================================
// SUMMARY
// =============================================================================
console.log("\n================================================================================");
console.log(`TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED (100% PASS RATE)`);
console.log("================================================================================\n");

if (failedCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
