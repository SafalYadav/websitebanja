// tests/automation_tenant_config.test.mjs
/**
 * WebsiteBanja Automation Tenant Configuration & Security Isolation Tests
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  validateAutomationTenantConfig,
  parseAuthorizedAdminUserIds,
  CANONICAL_ADMIN_USER_IDS,
} from "../scripts/configure_azure_razorpay.mjs";

describe("Automation Tenant Configuration & Authorization Guardrails", () => {
  const validAdminTenant = "a0d29ad3-4c93-4bcd-a4d0-b45804017cf2"; // Canonical bootstrap admin
  const anotherAdminTenant = "cceafe47-a710-49e9-a894-16f592dc8e64";

  it("1. Absent AUTOMATION_TENANT_ID throws when automation secret is present", () => {
    const env = {
      WEBSITEBANJA_AUTOMATION_SECRET: "secret-abc",
      AUTOMATION_TENANT_ID: "",
    };

    assert.throws(
      () => validateAutomationTenantConfig(env),
      /AUTOMATION_TENANT_ID must be explicitly configured when automation is enabled/
    );
  });

  it("2. Absent AUTOMATION_TENANT_ID throws when automation enabled flag is true", () => {
    const env = {
      WEBSITEBANJA_AUTOMATION_ENABLED: "true",
      AUTOMATION_TENANT_ID: undefined,
    };

    assert.throws(
      () => validateAutomationTenantConfig(env),
      /Selecting a tenant from admin ordering or a hardcoded UUID fallback is prohibited/
    );
  });

  it("3. Non-UUID format for AUTOMATION_TENANT_ID is strictly rejected", () => {
    const env = {
      WEBSITEBANJA_AUTOMATION_SECRET: "secret-abc",
      AUTOMATION_TENANT_ID: "not-a-valid-uuid",
    };

    assert.throws(
      () => validateAutomationTenantConfig(env),
      /must be a valid UUID format/
    );
  });

  it("4. Valid UUID format that is NOT an authorized administrator is strictly rejected", () => {
    const unauthorizedUuid = "00000000-0000-0000-0000-000000000000";
    const env = {
      WEBSITEBANJA_AUTOMATION_SECRET: "secret-abc",
      AUTOMATION_TENANT_ID: unauthorizedUuid,
      ADMIN_USER_IDS: `${validAdminTenant},${anotherAdminTenant}`,
    };

    assert.throws(
      () => validateAutomationTenantConfig(env),
      /is not present in authorized ADMIN_USER_IDS allowlist/
    );
  });

  it("5. Explicit, authorized AUTOMATION_TENANT_ID successfully validates", () => {
    const env = {
      WEBSITEBANJA_AUTOMATION_SECRET: "secret-abc",
      AUTOMATION_TENANT_ID: validAdminTenant,
    };

    const validated = validateAutomationTenantConfig(env);
    assert.equal(validated, validAdminTenant);
  });

  it("6. Custom authorized tenant in ADMIN_USER_IDS successfully validates", () => {
    const customTenant = "12345678-1234-1234-1234-123456789abc";
    const env = {
      WEBSITEBANJA_AUTOMATION_SECRET: "secret-abc",
      AUTOMATION_TENANT_ID: customTenant,
      ADMIN_USER_IDS: `${validAdminTenant},${customTenant}`,
    };

    const validated = validateAutomationTenantConfig(env);
    assert.equal(validated, customTenant);
  });

  it("7. When automation is disabled and tenant is not set, returns null without error", () => {
    const env = {
      WEBSITEBANJA_AUTOMATION_SECRET: "",
      AUTOMATION_SECRET: "",
      WEBSITEBANJA_AUTOMATION_ENABLED: "false",
      AUTOMATION_TENANT_ID: "",
    };

    const validated = validateAutomationTenantConfig(env);
    assert.equal(validated, null);
  });

  it("8. parseAuthorizedAdminUserIds merges canonical defaults with custom environment list", () => {
    const customId = "99999999-9999-9999-9999-999999999999";
    const env = {
      ADMIN_USER_IDS: ` ${customId} , ${validAdminTenant} `,
    };

    const ids = parseAuthorizedAdminUserIds(env);
    assert.ok(ids.includes(customId));
    assert.ok(ids.includes(validAdminTenant));
    for (const canonical of CANONICAL_ADMIN_USER_IDS) {
      assert.ok(ids.includes(canonical));
    }
  });
});
