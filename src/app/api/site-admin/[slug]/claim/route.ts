import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getUserScopedClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

/**
 * Registers the caller as the OWNER member of a published website.
 *
 * SECURITY: claiming is restricted to the account that already owns the project
 * row (`projects.user_id`). Previously this route accepted ANY authenticated
 * session, used the service-role key (bypassing RLS), and gated only on
 * "does a member row already exist" — and since nothing in the app ever created
 * that first member row, every site in the system was permanently claimable by
 * any logged-in stranger, who then inherited read access to the owner's leads and
 * write access to the live site. See the OWNER-uniqueness index and the
 * user_id-immutability check in the accompanying migration for the DB-side guards.
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

    // Act as the caller so RLS is enforced underneath our own checks.
    const supabase = getUserScopedClient(user.token);

    const { data: project, error: projErr } = await supabase
      .from("projects")
      .select("id, user_id")
      .eq("public_slug", slug)
      .maybeSingle();

    if (projErr || !project) {
      return NextResponse.json({ success: false, message: "Website not found." }, { status: 404 });
    }

    // The authorization decision: only the project owner may claim it.
    if (project.user_id !== user.id) {
      return NextResponse.json(
        { success: false, message: "You do not have permission to claim this website." },
        { status: 403 }
      );
    }

    const { data: existingMembers, error: membersErr } = await supabase
      .from("website_members")
      .select("id, user_id, role")
      .eq("project_id", project.id)
      .eq("role", "OWNER");

    if (membersErr) {
      return NextResponse.json({ success: false, message: "Error checking members." }, { status: 500 });
    }

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

    const { error: insertErr } = await supabase
      .from("website_members")
      .insert({
        project_id: project.id,
        user_id: user.id,
        role: "OWNER",
        status: "active",
      });

    if (insertErr) {
      // 23505 = unique_violation: a concurrent request won the race for OWNER.
      if ((insertErr as { code?: string }).code === "23505") {
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
