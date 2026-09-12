import { NextResponse } from "next/server";
import { checkMemoryRateLimit } from "@/lib/rateLimit";
import type { ExtractedUserNeeds, AgentTalkResponse } from "@/types/aiAgent";
import { AgentProviderFactory } from "@/lib/ai/agentProviderFactory";
import { normalizeAgentResponse } from "@/lib/ai/agentNormalizer";
import { setProjectKnowledge } from "@/lib/knowledge";
import { getClientIp, authenticateRequest } from "@/lib/supabaseServer";
import { dbCheckProjectExists } from "@/lib/db/queries";
import { getMitraLanguageConfig } from "@/lib/constants/mitraLanguages";

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
  priorNeeds: ExtractedUserNeeds,
  userLanguage: string = "English"
): AgentTalkResponse["data"] {
  const normalized = normalizeAgentResponse("", priorNeeds, userText);
  const mergedNeeds = normalized.extractedNeeds;
  const score = normalized.readinessScore;
  const wantsToBuild = /\b(?:build|generate|create)\s+(?:it|my\s+website|the\s+website|site)\s+now\b|\bstart\s+building\b|\byes[,\s]+(?:generate|build|create)\b|\bready to build\b|\bbuild now\b|\bgenerate now\b/i.test(userText);
  const langConfig = getMitraLanguageConfig(userLanguage);

  // If user says to build, NEVER ask again! Immediately launch!
  if (wantsToBuild) {
    let reply = `Awesome! Let's bring ${mergedNeeds.businessName || "your business"} to life right now. Launching your website generator...`;
    if (userLanguage === "Hindi") reply = `शानदार! चलिए ${mergedNeeds.businessName || "आपके बिज़नेस"} की वेबसाइट अभी बनाते हैं।`;
    else if (userLanguage === "Hinglish") reply = `Awesome! Chaliye ${mergedNeeds.businessName || "aapke business"} ki website abhi banate hain.`;
    else if (userLanguage === "Gujarati") reply = `સરસ! ચાલો ${mergedNeeds.businessName || "તમારા બિઝનેસ"} ની વેબસાઇટ બનાવીએ.`;
    else if (userLanguage === "Bengali") reply = `দারুণ! চলুন ${mergedNeeds.businessName || "আপনার ব্যবসার"} ওয়েবসাইট তৈরি করি।`;
    else if (userLanguage === "Marathi") reply = `छान! चला ${mergedNeeds.businessName || "तुमच्या व्यवसायाची"} वेबसाइट आता तयार करूया.`;
    else if (userLanguage === "Tamil") reply = `அருமை! ${mergedNeeds.businessName || "உங்கள் வணிகத்திற்கான"} வலைத்தளத்தை உருவாக்குவோம்.`;
    else if (userLanguage === "Telugu") reply = `అద్భుతం! ${mergedNeeds.businessName || "మీ వ్యాపారం"} కోసం వెబ్‌సైట్‌ను సిద్ధం చేద్దాం.`;
    else if (userLanguage === "Kannada") reply = `ಉತ್ತಮ! ${mergedNeeds.businessName || "ನಿಮ್ಮ ವ್ಯವಹಾರದ"} ವೆಬ್‌ಸೈಟ್ ನಿರ್ಮಿಸೋಣ.`;
    else if (userLanguage === "Malayalam") reply = `കൊള്ളാം! ${mergedNeeds.businessName || "നിങ്ങളുടെ ബിസിനസ്സ്"} വെബ്‌സൈറ്റ് തയ്യാറാക്കാം.`;
    else if (userLanguage === "Punjabi") reply = `ਵਧੀਆ! ਆਓ ${mergedNeeds.businessName || "ਤੁਹਾਡੇ ਕਾਰੋਬਾਰ"} ਦੀ ਵੈੱਬਸਾਈਟ ਬਣਾਈਏ।`;
    else if (userLanguage === "Odia") reply = `ବହୁତ ଭଲ! ଚାଲନ୍ତୁ ${mergedNeeds.businessName || "ଆପଣଙ୍କ ବ୍ୟବସାୟର"} ୱେବସାଇଟ୍ ତିଆରି କରିବା।`;
    else if (userLanguage === "Assamese") reply = `বঢ়িয়া! আহক ${mergedNeeds.businessName || "আপোনাৰ ব্যৱসায়ৰ"} ৱেবছাইট বনাওঁ।`;
    else if (userLanguage === "Urdu") reply = `بہترین! چلیں ${mergedNeeds.businessName || "آپ کے کاروبار"} کی ویب سائٹ بناتے ہیں۔`;

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
    let reply = `Everything looks fantastic for ${mergedNeeds.businessName || "your business"}! Ready for me to build your website?`;
    let suggestedReplies = ["Yes, generate my website now!", "Let's tweak the colors first", "Add another service offering"];
    if (userLanguage === "Hindi") {
      reply = `${mergedNeeds.businessName || "आपके बिज़नेस"} की सभी डिटेल्स बहुत अच्छी लग रही हैं! क्या मैं आपकी वेबसाइट तैयार करूँ?`;
      suggestedReplies = ["हाँ, वेबसाइट अभी बनाओ!", "पहले कलर्स बदलते हैं", "एक और सर्विस जोड़ें"];
    } else if (userLanguage === "Hinglish") {
      reply = `${mergedNeeds.businessName || "Aapke business"} ki sabhi details ready hain! Website generate karein?`;
      suggestedReplies = ["Haan, website abhi banao!", "Pehle colors tweak karte hain", "Ek aur service add karo"];
    } else if (userLanguage === "Gujarati") {
      reply = `${mergedNeeds.businessName || "તમારા બિઝનેસ"} ની બધી વિગતો તૈયાર છે! શું આપણે વેબસાઇટ બનાવીએ?`;
      suggestedReplies = ["હા, હમણાં જ બનાવો!", "કલર બદલીએ", "બીજી સર્વિસ ઉમેરો"];
    }
    return {
      reply,
      speechText: reply,
      suggestedReplies,
      extractedNeeds: mergedNeeds,
      readinessScore: Math.max(score, 85),
      isReadyToBuild: true,
      triggerImmediateBuild: false,
    };
  }

  if (!mergedNeeds.category || mergedNeeds.category === "Other") {
    const reply = langConfig.greeting;
    const suggestedReplies = langConfig.suggestedReplies;
    return {
      reply,
      speechText: reply,
      suggestedReplies,
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

    const userLanguage = typeof body?.language === "string" && body.language ? body.language : "English";
    const langConfig = getMitraLanguageConfig(userLanguage);

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
      let reply = `Awesome! Let's bring ${bName} to life right now. Launching your website generator...`;
      if (userLanguage === "Hindi") {
        reply = `शानदार! चलिए ${bName} की वेबसाइट अभी बनाते हैं। वेबसाइट जनरेटर शुरू हो रहा है...`;
      } else if (userLanguage === "Hinglish") {
        reply = `Awesome! Chaliye ${bName} ki website abhi banate hain. Generator start ho raha hai...`;
      } else if (userLanguage === "Gujarati") {
        reply = `સરસ! ચાલો ${bName} ની વેબસાઇટ હમણાં જ બનાવીએ. વેબસાઇટ જનરેટર શરૂ થઈ રહ્યું છે...`;
      }
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
7. MANDATORY LANGUAGE DIRECTIVE:
   - The user has explicitly selected: "${langConfig.displayName}" (${langConfig.name}, code: "${langConfig.code}").
   - You MUST formulate your "reply", "speechText", and "suggestedReplies" strictly in ${langConfig.name}:
     ${langConfig.systemDirective}
   - NEVER answer in any language other than "${langConfig.name}". Honor the user's active choice.
   - Include "detectedLanguage": { "code": "${langConfig.code}", "name": "${langConfig.name}", "nativeName": "${langConfig.nativeName}" } in your JSON.
   - Always keep "reply" and "speechText" 100% word-for-word identical. Spoken text must be natural, fluent and conversational in that script.
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
            const projectExists = await dbCheckProjectExists(body.projectId, authenticatedUser.id);

            if (projectExists) {
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
    const fallbackData = buildFallbackResponse(lastUserMessage, messages, currentNeeds, userLanguage);
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
