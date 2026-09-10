import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkMemoryRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const { success: withinLimit } = checkMemoryRateLimit(`track_event_${ip}`, 60, 60 * 1000);
    if (!withinLimit) {
      return NextResponse.json({ success: false, error: "Rate limit exceeded." }, { status: 429 });
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
    }

    const { slug, projectId, eventType = "page_view", metadata = {} } = body || {};

    const cleanEventType = String(eventType || "page_view")
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .slice(0, 50);

    // Bound metadata size to maximum 2KB to prevent DB storage exhaustion
    let boundedMetadata: Record<string, unknown> = {};
    if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
      try {
        const serialized = JSON.stringify(metadata);
        if (serialized.length <= 2048) {
          boundedMetadata = JSON.parse(serialized);
        } else {
          boundedMetadata = { truncated: true, size: serialized.length };
        }
      } catch {
        boundedMetadata = {};
      }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let resolvedProjectId = typeof projectId === "string" ? projectId.slice(0, 100) : null;
    let resolvedUserId = null;

    if (!resolvedProjectId && slug && typeof slug === "string") {
      const cleanSlug = slug.trim().slice(0, 100);
      const { data: proj } = await supabase
        .from("projects")
        .select("id, user_id")
        .eq("public_slug", cleanSlug)
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
        event_type: cleanEventType,
        metadata: boundedMetadata,
        created_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({ success: true });
  } catch {
    // Fail gracefully for non-blocking telemetry
    return NextResponse.json({ success: false });
  }
}
