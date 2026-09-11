import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/supabaseServer";
import {
  dbGetProjectByPublicSlug,
  dbGetWebsiteOwner,
  dbInsertWebsiteOwner,
} from "@/lib/db/queries";

export const dynamic = "force-dynamic";

/**
 * Registers the caller as the OWNER member of a published website.
 *
 * SECURITY: claiming is restricted to the account that already owns the project
 * row (`projects.user_id`).
 *
 * Application data is hosted on Azure PostgreSQL.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const project = await dbGetProjectByPublicSlug(slug);

    if (!project) {
      return NextResponse.json({ success: false, message: "Website not found." }, { status: 404 });
    }

    // The authorization decision: only the project owner may claim it.
    if (project.user_id !== user.id) {
      return NextResponse.json(
        { success: false, message: "You do not have permission to claim this website." },
        { status: 403 }
      );
    }

    const existingMembers = await dbGetWebsiteOwner(project.id);

    if (existingMembers && existingMembers.length > 0) {
      const alreadyMine = existingMembers.some((m) => m.user_id === user.id);
      return NextResponse.json(
        {
          success: alreadyMine,
          message: alreadyMine
            ? "You already own this website."
            : "This website has already been claimed.",
        },
        { status: alreadyMine ? 200 : 409 }
      );
    }

    try {
      await dbInsertWebsiteOwner(project.id, user.id);
    } catch (insertErr: unknown) {
      // 23505 = unique_violation: a concurrent request won the race for OWNER.
      if (
        typeof insertErr === "object" &&
        insertErr !== null &&
        "code" in insertErr &&
        (insertErr as { code?: string }).code === "23505"
      ) {
        return NextResponse.json(
          { success: false, message: "This website has already been claimed." },
          { status: 409 }
        );
      }
      console.error("Claim insert error:", insertErr);
      return NextResponse.json({ success: false, message: "Failed to claim ownership." }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Successfully claimed website ownership." });
  } catch (err) {
    console.error("Claim Error:", err);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
