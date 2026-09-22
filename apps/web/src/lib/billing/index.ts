/**
 * Billing module — Phase 5 implementation.
 *
 * Wires the Lemon Squeezy provider when LEMONSQUEEZY_API_KEY is set.
 * Falls back to the stub provider for local development.
 *
 * IMPORTANT: Local development never requires billing credentials.
 */

import type { BillingProvider, Plan, PlanLimits } from "./interface";
import { PLAN_LIMITS as _PLAN_LIMITS } from "./interface";
import { PaddleBillingProvider } from "./paddle";
import { LemonSqueezyBillingProvider } from "./lemon-squeezy";
export { PLAN_LIMITS } from "./interface";
export type { Plan, PlanLimits, BillingProvider };

// ─── Stub billing provider (for local dev / no-billing env) ───────────────────

class StubBillingProvider implements BillingProvider {
  getPlanLimits(plan: Plan): PlanLimits {
    return _PLAN_LIMITS[plan];
  }

  async createCheckoutSession(): Promise<{ url: string; id: string }> {
    throw new Error("Billing not configured. Set PADDLE_API_KEY to enable.");
  }

  async createPortalSession(): Promise<{ url: string }> {
    throw new Error("Billing not configured. Set PADDLE_API_KEY to enable.");
  }
}

// ─── Active billing provider ─────────────────────────────────────────────────
// Defaults to Paddle Billing v2 (supporting direct Payoneer payouts) when configured.

export const billing: BillingProvider = process.env.PADDLE_API_KEY
  ? new PaddleBillingProvider()
  : process.env.LEMONSQUEEZY_API_KEY
  ? new LemonSqueezyBillingProvider()
  : new StubBillingProvider();

// ─── Helper: get plan limits for a user ──────────────────────────────────────

export function getPlanLimits(plan: Plan): PlanLimits {
  return billing.getPlanLimits(plan);
}

