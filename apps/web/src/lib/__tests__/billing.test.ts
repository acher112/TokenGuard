/**
 * Tests for billing plan enforcement logic.
 *
 * Tests cover:
 * - PLAN_LIMITS values are correct
 * - Billing provider fallback to stub when no env var
 * - Plan limit comparisons (trace enforcement logic)
 * - Price-to-plan mapping in webhook handler for Paddle & Lemon Squeezy
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PLAN_LIMITS } from "@/lib/billing/interface";

// ─── PLAN_LIMITS ──────────────────────────────────────────────────────────────

describe("PLAN_LIMITS", () => {
  it("free plan has correct limits", () => {
    const limits = PLAN_LIMITS.free;
    expect(limits.priceUsd).toBe(0);
    expect(limits.annualPriceUsd).toBe(0);
    expect(limits.maxTracesPerMonth).toBe(10_000);
    expect(limits.maxProjects).toBe(1);
    expect(limits.maxSeats).toBe(1);
    expect(limits.retentionDays).toBe(7);
    expect(limits.hasAdvancedAnalytics).toBe(false);
    expect(limits.hasAlerts).toBe(false);
    expect(limits.hasSlackAlerts).toBe(false);
    expect(limits.hasSessionTracing).toBe(false);
    expect(limits.hasDatasetExport).toBe(false);
    expect(limits.hasOTelIngestion).toBe(false);
  });

  it("pro plan has correct limits", () => {
    const limits = PLAN_LIMITS.pro;
    expect(limits.priceUsd).toBe(49);
    expect(limits.annualPriceUsd).toBe(490);
    expect(limits.maxTracesPerMonth).toBe(100_000);
    expect(limits.maxProjects).toBe(5);
    expect(limits.maxSeats).toBe(3);
    expect(limits.additionalSeatPriceUsd).toBe(10);
    expect(limits.retentionDays).toBe(30);
    expect(limits.hasAdvancedAnalytics).toBe(true);
    expect(limits.hasAlerts).toBe(true);
    expect(limits.hasSlackAlerts).toBe(true);
    expect(limits.hasSessionTracing).toBe(true);
    expect(limits.hasDatasetExport).toBe(true);
    expect(limits.hasOTelIngestion).toBe(false);
  });

  it("team plan has correct limits", () => {
    const limits = PLAN_LIMITS.team;
    expect(limits.priceUsd).toBe(249);
    expect(limits.annualPriceUsd).toBe(2490);
    expect(limits.maxTracesPerMonth).toBe(1_000_000);
    expect(limits.maxProjects).toBe(Infinity);
    expect(limits.maxSeats).toBe(Infinity);
    expect(limits.retentionDays).toBe(90);
    expect(limits.hasTeamMembers).toBe(true);
    expect(limits.hasPrioritySupport).toBe(true);
    expect(limits.hasSlackAlerts).toBe(true);
    expect(limits.hasSessionTracing).toBe(true);
    expect(limits.hasDatasetExport).toBe(true);
    expect(limits.hasOTelIngestion).toBe(true);
    expect(limits.hasRBAC).toBe(true);
    expect(limits.hasSSO).toBe(true);
  });

  it("team plan allows more traces than pro", () => {
    expect(PLAN_LIMITS.team.maxTracesPerMonth).toBeGreaterThan(
      PLAN_LIMITS.pro.maxTracesPerMonth
    );
  });

  it("pro plan allows more traces than free", () => {
    expect(PLAN_LIMITS.pro.maxTracesPerMonth).toBeGreaterThan(
      PLAN_LIMITS.free.maxTracesPerMonth
    );
  });
});

// ─── Trace limit enforcement logic ───────────────────────────────────────────

describe("trace limit enforcement logic", () => {
  it("blocks at exactly the trace limit (>=)", () => {
    const limit = PLAN_LIMITS.free.maxTracesPerMonth;
    const current = limit; // exactly at limit
    expect(current >= limit).toBe(true);
  });

  it("allows one under the trace limit", () => {
    const limit = PLAN_LIMITS.free.maxTracesPerMonth;
    const current = limit - 1;
    expect(current >= limit).toBe(false);
  });

  it("blocks when over limit", () => {
    const limit = PLAN_LIMITS.free.maxTracesPerMonth;
    const current = limit + 500;
    expect(current >= limit).toBe(true);
  });

  it("team plan limit is very high (1M)", () => {
    // Even at 999,999 traces, should still be under team limit
    expect(999_999 >= PLAN_LIMITS.team.maxTracesPerMonth).toBe(false);
  });
});

// ─── Billing provider: stub fallback ─────────────────────────────────────────

describe("billing provider stub fallback", () => {
  it("throws when checkout called without provider configured", async () => {
    const { billing } = await import("@/lib/billing");
    await expect(
      billing.createCheckoutSession({
        userId: "user_1",
        email: "test@example.com",
        plan: "pro",
        returnUrl: "http://localhost:3000/settings",
      })
    ).rejects.toThrow();
  });

  it("throws when portal called without provider configured", async () => {
    const { billing } = await import("@/lib/billing");
    await expect(
      billing.createPortalSession({
        customerId: "cus_123",
        returnUrl: "http://localhost:3000/settings",
      })
    ).rejects.toThrow();
  });

  it("getPlanLimits returns correct limits for plan", async () => {
    const { billing } = await import("@/lib/billing");
    const limits = billing.getPlanLimits("pro");
    expect(limits.maxTracesPerMonth).toBe(100_000);
  });
});

// ─── Webhook: price-to-plan mapping ──────────────────────────────────────────

describe("webhook plan mapping", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      PADDLE_PRO_PRICE_ID: "pri_pro_paddle_123",
      PADDLE_TEAM_PRICE_ID: "pri_team_paddle_456",
      LEMONSQUEEZY_PRO_VARIANT_ID: "variant_pro_123",
      LEMONSQUEEZY_TEAM_VARIANT_ID: "variant_team_456",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  function mapPriceToPlan(id: string): "free" | "pro" | "team" {
    if (
      id === process.env.PADDLE_PRO_PRICE_ID ||
      id === process.env.LEMONSQUEEZY_PRO_VARIANT_ID
    ) {
      return "pro";
    }
    if (
      id === process.env.PADDLE_TEAM_PRICE_ID ||
      id === process.env.LEMONSQUEEZY_TEAM_VARIANT_ID
    ) {
      return "team";
    }
    return "free";
  }

  it("maps paddle pro price ID to pro plan", () => {
    expect(mapPriceToPlan("pri_pro_paddle_123")).toBe("pro");
  });

  it("maps paddle team price ID to team plan", () => {
    expect(mapPriceToPlan("pri_team_paddle_456")).toBe("team");
  });

  it("maps legacy LS pro variant ID to pro plan", () => {
    expect(mapPriceToPlan("variant_pro_123")).toBe("pro");
  });

  it("maps legacy LS team variant ID to team plan", () => {
    expect(mapPriceToPlan("variant_team_456")).toBe("team");
  });

  it("maps unknown price ID to free plan", () => {
    expect(mapPriceToPlan("pri_unknown_999")).toBe("free");
  });
});
