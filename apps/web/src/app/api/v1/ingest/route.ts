import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { apiKeys, projects, traces, traceSteps, llmCalls, toolCalls, errors } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { hashApiKey } from "@/lib/api-keys";
import { calculateLlmCost } from "@/lib/pricing";
import { getUserPlan, getMonthlyTraceCount } from "@/lib/billing/usage";
import { PLAN_LIMITS } from "@/lib/billing";
import { z } from "zod";

// Request size limit: 1MB
const MAX_BODY_SIZE = 1024 * 1024;

// ─── Rate Limiter (In-memory sliding window per API key) ─────────────────────

const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_RATE_LIMIT_RPM = parseInt(process.env.INGEST_RATE_LIMIT_RPM ?? "100", 10);

function checkRateLimit(keyId: string, limit = DEFAULT_RATE_LIMIT_RPM): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const timestamps = (rateLimitMap.get(keyId) ?? []).filter((t) => t > windowStart);

  if (timestamps.length >= limit) {
    rateLimitMap.set(keyId, timestamps);
    return false;
  }

  timestamps.push(now);
  rateLimitMap.set(keyId, timestamps);
  return true;
}

// ─── Validation schemas ─────────────────────────────────────────────────────

const llmCallSchema = z.object({
  modelName: z.string().max(100),
  provider: z.string().max(50).optional(),
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  temperature: z.string().optional(),
  requestJson: z.string().max(50_000).optional(),
  responseJson: z.string().max(50_000).optional(),
});

const toolCallSchema = z.object({
  toolName: z.string().max(100),
  status: z.enum(["success", "failed", "timeout"]).default("success"),
  argumentsJson: z.string().max(10_000).optional(),
  resultJson: z.string().max(10_000).optional(),
});

const errorSchema = z.object({
  errorType: z.string().max(100),
  message: z.string().max(1000),
  stackTrace: z.string().max(5000).optional(),
  retryCount: z.number().int().nonnegative().optional(),
  wastedCostUsd: z.string().optional(),
});

const stepSchema = z.object({
  stepType: z.enum(["llm", "tool", "error", "custom"]),
  sequence: z.number().int().nonnegative(),
  name: z.string().max(100).optional(),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().optional(),
  durationMs: z.number().int().nonnegative().optional(),
  llmCall: llmCallSchema.optional(),
  toolCall: toolCallSchema.optional(),
  error: errorSchema.optional(),
});

const ingestSchema = z.object({
  agentName: z.string().min(1).max(100),
  status: z.enum(["running", "success", "failed", "timeout"]),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime(),
  durationMs: z.number().int().nonnegative(),
  steps: z.array(stepSchema).max(500),
  tags: z.array(z.string().max(50)).max(10).optional(),
  userId: z.string().max(200).optional(),
  sessionId: z.string().max(200).optional(),
});

// ─── Route handler ──────────────────────────────────────────────────────────

export async function POST(request: Request) {
  // ── Auth: validate API key ────────────────────────────────────────────────
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing API key", message: "Include 'Authorization: Bearer tg_live_...' header" },
      { status: 401 }
    );
  }

  const rawKey = authHeader.slice(7).trim();
  if (!rawKey) {
    return NextResponse.json({ error: "Empty API key provided" }, { status: 401 });
  }

  const keyHash = hashApiKey(rawKey);

  const apiKeyRow = await db
    .select({ id: apiKeys.id, projectId: apiKeys.projectId, userId: projects.userId })
    .from(apiKeys)
    .innerJoin(projects, eq(apiKeys.projectId, projects.id))
    .where(and(eq(apiKeys.keyHash, keyHash), isNull(apiKeys.revokedAt)))
    .limit(1)
    .then((r) => r[0]);

  if (!apiKeyRow) {
    return NextResponse.json({ error: "Invalid or revoked API key" }, { status: 401 });
  }

  const apiKey = apiKeyRow;

  // ── Rate Limiting ─────────────────────────────────────────────────────────
  if (!checkRateLimit(apiKey.id)) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded",
        message: `Rate limit of ${DEFAULT_RATE_LIMIT_RPM} requests/minute exceeded.`,
      },
      {
        status: 429,
        headers: {
          "Retry-After": "60",
        },
      }
    );
  }

  // ── Plan limit: monthly trace quota ──────────────────────────────────────
  const [userPlan, monthlyTraceCount] = await Promise.all([
    getUserPlan(apiKey.userId),
    getMonthlyTraceCount(apiKey.userId),
  ]);
  const planLimits = PLAN_LIMITS[userPlan];

  if (monthlyTraceCount >= planLimits.maxTracesPerMonth) {
    return NextResponse.json(
      {
        error: "Monthly trace limit reached",
        message: `Your ${userPlan} plan allows ${planLimits.maxTracesPerMonth.toLocaleString()} traces/month. Upgrade to continue ingesting.`,
        code: "TRACE_LIMIT_EXCEEDED",
        limit: planLimits.maxTracesPerMonth,
        current: monthlyTraceCount,
      },
      { status: 429 }
    );
  }

  // ── Size check ───────────────────────────────────────────────────────────
  const contentLength = parseInt(request.headers.get("content-length") ?? "0", 10);
  if (contentLength > MAX_BODY_SIZE) {
    return NextResponse.json(
      { error: "Payload too large", message: "Maximum request size is 1MB" },
      { status: 413 }
    );
  }

  // ── Parse body ───────────────────────────────────────────────────────────
  const body = await request.json().catch(() => null);
  const parsed = ingestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const payload = parsed.data;

  // ── Calculate costs across all LLM steps ─────────────────────────────────
  let totalCostUsd = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  for (const step of payload.steps) {
    if (step.llmCall) {
      const { costUsd } = await calculateLlmCost(
        step.llmCall.modelName,
        step.llmCall.inputTokens,
        step.llmCall.outputTokens
      );
      totalCostUsd += parseFloat(costUsd);
      totalInputTokens += step.llmCall.inputTokens;
      totalOutputTokens += step.llmCall.outputTokens;
    }
  }

  // ── Store trace ───────────────────────────────────────────────────────────
  const [trace] = await db
    .insert(traces)
    .values({
      projectId: apiKey.projectId,
      agentName: payload.agentName,
      status: payload.status,
      totalCostUsd: totalCostUsd.toFixed(6),
      totalInputTokens,
      totalOutputTokens,
      durationMs: payload.durationMs,
      tags: payload.tags,
      userId: payload.userId,
      sessionId: payload.sessionId ?? null,
      startedAt: new Date(payload.startedAt),
      endedAt: new Date(payload.endedAt),
    })
    .returning({ id: traces.id });

  const traceId = trace!.id;

  // ── Store steps ───────────────────────────────────────────────────────────
  for (const step of payload.steps) {
    const [traceStep] = await db
      .insert(traceSteps)
      .values({
        traceId,
        stepType: step.stepType,
        sequence: step.sequence,
        name: step.name,
        startedAt: new Date(step.startedAt),
        endedAt: step.endedAt ? new Date(step.endedAt) : undefined,
        durationMs: step.durationMs,
      })
      .returning({ id: traceSteps.id });

    const stepId = traceStep!.id;

    // Insert LLM call details
    if (step.llmCall) {
      const { costUsd } = await calculateLlmCost(
        step.llmCall.modelName,
        step.llmCall.inputTokens,
        step.llmCall.outputTokens
      );
      await db.insert(llmCalls).values({
        stepId,
        traceId,
        modelName: step.llmCall.modelName,
        provider: step.llmCall.provider,
        inputTokens: step.llmCall.inputTokens,
        outputTokens: step.llmCall.outputTokens,
        estimatedCostUsd: costUsd,
        temperature: step.llmCall.temperature,
        requestJson: step.llmCall.requestJson,
        responseJson: step.llmCall.responseJson,
        durationMs: step.durationMs,
      });
    }

    // Insert tool call details
    if (step.toolCall) {
      await db.insert(toolCalls).values({
        stepId,
        traceId,
        toolName: step.toolCall.toolName,
        status: step.toolCall.status,
        argumentsJson: step.toolCall.argumentsJson,
        resultJson: step.toolCall.resultJson,
        durationMs: step.durationMs,
      });
    }

    // Insert error details
    if (step.error) {
      await db.insert(errors).values({
        stepId,
        traceId,
        projectId: apiKey.projectId,
        errorType: step.error.errorType,
        message: step.error.message,
        stackTrace: step.error.stackTrace,
        retryCount: step.error.retryCount ?? 0,
        wastedCostUsd: step.error.wastedCostUsd ?? "0",
        occurredAt: new Date(step.startedAt),
      });
    }
  }

  // Update API key last_used_at (non-blocking)
  db.update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, apiKey.id))
    .catch(() => {});

  return NextResponse.json(
    {
      success: true,
      traceId,
      totalCostUsd: totalCostUsd.toFixed(6),
      totalInputTokens,
      totalOutputTokens,
    },
    { status: 201 }
  );
}
