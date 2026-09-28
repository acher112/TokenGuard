/**
 * POST /api/v1/billing/sync
 *
 * Actively syncs the current user's subscription and plan status directly
 * from Paddle API (using the user's email). This ensures instant upgrades
 * without relying solely on asynchronous webhooks.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { users, subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { Plan } from "@/lib/billing/interface";

function getPaddleApiBase(): string {
  const env = process.env.PADDLE_ENVIRONMENT?.toLowerCase();
  return env === "production"
    ? "https://api.paddle.com"
    : "https://sandbox-api.paddle.com";
}

function mapPriceToPlan(id: string): Plan {
  if (id && id === process.env.PADDLE_PRO_PRICE_ID) return "pro";
  if (id && id === process.env.PADDLE_TEAM_PRICE_ID) return "team";
  return "free";
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.PADDLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      error: "Billing not configured",
      plan: (session.user as any).plan ?? "free",
    });
  }

  const apiBase = getPaddleApiBase();
  const email = session.user.email.toLowerCase().trim();

  try {
    // 1. Find customer by email in Paddle
    const customerRes = await fetch(
      `${apiBase}/customers?email=${encodeURIComponent(email)}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!customerRes.ok) {
      const errText = await customerRes.text();
      return NextResponse.json(
        { error: "Paddle customer lookup failed", details: errText },
        { status: 502 }
      );
    }

    const customerData = await customerRes.json();
    const customer = customerData.data?.[0];

    if (!customer?.id) {
      return NextResponse.json({
        synced: false,
        message: "No customer record in Paddle yet",
        plan: "free",
      });
    }

    // 2. Fetch customer subscriptions from Paddle
    const subRes = await fetch(
      `${apiBase}/subscriptions?customer_id=${customer.id}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!subRes.ok) {
      const errText = await subRes.text();
      return NextResponse.json(
        { error: "Paddle subscription lookup failed", details: errText },
        { status: 502 }
      );
    }

    const subData = await subRes.json();
    const subs: any[] = subData.data ?? [];

    // Filter all active or trialing subscriptions
    const activeSubs = subs.filter(
      (s) => s.status === "active" || s.status === "trialing"
    );

    if (activeSubs.length === 0) {
      return NextResponse.json({
        synced: false,
        message: "No active subscription found",
        plan: "free",
      });
    }

    // Sort active subscriptions:
    // 1. Higher tier first: team (Enterprise) > pro > free
    // 2. Most recent subscription first
    const tierWeight: Record<string, number> = { team: 3, pro: 2, free: 1 };
    activeSubs.sort((a, b) => {
      const planA = mapPriceToPlan(a.items?.[0]?.price?.id ?? "");
      const planB = mapPriceToPlan(b.items?.[0]?.price?.id ?? "");
      const weightDiff = (tierWeight[planB] ?? 0) - (tierWeight[planA] ?? 0);
      if (weightDiff !== 0) return weightDiff;
      const dateA = new Date(a.updated_at ?? a.created_at ?? 0).getTime();
      const dateB = new Date(b.updated_at ?? b.created_at ?? 0).getTime();
      return dateB - dateA;
    });

    const activeSub = activeSubs[0];
    const priceId = activeSub.items?.[0]?.price?.id ?? "";
    const plan: Plan = mapPriceToPlan(priceId);

    if (plan !== "free") {
      // Update users table
      await db
        .update(users)
        .set({ plan, updatedAt: new Date() })
        .where(eq(users.id, session.user.id));

      // Upsert subscriptions table
      const renewalDate = activeSub.current_billing_period?.ends_at
        ? new Date(activeSub.current_billing_period.ends_at)
        : null;

      await db
        .insert(subscriptions)
        .values({
          userId: session.user.id,
          lsSubscriptionId: activeSub.id,
          lsCustomerId: customer.id,
          lsOrderId: activeSub.transaction_id ?? null,
          lsVariantId: priceId,
          plan,
          status: activeSub.status === "trialing" ? "trialing" : "active",
          renewalDate: renewalDate ?? undefined,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: subscriptions.userId,
          set: {
            lsSubscriptionId: activeSub.id,
            lsCustomerId: customer.id,
            lsOrderId: activeSub.transaction_id ?? null,
            lsVariantId: priceId,
            plan,
            status: activeSub.status === "trialing" ? "trialing" : "active",
            renewalDate: renewalDate ?? undefined,
            updatedAt: new Date(),
          },
        });

      return NextResponse.json({
        synced: true,
        plan,
        subscriptionId: activeSub.id,
      });
    }

    return NextResponse.json({
      synced: false,
      message: "Subscription found but price ID did not match pro or team",
      priceId,
      plan: "free",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
