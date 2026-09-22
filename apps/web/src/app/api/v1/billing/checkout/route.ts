/**
 * POST /api/v1/billing/checkout
 *
 * Creates a billing checkout session for a plan upgrade.
 * Returns { checkoutUrl } — the client redirects the user to this URL.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { billing } from "@/lib/billing";

const checkoutSchema = z.object({
  plan: z.enum(["pro", "team"]),
  returnUrl: z.string().url().optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const returnUrl =
    parsed.data.returnUrl ??
    `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/dashboard/settings`;

  try {
    const checkoutSession = await billing.createCheckoutSession({
      userId: session.user.id,
      email: session.user.email,
      plan: parsed.data.plan,
      returnUrl,
    });

    return NextResponse.json({ checkoutUrl: checkoutSession.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Billing unavailable";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
