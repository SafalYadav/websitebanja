import { NextResponse } from "next/server";
import { checkMemoryRateLimit } from "@/lib/rateLimit";
import type { ExtractedUserNeeds, AgentTalkResponse } from "@/types/aiAgent";
import { AgentProviderFactory } from "@/lib/ai/agentProviderFactory";
import { normalizeAgentResponse } from "@/lib/ai/agentNormalizer";
import { setProjectKnowledge } from "@/lib/knowledge";
import { getClientIp, authenticateRequest, getUserScopedClient } from "@/lib/supabaseServer";

interface RequestMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface TalkRequestBody {
  messages: RequestMessage[];
  currentNeeds?: ExtractedUserNeeds;
  projectId?: string;
  language?: string;
}

function buildFallbackResponse(
  userText: string,
  history: RequestMessage[],
  priorNeeds: ExtractedUserNeeds
): AgentTalkResponse["data"] {
  const normalized = normalizeAgentResponse("", priorNeeds, userText);
  const mergedNeeds = normalized.extractedNeeds;
  const score = normalized.readinessScore;
  const wantsToBuild = /\b(?:build|generate|create)\s+(?:it|my\s+website|the\s+website|site)\s+now\b|\bstart\s+building\b|\byes[,\s]+(?:generate|build|create)\b|\bready to build\b|\bbuild now\b|\bgenerate now\b/i.test(userText);

  // If user says to build, NEVER ask again! Immediately launch!
  if (wantsToBuild) {
    const reply = `Awesome! Let's bring ${mergedNeeds.businessName || "your business"} to life right now. Launching your website generator...`;
    return {
      reply,
      speechText: reply,
      suggestedReplies: [],
      extractedNeeds: mergedNeeds,
      readinessScore: 100,
      isReadyToBuild: true,
      triggerImmediateBuild: true,
    };
  }

  // If we already have enough information, invite them to build
  if (score >= 65) {
    const reply = `Everything looks fantastic for ${mergedNeeds.businessName || "your business"}! Ready for me to build your website?`;
    return {
      reply,
      speechText: reply,
      suggestedReplies: ["Yes, generate my website now!", "Let's tweak the colors first", "Add another service offering"],
      extractedNeeds: mergedNeeds,
      readinessScore: Math.max(score, 85),
      isReadyToBuild: true,
      triggerImmediateBuild: false,
    };
  }

  if (!mergedNeeds.category || mergedNeeds.category === "Other") {
    const reply = `Hey there! I'm Mitra. What kind of business or project are you dreaming up? Tell me all about it!`;
    return {
      reply,
      speechText: reply,
      suggestedReplies: [
        "Cozy Cafe or Restaurant",
        "Modern Tech Startup",
        "Boutique Clothing & E-Commerce",
        "Personal Portfolio or Agency",
      ],
      extractedNeeds: mergedNeeds,
      readinessScore: 25,
      isReadyToBuild: false,
    };
  }

  if (!mergedNeeds.businessName) {
    const reply = `Ooh, a ${mergedNeeds.category}! Love that. What's the name of your ${mergedNeeds.category.toLowerCase()}, and who are your ideal customers?`;
    return {
      reply,
      speechText: reply,
      suggestedReplies: [
        "It's called Prime Cafe for coffee lovers",
        "We cater to local neighborhood families",
        "High-growth startups and tech professionals"
      ],
      extractedNeeds: mergedNeeds,
      readinessScore: 45,
      isReadyToBuild: false,
    };
  }

  if (!mergedNeeds.services || mergedNeeds.services.length === 0) {
    const reply = `Love the name ${mergedNeeds.businessName}! What are your top 2 or 3 signature specialties or services we should showcase on the homepage?`;
    return {
      reply,
      speechText: reply,
      suggestedReplies: [
        "Artisanal Coffee, Fresh Pastries & Breakfast",
        "Personal Training, Group Classes & Nutrition",
        "Brand Strategy, Web Design & Social Media"
      ],
      extractedNeeds: mergedNeeds,
      readinessScore: 60,
      isReadyToBuild: false,
    };
  }

  const reply = `Sounds great! For ${mergedNeeds.businessName}, what kind of brand vibe feels right? Warm and cozy, clean minimal, or bold and vibrant?`;
  return {
    reply,
    speechText: reply,
    suggestedReplies: [
      "Warm, cozy & earthy tones",
      "Modern minimalist with violet & blue",
      "Luxury bold with obsidian & gold",
      "Everything looks great, build the website now!"
    ],
    extractedNeeds: mergedNeeds,
    readinessScore: 75,
    isReadyToBuild: true,
    triggerImmediateBuild: false,
  };
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const { success: allowed } = checkMemoryRateLimit(`agent_talk_${ip}`, 60, 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { success: false, message: "Too many messages. Please wait a moment." },
        { status: 429 }
      );
    }

    const authenticatedUser = await authenticateRequest(req);

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ success: false, message: "Invalid JSON request." }, { status: 400 });
    }

    const body = (rawBody || {}) as TalkRequestBody;
    const rawMessages = Array.isArray(body?.messages) ? body.messages : [];
    const currentNeeds: ExtractedUserNeeds = body?.currentNeeds || {};

    if (rawMessages.length === 0) {
      return NextResponse.json(
        { success: false, message: "No conversation history provided." },
        { status: 400 }
      );
    }

    // Bounded messages: max 12 items, max 2000 chars each
    const messages: RequestMessage[] = rawMessages.slice(-12).map((m) => ({
      role: m.role === "assistant" || m.role === "system" ? m.role : "user",
      content: String(m.content || "").slice(0, 2000),
    }));

    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")?.content || "";
    const wantsToBuild = /\b(?:build|generate|create)\s+(?:it|my\s+website|the\s+website|site)\s+now\b|\bstart\s+building\b|\byes[,\s]+(?:generate|build|create)\b|\bready to build\b|\bbuild now\b|\bgenerate now\b/i.test(lastUserMessage);

    // If user explicitly asks to generate/build, immediately fulfill without asking again!
    if (wantsToBuild) {
      const bName = currentNeeds.businessName || "your website";
      const reply = `Awesome! Let's bring ${bName} to life right now. Launching your website generator...`;
      return NextResponse.json({
        success: true,
        data: {
          reply,
          speechText: reply,
          suggestedReplies: [],
          extractedNeeds: currentNeeds,
          readinessScore: 100,
          isReadyToBuild: true,
          triggerImmediateBuild: true,
        },
      });
    }

    // Use AgentProviderFactory (OpenAI primary -> Gemini fallback)
    try {
      const primaryProvider = AgentProviderFactory.createPrimary();
      const fallbackProvider = AgentProviderFactory.createFallback();
      let provider = primaryProvider;

      const systemPrompt = `You are Mitra, a warm, energetic, friendly AI Website Architect & Design Partner at WebsiteBanja.
You speak like an enthusiastic, supportive creative designer chatting naturally with a friend.

CRITICAL RULES:
1. ALWAYS return clean, valid JSON matching the schema below. NEVER wrap in markdown code blocks or fences.
2. "reply": Clean conversational spoken text for the user. 1-2 warm, friendly, concise sentences (around 20-30 words). Ask ONE relevant next question. NEVER use markdown formatting (no bold, asterisks, bullet points, numbered lists), NEVER use emojis, and NEVER put code fences or JSON in reply.
3. "speechText": MUST be EXACTLY the same string as "reply". Every word displayed in the chat is spoken aloud.
4. "suggestedReplies": 3 to 4 quick-tap suggested options for the user.
5. "extractedNeeds": Extract canonical facts from conversation:
   {
     "businessName": string,
     "category": string,
     "description": string,
     "targetAudience": string,
     "services": string[],
     "features": string[],
     "style": string,
     "primaryColor": string,
     "secondaryColor": string,
     "phone": string,
     "email": string,
     "whatsappNumber": string,
     "location": string
   }
6. Never auto-generate. Only set "triggerImmediateBuild": true if the user explicitly instructs to build/generate the website now.
7. AUTOMATIC MULTILINGUAL DETECTION & MIRRORING:
   - You are natively fluent in ALL Indian languages: Hindi, Hinglish, Gujarati, Marathi, Bengali, Tamil, Telugu, Kannada, Malayalam, Punjabi, and English.
   - AUTOMATICALLY DETECT the language and script that the user is communicating in from their latest message.
   - You MUST seamlessly switch and reply in the EXACT SAME LANGUAGE and style as the user:
     * If the user speaks/writes in Gujarati (e.g., "Mane Cafe mate website banavvi che" or "મને કાફે માટે વેબસાઇટ બનાવવી છે"), reply naturally and warmly in Gujarati!
     * If the user speaks/writes in Hindi or Hinglish (e.g. "Mujhe ek cafe ke liye website banani hai"), reply fluently in Hindi / Hinglish!
     * If the user speaks/writes in Marathi, Bengali, Tamil, Telugu, Kannada, Malayalam, Punjabi, or English, immediately reply in that language!
     * If the user switches language at any point in the conversation, AUTOMATICALLY SWITCH your language to match them immediately!
   - Include "detectedLanguage": { "code": string, "name": string, "nativeName": string } in your JSON.
   - Ensure "reply", "speechText", and "suggestedReplies" are all in the user's active detected language.
   - Always keep "reply" and "speechText" 100% word-for-word identical.
8. ACCURATE MODIFICATIONS & REMOVALS:
   - When the user modifies or updates a previous preference (e.g., 'Actually change the primary color to dark green', 'Change business name to Apex Care'), immediately update that field in "extractedNeeds".
   - When the user asks to remove or exclude a feature or section (e.g., 'Remove the pricing section', 'Remove testimonials', 'without whatsapp'), remove it from "features" or "services".
   - When the user asks to keep or restore a feature (e.g., 'Wait, keep pricing but make it minimal'), include that feature in "features".
   - Never reset or forget previously confirmed business name, category, or location when the user requests a modification.

JSON Schema:
{
  "reply": string,
  "speechText": string,
  "suggestedReplies": string[],
  "extractedNeeds": object,
  "readinessScore": number,
  "isReadyToBuild": boolean,
  "triggerImmediateBuild": boolean,
  "nextMissingAspect"?: string,
  "detectedLanguage"?: {
    "code": string,
    "name": string,
    "nativeName": string
  }
}`;

      const conversationForModel = [
        { role: "system" as const, content: systemPrompt },
        {
          role: "system" as const,
          content: `AUTOMATIC LANGUAGE DETECTION DIRECTIVE:
Detect the language and script of the user's latest message automatically. Always reply in the exact same language and communication style (Gujarati, Hindi, Hinglish, Marathi, Bengali, Tamil, Telugu, Kannada, Malayalam, Punjabi, or English). If the user switches language, switch your response language immediately. Ensure reply and speechText are identical.`,
        },
        {
          role: "system" as const,
          content: `Prior accumulated extracted needs: ${JSON.stringify(currentNeeds)}`,
        },
        ...messages.slice(-10).map((m) => ({
          role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
          content: m.content,
        })),
      ];

      let rawResponseText = "";
      try {
        const res = await provider.generate(conversationForModel, { jsonMode: true });
        rawResponseText = res.text ?? "";
      } catch (primaryErr) {
        console.warn("[Agent Talk] Primary provider failed, attempting fallback provider:", primaryErr);
        provider = fallbackProvider;
        const res = await provider.generate(conversationForModel, { jsonMode: true });
        rawResponseText = res.text ?? "";
      }

      if (rawResponseText) {
        const normalized = normalizeAgentResponse(rawResponseText, currentNeeds, lastUserMessage);

        if (body.projectId && authenticatedUser) {
          try {
            const userSupabase = getUserScopedClient(authenticatedUser.token);
            const { data: project } = await userSupabase
              .from("projects")
              .select("id, user_id")
              .eq("id", body.projectId)
              .eq("user_id", authenticatedUser.id)
              .maybeSingle();

            if (project) {
              await setProjectKnowledge(
                body.projectId,
                "extracted_needs",
                normalized.extractedNeeds,
                authenticatedUser.id,
                "business_info"
              );
            } else {
              console.warn("[Agent Talk] Project knowledge write skipped: caller is not project owner");
            }
          } catch (pkErr) {
            console.warn("[Agent Talk] Project Knowledge write skipped:", pkErr instanceof Error ? pkErr.message : pkErr);
          }
        }

        return NextResponse.json({
          success: true,
          data: normalized,
        });
      }
    } catch (agentErr) {
      console.warn("[API /api/agent/talk] Provider call fallback to deterministic engine:", agentErr);
    }

    // Fallback response engine
    const fallbackData = buildFallbackResponse(lastUserMessage, messages, currentNeeds);
    return NextResponse.json({
      success: true,
      data: fallbackData,
    });
  } catch (err) {
    console.error("Agent Talk Route Error:", err);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to process conversation. Please try again.",
      },
      { status: 500 }
    );
  }
}
