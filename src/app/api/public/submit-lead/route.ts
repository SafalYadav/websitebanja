import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { SiteLead } from "@/types/website";
import { checkMemoryRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/supabaseServer";

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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1. Fetch project by slug or ID
    let projectQuery = supabase.from("projects").select("id, user_id, json_data");
    if (slug) {
      projectQuery = projectQuery.eq("public_slug", slug);
    } else {
      projectQuery = projectQuery.eq("id", projectId);
    }

    const { data: projectData, error: projErr } = await projectQuery.single();
    if (projErr || !projectData) {
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

    // Atomically append lead to project json_data->'leads' using RPC
    const { error: updateErr } = await supabase.rpc("append_lead_to_project", {
      p_project_id: projectData.id,
      p_lead_data: newLead,
    });

    if (updateErr) {
      console.warn("[Submit Lead DB update warning]", updateErr);
    }

    // Also record an analytics event for telemetry
    await supabase.from("analytics_events").insert({
      project_id: projectData.id,
      user_id: projectData.user_id,
      event_type: "lead_submit",
      metadata: { leadId: newLead.id, sourcePage: newLead.sourcePage },
      created_at: new Date().toISOString(),
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
