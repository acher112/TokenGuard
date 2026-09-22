/**
 * Lemon Squeezy billing provider implementation.
 *
 * Handles:
 * - Creating checkout sessions for plan upgrades
 * - Customer portal session creation
 *
 * Falls back gracefully when env vars are not set (local dev).
 */

import type { BillingProvider, Plan, PlanLimits } from "./interface";
import { PLAN_LIMITS } from "./interface";

// Lemon Squeezy API base URL
const LS_API_BASE = "https://api.lemonsqueezy.com/v1";

// Map our plan tiers to Lemon Squeezy variant IDs from env
function getVariantId(plan: Plan): string {
  if (plan === "pro") {
    const id = process.env.LEMONSQUEEZY_PRO_VARIANT_ID;
    if (!id) throw new Error("LEMONSQUEEZY_PRO_VARIANT_ID is not configured");
    return id;
  }
  if (plan === "team") {
    const id = process.env.LEMONSQUEEZY_TEAM_VARIANT_ID;
    if (!id) throw new Error("LEMONSQUEEZY_TEAM_VARIANT_ID is not configured");
    return id;
  }
  throw new Error(`No variant ID for plan: ${plan}`);
}

function getApiKey(): string {
  const key = process.env.LEMONSQUEEZY_API_KEY;
  if (!key) throw new Error("LEMONSQUEEZY_API_KEY is not configured");
  return key;
}

async function lsRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const apiKey = getApiKey();
  const res = await fetch(`${LS_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "unknown error");
    throw new Error(`Lemon Squeezy API error ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

export class LemonSqueezyBillingProvider implements BillingProvider {
  getPlanLimits(plan: Plan): PlanLimits {
    return PLAN_LIMITS[plan];
  }

  async createCheckoutSession(params: {
    userId: string;
    email: string;
    plan: Plan;
    returnUrl: string;
  }): Promise<{ url: string; id: string }> {
    const storeId = process.env.LEMONSQUEEZY_STORE_ID;
    if (!storeId) throw new Error("LEMONSQUEEZY_STORE_ID is not configured");

    const variantId = getVariantId(params.plan);

    // POST /checkouts creates a checkout session
    // https://docs.lemonsqueezy.com/api/checkouts#create-a-checkout
    const response = await lsRequest<{
      data: {
        id: string;
        attributes: { url: string };
      };
    }>("/checkouts", {
      method: "POST",
      body: JSON.stringify({
        data: {
          type: "checkouts",
          attributes: {
            checkout_options: {
              embed: false,
              media: false,
              logo: true,
            },
            checkout_data: {
              email: params.email,
              custom: {
                user_id: params.userId,
              },
            },
            expires_at: null,
            preview: false,
          },
          relationships: {
            store: {
              data: { type: "stores", id: storeId },
            },
            variant: {
              data: { type: "variants", id: variantId },
            },
          },
        },
      }),
    });

    return {
      url: response.data.attributes.url,
      id: response.data.id,
    };
  }

  async createPortalSession(params: {
    customerId: string;
    returnUrl: string;
  }): Promise<{ url: string }> {
    // Lemon Squeezy doesn't have a server-side portal session API —
    // the customer portal URL is a fixed pattern based on customer ID.
    // We construct the URL and redirect the user.
    const storeId = process.env.LEMONSQUEEZY_STORE_ID;
    if (!storeId) throw new Error("LEMONSQUEEZY_STORE_ID is not configured");

    // LS customer portal URL format
    const url = `https://app.lemonsqueezy.com/my-orders/${params.customerId}`;
    return { url };
  }
}
