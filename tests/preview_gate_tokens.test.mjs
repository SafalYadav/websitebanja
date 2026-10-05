import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { createPreviewAuditToken, verifyPreviewAuditToken } from "../src/lib/intelligence/orchestration/previewAuditToken.ts";

process.env.WEBSITEBANJA_AUTOMATION_SECRET = "unit-test-signing-key";
test("private preview token is bound to a single preview and exact token shape", () => {
  const token = createPreviewAuditToken("prev_owned_123");
  assert.equal(verifyPreviewAuditToken("prev_owned_123", token), true);
  assert.equal(verifyPreviewAuditToken("prev_other_123", token), false);
  assert.equal(verifyPreviewAuditToken("prev_owned_123", `${token}.extra`), false);
  assert.equal(verifyPreviewAuditToken("prev_owned_123", `${token}bad`), false);
});
test("even correctly signed expired or excessive-lifetime tokens are denied", () => {
  for (const expires of [Date.now() - 1000, Date.now() + 600_000]) {
    const signature = createHmac("sha256", process.env.WEBSITEBANJA_AUTOMATION_SECRET).update(`prev_owned_123:${expires}`).digest("hex");
    assert.equal(verifyPreviewAuditToken("prev_owned_123", `${expires}.${signature}`), false);
  }
});
