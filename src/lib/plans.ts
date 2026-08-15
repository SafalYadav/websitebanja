import type { PlanDefinition, PlanId, SubscriptionStatus } from "@/types/plans";

/**
 * Format Indian Rupees with proper currency symbol and commas (e.g. ₹2,000)
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Centralized Plan Configurations (Source of Truth)
 */
export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: "free",
    name: "Free Starter",
    description: "Ideal for testing business ideas and building initial web presence.",
    priceINR: 0,
    period: "forever free",
    aiRequestsPerWindow: 3,
    windowDays: 7,
    customDomain: false,
    removeBadge: false,
    prioritySupport: false,
    backendSupport: false,
    features: [
      { text: "3 AI requests per rolling 7 days", included: true },
      { text: "WebsiteBanja public URL (/p/slug)", included: true },
      { text: "Full Visual Studio Editor access", included: true },
      { text: "Responsive layouts & auto SSL", included: true },
      { text: "Custom domain connection", included: false },
      { text: "Managed / BYO backend features", included: false },
    ],
  },
  paid_pro: {
    id: "paid_pro",
    name: "Paid Pro",
    badge: "Most Popular",
    description: "For serious businesses, agencies, and brands requiring custom domains & power.",
    priceINR: 2000,
    period: "per month",
    aiRequestsPerWindow: 50,
    windowDays: 7,
    customDomain: true,
    removeBadge: true,
    prioritySupport: true,
    backendSupport: true,
    features: [
      { text: "50 AI requests per rolling 7 days", included: true, highlight: true },
      { text: "Custom domain connection (yourbrand.com)", included: true, highlight: true },
      { text: "WebsiteBanja public URL fallback", included: true },
      { text: "Managed / BYO backend infrastructure", included: true },
      { text: "Remove WebsiteBanja footer badge", included: true },
      { text: "Global CDN edge delivery & priority support", included: true },
    ],
  },
};

/**
 * Plan entitlement helpers
 */
export function getPlan(planId?: string | null): PlanDefinition {
  if (planId === "paid_pro") return PLANS.paid_pro;
  return PLANS.free;
}

export function canConnectCustomDomain(planId?: string | null, status?: SubscriptionStatus | null): boolean {
  if (status === "active_paid" && planId === "paid_pro") return true;
  return false;
}

export function canProvisionBackend(planId?: string | null, status?: SubscriptionStatus | null): boolean {
  if (status === "active_paid" && planId === "paid_pro") return true;
  return false;
}

export function getAiQuota(planId?: string | null): { limit: number; windowDays: number } {
  const plan = getPlan(planId);
  return {
    limit: plan.aiRequestsPerWindow,
    windowDays: plan.windowDays,
  };
}
