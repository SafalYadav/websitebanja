import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { SiteLead } from "@/types/website";
import { checkMemoryRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/supabaseServer";
import {
  dbGetProjectByPublicSlug,
  dbGetProjectOwnership,
  dbAppendLeadToProject,
  dbInsertAnalyticsEvent,
} from "@/lib/db/queries";

export const dynamic = "force-dynamic";

const SubmitLeadSchema = z.object({
  slug: z.string().trim().max(100).optional(),
  projectId: z.string().trim().max(100).optional(),
  name: z.string().trim().min(1, "Name is required").max(100, "Name must not exceed 100 characters"),
  email: z.string().trim().email("Please provide a valid email address").max(150, "Email must not exceed 150 characters"),
  phone: z.string().trim().max(30, "Phone must not exceed 30 characters").optional(),
  message: z.string().trim().min(1, "Message is required").max(2000, "Message must not exceed 2000 characters"),
  sourcePage: z.string().trim().max(100).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const { success: withinLimit } = checkMemoryRateLimit(`submit_lead_${ip}`, 10, 15 * 60 * 1000);
    if (!withinLimit) {
      return NextResponse.json(
        { success: false, message: "Too many messages sent. Please wait before submitting again." },
        { status: 429 }
      );
    }

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ success: false, message: "Invalid JSON payload." }, { status: 400 });
    }

    const parseResult = SubmitLeadSchema.safeParse(rawBody);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues.map((i) => i.message).join(", ");
      return NextResponse.json({ success: false, message: errorMsg }, { status: 400 });
    }

    const { slug, projectId, name, email, phone, message, sourcePage } = parseResult.data;

    if (!slug && !projectId) {
      return NextResponse.json({ success: false, message: "Project identifier required." }, { status: 400 });
    }

    // 1. Fetch project by slug or ID
    let projectData: { id: string; user_id: string } | null = null;
    if (slug) {
      projectData = await dbGetProjectByPublicSlug(slug);
    } else if (projectId) {
      projectData = await dbGetProjectOwnership(projectId);
    }

    if (!projectData) {
      return NextResponse.json({ success: false, message: "Website not found." }, { status: 404 });
    }

    const newLead: SiteLead = {
      id: `lead_${Date.now()}`,
      name: String(name).trim(),
      email: String(email).trim(),
      phone: phone ? String(phone).trim() : undefined,
      message: String(message).trim(),
      sourcePage: sourcePage ? String(sourcePage) : "Home",
      createdAt: new Date().toISOString(),
      read: false,
    };

    // Atomically append lead to project json_data->'leads' using stored function in Azure PostgreSQL
    const { error: updateErr } = await dbAppendLeadToProject(
      projectData.id,
      newLead as unknown as Record<string, unknown>
    );

    if (updateErr) {
      console.warn("[Submit Lead DB update warning]", updateErr);
    }

    // Also record an analytics event for telemetry
    await dbInsertAnalyticsEvent({
      projectId: projectData.id,
      userId: projectData.user_id,
      eventType: "lead_submit",
      metadata: { leadId: newLead.id, sourcePage: newLead.sourcePage },
    });

    return NextResponse.json({
      success: true,
      message: "Thank you! Your inquiry has been sent to the business owner.",
      leadId: newLead.id,
    });
  } catch (err) {
    console.error("API /api/public/submit-lead error:", err);
    return NextResponse.json(
      { success: false, message: "Failed to submit message." },
      { status: 500 }
    );
  }
}
