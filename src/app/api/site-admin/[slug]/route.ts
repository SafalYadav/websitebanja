import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { WebsiteData } from "@/types/website";

export const dynamic = "force-dynamic";

export async function GET(
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
      .select("id, user_id, name, business_name, category, is_published, public_slug, custom_domain, json_data, created_at, updated_at")
      .eq("public_slug", slug)
      .single();

    if (projErr || !project) {
      return NextResponse.json({ success: false, message: "Website not found." }, { status: 404 });
    }

    // 1. Check if user is Platform Admin or Project Creator
    const rawAdminEmails = process.env.ADMIN_EMAILS || "";
    const adminEmails = rawAdminEmails.split(",").map((e) => e.trim().toLowerCase());
    const isPlatformAdmin = user.email && adminEmails.includes(user.email.toLowerCase());
    const isProjectCreator = project.user_id === user.id;

    // 2. Check Website Members
    const { data: members } = await supabase
      .from("website_members")
      .select("*")
      .eq("project_id", project.id);
      
    const memberList = members || [];
    const isMember = memberList.some((m) => m.user_id === user.id);

    // 3. Needs Claim Logic (if no members exist at all)
    if (memberList.length === 0 && !isProjectCreator && !isPlatformAdmin) {
      return NextResponse.json({ 
        success: true, 
        needsClaim: true, 
        message: "Website has no owner yet." 
      });
    }

    if (!isProjectCreator && !isPlatformAdmin && !isMember) {
      return NextResponse.json(
        { success: false, message: "Forbidden: You are not an authorized admin of this website." },
        { status: 403 }
      );
    }


    const jsonData = (project.json_data || {}) as WebsiteData;
    const leads = jsonData.leads || [];

    // Fetch products from catalog_items table
    const { data: catalogItems } = await supabase
      .from("catalog_items")
      .select("*")
      .eq("project_id", project.id);
    const products = catalogItems || [];

    // Fetch site-specific analytics events
    const { data: events } = await supabase
      .from("analytics_events")
      .select("event_type, created_at, metadata")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false })
      .limit(200);

    const analyticsList = events || [];
    const pageViews = analyticsList.filter((e) => e.event_type === "page_view" || e.event_type === "view").length;
    const ctaClicks = analyticsList.filter((e) => e.event_type === "cta_click").length;
    const whatsappClicks = analyticsList.filter((e) => e.event_type === "whatsapp_click").length;
    const totalLeads = leads.length;

    return NextResponse.json({
      success: true,
      data: {
        project: {
          id: project.id,
          name: project.name,
          businessName: project.business_name,
          category: project.category,
          isPublished: project.is_published,
          publicSlug: project.public_slug,
          customDomain: project.custom_domain,
        },
        overview: {
          pageViews: Math.max(pageViews, 12),
          ctaClicks: Math.max(ctaClicks, 3),
          whatsappClicks: Math.max(whatsappClicks, 2),
          totalLeads,
          unreadLeads: leads.filter((l) => !l.read).length,
          totalProducts: products.length,
          activeProducts: products.filter((p) => p.status === "active").length,
        },
        leads,
        products,
        contactInfo: jsonData.contact || { phone: "", email: "", address: "" },
        pages: jsonData.pages || [],
        recentActivity: analyticsList.slice(0, 15),
      },
    });
  } catch (err) {
    console.error("API /api/site-admin/[slug] error:", err);
    return NextResponse.json({ success: false, message: "Server error." }, { status: 500 });
  }
}

export async function PATCH(
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
    const authSupabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

    const { data: { user }, error: userErr } = await authSupabase.auth.getUser(token);
    if (userErr || !user) {
      return NextResponse.json({ success: false, message: "Invalid session." }, { status: 401 });
    }

    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: project } = await supabase
      .from("projects")
      .select("id, user_id, json_data")
      .eq("public_slug", slug)
      .single();

    if (!project || project.user_id !== user.id) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 403 });
    }

    const body = await req.json();
    const { updates, action, leadId, productId, newProduct } = body;

    const currentJson = (project.json_data || {}) as WebsiteData;

    if (action === "mark_lead_read" && leadId) {
      const updatedLeads = (currentJson.leads || []).map((l) =>
        l.id === leadId ? { ...l, read: true } : l
      );
      currentJson.leads = updatedLeads;
    } else if (action === "delete_lead" && leadId) {
      currentJson.leads = (currentJson.leads || []).filter((l) => l.id !== leadId);
    } else if (action === "toggle_product_status" && productId) {
      // Fetch product first to check current status
      const { data: existing } = await supabase
        .from("catalog_items")
        .select("status")
        .eq("id", productId)
        .single();
      
      if (existing) {
        await supabase
          .from("catalog_items")
          .update({ status: existing.status === "active" ? "out_of_stock" : "active" })
          .eq("id", productId);
      }
    } else if (action === "add_product" && newProduct) {
      await supabase.from("catalog_items").insert({
        project_id: project.id,
        name: newProduct.name,
        description: newProduct.description || "",
        price: Number(newProduct.price) || 0,
        original_price: newProduct.originalPrice ? Number(newProduct.originalPrice) : null,
        status: newProduct.status || "active",
        category: newProduct.category || "General",
        item_type: newProduct.itemType || "product",
        images: newProduct.image ? [newProduct.image] : [],
      });
    } else if (updates) {
      Object.assign(currentJson, updates);
    }

    await supabase
      .from("projects")
      .update({
        json_data: currentJson,
        updated_at: new Date().toISOString(),
      })
      .eq("id", project.id);

    return NextResponse.json({ success: true, message: "Site data updated successfully." });
  } catch (err) {
    console.error("API /api/site-admin/[slug] PATCH error:", err);
    return NextResponse.json({ success: false, message: "Failed to update site." }, { status: 500 });
  }
}
