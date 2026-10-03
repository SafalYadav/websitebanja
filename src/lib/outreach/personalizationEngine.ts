// src/lib/outreach/personalizationEngine.ts
/**
 * WebsiteBanja Personalized Outreach Engine
 * Phase: Phase 11 (Personalized Outreach Foundation)
 *
 * Consumes:
 *   - Phase 8: Qualified Lead Data (verified name, city, ratings, phone)
 *   - Phase 9: Research & Multi-Dimensional Website Audit Findings
 *   - Phase 10: Personalized WebsiteBanja Preview & OutreachContext
 *
 * Produces:
 *   - Factual, high-converting, channel-optimized outreach drafts
 *   - Channel support: Email, WhatsApp, Instagram, SMS
 *   - Deduplicated and stored in local scratch outbox
 *   - Multi-tenant isolated & structured for Phase 12 CRM handoff
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import type {
  DraftOutreachRequest,
  DraftOutreachResponse,
  OutreachRecord,
  OutreachChannel,
  OutreachBusinessInfo,
  OutreachPersonalizationData,
} from "./types";
import { leadRepository } from "@/lib/discovery/leadRepository";
import { auditRepository } from "@/lib/audit/auditRepository";
import { createSyntheticMissingWebsiteAudit } from "@/lib/audit/auditEngine";
import { canonicalGenerationOrchestrator } from "@/lib/intelligence/orchestration/canonicalGenerationOrchestrator";
import type { StoredPreviewRecord } from "@/lib/personalization/types";
import type { BusinessLead } from "@/lib/discovery/types";
import type { LeadAuditReport } from "@/lib/audit/types";
import { outreachRepository } from "./outreachRepository";
import { validateOutreachDraft } from "./qualityValidator";
import { emitAgentEvent } from "@/lib/telemetry/agentTelemetry";

const PREVIEW_DIR = path.resolve(process.cwd(), "scratch/previews");

function readStoredPreviews(): StoredPreviewRecord[] {
  try {
    const fileA = path.join(PREVIEW_DIR, "manifest.json");
    if (fs.existsSync(fileA)) {
      return JSON.parse(fs.readFileSync(fileA, "utf-8"));
    }
    const fileB = path.join(PREVIEW_DIR, "preview-manifest.json");
    if (fs.existsSync(fileB)) {
      return JSON.parse(fs.readFileSync(fileB, "utf-8"));
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Derives a human-readable observation based on actual audit data
 */
function extractAuditObservation(lead: BusinessLead, audit: LeadAuditReport): {
  observation: string;
  impact: string;
} {
  const isMissingSite =
    audit.website.status === "missing" ||
    audit.website.status === "unreachable" ||
    lead.websiteStatus === "missing";

  const loc = lead.city || "your area";
  const repText = lead.rating
    ? `strong local reputation (${lead.rating}★ across ${lead.reviewCount || 0} customer reviews)`
    : "established local presence";

  if (isMissingSite) {
    return {
      observation: `while ${lead.businessName} has built a ${repText} in ${loc}, there is no dedicated, mobile-friendly website where prospective clients can browse offerings or reach you directly online`,
      impact: `Local patrons increasingly look for quick menu/booking details or direct WhatsApp channels before making an inquiry.`,
    };
  }

  // Analyze specific audit issue categories
  if (audit.mobile && !audit.mobile.responsiveMetaPresent) {
    return {
      observation: `your current website layout doesn't adapt cleanly to smartphone screens, which makes navigation and button tapping difficult on mobile devices`,
      impact: `Over 70% of local search traffic comes from smartphones, so an optimized mobile layout directly impacts how many visitors convert into paying clients.`,
    };
  }

  if (audit.conversion && !audit.conversion.hasWhatsAppLink && !audit.conversion.hasPhoneCta) {
    return {
      observation: `your website makes it difficult for mobile visitors to initiate quick contact, lacking direct 1-click WhatsApp or clickable phone booking options`,
      impact: `Adding effortless 1-click communication immediately reduces friction for customers ready to reserve or book.`,
    };
  }

  if (audit.technical && !audit.technical.https) {
    return {
      observation: `your web address currently operates without modern HTTPS security certificates, which can display browser security warnings to prospective visitors`,
      impact: `A modern, secure web presence instills immediate trust and prevents visitors from turning away.`,
    };
  }

  return {
    observation: `your web presence could deliver a significantly more refined visual presentation that matches the high standard of your work in ${loc}`,
    impact: `A modern, fast-loading digital showcase ensures your online presence reflects the true quality of your establishment.`,
  };
}

/**
 * Email Formatter: Professional, concise, 5-part structure
 */
function formatEmailDraft(
  business: OutreachBusinessInfo,
  previewUrl: string,
  observation: { observation: string; impact: string },
  lead: BusinessLead
): { subject: string; message: string } {
  const name = business.name;
  const loc = lead.city || "your city";
  const firstWord = name.split(" ")[0];

  const subject = `A new website concept for ${name}`;

  const message = `Hi ${name} team,

I came across ${name} while looking at leading businesses in ${loc} and noticed ${observation.observation}.

${observation.impact}

To demonstrate what a modern digital presence could look like, I designed a bespoke website concept for ${firstWord}, complete with:
- A clean, mobile-first responsive layout tailored to your industry
- Direct 1-click WhatsApp concierge and instant phone inquiry buttons
- Highlighted local trust signals and genuine customer feedback
- High-resolution visual showcasing with zero generic template feel

You can explore the interactive local preview here:
${previewUrl}

If you would like to see this published with your exact branding and domain, I would be delighted to coordinate a quick handover. Either way, I hope the concept serves as a helpful reference!

Best regards,
Safal Yadav
WebsiteBanja Architecture Team
Vadodara, Gujarat`;

  return { subject, message };
}

/**
 * WhatsApp Formatter: Concise, conversational, respectful tone
 */
function formatWhatsAppDraft(
  business: OutreachBusinessInfo,
  previewUrl: string,
  observation: { observation: string; impact: string }
): { message: string } {
  const name = business.name;
  const firstWord = name.split(" ")[0];

  const message = `Hi ${firstWord} team! I noticed ${business.name} has a great reputation locally, but ${observation.observation}.

I put together a fast, mobile-friendly website concept featuring 1-click WhatsApp booking and modern visual showcase:
${previewUrl}

Hope the concept is helpful! Let me know if you would like me to share more details.`;

  return { message };
}

/**
 * Instagram Formatter: Natural, short DM suitable for creative outreach
 */
function formatInstagramDraft(
  business: OutreachBusinessInfo,
  previewUrl: string
): { message: string } {
  const name = business.name;
  const firstWord = name.split(" ")[0];

  const message = `Hey ${firstWord} team! Really appreciate your work and local reputation. I put together a clean, modern mobile website concept tailored for ${name}:
${previewUrl}
Thought you might like to see it — hope it provides some inspiration!`;

  return { message };
}

/**
 * SMS Formatter: Ultra-short, punchy (under 160 characters)
 */
function formatSmsDraft(
  business: OutreachBusinessInfo,
  previewUrl: string
): { message: string } {
  const firstWord = business.name.split(" ")[0];
  // Strict < 160 char limit
  const message = `Hi ${firstWord}! Here is a modern mobile website concept tailored for ${business.name}: ${previewUrl} - from WebsiteBanja.`;
  return { message: message.slice(0, 160) };
}

/**
 * Core engine method to generate personalized outreach draft
 */
export async function generateOutreachDraft(
  request: DraftOutreachRequest
): Promise<DraftOutreachResponse> {
  const startTime = Date.now();
  const requestId = `req_outreach_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
  const channel: OutreachChannel = request.channel || "email";

  emitAgentEvent({
    event: "outreach.draft.started",
    agent: "mitra",
    requestId,
    metadata: { leadId: request.leadId, channel },
  });

  // 1. Resolve Lead
  let lead: BusinessLead | null = null;
  if (request.overrideLead) {
    lead = request.overrideLead as BusinessLead;
  } else {
    lead = await leadRepository.findLeadById(request.leadId, request.userId);
  }

  if (!lead) {
    return {
      success: false,
      handoffPhase: "phase12_reply_intelligence_crm",
      error: {
        code: "LEAD_NOT_FOUND",
        message: `Lead with ID '${request.leadId}' was not found in storage.`,
      },
    };
  }

  // 2. Resolve Audit
  let audit: LeadAuditReport | null = null;
  if (request.overrideAudit) {
    audit = request.overrideAudit as LeadAuditReport;
  } else {
    if (request.auditId) {
      audit = await auditRepository.findAuditById(request.auditId, request.userId);
    }
    if (!audit) {
      audit = await auditRepository.findAuditByLeadId(request.leadId, request.userId);
    }
  }

  if (!audit) {
    const synth = createSyntheticMissingWebsiteAudit(lead);
    audit = {
      auditId: `audit_auto_${Date.now()}`,
      leadId: lead.leadId,
      auditedAt: new Date().toISOString(),
      business: {
        businessName: lead.businessName,
        category: lead.category,
        industry: lead.industry || lead.category,
        location: lead.city || lead.address || "Vadodara, Gujarat",
        phone: lead.phone,
        email: lead.email,
        website: lead.website,
      },
      research: {
        businessName: lead.businessName,
        industry: lead.industry || lead.category,
        category: lead.category,
        location: lead.city || lead.address || "Vadodara, Gujarat",
        summary: `${lead.businessName} is an active local business.`,
        publicContact: { phone: lead.phone, email: lead.email, address: lead.address },
        socialPresence: [],
        reputationSummary: lead.rating ? `${lead.rating}/5.0 (${lead.reviewCount} reviews)` : "Active business",
      },
      website: {
        status: (lead.websiteStatus as any) || "missing",
        url: lead.website || "",
        pagesAudited: 0,
        auditedUrls: [],
      },
      opportunity: {
        score: 90,
        reasons: ["No active website discovered for this business."],
      },
      technical: synth.technical,
      mobile: synth.mobile,
      ux: synth.ux,
      seo: synth.seo,
      conversion: synth.conversion,
      performance: synth.performance,
      accessibility: synth.accessibility,
      recommendations: ["Deploy modern hosted WebsiteBanja website."],
      phase10DesignInputs: {
        visualDirection: "modern high trust",
        layoutStrategy: "clean hero with prominent call-to-action",
        requiredSections: ["hero", "services", "features", "reviews", "contact", "footer"],
        ctaStrategy: "direct inquiry",
        imageryDirection: "clean authentic",
        contentPriorities: ["services", "trust signals"],
      },
      handoffPhase: "phase10_automated_preview_generation",
    };
  }

  const finalAudit: LeadAuditReport = audit;

  // 3. Resolve Preview Record
  let preview: StoredPreviewRecord | null = null;
  if (request.overridePreview) {
    const rawPrev = request.overridePreview as any;
    const resolvedUrl =
      rawPrev.previewUrl ||
      rawPrev.url ||
      (rawPrev.id ? `https://websitebanja.com/preview/${rawPrev.id}` : `https://websitebanja.com/preview/prev_${lead.leadId}`);

    preview = {
      previewId: rawPrev.previewId || rawPrev.id || `prev_${lead.leadId}`,
      slug: rawPrev.slug || `preview-${lead.leadId}`,
      leadId: lead.leadId,
      auditId: finalAudit.auditId,
      businessName: lead.businessName,
      industry: lead.industry || lead.category,
      generatedAt: rawPrev.createdAt || rawPrev.generatedAt || new Date().toISOString(),
      previewUrl: resolvedUrl,
      qualityScore: rawPrev.qualityScore || 85,
      designArchetype: rawPrev.designArchetype || "Modern Clean",
      imageManifest: rawPrev.imageManifest || [],
      generationStatus: "generated",
      userId: request.userId,
    };
  } else {
    const storedPreviews = readStoredPreviews();
    preview =
      storedPreviews.find(
        (p) =>
          p.leadId === lead!.leadId &&
          (request.userId ? p.userId === request.userId : true)
      ) || null;

    if (!preview && request.previewId) {
      preview = storedPreviews.find((p) => p.previewId === request.previewId) || null;
    }
  }

  // If still no preview, auto-generate one to guarantee a real local preview
  if (!preview) {
    const genRes = await canonicalGenerationOrchestrator.generateWebsite({
      businessName: lead.businessName,
      source: "autonomous_pipeline",
      leadId: lead.leadId,
      overrideLead: lead,
      overrideAudit: finalAudit,
      userId: request.userId,
    });

    if (genRes.success && genRes.previewDetails) {
      preview = {
        previewId: genRes.preview.id,
        slug: genRes.preview.slug,
        leadId: lead.leadId,
        auditId: finalAudit.auditId,
        businessName: lead.businessName,
        industry: lead.industry || lead.category,
        generatedAt: new Date().toISOString(),
        previewUrl: genRes.preview.url,
        qualityScore: genRes.previewDetails.qualityScore,
        designArchetype: genRes.previewDetails.designArchetype,
        imageManifest: genRes.previewDetails.imageManifest,
        generationStatus: "generated",
        userId: request.userId,
      };
    } else {
      throw new Error(genRes.error?.message || "Website generation failed; outreach cannot reference a missing preview.");
    }
  }

  // 4. Duplicate Check (leadId + channel + previewId)
  if (!request.regenerate) {
    const existing = await outreachRepository.findExistingDraft(
      lead.leadId,
      channel,
      preview.previewId,
      request.userId
    );
    if (existing) {
      return {
        success: true,
        outreach: existing,
        reusedExisting: true,
        handoffPhase: "phase12_reply_intelligence_crm",
      };
    }
  }

  // 5. Build Personalization Data
  const businessInfo: OutreachBusinessInfo = {
    name: lead.businessName,
    industry: lead.industry || lead.category,
    location: lead.city ? `${lead.city}, ${lead.state || "India"}` : lead.address || "Vadodara, Gujarat",
    email: request.recipientEmail || lead.email,
    phone: lead.phone,
    website: lead.website,
  };

  const auditObservation = extractAuditObservation(lead, finalAudit);

  const personalizationData: OutreachPersonalizationData = {
    websiteProblems: [auditObservation.observation],
    improvements: [
      `Engineered a high-contrast ${preview.designArchetype} digital showcase for ${lead.businessName}.`,
      `Integrated direct 1-click WhatsApp concierge and phone booking (${lead.phone || "direct channel"}).`,
      `Highlighted authentic local trust signals: ${lead.rating || 5}/5.0 rating in ${lead.city || "Vadodara"}.`,
    ],
    businessSpecificPoints: [
      `Business: ${lead.businessName}`,
      `Location: ${businessInfo.location}`,
      `Reputation: ${lead.rating ? `${lead.rating}★ (${lead.reviewCount || 0} reviews)` : "Active local business"}`,
      `Preview URL: ${preview.previewUrl}`,
    ],
  };

  // 6. Format Content Based on Channel
  let subject: string | undefined;
  let message: string;

  if (channel === "whatsapp") {
    const res = formatWhatsAppDraft(businessInfo, preview.previewUrl, auditObservation);
    message = res.message;
  } else if (channel === "instagram") {
    const res = formatInstagramDraft(businessInfo, preview.previewUrl);
    message = res.message;
  } else if (channel === "sms") {
    const res = formatSmsDraft(businessInfo, preview.previewUrl);
    message = res.message;
  } else {
    // Default: Email
    const res = formatEmailDraft(businessInfo, preview.previewUrl, auditObservation, lead);
    subject = res.subject;
    message = res.message;
  }

  // 7. Validate Draft Quality & Factual Claims
  const validation = validateOutreachDraft({
    channel,
    businessName: lead.businessName,
    previewUrl: preview.previewUrl,
    subject,
    message,
  });

  if (!validation.isValid) {
    emitAgentEvent({
      event: "outreach.draft.validation_failed",
      agent: "mitra",
      requestId,
      status: "error",
      metadata: { issues: validation.issues },
    });
  }

  // 8. Construct Outreach Record
  const outreachId = `outreach_${channel}_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
  const now = new Date().toISOString();

  const record: OutreachRecord = {
    outreachId,
    leadId: lead.leadId,
    auditId: finalAudit.auditId,
    previewId: preview.previewId,
    business: businessInfo,
    channel,
    status: validation.isValid ? "draft" : "review",
    subject,
    message,
    previewUrl: preview.previewUrl,
    personalization: personalizationData,
    validation,
    createdAt: now,
    updatedAt: now,
    userId: request.userId,
    handoffPhase: "phase12_reply_intelligence_crm",
  };

  // 9. Persist to Local Outbox
  await outreachRepository.saveOutreachRecord(record);

  emitAgentEvent({
    event: "outreach.draft.generated",
    agent: "mitra",
    requestId,
    metadata: {
      outreachId: record.outreachId,
      leadId: record.leadId,
      channel: record.channel,
      durationMs: Date.now() - startTime,
    },
  });

  emitAgentEvent({
    event: "outreach.created",
    agent: "mitra",
    requestId,
    metadata: {
      outreachId: record.outreachId,
      status: record.status,
    },
  });

  return {
    success: true,
    outreach: record,
    reusedExisting: false,
    handoffPhase: "phase12_reply_intelligence_crm",
  };
}
