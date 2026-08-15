import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeDomain, isValidDomain, CNAME_TARGET, A_RECORD_IP } from "@/lib/domains";
import { trackAnalyticsEvent } from "@/lib/analytics";
import dns from "dns/promises";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body: unknown = await req.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, message: "Invalid payload." }, { status: 400 });
    }

    const { projectId, domain: rawDomain } = body as { projectId?: string; domain?: string };
    if (!projectId || !rawDomain) {
      return NextResponse.json({ success: false, message: "Project ID and Domain are required." }, { status: 400 });
    }

    const domain = normalizeDomain(rawDomain);
    if (!isValidDomain(domain)) {
      return NextResponse.json({ success: false, message: "Please enter a valid domain (e.g. yourbrand.com)." }, { status: 400 });
    }

    // 1. Verify project ownership
    const { data: project, error: projErr } = await supabase
      .from("projects")
      .select("id, user_id, custom_domain")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single();

    if (projErr || !project) {
      return NextResponse.json({ success: false, message: "Project not found or unauthorized." }, { status: 404 });
    }

    // 2. Perform Server-Side DNS verification check
    let verified = false;
    let verificationNote = "";

    try {
      // Check CNAME records
      const cnames: string[] = await dns.resolveCname(domain).catch(() => [] as string[]);
      if (cnames.some((c) => c.toLowerCase().includes("websitebanja.com") || c.toLowerCase() === CNAME_TARGET)) {
        verified = true;
        verificationNote = `Verified via CNAME pointing to ${CNAME_TARGET}`;
      } else {
        // Check A records
        const ips: string[] = await dns.resolve4(domain).catch(() => [] as string[]);
        if (ips.includes(A_RECORD_IP)) {
          verified = true;
          verificationNote = `Verified via A Record pointing to ${A_RECORD_IP}`;
        }
      }
    } catch {
      verified = false;
    }

    // 3. Update project custom domain state in Supabase
    const status = verified ? "verified" : "pending_verification";
    const { error: updateErr } = await supabase
      .from("projects")
      .update({
        custom_domain: domain,
        custom_domain_status: status,
        custom_domain_verified_at: verified ? new Date().toISOString() : null,
      })
      .eq("id", projectId)
      .eq("user_id", user.id);

    if (updateErr) {
      throw updateErr;
    }

    await trackAnalyticsEvent({
      eventType: verified ? "domain_verify" : "domain_connect",
      userId: user.id,
      projectId,
      metadata: { domain, verified, status },
    });

    return NextResponse.json({
      success: true,
      data: {
        domain,
        verified,
        status,
        message: verified
          ? `Domain successfully verified! ${verificationNote}`
          : "DNS records not detected yet. DNS propagation can take 5–30 minutes after updating your registrar records.",
      },
    });
  } catch (err) {
    console.error("API /api/domains/verify error:", err);
    return NextResponse.json(
      {
        success: false,
        message: err instanceof Error ? err.message : "Failed to verify domain.",
      },
      { status: 500 }
    );
  }
}
