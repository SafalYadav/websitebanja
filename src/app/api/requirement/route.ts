import { NextResponse } from "next/server";
import { z } from "zod";
import { setProjectKnowledge } from "@/lib/knowledge";
import { authenticateRequest } from "@/lib/supabaseServer";
import { dbCheckProjectExists } from "@/lib/db/queries";
import { checkMemoryRateLimit } from "@/lib/rateLimit";

// Comprehensive Zod validation schema matching WebsiteRequirement
const requirementSchema = z.object({
  intent: z.string().default("create"),
  business: z.object({
    name: z.string().min(1, "Business name is required"),
    type: z.string().optional(),
    industry: z.string().optional(),
  }),
  audience: z.string().optional(),
  location: z.string().optional(),
  services: z.array(z.string()).optional(),
  products: z
    .array(
      z.object({
        name: z.string(),
        price: z.number().optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        image: z.string().optional(),
      })
    )
    .optional(),
  pricing: z.string().optional(),
  contactInformation: z
    .object({
      email: z.string().email().optional(),
      phone: z.string().optional(),
      whatsapp: z.string().optional(),
      address: z.string().optional(),
    })
    .optional(),
  cta: z.string().optional(),
  pages: z
    .array(
      z.object({
        name: z.string(),
        slug: z.string().optional(),
        sections: z.array(z.string()),
      })
    )
    .optional(),
  content: z.record(z.string(), z.string()).optional(),
  brand: z
    .object({
      colors: z
        .object({
          primary: z.string().optional(),
          secondary: z.string().optional(),
          accent: z.string().optional(),
        })
        .optional(),
      typography: z
        .object({
          heading: z.string().optional(),
          body: z.string().optional(),
        })
        .optional(),
      logoUrl: z.string().optional(),
      style: z.string().optional(),
    })
    .optional(),
  functionality: z
    .object({
      booking: z.boolean().optional(),
      ecommerce: z.boolean().optional(),
      auth: z.boolean().optional(),
      forms: z.boolean().optional(),
      whatsappDirect: z.boolean().optional(),
      integrations: z.array(z.string()).optional(),
    })
    .optional(),
  backend: z
    .object({
      requirement: z.string().optional(),
      config: z.record(z.string(), z.unknown()).optional(),
    })
    .optional(),
  integrations: z.array(z.string()).optional(),
  responsive: z
    .object({
      mobileFirst: z.boolean().optional(),
      breakpoints: z
        .object({
          sm: z.number().optional(),
          md: z.number().optional(),
          lg: z.number().optional(),
        })
        .optional(),
    })
    .optional(),
  designPreferences: z
    .object({
      density: z.enum(["compact", "medium", "spacious"]).optional(),
      themeMode: z.enum(["light", "dark", "system"]).optional(),
      contrastLevel: z.enum(["standard", "high"]).optional(),
      style: z.string().optional(),
      accentEmphasis: z.enum(["subtle", "prominent", "high"]).optional(),
    })
    .passthrough()
    .optional(),
  specialInstructions: z.array(z.string()).optional(),
  projectId: z.string().optional(),
});

export type WebsiteRequirement = z.infer<typeof requirementSchema>;

export async function POST(request: Request) {
  try {
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { success: withinLimit } = checkMemoryRateLimit(`req_route_${user.id}`, 30, 60 * 1000);
    if (!withinLimit) {
      return NextResponse.json(
        { success: false, message: "Too many requirement requests. Please wait a moment." },
        { status: 429 }
      );
    }

    const rawBody: unknown = await request.json();
    const parseResult = requirementSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, message: parseResult.error.issues.map((i) => i.message).join(", ") },
        { status: 400 }
      );
    }

    const { projectId, ...requirementData } = parseResult.data;
    const requirement: WebsiteRequirement = requirementData as WebsiteRequirement;

    // Persist to project knowledge only if caller owns the project
    if (projectId) {
      const projectExists = await dbCheckProjectExists(projectId, user.id);

      if (!projectExists) {
        return NextResponse.json(
          { success: false, message: "Forbidden: You do not have permission to modify this project." },
          { status: 403 }
        );
      }

      try {
        await setProjectKnowledge(
          projectId,
          "extracted_requirement",
          requirement,
          user.id,
          "business_info"
        );
      } catch (err) {
        console.warn("[Requirement Route] Knowledge persistence error:", err);
      }
    }

    return NextResponse.json({ success: true, data: requirement });
  } catch (err) {
    console.error("Requirement endpoint error:", err);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
