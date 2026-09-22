/**
 * Billing usage helpers — query current usage for plan enforcement.
 *
 * These helpers are used by the ingest API and the settings page
 * to determine whether a user has exceeded their plan limits.
 */

import { db } from "@/lib/db/client";
import { traces, projects, subscriptions } from "@/lib/db/schema";
import { eq, and, gte, count } from "drizzle-orm";
import { PLAN_LIMITS } from "./interface";
import type { Plan } from "./interface";

/**
 * Get the current plan for a user.
 * Falls back to "free" if no subscription row exists.
 */
export async function getUserPlan(userId: string): Promise<Plan> {
  const sub = await db
    .select({ plan: subscriptions.plan, status: subscriptions.status })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1)
    .then((r) => r[0]);

  if (!sub) return "free";
  // Only active/trialing subscriptions grant the paid tier
  if (sub.status === "active" || sub.status === "trialing") {
    return sub.plan;
  }
  return "free";
}

/**
 * Count how many traces have been ingested this calendar month
 * for all projects owned by a given user.
 */
export async function getMonthlyTraceCount(userId: string): Promise<number> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Get all project IDs for the user
  const userProjects = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.userId, userId));

  if (userProjects.length === 0) return 0;

  const projectIds = userProjects.map((p) => p.id);

  // Count traces across all projects since start of month
  let total = 0;
  for (const projectId of projectIds) {
    const [result] = await db
      .select({ value: count() })
      .from(traces)
      .where(
        and(
          eq(traces.projectId, projectId),
          gte(traces.startedAt, monthStart)
        )
      );
    total += result?.value ?? 0;
  }

  return total;
}

/**
 * Get the billing customer ID for a user (needed for portal sessions).
 * Returns null if no paid subscription exists.
 */
export async function getCustomerId(userId: string): Promise<string | null> {
  const sub = await db
    .select({ customerId: subscriptions.lsCustomerId })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1)
    .then((r) => r[0]);

  return sub?.customerId ?? null;
}

// Backwards-compatible alias
export const getLsCustomerId = getCustomerId;


export interface UsageSummary {
  plan: Plan;
  priceUsd: number;
  annualPriceUsd: number;
  tracesThisMonth: number;
  traceLimit: number;
  projectCount: number;
  projectLimit: number;
  retentionDays: number;
  maxSeats: number;
  hasAdvancedAnalytics: boolean;
  hasCostOptimization: boolean;
  hasAlerts: boolean;
  hasSlackAlerts: boolean;
  hasSessionTracing: boolean;
  hasDatasetExport: boolean;
  hasOTelIngestion: boolean;
  hasRBAC: boolean;
  hasSSO: boolean;
  supportLevel: string;
  costWasteEngineLevel: string;
}

/**
 * Get a full usage summary for the settings page.
 */
export async function getUserUsageSummary(userId: string): Promise<UsageSummary> {
  const [plan, tracesThisMonth, userProjects] = await Promise.all([
    getUserPlan(userId),
    getMonthlyTraceCount(userId),
    db.select({ id: projects.id }).from(projects).where(eq(projects.userId, userId)),
  ]);

  const limits = PLAN_LIMITS[plan];

  return {
    plan,
    priceUsd: limits.priceUsd,
    annualPriceUsd: limits.annualPriceUsd,
    tracesThisMonth,
    traceLimit: limits.maxTracesPerMonth,
    projectCount: userProjects.length,
    projectLimit: limits.maxProjects,
    retentionDays: limits.retentionDays,
    maxSeats: limits.maxSeats,
    hasAdvancedAnalytics: limits.hasAdvancedAnalytics,
    hasCostOptimization: limits.hasCostOptimization,
    hasAlerts: limits.hasAlerts,
    hasSlackAlerts: limits.hasSlackAlerts,
    hasSessionTracing: limits.hasSessionTracing,
    hasDatasetExport: limits.hasDatasetExport,
    hasOTelIngestion: limits.hasOTelIngestion,
    hasRBAC: limits.hasRBAC,
    hasSSO: limits.hasSSO,
    supportLevel: limits.supportLevel,
    costWasteEngineLevel: limits.costWasteEngineLevel,
  };
}
