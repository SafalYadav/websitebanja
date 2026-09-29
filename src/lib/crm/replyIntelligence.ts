// src/lib/crm/replyIntelligence.ts
/**
 * WebsiteBanja Reply Intelligence Engine
 * Phase: Phase 12 (Reply Intelligence + CRM Foundation)
 *
 * Classifies inbound business responses by:
 *   - Intent (14 canonical categories)
 *   - Sentiment (POSITIVE, NEUTRAL, NEGATIVE, MIXED, UNKNOWN)
 *   - Urgency (LOW, MEDIUM, HIGH)
 *   - Confidence Score (0.0 to 1.0)
 *   - Key Signals & Factual Extraction
 *   - Human Review Triggers (Low confidence < 0.65 or ambiguous syntax)
 *
 * Factual Safety:
 *   - NEVER invents prices, discounts, customer information, services, or fake meeting times.
 *   - If context is missing, marks as UNKNOWN / UNCLEAR.
 *   - Implements multi-provider AI classification with guaranteed deterministic safe fallback.
 */

import type {
  ReplyIntent,
  ReplySentiment,
  ReplyUrgency,
  ReplyAnalysis,
  AnalyzeReplyRequest,
} from "./types";
import { determineNextAction } from "./nextActionEngine";
import { ModelRouter } from "@/lib/ai/router/modelRouter";
import { emitAgentEvent } from "@/lib/telemetry/agentTelemetry";

const modelRouter = new ModelRouter();

// =============================================================================
// DETERMINISTIC PATTERN MATCHER & HEURISTIC ENGINE
// =============================================================================

interface PatternRule {
  intent: ReplyIntent;
  sentiment: ReplySentiment;
  urgency: ReplyUrgency;
  confidence: number;
  patterns: RegExp[];
  keySignals: string[];
}

const DETERMINISTIC_RULES: PatternRule[] = [
  // 1. DO_NOT_CONTACT (Explicit opt-out)
  {
    intent: "DO_NOT_CONTACT",
    sentiment: "NEGATIVE",
    urgency: "HIGH",
    confidence: 0.98,
    patterns: [
      /don['’]?t contact (me|us) again/i,
      /do not contact (me|us)/i,
      /remove (me|my email|my number)/i,
      /unsubscribe/i,
      /stop messaging/i,
      /stop emailing/i,
      /leave (me|us) alone/i,
      /harassment/i,
      /report (spam|you)/i,
    ],
    keySignals: ["Explicit opt-out request", "Unsubscribe/removal demand"],
  },

  // 2. ALREADY_HAS_WEBSITE
  {
    intent: "ALREADY_HAS_WEBSITE",
    sentiment: "NEUTRAL",
    urgency: "LOW",
    confidence: 0.95,
    patterns: [
      /already (have|has|got) (our own|a)?.*(website|site)/i,
      /already have a (website|site)/i,
      /already got a (website|site)/i,
      /we have our own (website|site|developer|team|agency)/i,
      /existing website/i,
      /just launched our (new )?website/i,
      /our site is already live/i,
    ],
    keySignals: ["Existing website stated", "Current development partner in place"],
  },

  // 3. NOT_INTERESTED
  {
    intent: "NOT_INTERESTED",
    sentiment: "NEGATIVE",
    urgency: "LOW",
    confidence: 0.92,
    patterns: [
      /not interested/i,
      /no thanks/i,
      /no thank you/i,
      /pass on this/i,
      /don['’]?t need (a |this )?website/i,
      /not looking for (a |any )?website/i,
      /please don['’]?t reach out/i,
    ],
    keySignals: ["Declined proposal", "No website requirement"],
  },

  // 4. ASKING_FOR_CALL
  {
    intent: "ASKING_FOR_CALL",
    sentiment: "POSITIVE",
    urgency: "HIGH",
    confidence: 0.95,
    patterns: [
      /(can we|let['’]?s|could we) (schedule|set up|do|have|book) (a |an )?(quick )?(call|phone call|meeting|zoom|chat|google meet)/i,
      /give me a call/i,
      /call me at/i,
      /call me on/i,
      /reach me at (phone|\+?\d{10})/i,
      /discuss over a (call|phone call|meeting)/i,
      /when are you free to speak/i,
      /let['’]?s talk tomorrow/i,
    ],
    keySignals: ["Requested phone call or virtual meeting", "Offered phone number or meeting time"],
  },

  // 5. ASKING_FOR_DEMO
  {
    intent: "ASKING_FOR_DEMO",
    sentiment: "POSITIVE",
    urgency: "MEDIUM",
    confidence: 0.92,
    patterns: [
      /can you send (a )?demo/i,
      /show me (other |more )?(examples|samples|work|portfolio)/i,
      /do you have (other |more )?samples/i,
      /can I see (live|past) work/i,
      /other clients in (restaurant|fitness|hotel|law)/i,
    ],
    keySignals: ["Requested portfolio samples", "Asked for live capability demonstration"],
  },

  // 6. ASKING_PRICE
  {
    intent: "ASKING_PRICE",
    sentiment: "POSITIVE",
    urgency: "HIGH",
    confidence: 0.95,
    patterns: [
      /(how much|what) (would|does|will|is|are)?.*(cost|price|pricing|charge|rate|quote|quotation|package)/i,
      /what would (something like this|this|it) cost/i,
      /how much (would|does) (it|this|something like this|a website like this) cost/i,
      /price quotation/i,
      /send me a quote/i,
      /what are your rates/i,
      /cost estimation/i,
      /charges for this/i,
    ],
    keySignals: ["Explicit price/cost inquiry", "Requested quotation or budget details"],
  },

  // 7. NEEDS_TIME
  {
    intent: "NEEDS_TIME",
    sentiment: "NEUTRAL",
    urgency: "MEDIUM",
    confidence: 0.88,
    patterns: [
      /(busy|traveling|travelling) (right now|this week)/i,
      /(check|touch base|follow up|reach out) (back |again )?(next week|next month|later|after)/i,
      /give (me|us) some time/i,
      /will review (next week|later)/i,
      /evaluating next quarter/i,
    ],
    keySignals: ["Currently busy or evaluating timing", "Requested later follow-up date"],
  },

  // 8. ASKING_FOR_DETAILS
  {
    intent: "ASKING_FOR_DETAILS",
    sentiment: "POSITIVE",
    urgency: "MEDIUM",
    confidence: 0.88,
    patterns: [
      /what (technology|platform|stack) (do you use|is this)/i,
      /how (long|many days) (does it take|to launch|to build)/i,
      /does it include (domain|hosting|seo|whatsapp)/i,
      /can you explain the process/i,
      /tell me more about/i,
    ],
    keySignals: ["Technical inquiry", "Timeline or feature clarification request"],
  },

  // 9. INTERESTED (General commercial interest)
  {
    intent: "INTERESTED",
    sentiment: "POSITIVE",
    urgency: "HIGH",
    confidence: 0.90,
    patterns: [
      /(looks|sounds) (very |super )?(promising|interesting|impressive|great)/i,
      /i (really |definitely )?like the (preview|concept|design)/i,
      /we (would like|want) to (proceed|move forward|publish this)/i,
      /interested in (this|getting this published)/i,
      /how do we get started/i,
    ],
    keySignals: ["Active commercial interest", "Positive reception of interactive preview"],
  },

  // 10. WRONG_CONTACT
  {
    intent: "WRONG_CONTACT",
    sentiment: "NEUTRAL",
    urgency: "LOW",
    confidence: 0.90,
    patterns: [
      /wrong (person|email|number|contact)/i,
      /i am not the (owner|manager|decision maker)/i,
      /i don['’]?t handle (websites|marketing|it)/i,
      /contact our (marketing|it) department/i,
      /please email (someone else|info@)/i,
    ],
    keySignals: ["Informed wrong recipient or department", "Directs inquiry elsewhere"],
  },

  // 11. CONFUSED
  {
    intent: "CONFUSED",
    sentiment: "NEUTRAL",
    urgency: "MEDIUM",
    confidence: 0.82,
    patterns: [
      /who are you/i,
      /how did you get (my|our) (number|email|details)/i,
      /what is this regarding/i,
      /i don['’]?t understand/i,
    ],
    keySignals: ["Sender identity questioned", "Source of outreach query"],
  },

  // 12. POSITIVE_GENERAL
  {
    intent: "POSITIVE_GENERAL",
    sentiment: "POSITIVE",
    urgency: "LOW",
    confidence: 0.85,
    patterns: [
      /nice work/i,
      /looks cool/i,
      /thanks for sharing/i,
      /good job/i,
      /appreciate the message/i,
    ],
    keySignals: ["Polite appreciation", "No explicit purchase commitment"],
  },
];

/**
 * Classifies an inbound reply using deterministic heuristics
 */
export function classifyReplyDeterministically(messageText: string, businessName?: string): ReplyAnalysis {
  const clean = messageText.trim();

  // Edge Case: Extremely short, ambiguous replies
  if (clean.length < 5 || /^(ok|k|yes|cool|thumbs up|👍|fine|\?)$/i.test(clean)) {
    const nextAction = determineNextAction({
      intent: "UNCLEAR",
      sentiment: "NEUTRAL",
      urgency: "LOW",
      confidence: 0.40,
      requiresHumanReview: true,
      businessName,
    });

    return {
      intent: "UNCLEAR",
      sentiment: "NEUTRAL",
      urgency: "LOW",
      confidence: 0.40,
      summary: `Ambiguous single-token reply received: "${clean}"`,
      keySignals: ["Ambiguous brevity", "Lacks substantive context"],
      recommendedAction: nextAction.recommendedAction,
      requiresHumanReview: true,
      analyzedAt: new Date().toISOString(),
      provider: "deterministic_fallback",
    };
  }

  // Scan against deterministic rules
  for (const rule of DETERMINISTIC_RULES) {
    for (const pat of rule.patterns) {
      if (pat.test(clean)) {
        const nextAction = determineNextAction({
          intent: rule.intent,
          sentiment: rule.sentiment,
          urgency: rule.urgency,
          confidence: rule.confidence,
          requiresHumanReview: false,
          businessName,
        });

        return {
          intent: rule.intent,
          sentiment: rule.sentiment,
          urgency: rule.urgency,
          confidence: rule.confidence,
          summary: `Reply indicates ${rule.intent.toLowerCase().replace(/_/g, " ")}.`,
          keySignals: rule.keySignals,
          recommendedAction: nextAction.recommendedAction,
          requiresHumanReview: rule.confidence < 0.65,
          analyzedAt: new Date().toISOString(),
          provider: "deterministic_fallback",
        };
      }
    }
  }

  // Fallback for unclassified text
  const nextAction = determineNextAction({
    intent: "OTHER",
    sentiment: "UNKNOWN",
    urgency: "LOW",
    confidence: 0.50,
    requiresHumanReview: true,
    businessName,
  });

  return {
    intent: "OTHER",
    sentiment: "UNKNOWN",
    urgency: "LOW",
    confidence: 0.50,
    summary: "Incoming reply does not cleanly match established intent patterns.",
    keySignals: ["Unclassified general message"],
    recommendedAction: nextAction.recommendedAction,
    requiresHumanReview: true,
    analyzedAt: new Date().toISOString(),
    provider: "deterministic_fallback",
  };
}

/**
 * Analyzes an inbound message via AI provider with guaranteed deterministic fallback
 */
export async function analyzeInboundReply(req: AnalyzeReplyRequest): Promise<ReplyAnalysis> {
  const { messageText, leadContext } = req;
  const businessName = leadContext?.businessName;

  // 1. Attempt AI Structured Classification if API keys are configured
  if (process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY) {
    try {
      const prompt = `You are WebsiteBanja's Reply Intelligence Agent.
Analyze the following inbound client reply to an outreach message showcasing a bespoke website preview.

Client Message: "${messageText}"
Target Business: "${businessName || "Local Business"}"

Classify into one of the following exact Intents:
- INTERESTED: Strong interest in moving forward.
- ASKING_PRICE: Explicitly asks for pricing, rates, cost, or quotation.
- ASKING_FOR_DETAILS: Asks for technical stack, timeline, or scope details.
- ASKING_FOR_DEMO: Asks for more examples, portfolio, or demonstrations.
- ASKING_FOR_CALL: Suggests or requests a phone/video call.
- POSITIVE_GENERAL: Polite praise without immediate commitment.
- NEEDS_TIME: Busy, traveling, or requests follow-up later.
- NOT_INTERESTED: Rejects or declines the offer.
- ALREADY_HAS_WEBSITE: States they already have a website or web team.
- WRONG_CONTACT: Wrong person, department, or company.
- DO_NOT_CONTACT: Demands removal, unsubscribe, or to stop contacting.
- CONFUSED: Asks who we are or expresses confusion.
- UNCLEAR: Ambiguous, one-word, or incomprehensible.
- OTHER: None of the above.

Classify Sentiment: POSITIVE, NEUTRAL, NEGATIVE, MIXED, UNKNOWN.
Classify Urgency: LOW, MEDIUM, HIGH.
Confidence: Float between 0.0 and 1.0.

Provide JSON strictly matching this schema:
{
  "intent": string,
  "sentiment": string,
  "urgency": string,
  "confidence": number,
  "summary": string,
  "keySignals": string[]
}`;

      const aiRes = await modelRouter.route<{
        intent: string;
        sentiment: string;
        urgency: string;
        confidence: number;
        summary: string;
        keySignals: string[];
      }>({
        userPrompt: prompt,
        temperature: 0.1,
      });

      if (aiRes.success && aiRes.data && typeof aiRes.data.confidence === "number") {
        const p = aiRes.data;
        const intent = (p.intent as ReplyIntent) || "OTHER";
        const sentiment = (p.sentiment as ReplySentiment) || "UNKNOWN";
        const urgency = (p.urgency as ReplyUrgency) || "LOW";
        const confidence = Math.max(0.1, Math.min(1.0, p.confidence));
        const requiresHumanReview = confidence < 0.65 || intent === "UNCLEAR" || intent === "CONFUSED";

        const nextAction = determineNextAction({
          intent,
          sentiment,
          urgency,
          confidence,
          requiresHumanReview,
          businessName,
        });

        emitAgentEvent({
          event: "crm.reply.analyzed",
          agent: "mitra",
          status: "success",
          metadata: { intent, sentiment, urgency, confidence, provider: "ai_model" },
        });

        return {
          intent,
          sentiment,
          urgency,
          confidence,
          summary: p.summary || `Reply classified as ${intent}`,
          keySignals: Array.isArray(p.keySignals) ? p.keySignals : [],
          recommendedAction: nextAction.recommendedAction,
          requiresHumanReview,
          analyzedAt: new Date().toISOString(),
          provider: "ai_model",
        };
      }
    } catch (err) {
      emitAgentEvent({
        event: "crm.reply.analysis_failed",
        agent: "mitra",
        status: "error",
        metadata: { error: err instanceof Error ? err.message : String(err) },
      });
      // Fallback seamlessly to deterministic classification below
    }
  }

  // 2. Deterministic Fallback
  const result = classifyReplyDeterministically(messageText, businessName);

  emitAgentEvent({
    event: "crm.reply.analyzed",
    agent: "mitra",
    status: "success",
    metadata: {
      intent: result.intent,
      sentiment: result.sentiment,
      urgency: result.urgency,
      confidence: result.confidence,
      provider: "deterministic_fallback",
    },
  });

  return result;
}
