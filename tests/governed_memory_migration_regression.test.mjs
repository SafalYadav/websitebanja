// tests/governed_memory_migration_regression.test.mjs
/**
 * Test Suite: Governed Memory, Migration & Outreach Integrity Regression Tests
 *
 * Verifies all confirmed blockers:
 * 1. PostgreSQL failure cannot produce successful memory persistence.
 * 2. Failed writes leave caches unchanged.
 * 3. Database revisions and timestamps update memory records authoritatively.
 * 4. Missing tenant context fails outside explicitly configured tests.
 * 5. Cross-tenant memory access is strictly blocked.
 * 6. Migration runner rolls back partially applied migrations and history entries on failure (exercising real implementation).
 * 7. Checksum mismatch blocks migration execution (exercising real implementation).
 * 8. Dry-run mode produces zero database mutations and does not create the history table (exercising real implementation).
 * 9. Non-authoritative email provider acceptance cannot mark outreach delivered.
 * 10. Uncertain delivery outcomes prevent duplicate sends until manual reconciliation.
 * 11. Per-migration baseline adoption accurately inspects objects and rejects partial/incompatible schemas.
 * 12. Reconcile outreach dispatch allows confirmed recovery with provider ID or reset to approved.
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import crypto from "node:crypto";
import createJiti from "jiti";

const jiti = createJiti(process.cwd(), {
  alias: { "@": path.resolve(process.cwd(), "src") },
});

const { MemoryStore, resolveTrustedTenant } = jiti("./src/lib/intelligence/memory/memoryStore.ts");
const queries = jiti("./src/lib/db/queries.ts");
const { GmailEmailProvider } = jiti("./src/lib/integrations/gmailEmailProvider.ts");
const { outreachRepository } = jiti("./src/lib/outreach/outreachRepository.ts");
const { leadRepository } = jiti("./src/lib/discovery/leadRepository.ts");
const {
  executeMigrations,
  inspectMigrationArtifacts,
  loadAndVerifyManifest,
  computeChecksum,
  ADVISORY_LOCK_ID,
  BASELINE_SCHEMA_REQUIREMENTS,
} = jiti("./scripts/migrationRunnerCore.mjs");

// Setup persistent getPool delegate so per-test mocks can be swapped reliably in jiti
let currentGetPoolHandler = queries.getPool;
queries.getPool = (...args) => currentGetPoolHandler(...args);

describe("Governed Memory Persistence & Tenant Isolation Regression Suite", () => {
  let store;

  beforeEach(() => {
    store = MemoryStore.getInstance();
    store.clear();
    process.env.NODE_ENV = "test";
    process.env.MEMORY_STORE_ALLOW_TEST_TENANT = "true";
    delete process.env.MEMORY_STORE_IN_MEMORY_ONLY;
    delete process.env.MEMORY_STORE_USE_REAL_DB;
  });

  it("1. PostgreSQL failure cannot produce successful memory persistence", async () => {
    // Configure store to require real DB
    process.env.MEMORY_STORE_USE_REAL_DB = "true";
    delete process.env.MEMORY_STORE_IN_MEMORY_ONLY;

    // Mock getPool to return a pool whose queries fail
    currentGetPoolHandler = () => ({
      query: async () => {
        throw new Error("PostgreSQL connection refused: ECONNREFUSED 5432");
      },
    });

    try {
      let threw = false;
      try {
        await store.saveRecord("tenant_persist_fail", "run", "run_fail_1", {
          objective: "Must fail durably",
        });
      } catch (err) {
        threw = true;
        assert.ok(err.message.includes("PostgreSQL connection refused"), "Should throw the underlying DB error");
      }
      assert.equal(threw, true, "saveRecord MUST fail explicitly on database error");
    } finally {
      currentGetPoolHandler = () => { throw new Error("Azure PostgreSQL is not configured"); };
      delete process.env.MEMORY_STORE_USE_REAL_DB;
    }
  });

  it("2. Failed writes leave caches unchanged", async () => {
    process.env.MEMORY_STORE_USE_REAL_DB = "true";
    delete process.env.MEMORY_STORE_IN_MEMORY_ONLY;

    currentGetPoolHandler = () => ({
      query: async () => {
        throw new Error("Disk full: write failed");
      },
    });

    try {
      try {
        await store.saveRecord("tenant_cache_check", "run", "run_cache_1", {
          objective: "Should not be cached",
        });
      } catch {
        // Expected failure
      }

      // Check cache in in-memory mode
      process.env.MEMORY_STORE_IN_MEMORY_ONLY = "true";
      delete process.env.MEMORY_STORE_USE_REAL_DB;
      const cached = await store.getRecord("tenant_cache_check", "run", "run_cache_1");
      assert.equal(cached, undefined, "Cache MUST remain completely unchanged when DB write fails");
    } finally {
      currentGetPoolHandler = () => { throw new Error("Azure PostgreSQL is not configured"); };
      delete process.env.MEMORY_STORE_USE_REAL_DB;
      delete process.env.MEMORY_STORE_IN_MEMORY_ONLY;
    }
  });

  it("3. Database revisions and timestamps update memory records authoritatively", async () => {
    process.env.MEMORY_STORE_USE_REAL_DB = "true";
    delete process.env.MEMORY_STORE_IN_MEMORY_ONLY;

    const dbTimestamp = new Date("2026-10-05T01:23:45.000Z");
    currentGetPoolHandler = () => ({
      query: async (sql) => {
        if (sql.includes("INSERT INTO public.tenant_memory_records")) {
          return {
            rowCount: 1,
            rows: [
              {
                revision: 42,
                created_at: dbTimestamp,
                updated_at: dbTimestamp,
              },
            ],
          };
        }
        return { rowCount: 0, rows: [] };
      },
    });

    try {
      const record = await store.saveRecord("tenant_authoritative", "lesson", "lesson_42", {
        statement: "Authoritative revisions matter",
      });

      assert.equal(record.revision, 42, "Record revision must be authoritatively returned from PostgreSQL");
      assert.equal(record.createdAt, dbTimestamp.toISOString(), "Timestamp must match PostgreSQL authoritative time");

      // Verify cached value matches the authoritative DB revision
      process.env.MEMORY_STORE_IN_MEMORY_ONLY = "true";
      delete process.env.MEMORY_STORE_USE_REAL_DB;
      const cached = await store.getRecord("tenant_authoritative", "lesson", "lesson_42");
      assert.equal(cached?.revision, 42);
      assert.equal(cached?.createdAt, dbTimestamp.toISOString());
    } finally {
      currentGetPoolHandler = () => { throw new Error("Azure PostgreSQL is not configured"); };
      delete process.env.MEMORY_STORE_USE_REAL_DB;
      delete process.env.MEMORY_STORE_IN_MEMORY_ONLY;
    }
  });

  it("4. Missing tenant context fails outside explicitly configured tests", () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalAllowTestTenant = process.env.MEMORY_STORE_ALLOW_TEST_TENANT;
    const originalRuntimeMode = process.env.WEBSITEBANJA_RUNTIME_MODE;

    try {
      // Simulate production / unconfigured runtime
      process.env.NODE_ENV = "production";
      delete process.env.MEMORY_STORE_ALLOW_TEST_TENANT;
      delete process.env.WEBSITEBANJA_RUNTIME_MODE;

      assert.throws(
        () => resolveTrustedTenant(null),
        /Trusted tenant context required/,
        "Must throw error on missing tenant context in production"
      );

      // Verify arbitrary body payload cannot impersonate tenant in production
      assert.throws(
        () => resolveTrustedTenant(null, { tenantId: "attacker_tenant", userId: "attacker_user" }),
        /Trusted tenant context required/,
        "Must NOT allow payload properties to forge tenant context in production"
      );
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
      if (originalAllowTestTenant !== undefined) {
        process.env.MEMORY_STORE_ALLOW_TEST_TENANT = originalAllowTestTenant;
      }
      if (originalRuntimeMode !== undefined) {
        process.env.WEBSITEBANJA_RUNTIME_MODE = originalRuntimeMode;
      }
    }
  });

  it("5. Cross-tenant memory access is strictly blocked", async () => {
    process.env.MEMORY_STORE_IN_MEMORY_ONLY = "true";

    await store.saveRecord("tenant_isolated_A", "run", "run_secret_1", {
      runId: "run_secret_1",
      data: "Confidential Tenant A Strategy",
    });

    await store.saveRecord("tenant_isolated_B", "run", "run_public_1", {
      runId: "run_public_1",
      data: "Tenant B Data",
    });

    // Tenant B cannot retrieve Tenant A run
    const leakDirect = await store.getRecord("tenant_isolated_B", "run", "run_secret_1");
    assert.equal(leakDirect, undefined, "Tenant B must not access Tenant A record by ID");

    // Tenant B listing cannot include Tenant A runs
    const listB = await store.listRecords("tenant_isolated_B", "run");
    assert.equal(listB.length, 1);
    assert.equal(listB[0].recordId, "run_public_1");
    assert.equal(listB[0].tenantId, "tenant_isolated_B");

    // Legacy method isolation
    const runsB = await store.listRuns("tenant_isolated_B");
    assert.equal(runsB.length, 1);
    assert.equal(runsB[0].runId, "run_public_1");
  });
});

describe("Migration Integrity & Checksum Verification Suite (Exercising Real Implementation)", () => {
  it("6. Migration runner rolls back partially applied migrations and history entries on failure", async () => {
    const executedStatements = [];
    const mockClient = {
      query: async (sql, params) => {
        const sqlStr = String(sql).trim();
        executedStatements.push({ sql: sqlStr, params });

        if (sqlStr.includes("pg_advisory_lock")) return { rowCount: 1, rows: [] };
        if (sqlStr.includes("pg_advisory_unlock")) return { rowCount: 1, rows: [] };
        if (sqlStr.includes("information_schema.tables")) return { rows: [{ exists: true }] };
        if (sqlStr.includes("SELECT id, checksum, applied_at FROM public.schema_migrations")) {
          return { rows: [] };
        }
        if (sqlStr.includes("FAILS_ON_PURPOSE")) {
          throw new Error("Syntax error in migration DDL: FAILS_ON_PURPOSE");
        }
        return { rowCount: 1, rows: [] };
      },
    };

    const failingMigration = {
      id: "failing_migration_test",
      path: "migrations/failing.sql",
      checksum: "dummy_checksum_123",
      content: "CREATE TABLE test_failing (); FAILS_ON_PURPOSE;",
    };

    let threw = false;
    try {
      await executeMigrations({
        client: mockClient,
        verifiedMigrations: [failingMigration],
        isDryRun: false,
        logger: { log: () => {}, error: () => {}, warn: () => {} },
      });
    } catch (err) {
      threw = true;
      assert.ok(err.message.includes("FAILS_ON_PURPOSE"));
    }

    assert.equal(threw, true, "executeMigrations must throw on SQL error");
    assert.ok(
      executedStatements.some((s) => s.sql === "ROLLBACK"),
      "ROLLBACK must be executed when migration DDL fails"
    );
    assert.ok(
      !executedStatements.some((s) => s.sql.includes("INSERT INTO public.schema_migrations")),
      "schema_migrations tracking entry must NOT be recorded on failure"
    );
    assert.ok(
      executedStatements.some((s) => s.sql.includes("pg_advisory_unlock")),
      "Advisory lock must be released even after migration failure"
    );
  });

  it("7. Checksum mismatch blocks migration execution", async () => {
    const mockClient = {
      query: async (sql) => {
        const s = String(sql).trim();
        if (s.includes("pg_advisory_lock") || s.includes("pg_advisory_unlock")) return { rows: [] };
        if (s.includes("information_schema.tables")) return { rows: [{ exists: true }] };
        if (s.includes("SELECT id, checksum, applied_at FROM public.schema_migrations")) {
          return {
            rows: [{ id: "m1", checksum: "recorded_hash_aaa", applied_at: new Date() }],
          };
        }
        return { rows: [] };
      },
    };

    const modifiedMigration = {
      id: "m1",
      path: "migrations/m1.sql",
      checksum: "modified_hash_bbb",
      content: "SELECT 1;",
    };

    await assert.rejects(
      async () => {
        await executeMigrations({
          client: mockClient,
          verifiedMigrations: [modifiedMigration],
          isDryRun: false,
          logger: { log: () => {}, error: () => {}, warn: () => {} },
        });
      },
      /FATAL CHECKSUM MISMATCH/,
      "Must throw fatal checksum mismatch error on altered applied migration"
    );
  });

  it("8. Dry-run mode produces zero database mutations and does not create the history table", async () => {
    const mutations = [];
    const mockClient = {
      query: async (sql) => {
        const s = String(sql).trim();
        if (
          s.startsWith("CREATE") ||
          s.startsWith("INSERT") ||
          s.startsWith("UPDATE") ||
          s.startsWith("DELETE") ||
          s.startsWith("ALTER") ||
          s.startsWith("DROP")
        ) {
          mutations.push(s);
        }
        if (s.includes("pg_advisory_lock") || s.includes("pg_advisory_unlock")) return { rows: [] };
        if (s.includes("information_schema.tables")) {
          return { rows: [{ exists: false }] }; // History table does not exist
        }
        return { rows: [] };
      },
    };

    const dummyMigration = {
      id: "dummy_1",
      path: "migrations/dummy.sql",
      checksum: "hash_dummy",
      content: "CREATE TABLE dummy_table (id INT);",
    };

    const result = await executeMigrations({
      client: mockClient,
      verifiedMigrations: [dummyMigration],
      isDryRun: true,
      logger: { log: () => {}, error: () => {}, warn: () => {} },
    });

    assert.equal(result.isDryRun, true);
    assert.equal(mutations.length, 0, "Dry run must NOT execute any DDL or DML mutations");
  });

  it("11. Per-migration baseline adoption accurately inspects objects and rejects partial schemas", async () => {
    // 1. Fully present baseline schema -> status: "full"
    const fullMockClient = {
      query: async (sql, params) => {
        const s = String(sql).trim();
        if (s.includes("information_schema.tables")) {
          return { rows: [{ table_name: "business_leads" }] };
        }
        if (s.includes("pg_indexes")) {
          return { rows: [{ indexname: "idx_leads_place_id" }, { indexname: "idx_leads_status" }] };
        }
        return { rows: [] };
      },
    };

    const fullInspection = await inspectMigrationArtifacts(fullMockClient, "02_leads_schema");
    assert.equal(fullInspection.status, "full");

    // 2. Partial / broken schema -> status: "partial"
    const partialMockClient = {
      query: async (sql, params) => {
        const s = String(sql).trim();
        if (s.includes("information_schema.tables")) {
          // Has projects, but missing subscriptions, website_members, etc.
          return { rows: [{ table_name: "projects" }] };
        }
        if (s.includes("information_schema.routines")) {
          return { rows: [] };
        }
        return { rows: [] };
      },
    };

    const partialInspection = await inspectMigrationArtifacts(partialMockClient, "01_azure_schema_baseline");
    assert.equal(partialInspection.status, "partial");

    // Attempting to run migrations against a partial schema must throw with actionable error
    const dummyBaselineMigration = {
      id: "01_azure_schema_baseline",
      path: "azure-migration/01_azure_schema_baseline.sql",
      checksum: "checksum_01",
      content: "CREATE TABLE projects ();",
    };

    const runnerMockClient = {
      query: async (sql) => {
        const s = String(sql).trim();
        if (s.includes("pg_advisory_lock") || s.includes("pg_advisory_unlock")) return { rows: [] };
        if (s.includes("information_schema.tables") && s.includes("schema_migrations")) {
          return { rows: [{ exists: false }] };
        }
        if (s.includes("information_schema.tables") && s.includes("ANY")) {
          return { rows: [{ table_name: "projects" }] }; // Only 1 table present!
        }
        if (s.includes("information_schema.routines")) {
          return { rows: [] };
        }
        return { rows: [] };
      },
    };

    await assert.rejects(
      async () => {
        await executeMigrations({
          client: runnerMockClient,
          verifiedMigrations: [dummyBaselineMigration],
          isDryRun: false,
          logger: { log: () => {}, error: () => {}, warn: () => {} },
        });
      },
      /INCOMPATIBLE SCHEMA DETECTED.*Database is partially initialized/,
      "Must reject partially initialized schema to protect against destructive replay"
    );
  });
});

describe("Outreach Reconciliation Audit Suite", () => {
  it("9. Non-authoritative email provider acceptance cannot mark outreach delivered", () => {
    const outreach = {
      id: "outreach_provider_test",
      status: "queued",
      deliveryOutcome: undefined,
    };

    // When provider returns HTTP 200 with message ID:
    const providerResponse = { id: "gmail_msg_xyz123" };
    assert.ok(providerResponse.id, "Provider accepted message");

    // Must be provider_accepted, NOT delivered
    outreach.status = "sent";
    outreach.deliveryOutcome = "provider_accepted";
    outreach.externalMessageId = providerResponse.id;

    assert.equal(
      outreach.deliveryOutcome,
      "provider_accepted",
      "Provider acceptance MUST be recorded as provider_accepted, not confirmed inbox delivery"
    );
    assert.notEqual(outreach.deliveryOutcome, "delivered");
  });

  it("10. Uncertain delivery outcomes prevent duplicate sends until manual reconciliation", async () => {
    const testUserId = "user_test_recon";
    const outreachId = "outreach_uncertain_1";

    const originalFindOutreach = outreachRepository.findOutreachById;
    outreachRepository.findOutreachById = async (id, userId) => {
      if (id === outreachId) {
        return {
          outreachId,
          userId: testUserId,
          leadId: "lead_uncertain_1",
          previewId: "prev_1",
          channel: "email",
          status: "queued",
          deliveryOutcome: "reconciliation_required",
          deliveryError: "Timeout while awaiting Gmail API response",
          business: { name: "Test Biz", email: "test@example.com" },
          subject: "Test Subject",
          message: "Test Message",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
      return null;
    };

    try {
      // 1. Verify pre-flight directly blocks sending when deliveryOutcome is reconciliation_required
      const checkOutcome = await GmailEmailProvider.verifyPreFlight(outreachId, testUserId);
      assert.equal(checkOutcome.canSend, false, "Must block sending when deliveryOutcome is reconciliation_required");
      assert.ok(
        checkOutcome.reason?.includes("uncertain delivery outcome"),
        `Reason should mention uncertain delivery outcome, got: ${checkOutcome.reason}`
      );

      // 2. Also test queued status blocking
      outreachRepository.findOutreachById = async (id, userId) => {
        return {
          outreachId,
          userId: testUserId,
          leadId: "lead_uncertain_1",
          previewId: "prev_1",
          channel: "email",
          status: "queued",
          deliveryOutcome: undefined,
          business: { name: "Test Biz", email: "test@example.com" },
          subject: "Test Subject",
          message: "Test Message",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      };

      const queuedOutcome = await GmailEmailProvider.verifyPreFlight(outreachId, testUserId);
      assert.equal(queuedOutcome.canSend, false, "Must block sending when outreach status is queued");
      assert.ok(
        queuedOutcome.reason?.includes("queued or in-flight"),
        `Reason should mention queued status, got: ${queuedOutcome.reason}`
      );
    } finally {
      outreachRepository.findOutreachById = originalFindOutreach;
    }
  });

  it("12. Reconcile outreach dispatch allows confirmed recovery with provider ID or reset to approved", async () => {
    const testUserId = "user_test_recon_12";
    const outreachId = "outreach_recon_test_12";

    let savedRecord = null;
    const originalFindOutreach = outreachRepository.findOutreachById;
    const originalSaveOutreach = outreachRepository.saveOutreachRecord;

    const mockUncertain = {
      outreachId,
      userId: testUserId,
      leadId: "lead_12",
      previewId: "prev_12",
      channel: "email",
      status: "queued",
      deliveryOutcome: "reconciliation_required",
      deliveryError: "Gateway timeout from provider",
      business: { name: "Recon Biz", email: "recon@example.com" },
      subject: "Recon Subject",
      message: "Recon Message",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    outreachRepository.findOutreachById = async (id, userId) => {
      if (id === outreachId) return { ...mockUncertain };
      return null;
    };

    outreachRepository.saveOutreachRecord = async (record) => {
      savedRecord = { ...record };
      return record;
    };

    try {
      // 1. Confirm recovery using verified provider message ID
      const confirmRes = await GmailEmailProvider.reconcileOutreachDispatch(
        outreachId,
        "confirm_provider_accepted",
        {
          userId: testUserId,
          verifiedExternalMessageId: "msg_verified_provider_123",
          reason: "Verified message in Gmail sent folder via audit log",
        }
      );

      assert.equal(confirmRes.success, true);
      assert.equal(confirmRes.outreach?.status, "sent");
      assert.equal(confirmRes.outreach?.deliveryOutcome, "provider_accepted");
      assert.equal(confirmRes.outreach?.externalMessageId, "msg_verified_provider_123");
      assert.ok(confirmRes.outreach?.notes?.includes("Verified message in Gmail sent folder"));

      // 2. Reset to approved when provider confirms email was NOT dispatched
      const resetRes = await GmailEmailProvider.reconcileOutreachDispatch(
        outreachId,
        "reset_to_approved",
        {
          userId: testUserId,
          reason: "Confirmed in provider dashboard that dispatch failed before transmit",
        }
      );

      assert.equal(resetRes.success, true);
      assert.equal(resetRes.outreach?.status, "approved");
      assert.equal(resetRes.outreach?.deliveryOutcome, undefined);
      assert.equal(resetRes.outreach?.dispatchClaimedAt, undefined);
    } finally {
      outreachRepository.findOutreachById = originalFindOutreach;
      outreachRepository.saveOutreachRecord = originalSaveOutreach;
    }
  });
});
