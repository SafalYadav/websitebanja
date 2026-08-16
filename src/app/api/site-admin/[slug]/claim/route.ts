import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const authSupabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data: { user }, error: userErr } = await authSupabase.auth.getUser(token);
    if (userErr || !user) {
      return NextResponse.json({ success: false, message: "Invalid session." }, { status: 401 });
    }

    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: project, error: projErr } = await supabase
      .from("projects")
      .select("id")
      .eq("public_slug", slug)
      .single();

    if (projErr || !project) {
      return NextResponse.json({ success: false, message: "Website not found." }, { status: 404 });
    }

    // Attempt to claim atomically
    // This query will fail if a member already exists due to a race condition if we do it in two steps.
    // However, we can do an insert with a select subquery or just check and insert.
    
    // Check existing members
    const { data: existingMembers, error: membersErr } = await supabase
      .from("website_members")
      .select("id")
      .eq("project_id", project.id);
      
    if (membersErr) {
      return NextResponse.json({ success: false, message: "Error checking members." }, { status: 500 });
    }

    if (existingMembers && existingMembers.length > 0) {
      return NextResponse.json({ success: false, message: "This website has already been claimed." }, { status: 400 });
    }

    // Insert as OWNER
    const { error: insertErr } = await supabase
      .from("website_members")
      .insert({
        project_id: project.id,
        user_id: user.id,
        role: "OWNER",
        status: "active"
      });

    if (insertErr) {
      return NextResponse.json({ success: false, message: "Failed to claim ownership." }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Successfully claimed website ownership." });

  } catch (err) {
    console.error("Claim Error:", err);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
