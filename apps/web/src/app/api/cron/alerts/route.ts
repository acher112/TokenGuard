/**
 * GET /api/cron/alerts
 *
 * Cron job that evaluates all active alert rules across all projects.
 * Called every 15 minutes by Vercel Cron.
 *
 * Security: requires CRON_SECRET header matching CRON_SECRET env var.
 * In development (no CRON_SECRET set), requests are allowed through for testing.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { alerts, projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { evaluateAlertsForProject } from "@/lib/alerts/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // ─── Security: verify CRON_SECRET ──────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const startTime = Date.now();

  try {
    // Find all projects that have at least one active alert rule
    const projectsWithAlerts = await db
      .selectDistinct({ projectId: alerts.projectId })
      .from(alerts)
      .where(eq(alerts.isActive, true));

    if (projectsWithAlerts.length === 0) {
      return NextResponse.json({
        ok: true,
        projectsEvaluated: 0,
        totalAlertsFired: 0,
        durationMs: Date.now() - startTime,
      });
    }

    let totalFired = 0;
    const results: Array<{ projectId: string; fired: number; evaluated: number }> = [];

    // Evaluate alerts for each project
    for (const { projectId } of projectsWithAlerts) {
      try {
        const evalResults = await evaluateAlertsForProject(projectId);
        const fired = evalResults.filter((r) => r.triggered).length;
        totalFired += fired;
        results.push({
          projectId,
          fired,
          evaluated: evalResults.length,
        });
      } catch (err) {
        console.error(`[AgentWatch Cron] Failed to evaluate alerts for project ${projectId}:`, err);
        // Continue with other projects — don't let one failure block all
      }
    }

    console.log(
      `[AgentWatch Cron] Evaluated ${projectsWithAlerts.length} projects, ${totalFired} alerts fired. (${Date.now() - startTime}ms)`
    );

    return NextResponse.json({
      ok: true,
      projectsEvaluated: projectsWithAlerts.length,
      totalAlertsFired: totalFired,
      results,
      durationMs: Date.now() - startTime,
    });
  } catch (err) {
    console.error("[AgentWatch Cron] Fatal error:", err);
    return NextResponse.json(
      { ok: false, error: "Internal cron error" },
      { status: 500 }
    );
  }
}
