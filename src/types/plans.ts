export type PlanId = "free" | "paid_pro";
export type SubscriptionStatus = "free" | "active_paid" | "cancelled" | "expired";

export interface PlanFeature {
  text: string;
  included: boolean;
  highlight?: boolean;
}

export interface PlanDefinition {
  id: PlanId;
  name: string;
  badge?: string;
  description: string;
  priceINR: number;
  period: string;
  aiRequestsPerWindow: number;
  windowDays: number;
  customDomain: boolean;
  removeBadge: boolean;
  prioritySupport: boolean;
  backendSupport: boolean;
  features: PlanFeature[];
}

export interface UserSubscription {
  id: string;
  userId: string;
  planId: PlanId;
  status: SubscriptionStatus;
  amountINR: number;
  currentPeriodStart: string;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface StudioQuotaStatus {
  planId: PlanId;
  isPro: boolean;
  isAdmin?: boolean;
  changesUsed: number;
  limit: number;
  remainingChanges: number;
  isBlocked: boolean;
  periodStart: string;
  periodEnd: string;
}

