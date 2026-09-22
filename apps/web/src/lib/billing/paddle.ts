/**
 * Paddle Billing v2 provider implementation.
 *
 * Handles:
 * - Creating checkout transaction sessions for plan upgrades
 * - Generating authenticated Customer Portal sessions
 * - Supporting both Sandbox and Production Paddle environments
 *
 * Local development falls back to StubBillingProvider if PADDLE_API_KEY is unset.
 */

import type { BillingProvider, CheckoutSession, Plan, PlanLimits } from "./interface";
import { PLAN_LIMITS } from "./interface";

function getPaddleApiBase(): string {
  const env = process.env.PADDLE_ENVIRONMENT?.toLowerCase();
  return env === "production"
    ? "https://api.paddle.com"
    : "https://sandbox-api.paddle.com";
}

function getPriceId(plan: Plan): string {
  if (plan === "pro") {
    const id = process.env.PADDLE_PRO_PRICE_ID;
    if (!id) throw new Error("PADDLE_PRO_PRICE_ID is not configured");
    return id;
  }
  if (plan === "team") {
    const id = process.env.PADDLE_TEAM_PRICE_ID;
    if (!id) throw new Error("PADDLE_TEAM_PRICE_ID is not configured");
    return id;
  }
  throw new Error(`No Paddle price ID configured for plan: ${plan}`);
}

function getApiKey(): string {
  const key = process.env.PADDLE_API_KEY;
  if (!key) throw new Error("PADDLE_API_KEY is not configured");
  return key;
}

async function paddleRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const apiKey = getApiKey();
  const apiBase = getPaddleApiBase();

  const res = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "unknown error");
    throw new Error(`Paddle API error ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

export class PaddleBillingProvider implements BillingProvider {
  getPlanLimits(plan: Plan): PlanLimits {
    return PLAN_LIMITS[plan];
  }

  async createCheckoutSession(params: {
    userId: string;
    email: string;
    plan: Plan;
    returnUrl: string;
  }): Promise<CheckoutSession> {
    const priceId = getPriceId(params.plan);

    // POST /transactions creates a new transaction in Paddle Billing v2
    // https://developer.paddle.com/api-reference/transactions/create-transaction
    const response = await paddleRequest<{
      data: {
        id: string;
        url?: string | null;
        checkout?: {
          url?: string | null;
        };
      };
    }>("/transactions", {
      method: "POST",
      body: JSON.stringify({
        items: [
          {
            price_id: priceId,
            quantity: 1,
          },
        ],
        custom_data: {
          user_id: params.userId,
        },
        checkout: {
          success_url: params.returnUrl,
        },
      }),
    });

    const checkoutUrl =
      response.data.checkout?.url ??
      response.data.url ??
      `https://checkout.paddle.com/checkout/tx/${response.data.id}`;

    return {
      id: response.data.id,
      url: checkoutUrl,
    };
  }

  async createPortalSession(params: {
    customerId: string;
    returnUrl: string;
  }): Promise<{ url: string }> {
    // POST /customers/{customer_id}/portal-sessions creates an authenticated customer portal session
    // https://developer.paddle.com/api-reference/customers/create-portal-session
    const response = await paddleRequest<{
      data: {
        id: string;
        urls: {
          general?: {
            overview?: string;
          };
        };
      };
    }>(`/customers/${encodeURIComponent(params.customerId)}/portal-sessions`, {
      method: "POST",
      body: JSON.stringify({}),
    });

    const overviewUrl = response.data.urls?.general?.overview;
    if (!overviewUrl) {
      throw new Error("Unable to retrieve customer portal URL from Paddle");
    }

    return { url: overviewUrl };
  }
}
