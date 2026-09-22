/**
 * OpenTelemetry OTLP Traces Ingest — POST /api/v1/otel/traces
 *
 * Accepts OpenTelemetry OTLP JSON format (protobuf-encoded spans).
 * Maps OTel spans → TokenGuard trace/step schema.
 * Gated to Enterprise plan (hasOTelIngestion).
 *
 * Compatible with: otel-collector, opentelemetry-sdk-python, opentelemetry-js
 *
 * Reference: https://opentelemetry.io/docs/specs/otlp/
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { traces, traceSteps, llmCalls, apiKeys, projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createId } from "@/lib/db/utils";
import { calculateLlmCost } from "@/lib/pricing";

// ── OTel type helpers ──────────────────────────────────────────────────────────
interface OTelAttribute {
  key: string;
  value: { stringValue?: string; intValue?: number; doubleValue?: number; boolValue?: boolean };
}

interface OTelSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  kind: number;
  startTimeUnixNano: string;
  endTimeUnixNano: string;
  attributes?: OTelAttribute[];
  status?: { code: number; message?: string };
}

interface OTelResourceSpans {
  resource?: { attributes?: OTelAttribute[] };
  scopeSpans?: { spans?: OTelSpan[] }[];
}

function getAttr(attrs: OTelAttribute[] | undefined, key: string): string | number | undefined {
  const a = attrs?.find((a) => a.key === key);
  if (!a) return undefined;
  return a.value.stringValue ?? a.value.intValue ?? a.value.doubleValue ?? undefined;
}

function nanoToDate(nano: string): Date {
  return new Date(Math.floor(parseInt(nano) / 1_000_000));
}

export async function POST(req: NextRequest) {
  // ── API Key auth ───────────────────────────────────────────────────────────
  const authHeader = req.headers.get("authorization") ?? "";
  const rawKey = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;

  if (!rawKey) {
    return NextResponse.json({ error: "Missing API key" }, { status: 401 });
  }

  // Hash the key and look it up
  const { createHash } = await import("crypto");
  const hashedKey = createHash("sha256").update(rawKey).digest("hex");

  const keyRow = await db
    .select({ id: apiKeys.id, projectId: apiKeys.projectId })
    .from(apiKeys)
    .where(eq(apiKeys.keyHash, hashedKey))
    .limit(1)
    .then((r) => r[0]);

  if (!keyRow) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  // ── Plan check for OTel ────────────────────────────────────────────────────
  const { getUserPlan } = await import("@/lib/billing/usage");
  const { PLAN_LIMITS } = await import("@/lib/billing/interface");

  const project = await db
    .select({ userId: projects.userId })
    .from(projects)
    .where(eq(projects.id, keyRow.projectId))
    .limit(1)
    .then((r) => r[0]);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const plan = await getUserPlan(project.userId);
  if (!PLAN_LIMITS[plan].hasOTelIngestion) {
    return NextResponse.json(
      { error: "OpenTelemetry ingestion requires Enterprise plan", code: "PLAN_LIMIT" },
      { status: 403 }
    );
  }

  // ── Parse OTLP JSON body ───────────────────────────────────────────────────
  let body: { resourceSpans?: OTelResourceSpans[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const resourceSpans: OTelResourceSpans[] = body.resourceSpans ?? [];
  let tracesIngested = 0;

  for (const rs of resourceSpans) {
    const serviceAttrs = rs.resource?.attributes ?? [];
    const serviceName = (getAttr(serviceAttrs, "service.name") as string) ?? "unknown-service";

    for (const scopeSpan of rs.scopeSpans ?? []) {
      const spans = scopeSpan.spans ?? [];

      // Group spans by traceId — root spans (no parentSpanId) become traces
      const rootSpans = spans.filter((s) => !s.parentSpanId);
      const childSpans = spans.filter((s) => !!s.parentSpanId);

      for (const root of rootSpans) {
        const attrs = root.attributes ?? [];
        const startedAt = nanoToDate(root.startTimeUnixNano);
        const endedAt = nanoToDate(root.endTimeUnixNano);
        const durationMs = Math.floor(
          (parseInt(root.endTimeUnixNano) - parseInt(root.startTimeUnixNano)) / 1_000_000
        );
        const statusCode = root.status?.code ?? 0;
        const status = statusCode === 2 ? "failed" : "success";

        // Create the trace
        const traceId = createId();
        let totalCostUsd = "0";
        let totalInputTokens = 0;
        let totalOutputTokens = 0;

        await db.insert(traces).values({
          id: traceId,
          projectId: keyRow.projectId,
          agentName: serviceName,
          status,
          sessionId: (getAttr(attrs, "session.id") as string) ?? null,
          totalCostUsd,
          totalInputTokens,
          totalOutputTokens,
          durationMs,
          startedAt,
          endedAt,
        });

        // Process child spans as trace steps
        const children = childSpans.filter((s) => s.parentSpanId === root.spanId);
        let seq = 1;
        for (const child of children) {
          const childAttrs = child.attributes ?? [];
          const childStart = nanoToDate(child.startTimeUnixNano);
          const childEnd = nanoToDate(child.endTimeUnixNano);
          const childDuration = Math.floor(
            (parseInt(child.endTimeUnixNano) - parseInt(child.startTimeUnixNano)) / 1_000_000
          );

          const stepId = createId();
          await db.insert(traceSteps).values({
            id: stepId,
            traceId,
            stepType: "llm",
            sequence: seq++,
            name: child.name,
            startedAt: childStart,
            endedAt: childEnd,
            durationMs: childDuration,
          });

          // If this span has LLM attributes, record as llm_call
          const modelName = getAttr(childAttrs, "gen_ai.request.model") as string;
          if (modelName) {
            const inputTokens = (getAttr(childAttrs, "gen_ai.usage.prompt_tokens") as number) ?? 0;
            const outputTokens = (getAttr(childAttrs, "gen_ai.usage.completion_tokens") as number) ?? 0;
            const provider = (getAttr(childAttrs, "gen_ai.system") as string) ?? "unknown";
            const { costUsd } = await calculateLlmCost(modelName, inputTokens, outputTokens);

            await db.insert(llmCalls).values({
              id: createId(),
              stepId,
              traceId,
              modelName,
              provider,
              inputTokens,
              outputTokens,
              estimatedCostUsd: costUsd,
              durationMs: childDuration,
            });

            totalInputTokens += inputTokens;
            totalOutputTokens += outputTokens;
            totalCostUsd = (parseFloat(totalCostUsd) + parseFloat(costUsd)).toFixed(6);
          }
        }

        // Update trace totals
        await db
          .update(traces)
          .set({ totalCostUsd, totalInputTokens, totalOutputTokens })
          .where(eq(traces.id, traceId));

        tracesIngested++;
      }
    }
  }

  return NextResponse.json({ ok: true, tracesIngested }, { status: 200 });
}
