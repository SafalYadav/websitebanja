import { createClient } from "@supabase/supabase-js";

export type AnalyticsEventType =
  | "user_signup"
  | "ai_request"
  | "ai_success"
  | "ai_failure"
  | "project_create"
  | "project_publish"
  | "project_unpublish"
  | "plan_upgrade"
  | "domain_connect"
  | "domain_verify";

export interface TrackEventParams {
  eventType: AnalyticsEventType;
  userId?: string | null;
  projectId?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Server-safe analytics event recorder.
 * Writes event logs asynchronously without blocking primary user request flows.
 */
export async function trackAnalyticsEvent({
  eventType,
  userId,
  projectId,
  metadata = {},
}: TrackEventParams): Promise<void> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) return;

    const supabase = createClient(supabaseUrl, supabaseKey);

    await supabase.from("analytics_events").insert({
      event_type: eventType,
      user_id: userId ?? null,
      project_id: projectId ?? null,
      metadata,
    });
  } catch (err) {
    // Non-blocking: analytics should never crash application requests
    console.error("[Analytics Track ERROR]", err);
  }
}
