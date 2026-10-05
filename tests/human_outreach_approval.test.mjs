import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { randomUUID, createHash } from "node:crypto";
import ts from "typescript";
import { z } from "zod";
function load(relative, imports, globals = {}) {
  const loadedModule = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(new URL(`../src/lib/intelligence/pipeline/${relative}.ts`, import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { module: loadedModule, exports: loadedModule.exports, Date, ...globals, require: id => { assert.ok(Object.hasOwn(imports, id), id); return imports[id]; } });
  return loadedModule.exports;
}
test("draft API derives ownership, strips caller overrides and preserves research holds", async () => {
  let captured;
  const route = load("../../../app/api/automation/generate-outreach-draft/route", {
    "next/server": { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } },
    "@/lib/telemetry/agentTelemetry": { emitAgentEvent() {} },
    "@/lib/ai/router/modelConfig": { sanitizeErrorOutput: () => "safe error" },
    "@/lib/outreach/personalizationEngine": { generateOutreachDraft: async request => {
      captured = request; return { success: false, researchId: "original-research", status: "research_required" };
    } },
    "@/lib/automation/automationApiIdentity": { authorizeAutomationTenant: async () => ({ identity: { userId: "trusted-owner", tenantId: "trusted-owner" } }) },
    zod: { z },
  });
  const result = await route.POST({ text: async () => JSON.stringify({ leadId: "original-lead", userId: "victim", previewId: "original-preview",
    overridePreview: { previewUrl: "https://unreviewed.example" }, overrideLead: { userId: "victim" }, overrideAudit: {} }) });
  assert.equal(result.status, 409);
  assert.equal(result.body.researchId, "original-research");
  assert.equal(captured.userId, "trusted-owner");
  assert.equal(captured.previewId, "original-preview");
  for (const key of ["overridePreview", "overrideLead", "overrideAudit"]) assert.equal(Object.hasOwn(captured, key), false);
});
test('actual Gmail dispatch stops before OAuth/fetch on denied claim and keeps simulations out of CRM', async () => {
  let oauthCalls = 0; let fetchCalls = 0; let crmCalls = 0;
  let denied = true;
  const env = { AUTO_SEND_ENABLED: 'true', COMMUNICATION_DRY_RUN: 'true' };
  let response = null;
  const saved = [];
  const provider = load('../../integrations/gmailEmailProvider', {
    fs: { default: {} }, path: { default: { resolve: () => '/isolated/rate-limits.json' } },
    crypto: { default: { randomBytes: () => ({ toString: () => 'fixture' }) } },
    './gmailOAuth': { GmailOAuthManager: { getValidAccessToken: async () => { oauthCalls++; return 'fixture-token'; } } },
    './configValidator': { ConfigValidator: { getGmailStatus: () => ({ isConfigured: true }), updateInternalState: action => action({ gmail: {} }) } },
    '@/lib/outreach/outreachRepository': { outreachRepository: { saveOutreachRecord: async record => {
      if (denied) throw new Error('checkpoint conflict'); saved.push(structuredClone(record)); return record;
    } } },
    '@/lib/discovery/leadRepository': { leadRepository: {} },
    '@/lib/crm/crmRepository': { crmRepository: new Proxy({}, { get: () => () => { crmCalls++; throw new Error('Simulation cannot write CRM'); } }) },
    '@/lib/telemetry/agentTelemetry': { emitAgentEvent() {} },
    '@/lib/adminAuth': { getAuthorizedAdminUserIds: () => ['a0d29ad3-4c93-4bcd-a4d0-b45804017cf2'] },
  }, { process: { cwd: () => '/isolated', env }, Buffer,
    fetch: async () => { fetchCalls++; if (response) return response; throw new Error('Uncertain transport outcome'); } }).GmailEmailProvider;
  provider.verifyPreFlight = async () => ({ canSend: true, outreach: structuredClone({ ...durableDraft, status: 'approved' }) });
  const blocked = await provider.sendOutreachEmail('draft-one', { userId: 'tenant' });
  assert.equal(blocked.error.code, 'DISPATCH_CLAIM_DENIED');
  assert.equal(oauthCalls, 0); assert.equal(fetchCalls, 0);
  denied = false;
  const simulated = await provider.sendOutreachEmail('draft-one', { userId: 'tenant' });
  assert.equal(simulated.success, true); assert.equal(simulated.isSimulated, true);
  assert.equal(saved[0].status, 'queued'); assert.equal(saved[1].status, 'simulated_sent');
  assert.ok(saved[1].simulatedAt); assert.equal(saved[1].sentAt, undefined);
  assert.equal(oauthCalls, 0); assert.equal(fetchCalls, 0); assert.equal(crmCalls, 0);
  env.COMMUNICATION_DRY_RUN = 'false';
  const uncertain = await provider.sendOutreachEmail('draft-one', { userId: 'tenant' });
  assert.equal(uncertain.error.code, 'DELIVERY_OUTCOME_UNCERTAIN');
  assert.equal(saved.at(-1).status, 'queued');
  response = { ok: true, json: async () => ({ threadId: 'missing-message-id' }) };
  const unverifiable = await provider.sendOutreachEmail('draft-one', { userId: 'tenant' });
  assert.equal(unverifiable.error.code, 'DELIVERY_OUTCOME_UNCERTAIN');
  assert.equal(saved.at(-1).status, 'queued'); assert.equal(crmCalls, 0);
});
test('management approval API requires the reviewed snapshot and binds trusted owner/proof', async () => {
  const { auth } = fixture();
  let persisted;
  const route = load('../../../app/api/automation/outreach/route', {
    'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } },
    '@/lib/outreach/outreachRepository': { outreachRepository: { updateOutreachStatus: async (request, proof) => {
      assert.equal(auth.requireHumanApproval(proof, 'tenant'), 'tenant'); persisted = request; return { outreachId: request.outreachId };
    } } },
    '@/lib/outreach/simulationProvider': { localSimulationProvider: {} },
    '@/lib/ai/router/modelConfig': { sanitizeErrorOutput: () => 'safe error' },
    '@/lib/automation/automationApiIdentity': { authorizeAutomationTenant: async () => ({ identity: { userId: 'tenant', tenantId: 'tenant' } }) },
    '@/lib/intelligence/pipeline/humanApprovalAuthorization': auth,
    '@/lib/adminAuth': { verifyAdminAuth: async () => ({ isAdmin: true, userId: 'tenant' }) }, zod: { z },
  });
  const missing = await route.PATCH({ json: async () => ({ outreachId: 'draft', status: 'approved' }) });
  assert.equal(missing.status, 400); assert.equal(persisted, undefined);
  const approved = await route.PATCH({ json: async () => ({ outreachId: 'draft', status: 'approved', userId: 'victim',
    expectedReviewedMessage: 'Reviewed message', expectedReviewedSubject: '', expectedReviewedRecipient: 'owner@example.com' }) });
  assert.equal(approved.status, 200); assert.equal(persisted.userId, 'tenant');
  assert.equal(persisted.expectedReviewedMessage, 'Reviewed message');
});
test('direct Gmail API derives owner and forbids machine force-send overrides', async () => {
  let admin = { isAdmin: false }; const calls = [];
  const route = load('../../../app/api/integrations/gmail/send/route', {
    'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } },
    '@/lib/integrations/gmailEmailProvider': { GmailEmailProvider: { sendOutreachEmail: async (...args) => {
      calls.push(args); return { success: true, isSimulated: true };
    } } },
    '@/lib/automation/automationApiIdentity': { authorizeAutomationTenant: async () => ({ identity: { tenantId: 'tenant', userId: 'tenant' } }) },
    '@/lib/adminAuth': { verifyAdminAuth: async () => admin }, zod: { z },
  });
  assert.equal((await route.POST({ json: async () => ({ outreachId: 'draft', forceSend: true, userId: 'victim' }) })).status, 403);
  assert.equal(calls.length, 0);
  const simulated = await route.POST({ json: async () => ({ outreachId: 'draft', userId: 'victim' }) });
  assert.equal(simulated.body.isSimulated, true); assert.equal(calls[0][1].userId, 'tenant');
  admin = { isAdmin: true, userId: 'tenant' };
  assert.equal((await route.POST({ json: async () => ({ outreachId: 'draft', forceSend: true }) })).status, 200);
  assert.equal(calls[1][1].forceSend, true);
});
function fixture() {
  let admin = { isAdmin: true, userId: "tenant" };
  let update = async request => ({ outreachId: request.outreachId, status: request.status, userId: request.userId });
  const auth = load("humanApprovalAuthorization", { "@/lib/adminAuth": { verifyAdminAuth: async () => admin } });
  const gate = load("approvalGate", {
    crypto: { randomUUID }, "./humanApprovalAuthorization": auth,
    "@/lib/outreach/outreachRepository": { outreachRepository: {
      findOutreachById: async () => ({ leadId: draft.leadId, message: draft.body, subject: draft.subject, business: { email: draft.recipientEmail } }),
      saveOutreachRecord: async record => record,
      updateOutreachStatus: request => update(request),
    } },
    "@/lib/telemetry/agentTelemetry": { emitAgentEvent() {} },
  }).approvalGate;
  return { auth, gate, setAdmin: value => { admin = value; }, setUpdate: value => { update = value; } };
}
const draft = { pipelineRunId: "run", leadId: "lead", outreachId: "draft", tenantId: "tenant", businessName: "Store", recipientEmail: "owner@example.com", subject: "Preview", body: "Review your preview" };
test("plain names, agent identities, forged/serialized capabilities and wrong tenants cannot approve", async () => {
  const { auth, gate, setAdmin } = fixture(); await gate.registerDraft(draft);
  for (const value of ["Safal", "human_admin", "boss", "ceo", "n8n", "system", { kind: "authenticated_human_approval" }]) {
    await assert.rejects(gate.approveDraft("draft", value), /Verified human/);
  }
  setAdmin({ isAdmin: false }); await assert.rejects(auth.authorizeHumanApproval({}, "tenant"), /Authenticated human/);
  setAdmin({ isAdmin: true, userId: "other" }); const other = await auth.authorizeHumanApproval({}, "other");
  await assert.rejects(gate.approveDraft("draft", other), /Verified human/);
  setAdmin({ isAdmin: true, userId: "tenant" }); const valid = await auth.authorizeHumanApproval({}, "tenant");
  await assert.rejects(gate.approveDraft("draft", JSON.parse(JSON.stringify(valid))), /Verified human/);
  assert.equal(gate.canSend("draft"), false);
});
test("failed/null/mismatched persistence never acknowledges approval; concurrent reviews cannot both pass", async () => {
  const { auth, gate, setUpdate } = fixture(); const record = await gate.registerDraft(draft);
  const proof = await auth.authorizeHumanApproval({}, "tenant");
  for (const update of [async () => { throw new Error("storage unavailable"); }, async () => null, async () => ({ outreachId: "other", status: "approved" })]) {
    setUpdate(update); await assert.rejects(gate.approveDraft("draft", proof));
    assert.equal(record.status, "PENDING_HUMAN_APPROVAL"); assert.equal(record.reviewedBy, undefined); assert.equal(gate.canSend("draft"), false);
  }
  let release; setUpdate(() => new Promise(resolve => { release = resolve; }));
  const first = gate.approveDraft("draft", proof);
  await assert.rejects(gate.approveDraft("draft", proof), /already in progress/);
  assert.equal(gate.canSend("draft"), false);
  release({ outreachId: "draft", status: "approved", userId: "tenant" }); await first;
  assert.equal(record.reviewedBy, "tenant"); assert.equal(gate.canSend("draft"), true);
  setUpdate(async () => { throw new Error("storage unavailable"); });
  await assert.rejects(gate.rejectDraft("draft", proof, "Human revoked approval"));
  assert.equal(gate.canSend("draft"), false);
  setUpdate(async request => ({ outreachId: request.outreachId, status: request.status, userId: request.userId }));
  await gate.rejectDraft("draft", proof, "Human revoked approval"); assert.equal(record.status, "REJECTED");
  assert.equal(gate.canSend("draft"), false);
});

function durableFixture() {
  const rows = new Map(); const calls = [];
  const { auth } = fixture();
  const pool = { query: async (sql, values) => {
    calls.push(sql);
    if (sql.startsWith('INSERT')) {
      assert.match(sql, /ON CONFLICT DO NOTHING/);
      const [id, tenant, lead, preview, channel, status, data] = values;
      if (rows.has(id) || [...rows.values()].some(row => row.record_data.userId === tenant && row.record_data.leadId === lead &&
        row.record_data.previewId === preview && row.record_data.channel === channel && !['rejected', 'cancelled'].includes(row.record_data.status))) return { rowCount: 0, rows: [] };
      const row = { record_data: JSON.parse(data), revision: 0 };
      assert.equal(row.record_data.status, status);
      rows.set(id, row); return { rowCount: 1, rows: [structuredClone(row)] };
    }
    if (sql.startsWith('UPDATE')) {
      assert.match(sql, /outreach_id=\$1 AND user_id=\$2 AND revision=\$5/);
      const [id, tenant, data, status, revision] = values;
      const row = rows.get(id);
      if (!row || row.record_data.userId !== tenant || row.revision !== revision) return { rowCount: 0, rows: [] };
      row.record_data = JSON.parse(data); row.revision++;
      assert.equal(row.record_data.status, status);
      return { rowCount: 1, rows: [structuredClone(row)] };
    }
    if (sql.startsWith('DELETE')) {
      assert.match(sql, /outreach_id=\$1 AND user_id=\$2/);
      const row = rows.get(values[0]);
      if (!row || row.record_data.userId !== values[1]) return { rowCount: 0 };
      rows.delete(values[0]); return { rowCount: 1 };
    }
    if (sql.includes('WHERE outreach_id=$1')) {
      assert.match(sql, /outreach_id=\$1 AND user_id=\$2/);
      const row = rows.get(values[0]);
      return { rows: row?.record_data.userId === values[1] ? [structuredClone(row)] : [] };
    }
    if (sql.includes("record_data->'approvalRequest'->>'approvalId'=$2")) {
      assert.match(sql, /WHERE user_id=\$1/);
      return { rows: [...rows.values()].filter(row => row.record_data.userId === values[0] &&
        row.record_data.approvalRequest?.approvalId === values[1]).map(row => structuredClone(row)) };
    }
    assert.match(sql, /WHERE user_id=\$1/);
    let selected = [...rows.values()].filter(row => row.record_data.userId === values[0]);
    if (sql.includes('status NOT IN')) {
      assert.match(sql, /lead_id=\$2 AND channel=\$3 AND preview_id=\$4/);
      selected = selected.filter(row => row.record_data.leadId === values[1] && row.record_data.channel === values[2] &&
        row.record_data.previewId === values[3] && !['rejected', 'cancelled'].includes(row.record_data.status));
    } else selected = selected.filter(row => (!values[1] || row.record_data.leadId === values[1]) &&
      (!values[2] || row.record_data.channel === values[2]) && (!values[3] || row.record_data.status === values[3]));
    return { rows: selected.map(row => structuredClone(row)) };
  } };
  const imports = { 'node:crypto': { createHash, randomUUID }, '@/lib/db/queries': { getPool: () => pool }, '@/lib/ai/router/modelConfig': { sanitizeErrorOutput: value => value },
    '@/lib/intelligence/pipeline/humanApprovalAuthorization': auth, '@/lib/telemetry/agentTelemetry': { emitAgentEvent() {} } };
  const repositoryModule = load('../../outreach/outreachRepository', imports);
  return { repository: repositoryModule.outreachRepository, hasCurrentHumanApproval: repositoryModule.hasCurrentHumanApproval, auth, calls, imports };
}
const durableDraft = { outreachId: 'draft-one', leadId: 'lead', previewId: 'preview', userId: 'tenant', channel: 'email', status: 'draft',
  business: { name: 'Wine retailer', industry: 'wine_retail', location: 'Delhi', email: 'owner@example.com' },
  message: 'Review your grounded retail preview', previewUrl: 'https://fixture/preview', personalization: {}, createdAt: new Date().toISOString() };
test('approval queue registration persists its exact owned snapshot and reuses it after restart', async () => {
  const { repository, auth, hasCurrentHumanApproval } = durableFixture();
  await repository.saveOutreachRecord(structuredClone(durableDraft));
  const imports = { crypto: { randomUUID }, './humanApprovalAuthorization': auth,
    '@/lib/outreach/outreachRepository': { outreachRepository: repository, hasCurrentHumanApproval }, '@/lib/telemetry/agentTelemetry': { emitAgentEvent() {} } };
  const firstGate = load('approvalGate', imports).approvalGate;
  const request = { pipelineRunId: 'original-run', leadId: 'lead', outreachId: 'draft-one', tenantId: 'tenant', businessName: durableDraft.business.name,
    recipientEmail: durableDraft.business.email, subject: '', body: durableDraft.message };
  const first = await firstGate.registerDraft(request);
  const stored = await repository.findOutreachById('draft-one', 'tenant');
  assert.equal(stored.approvalRequest.approvalId, first.approvalId);
  assert.equal(stored.approvalRequest.reviewedBody, durableDraft.message);
  stored.approvalRequest.pipelineRunId = 'forged-run';
  await assert.rejects(repository.saveOutreachRecord(stored), /snapshot is immutable/);
  const restarted = load('approvalGate', imports).approvalGate;
  assert.equal((await restarted.getStoredPendingApprovals('tenant'))[0].approvalId, first.approvalId);
  assert.equal((await restarted.getStoredPendingApprovals('other')).length, 0);
  assert.equal((await restarted.getStoredApprovalRecord('draft-one', 'tenant')).reviewedBody, durableDraft.message);
  assert.equal((await restarted.getStoredApprovalRecord(first.approvalId, 'tenant')).outreachId, 'draft-one');
  assert.equal(await restarted.getStoredApprovalRecord(first.approvalId, 'other'), undefined);
  const proof = await auth.authorizeHumanApproval({}, 'tenant');
  await restarted.approveDraft(first.approvalId, proof);
  const afterApproval = load('approvalGate', imports).approvalGate;
  assert.equal((await afterApproval.getStoredApprovalRecord(first.approvalId, 'tenant')).status, 'READY_TO_SEND');
  assert.equal((await afterApproval.getStoredPendingApprovals('tenant')).length, 0);
  assert.equal((await afterApproval.registerDraft(request)).status, 'READY_TO_SEND');
  await afterApproval.rejectDraft(first.approvalId, proof, 'Human revoked the pending send');
  const afterRevocation = load('approvalGate', imports).approvalGate;
  assert.equal((await afterRevocation.getStoredApprovalRecord(first.approvalId, 'tenant')).status, 'REJECTED');
  assert.equal(afterRevocation.canSend('draft-one'), false);
  await assert.rejects(repository.updateOutreachStatus({ outreachId: 'draft-one', userId: 'tenant', status: 'approved' }, proof), /state does not permit/);
  assert.equal((await restarted.registerDraft(request)).approvalId, first.approvalId);
  await assert.rejects(restarted.registerDraft({ ...request, tenantId: 'other' }), /exact owned/);
  await assert.rejects(restarted.registerDraft({ ...request, pipelineRunId: 'different-run' }), /identity\/snapshot conflict/);
  await assert.rejects(restarted.registerDraft({ ...request, body: 'Unreviewed replacement' }), /exact owned/);
});
test('revised saved draft creates a new human review while retaining immutable original history', async () => {
  const { repository, auth, hasCurrentHumanApproval } = durableFixture();
  await repository.saveOutreachRecord(structuredClone(durableDraft));
  const imports = { crypto: { randomUUID }, './humanApprovalAuthorization': auth,
    '@/lib/outreach/outreachRepository': { outreachRepository: repository, hasCurrentHumanApproval }, '@/lib/telemetry/agentTelemetry': { emitAgentEvent() {} } };
  const gate = load('approvalGate', imports).approvalGate;
  const original = await gate.registerDraft({ pipelineRunId: 'original-run', leadId: 'lead', outreachId: 'draft-one', tenantId: 'tenant',
    businessName: durableDraft.business.name, recipientEmail: durableDraft.business.email, subject: '', body: durableDraft.message });
  const proof = await auth.authorizeHumanApproval({}, 'tenant');
  await repository.updateOutreachStatus({ outreachId: 'draft-one', userId: 'tenant', status: 'review', editedMessage: 'Revised saved message' });
  await assert.rejects(gate.approveDraft(original.approvalId, proof), /snapshot changed/);
  const revised = await repository.updateOutreachStatus({ outreachId: 'draft-one', userId: 'tenant', status: 'approved',
    expectedReviewedMessage: 'Revised saved message', expectedReviewedSubject: '', expectedReviewedRecipient: durableDraft.business.email }, proof);
  assert.notEqual(revised.approvalRequest.approvalId, original.approvalId);
  assert.equal(revised.approvalHistory.length, 1);
  assert.equal(revised.approvalHistory[0].reviewedBody, durableDraft.message);
  assert.equal(revised.approvalRequest.reviewedBody, 'Revised saved message');
  const fresh = load('approvalGate', imports).approvalGate;
  assert.equal(await fresh.getStoredApprovalRecord(original.approvalId, 'tenant'), undefined);
  assert.equal((await fresh.getStoredApprovalRecord(revised.approvalRequest.approvalId, 'tenant')).status, 'READY_TO_SEND');
  const tampered = await repository.findOutreachById('draft-one', 'tenant'); tampered.approvalHistory[0].reviewedBody = 'Rewritten history';
  await assert.rejects(repository.saveOutreachRecord(tampered), /history is immutable/);
});
test('approval cannot approve the old snapshot while changing content or recipient in the same request', async () => {
  const { repository, auth, calls } = durableFixture();
  await repository.saveOutreachRecord(structuredClone(durableDraft));
  const proof = await auth.authorizeHumanApproval({}, 'tenant');
  for (const edit of [{ editedMessage: 'Unreviewed replacement' }, { editedSubject: 'Unreviewed subject' }, { recipientEmail: 'unreviewed@example.com' }]) {
    const before = calls.filter(sql => sql.startsWith('UPDATE')).length;
    await assert.rejects(repository.updateOutreachStatus({ outreachId: 'draft-one', userId: 'tenant', status: 'approved',
      expectedReviewedMessage: durableDraft.message, expectedReviewedSubject: '', expectedReviewedRecipient: durableDraft.business.email, ...edit }, proof), /Edit outreach separately/);
    assert.equal(calls.filter(sql => sql.startsWith('UPDATE')).length, before);
    assert.equal((await repository.findOutreachById('draft-one', 'tenant')).status, 'draft');
  }
});
test('two dispatch workers cannot both claim the same human-reviewed outreach', async () => {
  const { repository, auth, imports } = durableFixture();
  await repository.saveOutreachRecord(structuredClone(durableDraft));
  const proof = await auth.authorizeHumanApproval({}, 'tenant');
  await repository.updateOutreachStatus({ outreachId: 'draft-one', userId: 'tenant', status: 'approved' }, proof);
  const secondWorker = load('../../outreach/outreachRepository', imports).outreachRepository;
  const first = await repository.findOutreachById('draft-one', 'tenant');
  const second = await secondWorker.findOutreachById('draft-one', 'tenant');
  first.status = 'queued'; second.status = 'queued';
  const claims = await Promise.allSettled([repository.saveOutreachRecord(first), secondWorker.saveOutreachRecord(second)]);
  assert.equal(claims.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(claims.filter(result => result.status === 'rejected').length, 1);
  assert.equal((await secondWorker.findOutreachById('draft-one', 'tenant')).status, 'queued');
  const claimed = await secondWorker.findOutreachById('draft-one', 'tenant');
  assert.ok(claimed.dispatchClaimedAt);
  claimed.status = 'review';
  await assert.rejects(secondWorker.saveOutreachRecord(claimed), /requires delivery reconciliation/);
  const tampered = await secondWorker.findOutreachById('draft-one', 'tenant'); delete tampered.dispatchClaimedAt;
  await assert.rejects(secondWorker.saveOutreachRecord(tampered), /claim provenance is immutable/);
  await secondWorker.updateOutreachStatus({ outreachId: 'draft-one', userId: 'tenant', status: 'cancelled' });
  await assert.rejects(secondWorker.updateOutreachStatus({ outreachId: 'draft-one', userId: 'tenant', status: 'review' }), /requires delivery reconciliation/);
});
test('approval rejects an outdated reviewed message, subject or recipient before persistence', async () => {
  const { repository, auth, calls } = durableFixture();
  await repository.saveOutreachRecord(structuredClone(durableDraft));
  const proof = await auth.authorizeHumanApproval({}, 'tenant');
  for (const snapshot of [{ expectedReviewedMessage: 'Old message' }, { expectedReviewedSubject: 'Old subject' }, { expectedReviewedRecipient: 'old@example.com' }]) {
    const before = calls.filter(sql => sql.startsWith('UPDATE')).length;
    await assert.rejects(repository.updateOutreachStatus({ outreachId: 'draft-one', userId: 'tenant', status: 'approved', ...snapshot }, proof), /snapshot changed/);
    assert.equal(calls.filter(sql => sql.startsWith('UPDATE')).length, before);
    assert.equal((await repository.findOutreachById('draft-one', 'tenant')).status, 'draft');
  }
});
test('revocation removes persisted approval and changed content requires a new human decision', async () => {
  const { repository, auth, imports } = durableFixture();
  await repository.saveOutreachRecord(structuredClone(durableDraft));
  const proof = await auth.authorizeHumanApproval({}, 'tenant');
  const approved = await repository.updateOutreachStatus({ outreachId: 'draft-one', userId: 'tenant', status: 'approved' }, proof);
  const originalHash = approved.approvedContentHash;
  const reviewed = await repository.updateOutreachStatus({ outreachId: 'draft-one', userId: 'tenant', status: 'review', editedMessage: 'Changed reviewed copy' });
  for (const key of ['approvedBy', 'approvedAt', 'approvedContentHash']) assert.equal(reviewed[key], undefined);
  const restarted = load('../../outreach/outreachRepository', imports).outreachRepository;
  const unapproved = await restarted.findOutreachById('draft-one', 'tenant'); unapproved.status = 'queued';
  await assert.rejects(restarted.saveOutreachRecord(unapproved), /Unapproved/);
  const reapproved = await restarted.updateOutreachStatus({ outreachId: 'draft-one', userId: 'tenant', status: 'approved' }, proof);
  assert.notEqual(reapproved.approvedContentHash, originalHash);
  assert.equal(reapproved.approvedBy, 'tenant');
});
test('durable outreach deduplicates concurrent creation and survives repository restart without owner leakage', async () => {
  const { repository, imports, calls } = durableFixture();
  const [first, concurrent] = await Promise.all([repository.saveOutreachRecord(structuredClone(durableDraft)),
    repository.saveOutreachRecord({ ...structuredClone(durableDraft), outreachId: 'draft-two' })]);
  assert.equal(first.outreachId, concurrent.outreachId);
  const restarted = load('../../outreach/outreachRepository', imports).outreachRepository;
  assert.equal((await restarted.findOutreachById('draft-one', 'tenant')).message, durableDraft.message);
  assert.equal(await restarted.findOutreachById('draft-one', 'other'), null);
  assert.equal((await restarted.listOutreachRecords({ userId: 'other' })).length, 0);
  assert.equal(await restarted.deleteOutreachRecord('draft-one', 'other'), false);
  const before = calls.length;
  await assert.rejects(restarted.findOutreachById('draft-one'), /Trusted outreach owner/);
  await assert.rejects(restarted.listOutreachRecords(), /Trusted outreach owner/);
  assert.equal(calls.length, before);
});
test('durable outreach rejects stale writes, forged approval and unapproved send/queue states', async () => {
  const { repository, auth } = durableFixture();
  await repository.saveOutreachRecord(structuredClone(durableDraft));
  const first = await repository.findOutreachById('draft-one', 'tenant');
  const stale = await repository.findOutreachById('draft-one', 'tenant');
  first.status = 'review'; await repository.saveOutreachRecord(first);
  stale.status = 'rejected'; await assert.rejects(repository.saveOutreachRecord(stale), /checkpoint conflict/);
  for (const authorization of ['ceo', { kind: 'authenticated_human_approval' }]) {
    await assert.rejects(repository.updateOutreachStatus({ outreachId: 'draft-one', userId: 'tenant', status: 'approved' }, authorization), /Verified human/);
  }
  for (const status of ['sent', 'queued']) {
    const record = await repository.findOutreachById('draft-one', 'tenant'); record.status = status;
    await assert.rejects(repository.saveOutreachRecord(record), /Unapproved/);
  }
  await assert.rejects(repository.saveOutreachRecord({ ...structuredClone(durableDraft), outreachId: 'forged', status: 'approved' }), /unapproved draft/);
  const proof = await auth.authorizeHumanApproval({}, 'tenant');
  const approved = await repository.updateOutreachStatus({ outreachId: 'draft-one', userId: 'tenant', status: 'approved' }, proof);
  assert.equal(approved.approvedBy, 'tenant');
  assert.match(approved.approvedContentHash, /^[a-f0-9]{64}$/);
  const forgedProvenance = await repository.findOutreachById('draft-one', 'tenant'); forgedProvenance.approvedBy = 'ceo';
  await assert.rejects(repository.saveOutreachRecord(forgedProvenance), /Verified human/);
  const modified = await repository.findOutreachById('draft-one', 'tenant'); modified.message = 'Unreviewed changed content'; modified.status = 'sent';
  await assert.rejects(repository.saveOutreachRecord(modified), /requires revocation/);
  const untouched = await repository.findOutreachById('draft-one', 'tenant'); untouched.status = 'sent';
  await repository.saveOutreachRecord(untouched);
  const reset = await repository.findOutreachById('draft-one', 'tenant'); reset.status = 'review';
  await assert.rejects(repository.saveOutreachRecord(reset), /cannot be reset/);
  untouched.message = 'Changed delivered content';
  await assert.rejects(repository.saveOutreachRecord(untouched), /immutable/);
  const identityChange = await repository.findOutreachById('draft-one', 'tenant'); identityChange.userId = 'other';
  await assert.rejects(repository.saveOutreachRecord(identityChange), /identity is immutable/);
});
