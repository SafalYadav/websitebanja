import { NextResponse } from "next/server";
import { checkMemoryRateLimit } from "@/lib/rateLimit";
import type { ExtractedUserNeeds, AgentTalkResponse } from "@/types/aiAgent";
import { ModelRouter } from "@/lib/ai/router/modelRouter";
import { MODEL_CONFIG, sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";
import { recordAgentRun } from "@/lib/agents/telemetry";
import { emitAgentEvent } from "@/lib/telemetry/agentTelemetry";
import { normalizeAgentResponse } from "@/lib/ai/agentNormalizer";
import { setProjectKnowledge } from "@/lib/knowledge";
import { getClientIp, authenticateRequest } from "@/lib/supabaseServer";
import { dbCheckProjectExists } from "@/lib/db/queries";
import { getMitraLanguageConfig } from "@/lib/constants/mitraLanguages";
import { mitraSessionManager } from "@/lib/agents/mitra/sessionManager";

interface RequestMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface TalkRequestBody {
  messages: RequestMessage[];
  currentNeeds?: ExtractedUserNeeds;
  projectId?: string;
  language?: string;
  sessionId?: string;
  confirmed?: boolean;
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
    if (userLanguage === "Marathi") {
      reply = `${mergedNeeds.businessName || "तुमच्या व्यवसायाची"} सर्व माहिती उत्तम दिसत आहे! मी तुमची वेबसाईट तयार करू का?`;
      suggestedReplies = ["होय, वेबसाईट आता बनवा!", "आधी रंग बदलूया", "आणखी एक सेवा जोडा"];
    } else if (userLanguage === "Hindi") {
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
    let reply = `Ooh, a ${mergedNeeds.category}! Love that. What's the name of your ${mergedNeeds.category.toLowerCase()}, and who are your ideal customers?`;
    let suggestedReplies = [
      "It's called Prime Cafe for coffee lovers",
      "We cater to local neighborhood families",
      "High-growth startups and tech professionals"
    ];
    if (userLanguage === "Marathi") {
      reply = `छान! ${mergedNeeds.category} व्यवसायासाठी वेबसाईट बनवूया. तुमच्या व्यवसायाचे नाव काय आहे आणि तुमचे ग्राहक कोण आहेत?`;
      suggestedReplies = [
        "स्थानिक ग्राहकांसाठी आमचा व्यवसाय आहे",
        "आम्ही सर्वोत्तम सेवा देतो",
        "आमचे नाव सांगा"
      ];
    } else if (userLanguage === "Hindi") {
      reply = `अरे वाह, ${mergedNeeds.category}! आपके इस काम का क्या नाम है, और आपके मुख्य ग्राहक कौन हैं?`;
      suggestedReplies = [
        "यह स्थानीय परिवारों के लिए है",
        "हम बेहतरीन सेवाएं देते हैं",
        "बिजनेस का नाम बताएं"
      ];
    } else if (userLanguage === "Gujarati") {
      reply = `સરસ, ${mergedNeeds.category}! તમારા વ્યવસાયનું નામ શું છે ಮತ್ತು તમારા ગ્રાહકો કોણ છે?`;
      suggestedReplies = [
        "સ્થાનિક ગ્રાહકો માટે",
        "અમે શ્રેષ્ઠ સેવા આપીએ છીએ",
        "નામ જણાવો"
      ];
    }
    return {
      reply,
      speechText: reply,
      suggestedReplies,
      extractedNeeds: mergedNeeds,
      readinessScore: 45,
      isReadyToBuild: false,
    };
  }

  if (!mergedNeeds.services || mergedNeeds.services.length === 0) {
    let reply = `Love the name ${mergedNeeds.businessName}! What are your top 2 or 3 signature specialties or services we should showcase on the homepage?`;
    let suggestedReplies = [
      "Artisanal Coffee, Fresh Pastries & Breakfast",
      "Personal Training, Group Classes & Nutrition",
      "Brand Strategy, Web Design & Social Media"
    ];
    if (userLanguage === "Marathi") {
      reply = `${mergedNeeds.businessName} नाव खूप छान आहे! तुमच्या मुख्य २-३ सेवा किंवा वैशिष्ट्ये कोणती आहेत जी आपण वेबसाईटवर दाखवायची?`;
      suggestedReplies = [
        "मुख्य सेवा आणि उत्पादने",
        "आमची खास वैशिष्ट्ये",
        "सविस्तर माहिती"
      ];
    } else if (userLanguage === "Hindi") {
      reply = `${mergedNeeds.businessName} बहुत अच्छा नाम है! आपकी मुख्य 2-3 सेवाएं कौन सी हैं जो हम होमपेज पर दिखाएं?`;
      suggestedReplies = [
        "हमारी खास सेवाएं",
        "प्रमुख प्रोडक्ट्स",
        "विस्तृत जानकारी"
      ];
    } else if (userLanguage === "Gujarati") {
      reply = `${mergedNeeds.businessName} સરસ નામ છે! તમારી મુખ્ય ૨-૩ સેવાઓ કઈ છે જે આપણે હોમપેજ પર બતાવવી જોઈએ?`;
      suggestedReplies = [
        "મુખ્ય સેવાઓ",
        "અમારા ઉત્પાદનો",
        "વિગતવાર માહિતી"
      ];
    }
    return {
      reply,
      speechText: reply,
      suggestedReplies,
      extractedNeeds: mergedNeeds,
      readinessScore: 60,
      isReadyToBuild: false,
    };
  }

  const userMentioned3D = /\b(?:3d|spatial|perspective|webgl|threejs|r3f|2d\s+only|flat\s+only|no\s+3d|simple\s+2d|keep\s+it\s+2d|keep\s+it\s+simple)\b/i.test(userText);
  const has3DPreference = Boolean(priorNeeds.threeDPreference) || userMentioned3D;

  let reply = has3DPreference
    ? `Sounds great! For ${mergedNeeds.businessName}, what kind of brand vibe feels right? Warm and cozy, clean minimal, or bold and vibrant?`
    : `Sounds great! For ${mergedNeeds.businessName}, what kind of brand vibe feels right, and do you want 3D animations on your website?`;
  
  let suggestedReplies = has3DPreference
    ? [
        "Warm, cozy & earthy tones",
        "Modern minimalist with violet & blue",
        "Luxury bold with obsidian & gold",
        "Everything looks great, build the website now!"
      ]
    : [
        "Yes, use 3D ✨",
        "No, keep it simple",
        "Warm & cozy modern 2D",
        "Everything looks great, build the website now!"
      ];
  if (userLanguage === "Marathi") {
    reply = has3DPreference
      ? `उत्तम! ${mergedNeeds.businessName} साठी कोणती डिझाइन थीम किंवा रंग तुम्हाला आवडतील? आधुनिक आणि साधी, की आकर्षक आणि रंगीबेरंगी?`
      : `उत्तम! ${mergedNeeds.businessName} साठी कोणती डिझाइन थीम आवडेल, आणि आपल्याला 3D ॲनिमेशन हवे आहे का?`;
    suggestedReplies = has3DPreference
      ? [
          "आधुनिक आणि साधी थीम",
          "आकर्षक आणि रंगीबेरंगी",
          "क्लासिक आणि सोबर",
          "सर्व छान आहे, वेबसाईट तयार करा!"
        ]
      : [
          "होय, 3D वापरा ✨",
          "नाही, साधी 2D ठेवा",
          "आधुनिक आणि साधी थीम",
          "सर्व छान आहे, वेबसाईट तयार करा!"
        ];
  } else if (userLanguage === "Hindi") {
    reply = has3DPreference
      ? `बहुत बढ़िया! ${mergedNeeds.businessName} के लिए आपको किस तरह का स्टाइल पसंद है? मॉडर्न और सिंपल, या ब्राइट और कलरफुल?`
      : `बहुत बढ़िया! ${mergedNeeds.businessName} के लिए आपको किस तरह का स्टाइल पसंद है, और क्या आपको 3D एनिमेशन चाहिए?`;
    suggestedReplies = has3DPreference
      ? [
          "मॉडर्न और मिनिमल",
          "ब्राइट और कलरफुल",
          "क्लासिक और एलिगेंट",
          "सब कुछ तैयार है, वेबसाइट बनाओ!"
        ]
      : [
          "हाँ, 3D यूज़ करो ✨",
          "नहीं, 2D सिंपल रखो",
          "मॉडर्न और मिनिमल",
          "सब कुछ तैयार है, वेबसाइट बनाओ!"
        ];
  } else if (userLanguage === "Gujarati") {
    reply = has3DPreference
      ? `સરસ! ${mergedNeeds.businessName} માટે કઈ ડિઝાઇન થીમ ગમશે? આધુનિક અને સરળ, કે આકર્ષક અને તેજસ્વી?`
      : `સરસ! ${mergedNeeds.businessName} માટે કઈ ડિઝાઇન થીમ ગમશે, અને શું તમને 3D એનિમેશન જોઈએ છે?`;
    suggestedReplies = has3DPreference
      ? [
          "આધુનિક અને સરળ",
          "આકર્ષક અને તેજસ્વી",
          "ક્લાસિક અને સુંદર",
          "બધું બરાबर છે, વેબસાઇટ બનાવો!"
        ]
      : [
          "હા, 3D વાપરો ✨",
          "ના, સાદી 2D રાખો",
          "આધુનિક અને સરળ",
          "બધું બરાबर છે, વેબસાઇટ બનાવો!"
        ];
  }
  return {
    reply,
    speechText: reply,
    suggestedReplies,
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
    const requestId = `req_mitra_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    if (body?.sessionId) {
      mitraSessionManager.updateSessionStatus(body.sessionId, "thinking");
    }

    emitAgentEvent({
      event: "agent.started",
      agent: "mitra",
      requestId,
      projectId: body.projectId,
      userId: authenticatedUser?.id,
      metadata: { operation: "Conversational intake", sessionId: body.sessionId },
    });
    emitAgentEvent({
      event: "agent.thinking",
      agent: "mitra",
      requestId,
      projectId: body.projectId,
      userId: authenticatedUser?.id,
      metadata: { sessionId: body.sessionId },
    });

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

    // Use ModelRouter with Mitra policy (Gemini primary -> OpenRouter fallback -> optional Groq -> zero OpenAI)
    try {
      const router = new ModelRouter();
      const policy = MODEL_CONFIG.agentPolicies.mitra();

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
9. 3D PREFERENCE (HARD CONSTRAINT):
   - 3D is NEVER the default. If the user explicitly asks for 3D ("3D website", "3D animation", "3D scroll", "WebGL", "interactive 3D", "3D chahiye"), set "threeDPreference": "yes" in "extractedNeeds".
   - If user explicitly says no 3D ("no 3D", "simple website", "2D only", "3D nahi chahiye", "keep it simple"), set "threeDPreference": "no" in "extractedNeeds".
   - Words like "modern", "premium", "beautiful", "smooth animations" DO NOT mean 3D. "threeDPreference" must stay "no".
   - If the user hasn't specified 3D and you are discussing style/readiness, offer clean options in "suggestedReplies": ["Yes, use 3D ✨", "No, keep it simple"].

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

      const conversationHistoryText = messages
        .slice(-10)
        .map((m) => `${m.role === "user" ? "User" : "Mitra"}: ${m.content}`)
        .join("\n");

      const userPrompt = conversationHistoryText
        ? `Conversation History:\n${conversationHistoryText}\n\nLatest User Input: ${lastUserMessage}`
        : `Latest User Input: ${lastUserMessage}`;

      const routerResponse = await router.route({
        systemPrompt: `${systemPrompt}\n\nPrior accumulated extracted needs: ${JSON.stringify(currentNeeds)}`,
        userPrompt,
        temperature: 0.7,
        maxTokens: 1000,
        timeoutMs: policy.timeoutMs,
        metadata: {
          agent: "mitra",
          requestId,
          projectId: body.projectId,
          userId: authenticatedUser?.id,
        },
      }, policy);

      if (routerResponse.success) {
        emitAgentEvent({
          event: "agent.completed",
          agent: "mitra",
          requestId,
          projectId: body.projectId,
          userId: authenticatedUser?.id,
          provider: routerResponse.provider,
          model: routerResponse.model,
          latencyMs: routerResponse.latencyMs,
          status: "success",
        });
      } else {
        emitAgentEvent({
          event: "agent.failed",
          agent: "mitra",
          requestId,
          projectId: body.projectId,
          userId: authenticatedUser?.id,
          status: "error",
          metadata: {
            error: routerResponse.error?.message,
          },
        });
      }

      // Record non-blocking telemetry
      recordAgentRun({
        agentName: "mitra",
        userId: authenticatedUser?.id,
        projectId: body.projectId,
        status: routerResponse.success ? "success" : "failed",
        modelProvider: routerResponse.provider,
        modelName: routerResponse.model,
        latencyMs: Math.round(routerResponse.latencyMs),
        tokensUsed: {},
        metadata: {
          fallbackCount: routerResponse.fallbackCount,
          language: userLanguage,
          error: routerResponse.error?.message ? sanitizeErrorOutput(routerResponse.error.message) : undefined,
        },
      }).catch(() => {});

      if (routerResponse.success && routerResponse.rawText) {
        const normalized = normalizeAgentResponse(routerResponse.rawText, currentNeeds, lastUserMessage);

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

        if (body?.sessionId) {
          mitraSessionManager.updateSessionStatus(body.sessionId, "speaking");
        }

        return NextResponse.json({
          success: true,
          sessionId: body?.sessionId,
          data: normalized,
        });
      }
    } catch (agentErr) {
      console.warn("[API /api/agent/talk] Model router call fallback to deterministic engine:", sanitizeErrorOutput(String(agentErr)));
    }

    // Fallback response engine
    const fallbackData = buildFallbackResponse(lastUserMessage, messages, currentNeeds, userLanguage);

    if (body.projectId && authenticatedUser) {
      try {
        const projectExists = await dbCheckProjectExists(body.projectId, authenticatedUser.id);
        if (projectExists && fallbackData?.extractedNeeds) {
          await setProjectKnowledge(
            body.projectId,
            "extracted_needs",
            fallbackData.extractedNeeds,
            authenticatedUser.id,
            "business_info"
          );
        }
      } catch (pkErr) {
        console.warn("[Agent Talk Fallback] Project Knowledge write skipped:", pkErr instanceof Error ? pkErr.message : pkErr);
      }
    }

    if (body?.sessionId) {
      mitraSessionManager.updateSessionStatus(body.sessionId, "speaking", { mode: "fallback" });
    }

    return NextResponse.json({
      success: true,
      sessionId: body?.sessionId,
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
