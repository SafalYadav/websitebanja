"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  MessageSquare,
  BarChart3,
  Globe,
  ExternalLink,
  CheckCircle2,
  Trash2,
  Search,
  Mail,
  Phone,
  ArrowLeft,
  Store,
  Layers,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { ProductItem, SiteLead } from "@/types/website";
import { cn } from "@/lib/utils";
import ThemeToggle from "@/components/theme/ThemeToggle";

interface SiteAdminData {
  project: {
    id: string;
    name: string;
    businessName: string;
    category: string;
    isPublished: boolean;
    publicSlug: string;
    customDomain?: string;
  };
  overview: {
    pageViews: number;
    ctaClicks: number;
    whatsappClicks: number;
    totalLeads: number;
    unreadLeads: number;
    totalProducts: number;
    activeProducts: number;
  };
  leads: SiteLead[];
  products: ProductItem[];
  contactInfo: { phone: string; email: string; address: string };
  pages: { id: string; title: string; slug: string }[];
}

export default function GeneratedWebsiteAdminPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;

  const [isLoading, setIsLoading] = useState(true);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [data, setData] = useState<SiteAdminData | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "leads" | "products" | "pages">("overview");
  const [leadSearch, setLeadSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          if (isMounted) {
            setIsUnauthorized(true);
            setIsLoading(false);
          }
          return;
        }

        const res = await fetch(`/api/site-admin/${slug}`, {
          cache: "no-store",
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (res.status === 401 || res.status === 403) {
          if (isMounted) {
            setIsUnauthorized(true);
            setIsLoading(false);
          }
          return;
        }

        const json = await res.json();
        if (json.success && isMounted) {
          setData(json.data);
          setIsLoading(false);
        }
      } catch {
        // Ignored
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  const reloadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`/api/site-admin/${slug}`, {
        cache: "no-store",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch {
      // Ignored
    }
  };

  const handleMarkLeadRead = async (leadId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await fetch(`/api/site-admin/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: "mark_lead_read", leadId }),
      });
      void reloadData();
    } catch {
      // Ignore
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await fetch(`/api/site-admin/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: "delete_lead", leadId }),
      });
      void reloadData();
    } catch {
      // Ignore
    }
  };

  const handleToggleProduct = async (productId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await fetch(`/api/site-admin/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: "toggle_product_status", productId }),
      });
      void reloadData();
    } catch {
      // Ignore
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#09090B] text-zinc-600">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-violet-600 border-t-transparent" />
          <p className="text-sm font-semibold">Loading Website Admin Dashboard...</p>
        </div>
      </div>
    );
  }

  if (isUnauthorized || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#09090B] px-4">
        <div className="max-w-md w-full rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-xl dark:border-white/10 dark:bg-zinc-900">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 mb-4">
            <Store className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Owner Portal Access Required</h2>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            Please log in with the account that created this website to manage products, leads, and analytics.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Link
              href={`/login?next=/p/${slug}/admin`}
              className="w-full rounded-xl bg-violet-600 py-2.5 text-xs font-bold text-white hover:bg-violet-700 transition"
            >
              Sign In to Admin Portal
            </Link>
            <Link
              href={`/p/${slug}`}
              className="w-full rounded-xl border border-zinc-200 py-2.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-zinc-800 transition"
            >
              Back to Public Website
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const filteredLeads = data.leads.filter(
    (l) =>
      l.name.toLowerCase().includes(leadSearch.toLowerCase()) ||
      l.email.toLowerCase().includes(leadSearch.toLowerCase()) ||
      l.message.toLowerCase().includes(leadSearch.toLowerCase())
  );

  const filteredProducts = data.products.filter(
    (p) =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.category.toLowerCase().includes(productSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#09090B] dark:text-zinc-100">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-[#09090B]/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-400"
              title="Dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold truncate max-w-[200px] sm:max-w-xs">
                  {data.project.businessName || data.project.name}
                </h1>
                <span className="rounded-md bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  OWNER ADMIN
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 truncate">
                {data.project.category} · websitebanja.com/p/{slug}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href={`/p/${slug}`}
              target="_blank"
              className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition"
            >
              <span>View Site</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
            <Link
              href={`/editor/${data.project.id}/workspace`}
              className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-violet-700 transition"
            >
              <Sparkles className="h-3 w-3" />
              <span>Open Studio</span>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto gap-2 border-b border-zinc-200 pb-3 dark:border-white/10 text-xs font-bold">
          {[
            { id: "overview", label: "Overview & Analytics", icon: BarChart3 },
            { id: "leads", label: `Leads & Inquiries (${data.overview.unreadLeads} new)`, icon: MessageSquare },
            { id: "products", label: `Catalog (${data.overview.totalProducts})`, icon: ShoppingBag },
            { id: "pages", label: `Pages (${data.pages.length || 1})`, icon: Layers },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-4 py-2 transition",
                  isActive
                    ? "bg-violet-600 text-white shadow-md shadow-violet-600/20"
                    : "bg-white text-zinc-600 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-white/10"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Overview */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-white/10 dark:bg-zinc-900">
                <span className="text-xs font-bold text-zinc-400 uppercase">Total Visitors</span>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black">{data.overview.pageViews}</span>
                  <span className="text-xs font-bold text-emerald-500">Live</span>
                </div>
              </div>
              <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-white/10 dark:bg-zinc-900">
                <span className="text-xs font-bold text-zinc-400 uppercase">Leads & Inquiries</span>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black">{data.overview.totalLeads}</span>
                  <span className="text-xs font-bold text-violet-500">{data.overview.unreadLeads} unread</span>
                </div>
              </div>
              <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-white/10 dark:bg-zinc-900">
                <span className="text-xs font-bold text-zinc-400 uppercase">WhatsApp Clicks</span>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black">{data.overview.whatsappClicks}</span>
                </div>
              </div>
              <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-white/10 dark:bg-zinc-900">
                <span className="text-xs font-bold text-zinc-400 uppercase">Active Catalog</span>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black">{data.overview.activeProducts}</span>
                  <span className="text-xs text-zinc-400">of {data.overview.totalProducts}</span>
                </div>
              </div>
            </div>

            {/* Quick Summary & Contact Info Card */}
            <div className="rounded-3xl border border-zinc-200 bg-white p-6 dark:border-white/10 dark:bg-zinc-900">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-4">Business Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-zinc-400 block font-semibold">Phone</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">{data.contactInfo.phone || "Not set"}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block font-semibold">Email</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">{data.contactInfo.email || "Not set"}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block font-semibold">Location / Address</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">{data.contactInfo.address || "Not set"}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Leads & Inquiries */}
        {activeTab === "leads" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search inquiries by name, email, or message..."
                  value={leadSearch}
                  onChange={(e) => setLeadSearch(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-200 bg-white pl-9 pr-4 py-2 text-xs text-zinc-900 outline-none focus:border-violet-500 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                />
              </div>
              <span className="text-xs text-zinc-400 font-bold">{filteredLeads.length} Total Inquiries</span>
            </div>

            {filteredLeads.length === 0 ? (
              <div className="rounded-3xl border border-zinc-200 bg-white p-12 text-center dark:border-white/10 dark:bg-zinc-900">
                <MessageSquare className="h-8 w-8 mx-auto text-zinc-400 mb-2" />
                <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">No Inquiries Found</h4>
                <p className="text-xs text-zinc-400 mt-1">Form submissions from your website will appear here in real time.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className={cn(
                      "rounded-2xl border p-4 transition bg-white dark:bg-zinc-900",
                      lead.read
                        ? "border-zinc-200 dark:border-white/10 opacity-80"
                        : "border-violet-500/50 bg-violet-50/20 dark:bg-violet-950/20 shadow-xs"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-zinc-900 dark:text-white">{lead.name}</h4>
                          {!lead.read && (
                            <span className="rounded-full bg-violet-600 px-2 py-0.5 text-[9px] font-bold text-white uppercase">
                              New
                            </span>
                          )}
                          <span className="text-[11px] text-zinc-400">
                            {new Date(lead.createdAt).toLocaleDateString()} at{" "}
                            {new Date(lead.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-zinc-600 dark:text-zinc-300">
                          <a href={`mailto:${lead.email}`} className="flex items-center gap-1 hover:text-violet-600">
                            <Mail className="h-3.5 w-3.5" />
                            <span>{lead.email}</span>
                          </a>
                          {lead.phone && (
                            <a href={`tel:${lead.phone}`} className="flex items-center gap-1 hover:text-violet-600">
                              <Phone className="h-3.5 w-3.5" />
                              <span>{lead.phone}</span>
                            </a>
                          )}
                          <span className="text-zinc-400 font-mono text-[10px]">Source: {lead.sourcePage || "Home"}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {!lead.read && (
                          <button
                            type="button"
                            onClick={() => void handleMarkLeadRead(lead.id)}
                            title="Mark as Read"
                            className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-100 dark:border-white/10 dark:hover:bg-zinc-800 text-emerald-600"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => void handleDeleteLead(lead.id)}
                          title="Delete Lead"
                          className="p-1.5 rounded-lg border border-zinc-200 hover:bg-rose-50 text-zinc-400 hover:text-rose-600 dark:border-white/10 dark:hover:bg-rose-950/30"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 rounded-xl bg-zinc-50 p-3 text-xs text-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300">
                      <p className="whitespace-pre-wrap">{lead.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Products */}
        {activeTab === "products" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search products by title or category..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-200 bg-white pl-9 pr-4 py-2 text-xs text-zinc-900 outline-none focus:border-violet-500 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                />
              </div>
              <Link
                href={`/editor/${data.project.id}/workspace`}
                className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-xs font-bold text-white hover:bg-violet-700 transition"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Add / Edit in Studio</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs dark:border-white/10 dark:bg-zinc-900 flex flex-col justify-between"
                >
                  <div className="flex gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={product.image || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300"}
                      alt={product.name}
                      className="h-16 w-16 rounded-xl object-cover border border-zinc-100 dark:border-white/5 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold text-violet-600 uppercase tracking-wider block">
                        {product.category || "General"}
                      </span>
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-white truncate">{product.name}</h4>
                      <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="text-sm font-black text-zinc-900 dark:text-white">₹{product.price}</span>
                        {product.originalPrice && (
                          <span className="text-xs text-zinc-400 line-through">₹{product.originalPrice}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-white/10 flex items-center justify-between">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-bold",
                        product.status === "active"
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-rose-500/10 text-rose-600"
                      )}
                    >
                      {product.status === "active" ? "In Stock" : "Out of Stock"}
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleToggleProduct(product.id)}
                      className="text-xs font-semibold text-violet-600 hover:text-violet-700"
                    >
                      Toggle Availability
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Pages */}
        {activeTab === "pages" && (
          <div className="space-y-4">
            <div className="rounded-3xl border border-zinc-200 bg-white p-6 dark:border-white/10 dark:bg-zinc-900">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-3">Live Website Pages</h3>
              <div className="space-y-2">
                {data.pages.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-zinc-100 bg-zinc-50 dark:border-white/5 dark:bg-zinc-800/50"
                  >
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-violet-600" />
                      <span className="text-xs font-bold text-zinc-900 dark:text-white">{p.title}</span>
                      <span className="text-[11px] text-zinc-400 font-mono">
                        /p/{slug}{p.slug ? `/${p.slug}` : ""}
                      </span>
                    </div>
                    <Link
                      href={`/p/${slug}${p.slug ? `/${p.slug}` : ""}`}
                      target="_blank"
                      className="text-xs font-semibold text-violet-600 hover:text-violet-700 flex items-center gap-1"
                    >
                      <span>Preview</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
