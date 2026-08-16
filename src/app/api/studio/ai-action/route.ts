import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { checkMemoryRateLimit } from "@/lib/rateLimit";
import { verifyAdminAuth } from "@/lib/adminAuth";
import type { StudioAiAction } from "@/lib/studioAiActions";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // 1. Tiered Rate Limiting: Authorized Admins get 120 reqs/min, standard users get 30 reqs/min
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const authResult = await verifyAdminAuth(req);
    const limit = authResult.isAdmin ? 120 : 30;

    const { success } = checkMemoryRateLimit(`ai_action_${authResult.userId || ip}`, limit, 60 * 1000);
    if (!success) {
      return NextResponse.json(
        { error: "Rate limit reached. Please wait a moment before sending more AI commands." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { prompt, currentWebsite, selectedElement, businessName, category } = body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json({ error: "Instruction prompt is required." }, { status: 400 });
    }

    const systemPrompt = `You are WebsiteBanja Studio AI Copilot, a high-intelligence web builder assistant.
You interpret user intent (Hindi, Hinglish, English) and convert it into structured Studio actions.

==================================================
CRITICAL SEMANTIC INTENT RULES:
==================================================

1. "LE JAO", "CONNECT KARO", "JODO", "SCROLL KARAO" (Navigation & Link Intent):
   - Example: "Button ko catalog le jao" OR "Is button ko products se connect karo" OR "Take this button to contact"
   - INTENT: Configure the button's action to SCROLL / NAVIGATE to that section.
   - DO NOT move the button in the DOM. DO NOT reorder sections.
   - ACTION: "set_button_scroll_target" with target = "products" / "contact" / "services".

2. SECTION SYNONYMS & TARGET RESOLUTION:
   - "Catalog", "Products", "Shop", "Store", "Ecommerce", "Items" -> target: "products" (or dynamic key in sectionOrder)
   - "Contact", "Contact us", "Get in touch", "Call", "Enquiry" -> target: "contact"
   - "Services", "Our services", "Offerings", "Solutions" -> target: "services"
   - "About", "About us", "Story", "Mission" -> target: "about"
   - "FAQ", "Questions", "Help" -> target: "faq"
   - "Features", "Benefits" -> target: "features"
   - "Home", "Top", "Hero" -> target: "hero"

3. "MOVE KARO", "ORDER BADLO" (Structural Reorder Intent):
   - Example: "Products section ko Home ke neeche move karo"
   - INTENT: Reorder the array of sections.
   - ACTION: "reorder_sections" with the updated sectionOrder array.

4. CONTEXT-AWARE REFERENCES ("is button ko", "ye heading", "ye image", "isko"):
   - Use the "Current Selected Element" provided in context.
   - If selected element is a button and user says "isko catalog le jao" -> path: selected element's path (or "hero.button").

5. E-COMMERCE & PRODUCTS:
   - "Ek product add karo" / "Add 2 products" -> ACTION: "add_product" with accurate INR pricing, name, image, description.
   - "Change product price to 1999" -> ACTION: "update_product".

==================================================
SUPPORTED ACTION TYPES:
==================================================
- "update_text": { "path": "hero.title", "text": "New text" }
- "replace_image": { "path": "hero.image", "imageUrl": "https://images.unsplash.com/..." }
- "update_button": { "path": "hero.button", "label": "Explore Collection" }
- "set_button_scroll_target": { "path": "hero.button", "target": "products" | "contact" | "services" | "about" | "faq" }
- "set_button_whatsapp": { "path": "hero.button", "phone": "+919876543210" }
- "set_button_external_url": { "path": "hero.button", "url": "https://example.com" }
- "set_button_call": { "path": "hero.button", "phone": "+919876543210" }
- "add_section": { "sectionType": "features" | "faq" | "products" | "services" | "about" | "contact" }
- "delete_section": { "sectionKey": "faq" }
- "reorder_sections": { "newOrder": ["hero", "products", "services", "about", "faq", "contact", "footer"] }
- "add_product": { "product": { "name": "...", "description": "...", "price": 1999, "category": "...", "image": "https://...", "badge": "Popular" } }
- "update_product": { "productId": "prod_123", "updates": { "price": 2499, "status": "active" | "out_of_stock" } }
- "delete_product": { "productId": "prod_123" }

Return ONLY JSON:
{
  "summary": "Clear human-readable 1-sentence explanation of what changed",
  "actions": [
    {
      "action": "set_button_scroll_target",
      "payload": { "path": "hero.button", "target": "products" },
      "summary": "Configured Hero CTA button to smoothly scroll to the Products/Catalog section"
    }
  ]
}`;

    const userMessage = `Business Context: "${businessName || "Business"}" (${category || "General"})
Current Selected Element: ${JSON.stringify(selectedElement || null)}
Current Active Section Order: ${JSON.stringify(currentWebsite?.sectionOrder || [])}
Current Products: ${JSON.stringify(
      (currentWebsite?.products || []).map((p: { id: string; name: string; price: number }) => ({
        id: p.id,
        name: p.name,
        price: p.price,
      }))
    )}
Current Website Outline: ${JSON.stringify({
      hero: currentWebsite?.hero,
      about: currentWebsite?.about,
    })}

User Command: "${prompt.trim()}"`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.1,
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
