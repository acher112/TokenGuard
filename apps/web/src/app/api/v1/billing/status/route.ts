/**
 * GET /api/v1/billing/status
 *
 * Returns the current user's plan and usage summary.
 * Used by the settings page to display the plan card and usage meters.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserUsageSummary } from "@/lib/billing/usage";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await getUserUsageSummary(session.user.id);
  return NextResponse.json(summary);
}
