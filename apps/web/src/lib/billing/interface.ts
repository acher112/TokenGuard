/**
 * Billing interface — defines the contract between the app and billing provider.
 *
 * Phase 1: Only the interface is defined. Implementation is stubbed to return
 * free plan for all users. Lemon Squeezy will be wired in Phase 5.
 *
 * To swap billing providers, implement this interface and update `index.ts`.
 */

export type Plan = "free" | "pro" | "team";

export interface PlanLimits {
  priceUsd: number;
  annualPriceUsd: number;           // yearly price (15-17% discount)
  maxProjects: number;
  maxTracesPerMonth: number;
  retentionDays: number;
  maxApiKeysPerProject: number;
  maxSeats: number;
  additionalSeatPriceUsd: number;
  hasAdvancedAnalytics: boolean;
  hasCostOptimization: boolean;
  hasAlerts: boolean;
  hasSlackAlerts: boolean;          // Slack block-kit alert channel
  hasSessionTracing: boolean;       // multi-turn session grouping
  hasDatasetExport: boolean;        // export traces as JSONL/CSV
  hasOTelIngestion: boolean;        // OpenTelemetry OTLP endpoint
  hasRBAC: boolean;                 // role-based access control
  hasSSO: boolean;                  // SSO (Google Workspace / Okta)
  hasTeamMembers: boolean;
  hasPrioritySupport: boolean;
  supportLevel: "community" | "email" | "priority_slack";
  costWasteEngineLevel: "basic" | "full_ai" | "custom_alerts";
}

export interface CheckoutSession {
  url: string;
  id: string;
}

export interface BillingProvider {
  /** Get plan limits for a given plan tier. */
  getPlanLimits(plan: Plan): PlanLimits;

  /** Create a checkout session for upgrading. */
  createCheckoutSession(params: {
    userId: string;
    email: string;
    plan: Plan;
    returnUrl: string;
    interval?: "monthly" | "annual";
  }): Promise<CheckoutSession>;

  /** Create a customer portal session for managing subscription. */
  createPortalSession(params: {
    customerId: string;
    returnUrl: string;
  }): Promise<{ url: string }>;
}

// ─── Plan limits (source of truth for plan enforcement) ───────────────────────

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    priceUsd: 0,
    annualPriceUsd: 0,
    maxProjects: 1,
    maxTracesPerMonth: 10_000,
    retentionDays: 7,
    maxApiKeysPerProject: 2,
    maxSeats: 1,
    additionalSeatPriceUsd: 0,
    hasAdvancedAnalytics: false,
    hasCostOptimization: false,
    hasAlerts: false,
    hasSlackAlerts: false,
    hasSessionTracing: false,
    hasDatasetExport: false,
    hasOTelIngestion: false,
    hasRBAC: false,
    hasSSO: false,
    hasTeamMembers: false,
    hasPrioritySupport: false,
    supportLevel: "community",
    costWasteEngineLevel: "basic",
  },
  pro: {
    priceUsd: 49,
    annualPriceUsd: 490,              // $490/yr — saves $98 (17% off)
    maxProjects: 5,
    maxTracesPerMonth: 100_000,
    retentionDays: 30,
    maxApiKeysPerProject: 10,
    maxSeats: 3,
    additionalSeatPriceUsd: 10,
    hasAdvancedAnalytics: true,
    hasCostOptimization: true,
    hasAlerts: true,
    hasSlackAlerts: true,
    hasSessionTracing: true,
    hasDatasetExport: true,
    hasOTelIngestion: false,
    hasRBAC: false,
    hasSSO: false,
    hasTeamMembers: true,
    hasPrioritySupport: false,
    supportLevel: "email",
    costWasteEngineLevel: "full_ai",
  },
  team: {
    priceUsd: 249,
    annualPriceUsd: 2_490,            // $2,490/yr — saves $498 (17% off)
    maxProjects: Infinity,
    maxTracesPerMonth: 1_000_000,
    retentionDays: 90,
    maxApiKeysPerProject: Infinity,
    maxSeats: Infinity,
    additionalSeatPriceUsd: 0,
    hasAdvancedAnalytics: true,
    hasCostOptimization: true,
    hasAlerts: true,
    hasSlackAlerts: true,
    hasSessionTracing: true,
    hasDatasetExport: true,
    hasOTelIngestion: true,
    hasRBAC: true,
    hasSSO: true,
    hasTeamMembers: true,
    hasPrioritySupport: true,
    supportLevel: "priority_slack",
    costWasteEngineLevel: "custom_alerts",
  },
};
