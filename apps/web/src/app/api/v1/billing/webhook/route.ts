/**
 * POST /api/v1/billing/webhook
 *
 * Receives and processes Merchant of Record webhook events:
 * - Paddle Billing v2 (via `Paddle-Signature`)
 * - Lemon Squeezy (via `X-Signature`, for backward compatibility)
 *
 * Verifies HMAC-SHA256 signatures, maps plan IDs, and syncs
 * subscriptions table and user plan on relevant events.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { subscriptions, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// ─── Helpers: Crypto HMAC verification ────────────────────────────────────────

async function hmacSha256(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(message)
  );

  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Constant-time string comparison
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// ─── Paddle Signature Verification ────────────────────────────────────────────
// Format: ts=<timestamp>;h1=<signature>
// Signed payload: <timestamp>:<rawBody>
async function verifyPaddleSignature(
  rawBody: string,
  signatureHeader: string | null
): Promise<boolean> {
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "development") return true;
    return false;
  }
  if (!signatureHeader) return false;

  const parts = signatureHeader.split(";").reduce((acc, part) => {
    const [k, v] = part.split("=");
    if (k && v) acc[k.trim()] = v.trim();
    return acc;
  }, {} as Record<string, string>);

  const ts = parts["ts"];
  const h1 = parts["h1"];
  if (!ts || !h1) return false;

  const signedPayload = `${ts}:${rawBody}`;
  const computed = await hmacSha256(secret, signedPayload);

  return timingSafeEqual(computed, h1);
}

// ─── Lemon Squeezy Signature Verification ────────────────────────────────────
async function verifyLemonSqueezySignature(
  rawBody: string,
  signatureHeader: string | null
): Promise<boolean> {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "development") return true;
    return false;
  }
  if (!signatureHeader) return false;

  const computed = await hmacSha256(secret, rawBody);
  return timingSafeEqual(computed, signatureHeader);
}

// ─── Status & Plan Mappers ───────────────────────────────────────────────────

function mapPaddleStatus(
  status: string
): "active" | "cancelled" | "past_due" | "paused" | "trialing" {
  switch (status) {
    case "active":
      return "active";
    case "canceled":
    case "cancelled":
      return "cancelled";
    case "past_due":
      return "past_due";
    case "paused":
      return "paused";
    case "trialing":
      return "trialing";
    default:
      return "active";
  }
}

function mapLsStatus(
  lsStatus: string
): "active" | "cancelled" | "past_due" | "paused" | "trialing" {
  switch (lsStatus) {
    case "active":
      return "active";
    case "cancelled":
    case "expired":
      return "cancelled";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "paused":
      return "paused";
    case "on_trial":
    case "trialing":
      return "trialing";
    default:
      return "active";
  }
}

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

// ─── Webhook Handler ─────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const rawBody = await request.text();
  const paddleSig = request.headers.get("paddle-signature");
  const lsSig = request.headers.get("x-signature");

  // Determine provider by signature header
  const isPaddle = Boolean(paddleSig) || (!lsSig && Boolean(process.env.PADDLE_API_KEY));

  if (isPaddle) {
    const isValid = await verifyPaddleSignature(rawBody, paddleSig);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid Paddle signature" }, { status: 401 });
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const eventType: string = payload.event_type ?? "";
    const data = payload.data ?? {};

    const HANDLED_PADDLE_EVENTS = new Set([
      "subscription.created",
      "subscription.updated",
      "subscription.activated",
      "subscription.paused",
      "subscription.resumed",
      "subscription.canceled",
    ]);

    if (!HANDLED_PADDLE_EVENTS.has(eventType)) {
      return NextResponse.json({ received: true, skipped: true });
    }

    const subscriptionId = data.id;
    const customerId = data.customer_id;
    const priceId = data.items?.[0]?.price?.id ?? "";
    const userId = data.custom_data?.user_id;
    const status = mapPaddleStatus(data.status);
    const plan = mapPriceToPlan(priceId);

    const renewalDate = data.current_billing_period?.ends_at
      ? new Date(data.current_billing_period.ends_at)
      : null;
    const cancelledAt = data.scheduled_change?.action === "cancel" && data.scheduled_change?.effective_at
      ? new Date(data.scheduled_change.effective_at)
      : null;

    if (userId) {
      await db
        .insert(subscriptions)
        .values({
          userId,
          lsSubscriptionId: subscriptionId,
          lsCustomerId: customerId,
          lsOrderId: data.transaction_id ?? null,
          lsVariantId: priceId,
          plan,
          status,
          renewalDate: renewalDate ?? undefined,
          cancelledAt: cancelledAt ?? undefined,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: subscriptions.userId,
          set: {
            lsSubscriptionId: subscriptionId,
            lsCustomerId: customerId,
            lsOrderId: data.transaction_id ?? null,
            lsVariantId: priceId,
            plan,
            status,
            renewalDate: renewalDate ?? undefined,
            cancelledAt: cancelledAt ?? undefined,
            updatedAt: new Date(),
          },
        });

      const effectivePlan: "free" | "pro" | "team" =
        status === "active" || status === "trialing" ? plan : "free";

      await db
        .update(users)
        .set({ plan: effectivePlan, updatedAt: new Date() })
        .where(eq(users.id, userId));
    }

    return NextResponse.json({ received: true });
  }

  // ── Handle Lemon Squeezy (fallback) ────────────────────────────────────────
  const isValidLs = await verifyLemonSqueezySignature(rawBody, lsSig);
  if (!isValidLs) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const attrs = event.data?.attributes ?? {};
  const lsSubscriptionId = event.data?.id;
  const lsCustomerId = String(attrs.customer_id ?? "");
  const lsOrderId = String(attrs.order_id ?? "");
  const lsVariantId = String(attrs.variant_id ?? "");
  const lsStatus = attrs.status;
  const userId = event.meta?.custom_data?.user_id;

  const plan = mapPriceToPlan(lsVariantId);
  const status = mapLsStatus(lsStatus);
  const renewalDate = attrs.renews_at ? new Date(attrs.renews_at) : null;
  const cancelledAt = attrs.cancelled_at ? new Date(attrs.cancelled_at) : null;

  if (userId) {
    await db
      .insert(subscriptions)
      .values({
        userId,
        lsSubscriptionId,
        lsCustomerId,
        lsOrderId,
        lsVariantId,
        plan,
        status,
        renewalDate: renewalDate ?? undefined,
        cancelledAt: cancelledAt ?? undefined,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: subscriptions.userId,
        set: {
          lsSubscriptionId,
          lsCustomerId,
          lsOrderId,
          lsVariantId,
          plan,
          status,
          renewalDate: renewalDate ?? undefined,
          cancelledAt: cancelledAt ?? undefined,
          updatedAt: new Date(),
        },
      });

    const effectivePlan: "free" | "pro" | "team" =
      status === "active" || status === "trialing" ? plan : "free";

    await db
      .update(users)
      .set({ plan: effectivePlan, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  return NextResponse.json({ received: true });
}
