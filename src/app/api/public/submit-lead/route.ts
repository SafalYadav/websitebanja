import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { WebsiteData, SiteLead } from "@/types/website";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { slug, projectId, name, email, phone, message, sourcePage } = body;

    if (!name || !email || !message) {
      return NextResponse.json(
        { success: false, message: "Name, email, and message are required." },
        { status: 400 }
      );
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
    } else if (projectId) {
      projectQuery = projectQuery.eq("id", projectId);
    } else {
      return NextResponse.json({ success: false, message: "Project identifier required." }, { status: 400 });
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

    const currentJson = (projectData.json_data || {}) as WebsiteData;
    const currentLeads = currentJson.leads || [];
    const updatedLeads = [newLead, ...currentLeads];

    // Save lead into project json_data
    const { error: updateErr } = await supabase
      .from("projects")
      .update({
        json_data: {
          ...currentJson,
          leads: updatedLeads,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", projectData.id);

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
