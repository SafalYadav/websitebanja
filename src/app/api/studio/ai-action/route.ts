import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { checkMemoryRateLimit } from "@/lib/rateLimit";
import type { StudioAiAction } from "@/lib/studioAiActions";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const { success } = checkMemoryRateLimit(`ai_action_${ip}`, 30, 60 * 1000); // 30 edits/minute
    if (!success) {
      return NextResponse.json(
        { error: "Too many AI edit requests. Please slow down and try again in a minute." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { prompt, currentWebsite, selectedElement, businessName, category } = body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json({ error: "Instruction prompt is required." }, { status: 400 });
    }

    const systemPrompt = `You are WebsiteBanja Studio AI Copilot.
You modify website state by returning a list of discrete, safe, structured editor actions based on the user's natural language command.

Available Action Types:
- "update_text": { "path": "hero.title", "text": "New text value" }
- "replace_image": { "path": "hero.image" or "about.image", "imageUrl": "https://images.unsplash.com/..." }
- "update_button": { "path": "hero.button", "label": "Book Now" }
- "add_section": { "sectionType": "features" | "faq" | "products" | "services" }
- "delete_section": { "sectionKey": "faq" }
- "add_product": { "product": { "name": "...", "description": "...", "price": 1999, "category": "...", "image": "https://...", "badge": "New" } }
- "update_product": { "productId": "prod_123", "updates": { "price": 2499, "status": "out_of_stock" } }
- "delete_product": { "productId": "prod_123" }

Rules:
1. Return ONLY JSON matching this format:
{
  "summary": "Brief 1-sentence explanation of what was changed",
  "actions": [
    {
      "action": "update_text",
      "payload": { "path": "hero.title", "text": "..." },
      "summary": "Updated hero title to ..."
    }
  ]
}
2. When creating images, always use valid, high-resolution Unsplash URLs.
3. Indian business pricing format in INR numbers.
4. Keep modifications relevant, professional, conversion-focused, and premium.`;

    const userMessage = `Business: "${businessName || "Business"}" (${category || "General"})
Current Selected Element: ${JSON.stringify(selectedElement || null)}
Current Website Outline: ${JSON.stringify({
      hero: currentWebsite?.hero,
      about: currentWebsite?.about,
      sections: currentWebsite?.sectionOrder,
      productCount: currentWebsite?.products?.length || 0,
    })}

User Request: "${prompt.trim()}"`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.3,
    });

    const rawResponse = completion.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(rawResponse);

    const actions: StudioAiAction[] = Array.isArray(parsed.actions) ? parsed.actions : [];
    const summary: string = parsed.summary || "Website modified successfully.";

    return NextResponse.json({ success: true, summary, actions });
  } catch (error) {
    return NextResponse.json(
      {
        error: "AI Copilot Error",
        details: error instanceof Error ? error.message : "Failed to process AI modification request.",
      },
      { status: 500 }
    );
  }
}
