import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { slug, projectId, eventType = "page_view", metadata = {} } = body;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let resolvedProjectId = projectId;
    let resolvedUserId = null;

    if (!resolvedProjectId && slug) {
      const { data: proj } = await supabase
        .from("projects")
        .select("id, user_id")
        .eq("public_slug", slug)
        .single();
      if (proj) {
        resolvedProjectId = proj.id;
        resolvedUserId = proj.user_id;
      }
    }

    if (resolvedProjectId) {
      await supabase.from("analytics_events").insert({
        project_id: resolvedProjectId,
        user_id: resolvedUserId,
        event_type: String(eventType).slice(0, 50),
        metadata,
        created_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({ success: true });
  } catch {
    // Fail silently for non-blocking telemetry
    return NextResponse.json({ success: false });
  }
}
