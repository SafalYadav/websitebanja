import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { checkMemoryRateLimit } from "@/lib/rateLimit";
import { verifyAdminAuth } from "@/lib/adminAuth";
import { authenticateRequest, getClientIp } from "@/lib/supabaseServer";
import { getStudioQuota } from "@/lib/studioQuota";
import type { StudioAiAction } from "@/lib/studioAiActions";

export const dynamic = "force-dynamic";

/** Hard caps so an attacker cannot dictate our OpenAI token spend. */
const MAX_PROMPT_CHARS = 2000;
const MAX_CONTEXT_CHARS = 12000;

/** Serializes context for the prompt, truncating anything oversized. */
function boundedJson(value: unknown, maxChars: number): string {
  let serialized: string;
  try {
    serialized = JSON.stringify(value ?? null) ?? "null";
  } catch {
    return "null";
  }
  return serialized.length > maxChars ? `${serialized.slice(0, maxChars)}…"[truncated]"` : serialized;
}

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    let isAdmin = false;

    if (user) {
      const authResult = await verifyAdminAuth(req);
      isAdmin = authResult.isAdmin;
      if (!isAdmin) {
        // Enforce Studio Change Quota
        const quota = await getStudioQuota(user.id, user);
        if (quota.isBlocked) {
          return NextResponse.json(
            {
              error: quota.isPro
                ? "You've reached your current Studio change limit."
                : "You've reached your Free Plan Studio change limit.",
              subMessage: quota.isPro
                ? "Please contact support for high-volume enterprise quota."
                : "Upgrade to Pro to continue editing your website.",
              cta: quota.isPro ? undefined : "Upgrade to Pro — ₹500/month",
              code: "STUDIO_CHANGE_LIMIT_REACHED",
              quota,
            },
            { status: 403 }
          );
        }

        const { success } = checkMemoryRateLimit(`ai_action_${user.id}`, 30, 60 * 1000);
        if (!success) {
          return NextResponse.json(
            { error: "Rate limit reached. Please wait a moment before sending more AI commands." },
            { status: 429 }
          );
        }
      }
    } else {

      // Allow guest / preview studio editor sessions with strict IP rate limiting (10 requests / minute)
      const clientIp = getClientIp(req);
      const { success } = checkMemoryRateLimit(`ai_action_ip_${clientIp}`, 10, 60 * 1000);
      if (!success) {
        return NextResponse.json(
          { error: "Rate limit reached. Please wait a moment or sign in to continue using AI Copilot." },
          { status: 429 }
        );
      }
    }

    const body = await req.json();
    const { prompt, currentWebsite, selectedElement, businessName, category } = body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json({ error: "Instruction prompt is required." }, { status: 400 });
    }

    if (prompt.length > MAX_PROMPT_CHARS) {
      return NextResponse.json(
        { error: `Instruction is too long (max ${MAX_PROMPT_CHARS} characters).` },
        { status: 413 }
      );
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

3. MULTI-PAGE OPERATIONS:
   - "Create an About page" / "Ek naya Menu page banao" -> ACTION: "add_page" with title & slug.
   - "Make this button open the Contact page" -> ACTION: "set_button_page_target" with slug.
   - "Delete the Gallery page" -> ACTION: "delete_page".
   - "Change SEO title of about page" -> ACTION: "set_page_seo".

4. SITE OWNER ADMIN DASHBOARD:
   - "Add an admin dashboard" / "Enable owner portal" -> ACTION: "toggle_admin_dashboard" with enabled: true.

5. "MOVE KARO", "ORDER BADLO" (Structural Reorder Intent):
   - Example: "Products section ko Home ke neeche move karo"
   - INTENT: Reorder the array of sections.
   - ACTION: "reorder_sections" with the updated sectionOrder array.

6. CONTEXT-AWARE REFERENCES ("is button ko", "ye heading", "ye image", "isko"):
   - Use the "Current Selected Element" provided in context.
   - If selected element is a button and user says "isko catalog le jao" -> path: selected element's path (or "hero.button").

7. E-COMMERCE & PRODUCTS:
   - "Ek product add karo" / "Add 2 products" -> ACTION: "add_product" with accurate INR pricing, name, image, description.
   - "Change product price to 1999" -> ACTION: "update_product".

8. BUTTON ACTION & LABEL COMBINATIONS:
   - Example: "Change the hero button to Book on WhatsApp" or "Hero button ko WhatsApp banao"
   - INTENT: Update button text AND set WhatsApp action!
   - ACTION: "set_button_whatsapp" with path = "hero.button", label = "Book on WhatsApp", phone = contact phone or "+919876543210".
   - If user asks to change button label only -> "update_button" with label.

9. TEXT REFINEMENT & HEADLINES:
   - Example: "Make the hero headline more premium & punchy"
   - INTENT: Generate a high-converting, premium, punchy title tailored to the business.
   - ACTION: "update_text" with path = "hero.title", text = "The new headline".

==================================================
SUPPORTED ACTION TYPES:
==================================================
- "update_text": { "path": "hero.title", "text": "New text" }
- "replace_image": { "path": "hero.image", "imageUrl": "https://images.unsplash.com/..." }
- "update_button": { "path": "hero.button", "label": "Explore Collection" }
- "set_button_scroll_target": { "path": "hero.button", "target": "products" | "contact" | "services" | "about" | "faq", "label"?: string }
- "set_button_page_target": { "path": "hero.button", "slug": "about" | "contact" | "menu", "label"?: string }
- "set_button_whatsapp": { "path": "hero.button", "phone": "+919876543210", "label"?: string }
- "set_button_external_url": { "path": "hero.button", "url": "https://example.com", "label"?: string }
- "set_button_call": { "path": "hero.button", "phone": "+919876543210", "label"?: string }
- "add_section": { "sectionType": "features" | "faq" | "products" | "services" | "about" | "contact" }
- "delete_section": { "sectionKey": "faq" }
- "reorder_sections": { "newOrder": ["hero", "products", "services", "about", "faq", "contact", "footer"] }
- "add_page": { "title": "About Us", "slug": "about" }
- "delete_page": { "slug": "about" }
- "set_page_seo": { "slug": "about", "seo": { "title": "...", "description": "..." } }
- "toggle_admin_dashboard": { "enabled": true }
- "add_product": { "product": { "name": "...", "description": "...", "price": 1999, "category": "...", "image": "https://...", "badge": "Popular" } }
- "update_product": { "productId": "prod_123", "updates": { "price": 2499, "status": "active" | "out_of_stock" } }
- "delete_product": { "productId": "prod_123" }

Return ONLY JSON:
{
  "summary": "Clear human-readable 1-sentence explanation of what changed",
  "actions": [
    {
      "action": "set_button_whatsapp",
      "payload": { "path": "hero.button", "label": "Book on WhatsApp", "phone": "+919876543210" },
      "summary": "Updated Hero CTA button to Book on WhatsApp"
    }
  ]
}`;

    const userMessage = `Business Context: "${String(businessName || "Business").slice(0, 200)}" (${String(category || "General").slice(0, 100)})
Current Selected Element: ${boundedJson(selectedElement || null, 1000)}
Current Active Pages: ${boundedJson((currentWebsite?.pages || []).slice(0, 50).map((p: { id: string; title: string; slug: string }) => ({ id: p.id, title: p.title, slug: p.slug })), 2000)}
Current Active Section Order: ${boundedJson((currentWebsite?.sectionOrder || []).slice(0, 50), 1000)}
Current Products: ${boundedJson(
      (currentWebsite?.products || []).slice(0, 100).map((p: { id: string; name: string; price: number }) => ({
        id: p.id,
        name: p.name,
        price: p.price,
      })),
      4000
    )}
Current Website Outline: ${boundedJson({
      hero: currentWebsite?.hero,
      about: currentWebsite?.about,
    }, MAX_CONTEXT_CHARS)}

User Command: "${prompt.trim()}"`;

    let rawResponse = "{}";
    let providerError: Error | null = null;

    if (process.env.OPENAI_API_KEY) {
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          temperature: 0.1,
        });
        rawResponse = completion.choices[0]?.message?.content || "{}";
      } catch (openaiErr: unknown) {
        console.warn("[OpenAI Execution Warning, trying fallback]", openaiErr);
        providerError = openaiErr instanceof Error ? openaiErr : new Error(String(openaiErr));
      }
    }

    if (rawResponse === "{}" || !rawResponse.trim()) {
      const geminiApiKey =
        process.env.GEMINI_API_KEY ||
        process.env.GOOGLE_API_KEY ||
        process.env.GOOGLE_GENAI_API_KEY;

      if (geminiApiKey) {
        try {
          const { GoogleGenAI } = await import("@google/genai");
          const ai = new GoogleGenAI({ apiKey: geminiApiKey.trim(), vertexai: false });
          const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
              {
                role: "user",
                parts: [
                  { text: `${systemPrompt}\n\nSTRICT JSON ONLY:\n\nContext:\n${userMessage}` },
                ],
              },
            ],
            config: {
              responseMimeType: "application/json",
              temperature: 0.1,
            },
          });
          rawResponse = response.text || "{}";
        } catch (geminiErr: unknown) {
          console.error("[Gemini Fallback Error]", geminiErr);
          if (providerError) throw providerError;
          throw geminiErr;
        }
      } else if (providerError) {
        throw providerError;
      }
    }

    const cleanJson = rawResponse
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/g, "")
      .trim();

    const parsed = JSON.parse(cleanJson || "{}");

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
