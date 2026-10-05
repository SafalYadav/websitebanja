"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { formatINR } from "@/lib/plans";
import ThemeToggle from "@/components/theme/ThemeToggle";
import Logo from "@/components/brand/Logo";
import {
  Users,
  Layers,
  Sparkles,
  Globe,
  DollarSign,
  TrendingUp,
  Activity,
  ShieldAlert,
  Search,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  Lock,
  ArrowRight,
  Compass,
  Target,
  MessageSquare,
  Send,
  BarChart3,
  KeyRound,
  Zap,
  Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import AdminIntelligenceCenter from "@/components/admin/AdminIntelligenceCenter";
import BusinessResearchApprovals from "@/components/admin/BusinessResearchApprovals";
import AdminUsersAccess from "@/components/admin/AdminUsersAccess";
import AdminBossResearchPanel from "@/components/admin/AdminBossResearchPanel";
import AdminLeadCommandCenter from "@/components/admin/AdminLeadCommandCenter";
import AdminAutomationPipeline from "@/components/admin/AdminAutomationPipeline";
import AdminCrmCenter from "@/components/admin/AdminCrmCenter";
import AdminOutreachCenter from "@/components/admin/AdminOutreachCenter";
import AdminAnalyticsCenter from "@/components/admin/AdminAnalyticsCenter";
import AdminIntegrationsCenter from "@/components/admin/AdminIntegrationsCenter";

interface AnalyticsData {
  adminUser: {
    id: string;
    email: string;
  };
  overview: {
    totalUsers: number;
    newUsersToday: number;
    newUsersThisWeek: number;
    newUsersThisMonth: number;
    activeUsers: number;
    totalProjects: number;
    totalGeneratedWebsites: number;
    totalPublishedWebsites: number;
    customDomainCount: number;
    freeUsers: number;
    paidUsers: number;
    totalAiRequests: number;
    failedAiRequests: number;
    mrrINR: number;
    totalRevenueINR: number;
  };
  timeSeries: Array<{
    day: string;
    generations: number;
    successRate: number;
  }>;
  recentActivity: Array<{
    id: string;
    event_type: string;
    user_id?: string;
    project_id?: string;
    metadata?: Record<string, unknown>;
    created_at: string;
  }>;
  usersDirectory: Array<{
    userId: string;
    plan: string;
    projectsCount: number;
    publishedCount: number;
    generationsCount: number;
    status: string;
    lastActive: string;
  }>;
  projectsDirectory: Array<{
    id: string;
    user_id: string;
    name: string;
    business_name?: string;
    category?: string;
    is_published: boolean;
    public_slug?: string;
    custom_domain?: string;
    custom_domain_status?: string;
    created_at: string;
  }>;
}

export type TabType =
  | "overview"
  | "ai_health"
  | "boss_research"
  | "leads"
  | "automation"
  | "crm"
  | "outreach"
  | "analytics"
  | "integrations"
  | "usage"
  | "revenue"
  | "users"
  | "projects"
  | "activity";

function normalizeTab(raw: string | null): TabType {
  if (!raw) return "overview";
  const r = raw.toLowerCase().trim();
  if (r === "leads" || r === "lead" || r === "command_center" || r === "command-center") return "leads";
  if (r === "automation" || r === "pipeline" || r === "auto") return "automation";
  if (r === "crm" || r === "replies") return "crm";
  if (r === "outreach" || r === "dispatch") return "outreach";
  if (r === "analytics" || r === "pipeline_analytics" || r === "metrics") return "analytics";
  if (r === "integrations" || r === "integration") return "integrations";
  if (r === "ai_health" || r === "ai-health" || r === "health") return "ai_health";
  if (r === "boss_research" || r === "boss-research" || r === "boss") return "boss_research";
  if (r === "usage") return "usage";
  if (r === "revenue" || r === "billing") return "revenue";
  if (r === "users" || r === "access") return "users";
  if (r === "projects") return "projects";
  if (r === "activity" || r === "audit") return "activity";
  return "overview";
}

function AdminDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") || searchParams.get("section");

  const [isLoading, setIsLoading] = useState(true);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const activeTab = normalizeTab(tabParam);

  // Filter & Search states
  const [projectSearch, setProjectSearch] = useState("");

  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | undefined>(undefined);

  const handleTabChange = useCallback((tab: TabType) => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      router.replace(`${url.pathname}${url.search}${url.hash}`, { scroll: false });
    }
  }, [router]);

  useEffect(() => {
    let isMounted = true;

    async function fetchAnalytics() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          setSessionToken(session.access_token);
        }
        if (session?.user?.email) {
          setUserEmail(session.user.email);
        }

        if (!session) {
          if (isMounted) {
            setIsUnauthorized(true);
            setIsLoading(false);
          }
          return;
        }

        const res = await fetch(`/api/admin/analytics?t=${Date.now()}`, {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (res.status === 401 || res.status === 403) {
          if (isMounted) {
            setIsUnauthorized(true);
            setIsLoading(false);
          }
          return;
        }

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.message || "Failed to load analytics.");
        }

        if (isMounted) {
          setData(json.data);
          setLastUpdated(new Date());
          setIsLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setErrorMessage(err instanceof Error ? err.message : "Error fetching analytics.");
          setIsLoading(false);
        }
      }
    }

    void fetchAnalytics();

    // Gentle 60s background refresh interval
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        void fetchAnalytics();
      }
    }, 60000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        setSessionToken(session.access_token);
      }
      if (session?.user?.email) {
        setUserEmail(session.user.email);
      }
      if (!session) {
        setIsUnauthorized(true);
        setIsRefreshing(false);
        return;
      }
      const res = await fetch(`/api/admin/analytics?t=${Date.now()}`, {
        cache: "no-store",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setLastUpdated(new Date());
      }
    } catch {
      // Ignored
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-[#09090B] text-zinc-600 dark:text-zinc-400">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 via-violet-600 to-indigo-600 text-white shadow-lg animate-pulse mb-3">
          <Sparkles className="h-6 w-6" />
        </div>
        <p className="text-sm font-semibold">Authorizing Administrative Clearance...</p>
      </div>
    );
  }

  if (isUnauthorized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-[#09090B] px-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400 mb-4">
          <Lock className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Admin Access Restricted</h1>
        <p className="mt-2 text-sm text-zinc-500 max-w-md mx-auto leading-relaxed">
          Your account does not possess administrator clearance to access this control center. Authorization is enforced server-side.
        </p>

        {userEmail && (
          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800/80 px-3.5 py-1 text-xs font-mono text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-white/10">
            <span>Signed in as: <strong>{userEmail}</strong></span>
          </div>
        )}

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => void handleRefresh()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white px-4 py-2.5 text-xs font-bold transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Check Again</span>
          </button>

          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white px-5 py-2.5 text-xs font-bold transition hover:opacity-90 active:scale-95"
          >
            <span>Return to Dashboard</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-[#09090B] p-6 text-center">
        <ShieldAlert className="h-10 w-10 text-amber-500 mb-3" />
        <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          {errorMessage || "Unable to load administrative telemetry."}
        </p>
        <button
          type="button"
          onClick={() => void handleRefresh()}
          className="mt-4 rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white shadow-xs"
        >
          Retry
        </button>
      </div>
    );
  }

  const { overview, timeSeries, projectsDirectory, recentActivity } = data;

  const filteredProjects = projectsDirectory.filter((p) => {
    return (
      p.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
      (p.business_name && p.business_name.toLowerCase().includes(projectSearch.toLowerCase())) ||
      (p.category && p.category.toLowerCase().includes(projectSearch.toLowerCase())) ||
      (p.custom_domain && p.custom_domain.toLowerCase().includes(projectSearch.toLowerCase()))
    );
  });

  const ALL_TABS: Array<{
    id: TabType;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
    group: "Overview & Intelligence" | "Lead Operations" | "Platform & Business";
  }> = [
    // Group 1: Core Intelligence
    { id: "overview", label: "Overview KPI", icon: Activity, group: "Overview & Intelligence" },
    { id: "ai_health", label: "CEO Command Center", icon: Crown, badge: "P26", group: "Overview & Intelligence" },
    { id: "boss_research", label: "Boss Research & Skills", icon: Compass, group: "Overview & Intelligence" },

    // Group 2: Growth & Autonomous Pipeline (Autonomous Lead Ops)
    { id: "leads", label: "Lead Command Center", icon: Target, group: "Lead Operations" },
    { id: "automation", label: "Automation", icon: Zap, group: "Lead Operations" },
    { id: "crm", label: "CRM", icon: MessageSquare, group: "Lead Operations" },
    { id: "outreach", label: "Outreach", icon: Send, group: "Lead Operations" },
    { id: "analytics", label: "Pipeline Analytics", icon: BarChart3, group: "Lead Operations" },
    { id: "integrations", label: "Integrations", icon: KeyRound, group: "Lead Operations" },

    // Group 3: Platform & Business Operations
    { id: "usage", label: "Usage & Telemetry", icon: TrendingUp, group: "Platform & Business" },
    { id: "revenue", label: "Revenue & Subscriptions", icon: DollarSign, group: "Platform & Business" },
    { id: "users", label: `Users & Access (${overview.totalUsers})`, icon: Users, group: "Platform & Business" },
    { id: "projects", label: `Projects (${overview.totalProjects})`, icon: Layers, group: "Platform & Business" },
    { id: "activity", label: "Audit Stream", icon: ShieldAlert, group: "Platform & Business" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#09090B] dark:text-zinc-100 transition-colors duration-200">
      {/* Top Admin Navbar */}
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 backdrop-blur-xl dark:border-white/10 dark:bg-[#09090B]/90">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <Logo imageSize={40} subtitleClassName="text-[10px]" />
              <span className="ml-2 rounded-md bg-red-100 px-1.5 py-0.5 text-[10px] font-black text-red-700 dark:bg-red-950/60 dark:text-red-300 uppercase tracking-wider">
                ADMIN CONSOLE
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Admin: {data.adminUser.email}</span>
            </div>

            <div className="hidden md:flex items-center text-[11px] font-mono text-zinc-400">
              <span>Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
            </div>

            <button
              type="button"
              onClick={() => void handleRefresh()}
              title="Refresh Telemetry"
              className="flex h-9 items-center gap-1.5 px-3 rounded-xl border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition text-xs font-bold"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin text-violet-600")} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <ThemeToggle />

            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 rounded-xl bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white px-3.5 py-2 text-xs font-bold transition hover:opacity-90 shadow-xs"
            >
              <span>User Studio</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Global Canonical Navigation Tab Strip */}
        <div className="border-t border-zinc-200/60 dark:border-white/5 bg-zinc-50/70 dark:bg-zinc-950/40 px-6 py-2">
          <div className="mx-auto max-w-7xl flex items-center overflow-x-auto gap-1.5 no-scrollbar py-0.5">
            {ALL_TABS.map((tab) => {
              const TabIcon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                  className={cn(
                    "flex items-center gap-2 py-1.5 px-3 rounded-xl text-xs font-bold transition whitespace-nowrap border shrink-0",
                    isActive
                      ? "bg-violet-600 text-white border-violet-600 shadow-sm shadow-violet-600/30"
                      : "text-zinc-600 hover:bg-zinc-200/70 dark:text-zinc-400 dark:hover:bg-zinc-800/70 border-transparent"
                  )}
                >
                  <TabIcon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={cn(
                        "text-[9px] px-1.5 py-0.2 rounded-full font-black tracking-wide uppercase",
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300"
                      )}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-6 py-8 space-y-8">
        {/* ======================================================== */}
        {/* Tab 1: Overview KPIs                                      */}
        {/* ======================================================== */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* MRR Card */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-transparent p-6 shadow-xs backdrop-blur-md dark:border-emerald-500/20"
              >
                <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider">Monthly Recurring Revenue</span>
                  <DollarSign className="h-5 w-5" />
                </div>
                <h3 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
                  {formatINR(overview.mrrINR)}
                </h3>
                <p className="text-xs text-zinc-500 mt-1">
                  {overview.paidUsers} active Paid Pro subscribers (₹500/mo)
                </p>
              </motion.div>

              {/* Total Users */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xs backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/60"
              >
                <div className="flex items-center justify-between text-violet-600 dark:text-violet-400 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider">Registered Accounts</span>
                  <Users className="h-5 w-5" />
                </div>
                <h3 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
                  {overview.totalUsers}
                </h3>
                <p className="text-xs text-zinc-500 mt-1">
                  +{overview.newUsersToday} today • +{overview.newUsersThisWeek} this week
                </p>
              </motion.div>

              {/* Total Projects */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xs backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/60"
              >
                <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider">Total Websites Built</span>
                  <Layers className="h-5 w-5" />
                </div>
                <h3 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
                  {overview.totalProjects}
                </h3>
                <p className="text-xs text-zinc-500 mt-1">
                  {overview.totalPublishedWebsites} live ({overview.customDomainCount} custom domains)
                </p>
              </motion.div>

              {/* AI Requests */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xs backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/60"
              >
                <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider">AI Generations</span>
                  <Sparkles className="h-5 w-5" />
                </div>
                <h3 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
                  {overview.totalGeneratedWebsites}
                </h3>
                <p className="text-xs text-zinc-500 mt-1">
                  {overview.failedAiRequests} failures reported (98.9% success)
                </p>
              </motion.div>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-3xl border border-zinc-200 bg-white p-6 dark:border-white/10 dark:bg-zinc-900/60 space-y-4">
                <h4 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Users className="h-4 w-4 text-violet-500" />
                  <span>User Distribution</span>
                </h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs font-medium mb-1">
                      <span>Free Starter Users</span>
                      <span className="font-bold">{overview.freeUsers}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                      <div className="h-full bg-zinc-400 rounded-full" style={{ width: `${(overview.freeUsers / Math.max(overview.totalUsers, 1)) * 100}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-medium mb-1">
                      <span>Paid Pro Subscribers</span>
                      <span className="font-bold text-violet-600 dark:text-violet-400">{overview.paidUsers}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                      <div className="h-full bg-violet-600 rounded-full" style={{ width: `${(overview.paidUsers / Math.max(overview.totalUsers, 1)) * 100}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-zinc-200 bg-white p-6 dark:border-white/10 dark:bg-zinc-900/60 space-y-4">
                <h4 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Globe className="h-4 w-4 text-emerald-500" />
                  <span>Publishing Health</span>
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-white/5">
                    <span className="text-zinc-500">Live Edge Deployments</span>
                    <strong className="text-zinc-800 dark:text-zinc-200">{overview.totalPublishedWebsites}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-white/5">
                    <span className="text-zinc-500">Verified Custom Domains</span>
                    <strong className="text-zinc-800 dark:text-zinc-200">{overview.customDomainCount}</strong>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-zinc-500">Unpublished Drafts</span>
                    <strong className="text-zinc-800 dark:text-zinc-200">{Math.max(0, overview.totalProjects - overview.totalPublishedWebsites)}</strong>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-zinc-200 bg-white p-6 dark:border-white/10 dark:bg-zinc-900/60 space-y-4">
                <h4 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-500" />
                  <span>Rate Limiting & Safety</span>
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-white/5">
                    <span className="text-zinc-500">Free Tier Limit</span>
                    <strong className="text-zinc-800 dark:text-zinc-200">3 reqs / 7d (IP + User)</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-white/5">
                    <span className="text-zinc-500">Pro Tier Limit</span>
                    <strong className="text-zinc-800 dark:text-zinc-200">50 reqs / 7d</strong>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-zinc-500">Protection Mechanism</span>
                    <strong className="text-emerald-600 dark:text-emerald-400">Upstash Redis Sliding Window</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Link to Lead Command Center */}
            <div className="rounded-3xl border border-violet-500/20 bg-gradient-to-r from-violet-500/10 via-indigo-500/5 to-transparent p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-violet-500/10 px-3 py-1 text-xs font-bold text-violet-600 dark:text-violet-400 mb-2">
                  <Target className="h-3.5 w-3.5" />
                  <span>Autonomous Growth Engine</span>
                </div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                  Autonomous Lead Pipeline & Command Center
                </h3>
                <p className="text-xs text-zinc-500 mt-1 max-w-xl">
                  Manage local business discovery, Google Places enrichment, multi-agent evaluation, human review queues, and multi-channel outreach directly in this console.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleTabChange("leads")}
                className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-violet-600/20 hover:bg-violet-500 transition shrink-0"
              >
                <span>Open Lead Command Center</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* Tab 2: AI Health & Agents                                 */}
        {/* ======================================================== */}
        {activeTab === "ai_health" && (
          <><BusinessResearchApprovals sessionToken={sessionToken} /><AdminIntelligenceCenter sessionToken={sessionToken} onNavigateTab={(tab) => handleTabChange(tab as TabType)} /></>
        )}

        {/* ======================================================== */}
        {/* Tab 3: Boss Research & Skill Discovery                    */}
        {/* ======================================================== */}
        {activeTab === "boss_research" && (
          <AdminBossResearchPanel sessionToken={sessionToken} />
        )}

        {/* ======================================================== */}
        {/* Tab 4: Lead Command Center                                */}
        {/* ======================================================== */}
        {activeTab === "leads" && (
          <AdminLeadCommandCenter sessionToken={sessionToken} onNavigateTab={(tab) => handleTabChange(tab as TabType)} />
        )}

        {/* ======================================================== */}
        {/* Tab 5: Automation Pipeline Control Center                 */}
        {/* ======================================================== */}
        {activeTab === "automation" && (
          <AdminAutomationPipeline sessionToken={sessionToken} onNavigateTab={(tab) => handleTabChange(tab as TabType)} />
        )}

        {/* ======================================================== */}
        {/* Tab 6: CRM & Replies Intelligence                         */}
        {/* ======================================================== */}
        {activeTab === "crm" && (
          <AdminCrmCenter sessionToken={sessionToken} onNavigateTab={(tab) => handleTabChange(tab as TabType)} />
        )}

        {/* ======================================================== */}
        {/* Tab 7: Outreach Dispatch & Review Queue                   */}
        {/* ======================================================== */}
        {activeTab === "outreach" && (
          <AdminOutreachCenter sessionToken={sessionToken} onNavigateTab={(tab) => handleTabChange(tab as TabType)} />
        )}

        {/* ======================================================== */}
        {/* Tab 8: Pipeline Analytics & Cost Tracking                 */}
        {/* ======================================================== */}
        {activeTab === "analytics" && (
          <AdminAnalyticsCenter sessionToken={sessionToken} onNavigateTab={(tab) => handleTabChange(tab as TabType)} />
        )}

        {/* ======================================================== */}
        {/* Tab 9: Integrations Hub                                   */}
        {/* ======================================================== */}
        {activeTab === "integrations" && (
          <AdminIntegrationsCenter sessionToken={sessionToken} onNavigateTab={(tab) => handleTabChange(tab as TabType)} />
        )}

        {/* ======================================================== */}
        {/* Tab 10: Usage & Telemetry                                 */}
        {/* ======================================================== */}
        {activeTab === "usage" && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-zinc-200 bg-white p-8 dark:border-white/10 dark:bg-zinc-900/60 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                    AI Generations (7-Day Rolling Trend)
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Daily website synthesis and planning activity
                  </p>
                </div>
              </div>

              {/* Simple CSS-rendered Bar Chart */}
              <div className="grid grid-cols-7 gap-3 pt-6 h-56 items-end border-b border-zinc-200 dark:border-white/10 pb-4">
                {timeSeries.map((item, idx) => {
                  const maxGen = Math.max(...timeSeries.map((t) => t.generations), 10);
                  const heightPct = Math.max((item.generations / maxGen) * 100, 15);

                  return (
                    <div key={idx} className="flex flex-col items-center gap-2 h-full justify-end group">
                      <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 opacity-0 group-hover:opacity-100 transition">
                        {item.generations}
                      </span>
                      <div
                        className="w-full max-w-[48px] rounded-2xl bg-gradient-to-t from-violet-600 to-indigo-500 transition-all duration-500 group-hover:scale-105 shadow-md shadow-violet-600/20"
                        style={{ height: `${heightPct}%` }}
                      />
                      <span className="text-[11px] font-mono text-zinc-500 truncate mt-1">
                        {item.day.split(",")[0]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* Tab 11: Revenue & Subscriptions                           */}
        {/* ======================================================== */}
        {activeTab === "revenue" && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-zinc-200 bg-white p-8 dark:border-white/10 dark:bg-zinc-900/60 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                    SaaS Monetization & Subscriptions
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    INR Billing Metrics (Free ₹0 vs Paid Pro ₹500/mo)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="rounded-2xl border p-5 bg-zinc-50 dark:bg-zinc-950/40 dark:border-white/10">
                  <span className="text-xs font-semibold text-zinc-500">Current MRR</span>
                  <h4 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    {formatINR(overview.mrrINR)}
                  </h4>
                  <p className="text-[11px] text-zinc-400 mt-1">Normalized to Indian Rupees</p>
                </div>

                <div className="rounded-2xl border p-5 bg-zinc-50 dark:bg-zinc-950/40 dark:border-white/10">
                  <span className="text-xs font-semibold text-zinc-500">Annualized Run Rate (ARR)</span>
                  <h4 className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">
                    {formatINR(overview.mrrINR * 12)}
                  </h4>
                  <p className="text-[11px] text-zinc-400 mt-1">Projected 12-month revenue</p>
                </div>

                <div className="rounded-2xl border p-5 bg-zinc-50 dark:bg-zinc-950/40 dark:border-white/10">
                  <span className="text-xs font-semibold text-zinc-500">Free → Paid Conversion</span>
                  <h4 className="text-2xl font-bold text-violet-600 dark:text-violet-400 mt-1">
                    {overview.totalUsers > 0 ? ((overview.paidUsers / overview.totalUsers) * 100).toFixed(1) : 0}%
                  </h4>
                  <p className="text-[11px] text-zinc-400 mt-1">Active subscriber ratio</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* Tab 12: Users & Access Management                         */}
        {/* ======================================================== */}
        {activeTab === "users" && (
          <AdminUsersAccess sessionToken={sessionToken} currentAdminEmail={userEmail} />
        )}

        {/* ======================================================== */}
        {/* Tab 13: Projects Catalog                                  */}
        {/* ======================================================== */}
        {activeTab === "projects" && (
          <div className="space-y-4">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search projects, business, domains..."
                value={projectSearch}
                onChange={(e) => setProjectSearch(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-4 py-2 text-xs text-zinc-900 placeholder-zinc-400 outline-none focus:border-violet-500 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
              />
            </div>

            <div className="rounded-3xl border border-zinc-200 bg-white shadow-xs overflow-hidden dark:border-white/10 dark:bg-zinc-900/60">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-white/10 dark:bg-zinc-950/40 text-zinc-500 uppercase tracking-wider font-bold text-[10px]">
                    <th className="p-4">Project Name</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Edge Slug</th>
                    <th className="p-4">Custom Domain</th>
                    <th className="p-4">Created Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-white/5">
                  {filteredProjects.map((p, i) => (
                    <tr key={i} className="hover:bg-zinc-50/60 dark:hover:bg-white/5 transition">
                      <td className="p-4 font-bold text-zinc-900 dark:text-white">
                        {p.business_name || p.name}
                      </td>
                      <td className="p-4 text-zinc-500">{p.category || "General"}</td>
                      <td className="p-4">
                        {p.is_published ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            LIVE
                          </span>
                        ) : (
                          <span className="text-zinc-400 text-[10px] font-semibold">DRAFT</span>
                        )}
                      </td>
                      <td className="p-4 font-mono text-[11px]">
                        {p.public_slug ? (
                          <a
                            href={`/p/${p.public_slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1"
                          >
                            <span>/p/{p.public_slug}</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="p-4 font-mono text-[11px]">
                        {p.custom_domain ? (
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold",
                            p.custom_domain_status === "verified" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40" : "bg-amber-50 text-amber-700"
                          )}>
                            {p.custom_domain} ({p.custom_domain_status})
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="p-4 font-mono text-zinc-500">{new Date(p.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* Tab 14: Audit Stream                                      */}
        {/* ======================================================== */}
        {activeTab === "activity" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
              Real-time Analytics Audit Stream
            </h3>

            <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-white/10 dark:bg-zinc-900/60 divide-y divide-zinc-100 dark:divide-white/5">
              {recentActivity.length === 0 ? (
                <p className="text-xs text-zinc-500 py-4 text-center">No audit events recorded yet.</p>
              ) : (
                recentActivity.map((evt, idx) => (
                  <div key={idx} className="py-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className="h-2 w-2 rounded-full bg-violet-500" />
                      <div>
                        <span className="font-mono font-bold uppercase text-[11px] text-zinc-800 dark:text-zinc-200">
                          {evt.event_type}
                        </span>
                        {evt.user_id && (
                          <span className="text-[11px] text-zinc-400 font-mono ml-2">
                            User: {evt.user_id.slice(0, 8)}...
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[11px] font-mono text-zinc-500">
                      {new Date(evt.created_at).toLocaleTimeString()} • {new Date(evt.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-[#09090B] text-zinc-600 dark:text-zinc-400">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 via-violet-600 to-indigo-600 text-white shadow-lg animate-pulse mb-3">
            <Sparkles className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold">Loading Admin Console...</p>
        </div>
      }
    >
      <AdminDashboardContent />
    </Suspense>
  );
}
