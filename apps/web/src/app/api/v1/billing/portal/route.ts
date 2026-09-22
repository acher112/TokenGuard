/**
 * POST /api/v1/billing/portal
 *
 * Returns the customer portal URL for managing subscription.
 * Returns { portalUrl } — the client redirects the user to this URL.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { billing } from "@/lib/billing";
import { getCustomerId } from "@/lib/billing/usage";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const returnUrl =
    `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/dashboard/settings`;

  const customerId = await getCustomerId(session.user.id);
  if (!customerId) {
    return NextResponse.json(
      { error: "No active subscription found" },
      { status: 404 }
    );
  }

  try {
    const portal = await billing.createPortalSession({ customerId, returnUrl });
    return NextResponse.json({ portalUrl: portal.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Billing unavailable";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
