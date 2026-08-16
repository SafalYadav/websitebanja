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
You modify real website state and functionality by returning a list of discrete, safe, structured editor actions based on the user's natural language command.

Available Action Types:
1. Text & Content:
   - "update_text": { "path": "hero.title", "text": "New text value" }
2. Media:
   - "replace_image": { "path": "hero.image" or "about.image", "imageUrl": "https://images.unsplash.com/..." }
3. Button Actions & Real Functionality:
   - "update_button": { "path": "hero.button", "label": "Book Vehicle Now" }
   - "set_button_scroll_target": { "path": "hero.button", "target": "contact" | "services" | "products" | "about" | "faq" }
   - "set_button_whatsapp": { "path": "hero.button", "phone": "+919876543210" }
   - "set_button_external_url": { "path": "hero.button", "url": "https://example.com" }
   - "set_button_call": { "path": "hero.button", "phone": "+919876543210" }
4. Sections:
   - "add_section": { "sectionType": "features" | "faq" | "products" | "services" | "about" | "contact" }
   - "delete_section": { "sectionKey": "faq" | "services" | "features" }
   - "reorder_sections": { "newOrder": ["hero", "products", "services", "about", "faq", "contact", "footer"] }
5. E-Commerce Products & Catalog:
   - "add_product": { "product": { "name": "Premium SUV Booking", "description": "Full day luxury chauffeur rental.", "price": 4999, "originalPrice": 6999, "category": "Luxury Fleet", "image": "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800&auto=format&fit=crop&q=80", "badge": "Bestseller" } }
   - "update_product": { "productId": "prod_123", "updates": { "price": 2499, "status": "active" | "out_of_stock" } }
   - "delete_product": { "productId": "prod_123" }

Rules:
- If user asks to move button to Services or scroll to Contact, use "set_button_scroll_target" with path "hero.button" and target "services" / "contact".
- If user asks to move a section (e.g. Products below Hero), recalculate the "reorder_sections" array.
- If user asks to add/create a product, use "add_product" with accurate INR pricing.
- Return ONLY JSON matching this format:
{
  "summary": "Brief 1-sentence explanation of what was changed",
  "actions": [
    {
      "action": "set_button_scroll_target",
      "payload": { "path": "hero.button", "target": "services" },
      "summary": "Configured Hero button to scroll to Services section"
    }
  ]
}`;

    const userMessage = `Business: "${businessName || "Business"}" (${category || "General"})
Current Selected Element: ${JSON.stringify(selectedElement || null)}
Current Website Section Order: ${JSON.stringify(currentWebsite?.sectionOrder || [])}
Current Products: ${JSON.stringify((currentWebsite?.products || []).map((p: { id: string; name: string; price: number }) => ({ id: p.id, name: p.name, price: p.price })))}
Current Outline: ${JSON.stringify({
      hero: currentWebsite?.hero,
      about: currentWebsite?.about,
    })}

User Instruction: "${prompt.trim()}"`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.2,
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
