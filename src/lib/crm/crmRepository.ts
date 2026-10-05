// src/lib/crm/crmRepository.ts
/**
 * WebsiteBanja CRM Repository & Local State Store
 * Phase: Phase 12 (Reply Intelligence + CRM Foundation)
 *
 * Persists CRM entities in local scratch storage:
 *   - scratch/crm/conversations.json
 *   - scratch/crm/messages.json
 *   - scratch/crm/timeline.json
 *   - scratch/crm/lead_states.json
 *
 * Ingests Phase 11 simulated outbound outreach records to construct
 * cohesive conversation timelines with zero duplication.
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import type {
  CRMConversation,
  CRMMessage,
  CRMEvent,
  CRMLeadStatus,
  LeadCRMState,
  StatusTransitionRecord,
  ListCRMFilter,
} from "./types";
import type { OutreachChannel, OutreachRecord } from "@/lib/outreach/types";
import { emitAgentEvent } from "@/lib/telemetry/agentTelemetry";
import {
  saveLeadCRMStateToPostgres,
  getLeadCRMStateFromPostgres,
  listLeadCRMStatesFromPostgres,
  saveCRMConversationToPostgres,
  saveCRMMessageToPostgres,
} from "@/lib/db/pipelineCrmPersistence";

const CRM_DIR = path.resolve(process.cwd(), "scratch/crm");
const CONVERSATIONS_FILE = path.join(CRM_DIR, "conversations.json");
const MESSAGES_FILE = path.join(CRM_DIR, "messages.json");
const TIMELINE_FILE = path.join(CRM_DIR, "timeline.json");
const LEAD_STATES_FILE = path.join(CRM_DIR, "lead_states.json");

// Outreach directory for Phase 11 handoff ingestion
const OUTREACH_FILE = path.resolve(process.cwd(), "scratch/outreach/outreach.json");
const LEADS_FILE = path.resolve(process.cwd(), "scratch/leads/leads.json");

function ensureStorage(): void {
  if (!fs.existsSync(CRM_DIR)) {
    fs.mkdirSync(CRM_DIR, { recursive: true });
  }
  if (!fs.existsSync(CONVERSATIONS_FILE)) {
    fs.writeFileSync(CONVERSATIONS_FILE, JSON.stringify([], null, 2), "utf-8");
  }
  if (!fs.existsSync(MESSAGES_FILE)) {
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify([], null, 2), "utf-8");
  }
  if (!fs.existsSync(TIMELINE_FILE)) {
    fs.writeFileSync(TIMELINE_FILE, JSON.stringify([], null, 2), "utf-8");
  }
  if (!fs.existsSync(LEAD_STATES_FILE)) {
    fs.writeFileSync(LEAD_STATES_FILE, JSON.stringify({}, null, 2), "utf-8");
  }
}

function readJSON<T>(filePath: string, fallback: T): T {
  ensureStorage();
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error(`[CRMRepository] Failed to read ${filePath}:`, err);
    return fallback;
  }
}

function writeJSON<T>(filePath: string, data: T): void {
  ensureStorage();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export class CRMRepository {
  /**
   * Reads all conversations
   */
  getConversations(): CRMConversation[] {
    return readJSON<CRMConversation[]>(CONVERSATIONS_FILE, []);
  }

  /**
   * Reads all messages
   */
  getMessagesList(): CRMMessage[] {
    return readJSON<CRMMessage[]>(MESSAGES_FILE, []);
  }

  /**
   * Reads all timeline events
   */
  getTimelineList(): CRMEvent[] {
    return readJSON<CRMEvent[]>(TIMELINE_FILE, []);
  }

  /**
   * Reads lead status overrides map { [leadId]: { status, history, updatedAt } }
   */
  getLeadStatesMap(): Record<string, { status: CRMLeadStatus; history: StatusTransitionRecord[]; updatedAt: string }> {
    return readJSON<Record<string, { status: CRMLeadStatus; history: StatusTransitionRecord[]; updatedAt: string }>>(
      LEAD_STATES_FILE,
      {}
    );
  }

  /**
   * Creates or returns an existing conversation for a lead & channel
   */
  async createConversation(data: {
    leadId: string;
    channel: OutreachChannel;
    owner?: string;
    userId?: string;
  }): Promise<CRMConversation> {
    ensureStorage();
    const conversations = this.getConversations();
    const existing = conversations.find(
      (c) => c.leadId === data.leadId && c.channel === data.channel && (data.userId ? c.userId === data.userId : true)
    );

    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();
    const id = `conv_${data.leadId}_${data.channel}`;

    const newConv: CRMConversation = {
      id,
      leadId: data.leadId,
      channel: data.channel,
      status: "OPEN",
      createdAt: now,
      updatedAt: now,
      lastMessageAt: now,
      messageCount: 0,
      unreadCount: 0,
      owner: data.owner || "WebsiteBanja AI Lead Agent",
      userId: data.userId,
    };

    conversations.unshift(newConv);
    writeJSON(CONVERSATIONS_FILE, conversations);
    saveCRMConversationToPostgres(newConv).catch(() => {});

    return newConv;
  }

  /**
   * Retrieves conversation by ID
   */
  async getConversation(id: string): Promise<CRMConversation | null> {
    const conversations = this.getConversations();
    return conversations.find((c) => c.id === id) || null;
  }

  /**
   * Retrieves or lazily seeds a conversation for a lead
   */
  async getConversationForLead(leadId: string, channel: OutreachChannel = "email", userId?: string): Promise<CRMConversation> {
    await this.seedFromPhase11(leadId, userId);
    const conversations = this.getConversations();
    const found = conversations.find(
      (c) => c.leadId === leadId && (channel ? c.channel === channel : true) && (userId ? c.userId === userId : true)
    );

    if (found) return found;

    return this.createConversation({ leadId, channel, userId });
  }

  /**
   * Updates conversation attributes
   */
  async updateConversation(id: string, updates: Partial<CRMConversation>): Promise<CRMConversation | null> {
    ensureStorage();
    const conversations = this.getConversations();
    const idx = conversations.findIndex((c) => c.id === id);
    if (idx === -1) return null;

    const updated: CRMConversation = {
      ...conversations[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    conversations[idx] = updated;
    writeJSON(CONVERSATIONS_FILE, conversations);
    saveCRMConversationToPostgres(updated).catch(() => {});
    return updated;
  }

  /**
   * Appends a message to a conversation
   */
  async addMessage(msg: Omit<CRMMessage, "id" | "timestamp"> & { timestamp?: string }): Promise<CRMMessage> {
    ensureStorage();
    const now = msg.timestamp || new Date().toISOString();
    const id = `msg_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;

    const newMessage: CRMMessage = {
      ...msg,
      id,
      timestamp: now,
    };

    const messages = this.getMessagesList();
    messages.push(newMessage);
    writeJSON(MESSAGES_FILE, messages);
    saveCRMMessageToPostgres(newMessage).catch(() => {});

    // Update conversation metadata
    const conv = await this.getConversation(msg.conversationId);
    if (conv) {
      await this.updateConversation(conv.id, {
        lastMessageAt: now,
        messageCount: (conv.messageCount || 0) + 1,
        unreadCount: msg.direction === "inbound" ? (conv.unreadCount || 0) + 1 : conv.unreadCount,
        status: msg.direction === "inbound" ? "REPLIED" : conv.status,
      });
    }

    emitAgentEvent({
      event: "crm.reply.received",
      agent: "mitra",
      requestId: id,
      status: "success",
      metadata: {
        leadId: msg.leadId,
        channel: msg.channel,
        direction: msg.direction,
      },
    });

    return newMessage;
  }

  /**
   * Retrieves messages for a conversation
   */
  async getMessages(conversationId: string): Promise<CRMMessage[]> {
    const messages = this.getMessagesList();
    return messages
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  /**
   * Retrieves all messages for a lead across all conversations
   */
  async getMessagesForLead(leadId: string): Promise<CRMMessage[]> {
    const messages = this.getMessagesList();
    return messages
      .filter((m) => m.leadId === leadId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  /**
   * Creates a CRM timeline event
   */
  async createCRMEvent(event: Omit<CRMEvent, "id" | "timestamp"> & { timestamp?: string }): Promise<CRMEvent> {
    ensureStorage();
    const now = event.timestamp || new Date().toISOString();
    const id = `evt_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;

    const newEvent: CRMEvent = {
      ...event,
      id,
      timestamp: now,
    };

    const timeline = this.getTimelineList();
    timeline.push(newEvent);
    writeJSON(TIMELINE_FILE, timeline);

    return newEvent;
  }

  /**
   * Retrieves timeline events for a lead in chronological order
   */
  async getTimeline(leadId: string): Promise<CRMEvent[]> {
    const timeline = this.getTimelineList();
    return timeline
      .filter((e) => e.leadId === leadId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  /**
   * Updates lead CRM status and records transition history
   */
  async updateLeadStatus(
    leadId: string,
    newStatus: CRMLeadStatus,
    reason: string,
    source: StatusTransitionRecord["source"] = "system",
    messageId?: string,
    conversationId?: string,
    userId?: string
  ): Promise<LeadCRMState | null> {
    ensureStorage();
    const now = new Date().toISOString();
    const statesMap = this.getLeadStatesMap();
    const currentState = statesMap[leadId];

    const prevStatus: CRMLeadStatus = currentState ? currentState.status : "DISCOVERED";
    const history = currentState ? currentState.history || [] : [];

    const transition: StatusTransitionRecord = {
      previousStatus: prevStatus,
      newStatus,
      reason,
      timestamp: now,
      source,
      messageId,
      conversationId,
    };

    history.push(transition);
    statesMap[leadId] = {
      status: newStatus,
      history,
      updatedAt: now,
    };
    writeJSON(LEAD_STATES_FILE, statesMap);

    // Record timeline event
    await this.createCRMEvent({
      leadId,
      type: "STATUS_CHANGED",
      actor: source === "admin" ? "admin" : "system",
      description: `Status changed from ${prevStatus} to ${newStatus}: ${reason}`,
      metadata: { previousStatus: prevStatus, newStatus, reason, messageId },
    });

    emitAgentEvent({
      event: "crm.status.changed",
      agent: "mitra",
      status: "success",
      metadata: { leadId, previousStatus: prevStatus, newStatus, reason },
    });

    const finalState = await this.getLeadCRMState(leadId, userId);
    if (finalState) {
      saveLeadCRMStateToPostgres(finalState).catch(() => {});
    }
    return finalState;
  }

  /**
   * Ingests Phase 11 simulated outbound outreach records
   * if not already seeded.
   */
  async seedFromPhase11(leadId: string, userId?: string): Promise<void> {
    ensureStorage();
    if (!fs.existsSync(OUTREACH_FILE)) return;

    try {
      const raw = fs.readFileSync(OUTREACH_FILE, "utf-8");
      const outreachRecords = JSON.parse(raw) as OutreachRecord[];
      const leadOutreach = outreachRecords.filter(
        (o) => o.leadId === leadId && (userId ? o.userId === userId : true)
      );

      for (const rec of leadOutreach) {
        const convId = `conv_${rec.leadId}_${rec.channel}`;
        const existingConv = await this.getConversation(convId);

        let conv = existingConv;
        if (!conv) {
          const now = rec.createdAt || new Date().toISOString();
          conv = {
            id: convId,
            leadId: rec.leadId,
            channel: rec.channel,
            status: rec.status === "simulated_sent" ? "WAITING_FOR_REPLY" : "OPEN",
            createdAt: now,
            updatedAt: rec.updatedAt || now,
            lastMessageAt: rec.simulatedAt || rec.createdAt || now,
            messageCount: 0,
            unreadCount: 0,
            owner: "WebsiteBanja Outreach Agent",
            userId: rec.userId,
          };
          const convs = this.getConversations();
          convs.unshift(conv);
          writeJSON(CONVERSATIONS_FILE, convs);
        }

        // Check if outbound message is already recorded
        const msgs = await this.getMessages(convId);
        const alreadyHasMsg = msgs.some((m) => m.metadata?.outreachId === rec.outreachId);

        if (!alreadyHasMsg) {
          const now = rec.simulatedAt || rec.approvedAt || rec.createdAt || new Date().toISOString();
          const newMsg: CRMMessage = {
            id: `msg_out_${rec.outreachId}`,
            leadId: rec.leadId,
            conversationId: convId,
            channel: rec.channel,
            direction: "outbound",
            messageText: rec.message,
            timestamp: now,
            source: "outreach_handoff",
            metadata: {
              outreachId: rec.outreachId,
              subject: rec.subject,
              previewUrl: rec.previewUrl,
            },
          };

          const allMsgs = this.getMessagesList();
          allMsgs.push(newMsg);
          writeJSON(MESSAGES_FILE, allMsgs);

          // Update conv count
          await this.updateConversation(convId, {
            messageCount: (conv.messageCount || 0) + 1,
            lastMessageAt: now,
            status: rec.status === "simulated_sent" ? "WAITING_FOR_REPLY" : conv.status,
          });

          // Check if timeline event already recorded
          const timeline = await this.getTimeline(leadId);
          const hasEvt = timeline.some((e) => e.metadata?.outreachId === rec.outreachId);
          if (!hasEvt) {
            await this.createCRMEvent({
              leadId: rec.leadId,
              type: rec.status === "simulated_sent" ? "OUTREACH_SIMULATED" : "OUTREACH_DRAFTED",
              timestamp: now,
              actor: "system",
              description: `Personalized ${rec.channel.toUpperCase()} outreach ${rec.status === "simulated_sent" ? "simulated sent" : "drafted"} for ${rec.business.name}`,
              metadata: {
                outreachId: rec.outreachId,
                channel: rec.channel,
                previewUrl: rec.previewUrl,
              },
            });
          }

          // Update lead status to OUTREACH_SENT if simulated_sent
          if (rec.status === "simulated_sent") {
            const statesMap = this.getLeadStatesMap();
            if (!statesMap[leadId] || statesMap[leadId].status === "DISCOVERED" || statesMap[leadId].status === "QUALIFIED") {
              statesMap[leadId] = {
                status: "OUTREACH_SENT",
                history: [
                  {
                    previousStatus: "QUALIFIED",
                    newStatus: "OUTREACH_SENT",
                    reason: `Simulated dispatch of ${rec.channel} outreach to local outbox`,
                    timestamp: now,
                    source: "simulation",
                  },
                ],
                updatedAt: now,
              };
              writeJSON(LEAD_STATES_FILE, statesMap);
            }
          }
        }
      }
    } catch (err) {
      console.error("[CRMRepository] seedFromPhase11 failed:", err);
    }
  }

  /**
   * Retrieves full aggregated CRM state for a single lead
   */
  async getLeadCRMState(leadId: string, userId?: string): Promise<LeadCRMState | null> {
    await this.seedFromPhase11(leadId, userId);

    // Look up lead details from Phase 8 scratch storage
    let businessName = "Unknown Business";
    let industry = "general";
    let city = "Vadodara";
    let email: string | undefined;
    let phone: string | undefined;
    let website: string | undefined;

    if (fs.existsSync(LEADS_FILE)) {
      try {
        const raw = fs.readFileSync(LEADS_FILE, "utf-8");
        const leads = JSON.parse(raw) as any[];
        const lead = leads.find((l) => l.leadId === leadId);
        if (lead) {
          businessName = lead.businessName || businessName;
          industry = lead.industry || lead.category || industry;
          city = lead.city || city;
          email = lead.email;
          phone = lead.phone;
          website = lead.website;
        }
      } catch (err) {
        console.error("[CRMRepository] Error reading leads file:", err);
      }
    }

    const statesMap = this.getLeadStatesMap();
    const leadState = statesMap[leadId];

    if (!leadState) {
      try {
        const pgState = await getLeadCRMStateFromPostgres(leadId);
        if (pgState) return pgState;
      } catch {}
    }

    const status: CRMLeadStatus = leadState ? leadState.status : "DISCOVERED";
    const statusHistory: StatusTransitionRecord[] = leadState ? leadState.history || [] : [];

    const conversations = this.getConversations().filter(
      (c) => c.leadId === leadId && (userId ? c.userId === userId : true)
    );
    const activeConversation = conversations[0];
    const messages = await this.getMessagesForLead(leadId);
    const timeline = await this.getTimeline(leadId);

    // Latest analysis from latest inbound message if available
    const lastInbound = [...messages].reverse().find((m) => m.direction === "inbound");
    const latestAnalysis = lastInbound?.metadata?.rawPayload?.analysis as any;
    const nextAction = lastInbound?.metadata?.rawPayload?.nextAction as any;

    return {
      leadId,
      businessName,
      industry,
      city,
      email,
      phone,
      website,
      status,
      statusHistory,
      activeConversation,
      messages,
      latestAnalysis,
      nextAction,
      timeline,
      updatedAt: leadState?.updatedAt || new Date().toISOString(),
      userId,
    };
  }

  /**
   * Lists all leads that have entered CRM pipeline
   */
  async listLeadCRMStates(filter?: ListCRMFilter): Promise<LeadCRMState[]> {
    ensureStorage();
    const statesMap = this.getLeadStatesMap();
    const leadIds = new Set<string>(Object.keys(statesMap));

    // Also include any leads from Azure PostgreSQL
    try {
      const pgStates = await listLeadCRMStatesFromPostgres(filter?.userId);
      for (const pgs of pgStates) {
        leadIds.add(pgs.leadId);
      }
    } catch {}

    // Also include any leads from Phase 11 outreach
    if (fs.existsSync(OUTREACH_FILE)) {
      try {
        const raw = fs.readFileSync(OUTREACH_FILE, "utf-8");
        const outreachRecords = JSON.parse(raw) as OutreachRecord[];
        for (const o of outreachRecords) {
          if (!filter?.userId || o.userId === filter.userId) {
            leadIds.add(o.leadId);
          }
        }
      } catch (e) {
        // ignore
      }
    }

    const states: LeadCRMState[] = [];
    for (const leadId of leadIds) {
      const state = await this.getLeadCRMState(leadId, filter?.userId);
      if (!state) continue;

      if (filter?.status && state.status !== filter.status) continue;
      if (filter?.channel && state.activeConversation?.channel !== filter.channel) continue;
      if (filter?.search) {
        const q = filter.search.toLowerCase();
        const match =
          state.businessName.toLowerCase().includes(q) ||
          state.industry.toLowerCase().includes(q) ||
          state.city?.toLowerCase().includes(q) ||
          state.leadId.toLowerCase().includes(q);
        if (!match) continue;
      }

      states.push(state);
    }

    return states.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }
}

export const crmRepository = new CRMRepository();
