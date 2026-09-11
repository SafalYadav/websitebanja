/**
 * Server-safe analytics event recorder.
 *
 * WHY: Writes event logs asynchronously to Azure PostgreSQL without blocking
 * primary user request flows. Uses the central db/queries.ts pool.
 *
 * ARCHITECTURE: No Supabase client — all analytics goes directly to Azure PostgreSQL.
 */

import { dbInsertAnalyticsEvent } from "./db/queries";

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
    await dbInsertAnalyticsEvent({
      eventType,
      userId,
      projectId,
      metadata,
    });
  } catch (err) {
    // Non-blocking: analytics should never crash application requests
    console.error("[Analytics Track ERROR]", err);
  }
}
