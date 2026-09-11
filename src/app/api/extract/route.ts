import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { extractBusinessDetailsFast } from "@/lib/promptExtractor";
import { validateUserAuth } from "@/lib/supabaseServer";
import { checkMemoryRateLimit } from "@/lib/rateLimit";

/** Hard cap on prompt size: bounds both OpenAI token spend and regex work in the fast parser. */
const MAX_PROMPT_CHARS = 2000;

export async function POST(req: Request) {
  try {
    // SECURITY: previously the Authorization header was parsed but a failure was
    // explicitly "non-blocking", so anonymous callers reached a paid OpenAI model
    // with no rate limit and no length cap. Both are now mandatory.
    const auth = await validateUserAuth(req);
    if (!auth.user) {
      return NextResponse.json({ success: false, message: auth.error || "Unauthorized." }, { status: auth.status });
    }
    const user = auth.user;
    const userId = user.id;

    const { success: withinLimit } = checkMemoryRateLimit(`extract_${userId}`, 30, 60 * 1000);
    if (!withinLimit) {
      return NextResponse.json(
        { success: false, message: "Too many extraction requests. Please wait a moment." },
        { status: 429 }
      );
    }

    const body: unknown = await req.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, message: "Invalid payload." }, { status: 400 });
    }

    const { prompt, selectedCategory, selectedFeatures } = body as {
      prompt?: string;
      selectedCategory?: string;
      selectedFeatures?: string[];
    };

    if (!prompt || typeof prompt !== "string" || prompt.trim().length < 3) {
      return NextResponse.json({ success: false, message: "Please provide a more descriptive prompt." }, { status: 400 });
    }

    if (prompt.length > MAX_PROMPT_CHARS) {
      return NextResponse.json(
        { success: false, message: `Prompt is too long (max ${MAX_PROMPT_CHARS} characters).` },
        { status: 413 }
      );
    }

    const safeCategory = typeof selectedCategory === "string" ? selectedCategory.slice(0, 100) : undefined;
    const safeFeatures = Array.isArray(selectedFeatures)
      ? selectedFeatures.filter((f): f is string => typeof f === "string").slice(0, 30).map((f) => f.slice(0, 100))
      : undefined;

    // Default fast deterministic baseline
    const fallbackData = extractBusinessDetailsFast(prompt, safeCategory, safeFeatures);

    let extractedData = fallbackData;

    // Try OpenAI LLM Extraction if API key is provided
    if (process.env.OPENAI_API_KEY) {
      try {
        const systemPrompt = `You are WebsiteBanja's Smart Business Information Extractor.
Extract structured business profile data from the user's prompt. Return a valid JSON object matching this schema:
{
  "businessName": string (infer or generate an appropriate business name from prompt if not explicitly given),
  "category": string (e.g. Restaurant, Cafe, Gym, Salon, Hotel, Agency, Clinic, Real Estate, E-commerce, Portfolio, Other),
  "description": string (clear 2-4 sentence description of the business, its USP, and offerings),
  "services": string[] (3 to 6 key service or product names),
  "targetAudience": string,
  "location": string,
  "style": string (e.g. Modern, Minimal, Bold, Luxury, Friendly, Vibrant),
  "primaryColor": string (e.g. #7C3AED, #2563EB, #059669, #EA580C, #D97706),
  "secondaryColor": string,
  "phone": string (if provided in prompt, else empty string),
  "email": string (if provided in prompt, else empty string),
  "whatsappNumber": string (if provided in prompt, else empty string)
}`;

        const userMessage = `User Prompt: "${prompt.trim()}"
Selected Category Override: ${safeCategory || "None"}
Requested Features: ${safeFeatures ? safeFeatures.join(", ") : "None"}`;

        const response = await openai.chat.completions.create({
          model: "gpt-4.1-mini",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          temperature: 0.3,
        });

        const parsed = JSON.parse(response.choices[0].message.content ?? "{}") as Record<string, unknown>;

        extractedData = {
          businessName: typeof parsed.businessName === "string" && parsed.businessName.trim().length > 0
            ? parsed.businessName.trim()
            : fallbackData.businessName,
          category: safeCategory || (typeof parsed.category === "string" ? parsed.category : fallbackData.category),
          description: typeof parsed.description === "string" && parsed.description.trim().length > 10
            ? parsed.description.trim()
            : fallbackData.description,
          services: Array.isArray(parsed.services) && parsed.services.length > 0
            ? parsed.services
            : fallbackData.services,
          targetAudience: typeof parsed.targetAudience === "string" ? parsed.targetAudience : fallbackData.targetAudience,
          location: typeof parsed.location === "string" ? parsed.location : fallbackData.location,
          style: typeof parsed.style === "string" ? parsed.style : fallbackData.style,
          primaryColor: typeof parsed.primaryColor === "string" ? parsed.primaryColor : fallbackData.primaryColor,
          secondaryColor: typeof parsed.secondaryColor === "string" ? parsed.secondaryColor : fallbackData.secondaryColor,
          phone: typeof parsed.phone === "string" ? parsed.phone : fallbackData.phone,
          email: typeof parsed.email === "string" ? parsed.email : fallbackData.email,
          whatsappNumber: typeof parsed.whatsappNumber === "string" ? parsed.whatsappNumber : fallbackData.whatsappNumber,
        };
      } catch (llmErr) {
        console.warn("[API /api/extract] LLM extraction fallback to fast parser:", llmErr);
      }
    }

    if (userId) {
      await trackAnalyticsEvent({
        eventType: "ai_request",
        userId,
        metadata: { action: "prompt_extraction", category: extractedData.category },
      });
    }

    return NextResponse.json({
      success: true,
      data: extractedData,
    });
  } catch (err) {
    console.error("API /api/extract error:", err);
    // Return graceful fallback even on extreme error
    return NextResponse.json({
      success: true,
      data: extractBusinessDetailsFast("My Business", undefined, undefined),
    });
  }
}
