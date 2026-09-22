/**
 * Dataset Export API — GET /api/v1/export/traces
 *
 * Exports traces as JSONL (for fine-tuning/evaluation) or CSV (for spreadsheets).
 * Gated to Pro+ plan (hasDatasetExport).
 *
 * Query params:
 *   projectId  — required
 *   format     — "jsonl" (default) | "csv"
 *   limit      — max rows (default 1000, max 10000)
 *   agentName  — optional filter
 *   status     — optional filter: "success" | "failed"
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { traces, traceSteps, llmCalls, apiKeys, projects } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getUserPlan } from "@/lib/billing/usage";
import { PLAN_LIMITS } from "@/lib/billing/interface";

export async function GET(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const format = (searchParams.get("format") ?? "jsonl") as "jsonl" | "csv";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "1000"), 10_000);
  const agentNameFilter = searchParams.get("agentName");
  const statusFilter = searchParams.get("status");

  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  // ── Plan check ────────────────────────────────────────────────────────────
  const plan = await getUserPlan(session.user.id);
  if (!PLAN_LIMITS[plan].hasDatasetExport) {
    return NextResponse.json(
      { error: "Dataset export requires Pro or Enterprise plan", code: "PLAN_LIMIT" },
      { status: 403 }
    );
  }

  // ── Ownership check ───────────────────────────────────────────────────────
  const project = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, session.user.id)))
    .limit(1)
    .then((r) => r[0]);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // ── Query traces ──────────────────────────────────────────────────────────
  const conditions = [eq(traces.projectId, projectId)];

  const rows = await db
    .select({
      id: traces.id,
      agentName: traces.agentName,
      status: traces.status,
      sessionId: traces.sessionId,
      totalCostUsd: traces.totalCostUsd,
      totalInputTokens: traces.totalInputTokens,
      totalOutputTokens: traces.totalOutputTokens,
      durationMs: traces.durationMs,
      startedAt: traces.startedAt,
      endedAt: traces.endedAt,
    })
    .from(traces)
    .where(and(...conditions))
    .orderBy(desc(traces.startedAt))
    .limit(limit);

  // Fetch LLM call details for each trace
  const enriched = await Promise.all(
    rows.map(async (trace) => {
      const calls = await db
        .select({
          modelName: llmCalls.modelName,
          provider: llmCalls.provider,
          inputTokens: llmCalls.inputTokens,
          outputTokens: llmCalls.outputTokens,
          requestJson: llmCalls.requestJson,
          responseJson: llmCalls.responseJson,
          durationMs: llmCalls.durationMs,
        })
        .from(llmCalls)
        .where(eq(llmCalls.traceId, trace.id));

      return { ...trace, llmCalls: calls };
    })
  );

  // ── Format output ─────────────────────────────────────────────────────────
  if (format === "csv") {
    const headers = [
      "trace_id", "agent_name", "status", "session_id",
      "total_cost_usd", "total_input_tokens", "total_output_tokens",
      "duration_ms", "started_at", "ended_at", "model_name", "provider"
    ].join(",");

    const csvRows = enriched.map((t) => {
      const firstCall = t.llmCalls[0];
      return [
        t.id, t.agentName, t.status, t.sessionId ?? "",
        t.totalCostUsd, t.totalInputTokens, t.totalOutputTokens,
        t.durationMs ?? "", t.startedAt?.toISOString() ?? "", t.endedAt?.toISOString() ?? "",
        firstCall?.modelName ?? "", firstCall?.provider ?? "",
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
    });

    const csv = [headers, ...csvRows].join("\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="tokenguard-traces-${projectId}.csv"`,
      },
    });
  }

  // Default: JSONL — one JSON object per line (standard fine-tuning format)
  const jsonl = enriched
    .map((t) => JSON.stringify({
      id: t.id,
      agent_name: t.agentName,
      status: t.status,
      session_id: t.sessionId,
      total_cost_usd: t.totalCostUsd,
      total_input_tokens: t.totalInputTokens,
      total_output_tokens: t.totalOutputTokens,
      duration_ms: t.durationMs,
      started_at: t.startedAt,
      ended_at: t.endedAt,
      llm_calls: t.llmCalls,
    }))
    .join("\n");

  return new Response(jsonl, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Content-Disposition": `attachment; filename="tokenguard-traces-${projectId}.jsonl"`,
    },
  });
}
