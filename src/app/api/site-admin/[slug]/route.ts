import { NextRequest, NextResponse } from "next/server";
import { getAuthClient } from "@/lib/supabaseServer";
import type { WebsiteData } from "@/types/website";
import {
  dbGetProjectBySlugForAdmin,
  dbGetProjectForAdmin,
  dbGetWebsiteMembers,
  dbGetCatalogItems,
  dbGetAnalyticsEvents,
  dbGetCatalogItemStatus,
  dbUpdateCatalogItemStatus,
  dbInsertCatalogItemSimple,
  dbUpdateProjectJsonData,
} from "@/lib/db/queries";

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
    const authSupabase = getAuthClient();
    const { data: { user }, error: userErr } = await authSupabase.auth.getUser(token);
    if (userErr || !user) {
      return NextResponse.json({ success: false, message: "Invalid session." }, { status: 401 });
    }

    const project = (await dbGetProjectBySlugForAdmin(slug)) as any;

    if (!project) {
      return NextResponse.json({ success: false, message: "Website not found." }, { status: 404 });
    }

    // 1. Check if user is Platform Admin or Project Creator
    const rawAdminEmails = process.env.ADMIN_EMAILS || "";
    const adminEmails = rawAdminEmails.split(",").map((e) => e.trim().toLowerCase());
    const isPlatformAdmin = Boolean(user.email && adminEmails.includes(user.email.toLowerCase()));
    const isProjectCreator = project.user_id === user.id;

    // 2. Check Website Members
    const members = await dbGetWebsiteMembers(project.id);
    const memberList = (members || []) as any[];
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

    // Fetch products from catalog_items table via Azure PostgreSQL
    const catalogItems = await dbGetCatalogItems(project.id);
    const products = catalogItems || [];

    // Fetch site-specific analytics events via Azure PostgreSQL
    const events = await dbGetAnalyticsEvents(project.id, 200);
    const analyticsList = (events || []) as any[];
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
          pageViews,
          ctaClicks,
          whatsappClicks,
          totalLeads,
          unreadLeads: leads.filter((l) => !l.read).length,
          totalProducts: products.length,
          activeProducts: (products as any[]).filter((p) => p.status === "active").length,
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
    const authSupabase = getAuthClient();
    const { data: { user }, error: userErr } = await authSupabase.auth.getUser(token);
    if (userErr || !user) {
      return NextResponse.json({ success: false, message: "Invalid session." }, { status: 401 });
    }

    const project = (await dbGetProjectForAdmin(slug, "id, user_id, json_data")) as any;

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
      const existing = await dbGetCatalogItemStatus(productId);
      if (existing) {
        await dbUpdateCatalogItemStatus(
          productId,
          existing.status === "active" ? "out_of_stock" : "active"
        );
      }
    } else if (action === "add_product" && newProduct) {
      await dbInsertCatalogItemSimple({
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

    await dbUpdateProjectJsonData(project.id, currentJson as unknown as Record<string, unknown>);

    return NextResponse.json({ success: true, message: "Site data updated successfully." });
  } catch (err) {
    console.error("API /api/site-admin/[slug] PATCH error:", err);
    return NextResponse.json({ success: false, message: "Failed to update site." }, { status: 500 });
  }
}
