import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { traces, traceSteps, llmCalls, toolCalls, errors, projects } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatCost, formatDuration, formatRelativeTime } from "@/lib/utils";
import { ArrowLeft, Clock, DollarSign, Cpu, Tag, User } from "lucide-react";
import { TraceWaterfall, type SerializedStep } from "@/components/traces/trace-waterfall";

interface Props {
  params: {
    id: string;
  };
}

export default async function TraceDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) return null;

  // Verify project ownership
  const project = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, session.user.id))
    .limit(1)
    .then((r) => r[0]);

  if (!project) notFound();

  // Load the trace
  const trace = await db
    .select()
    .from(traces)
    .where(and(eq(traces.id, params.id), eq(traces.projectId, project.id)))
    .limit(1)
    .then((r) => r[0]);

  if (!trace) notFound();

  // Load all steps for this trace in sequence
  const stepRows = await db
    .select()
    .from(traceSteps)
    .where(eq(traceSteps.traceId, trace.id))
    .orderBy(asc(traceSteps.sequence));

  // Load attached LLM calls, tool calls, and errors
  const [llmRows, toolRows, errorRows] = await Promise.all([
    db.select().from(llmCalls).where(eq(llmCalls.traceId, trace.id)),
    db.select().from(toolCalls).where(eq(toolCalls.traceId, trace.id)),
    db.select().from(errors).where(eq(errors.traceId, trace.id)),
  ]);

  // Merge steps into serialized tree
  const serializedSteps: SerializedStep[] = stepRows.map((step) => {
    const stepLlm = llmRows.find((l) => l.stepId === step.id) ?? null;
    const stepTool = toolRows.find((t) => t.stepId === step.id) ?? null;
    const stepError = errorRows.find((e) => e.stepId === step.id) ?? null;

    return {
      id: step.id,
      sequence: step.sequence,
      stepType: step.stepType,
      name: step.name,
      durationMs: step.durationMs,
      startedAt: step.startedAt.toISOString(),
      endedAt: step.endedAt?.toISOString() ?? null,
      llmCall: stepLlm
        ? {
            id: stepLlm.id,
            modelName: stepLlm.modelName,
            provider: stepLlm.provider,
            inputTokens: stepLlm.inputTokens,
            outputTokens: stepLlm.outputTokens,
            estimatedCostUsd: stepLlm.estimatedCostUsd,
            temperature: stepLlm.temperature,
            requestJson: stepLlm.requestJson,
            responseJson: stepLlm.responseJson,
            durationMs: stepLlm.durationMs,
          }
        : null,
      toolCall: stepTool
        ? {
            id: stepTool.id,
            toolName: stepTool.toolName,
            status: stepTool.status,
            argumentsJson: stepTool.argumentsJson,
            resultJson: stepTool.resultJson,
            durationMs: stepTool.durationMs,
          }
        : null,
      error: stepError
        ? {
            id: stepError.id,
            errorType: stepError.errorType,
            message: stepError.message,
            stackTrace: stepError.stackTrace,
            retryCount: stepError.retryCount,
            wastedCostUsd: stepError.wastedCostUsd,
          }
        : null,
    };
  });

  const isSuccess = trace.status === "success";
  const costNum = parseFloat(trace.totalCostUsd || "0");
  const totalTokens = (trace.totalInputTokens || 0) + (trace.totalOutputTokens || 0);

  return (
    <div className="space-y-6">
      {/* Back Navigation */}
      <div>
        <Link
          href="/dashboard/traces"
          className="inline-flex items-center text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Traces
        </Link>
      </div>

      {/* Trace Overview Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="font-mono text-xl font-bold">
                  Trace #{trace.id.slice(0, 8)}
                </h1>
                <Badge
                  variant={isSuccess ? "success" : "destructive"}
                  className="font-mono text-xs"
                >
                  {isSuccess ? "✓ SUCCESS" : "✕ FAILED"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Agent: <span className="font-semibold text-foreground">{trace.agentName}</span>
                {" · "}
                Started {formatRelativeTime(trace.startedAt)}
              </p>
            </div>

            {/* Header Metrics */}
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="text-right">
                <span className="text-xs text-muted-foreground">Total Cost</span>
                <p className="font-mono text-lg font-bold text-foreground">
                  {formatCost(costNum)}
                </p>
                <span className="text-[10px] text-muted-foreground">Estimated</span>
              </div>

              <div className="text-right">
                <span className="text-xs text-muted-foreground">Duration</span>
                <p className="font-mono text-lg font-bold text-foreground">
                  {formatDuration(trace.durationMs)}
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs text-muted-foreground">Total Tokens</span>
                <p className="font-mono text-lg font-bold text-foreground">
                  {totalTokens.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Optional Metadata Row (Tags / User ID) */}
          {(trace.tags?.length || trace.userId) && (
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-3 text-xs text-muted-foreground">
              {trace.userId && (
                <div className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  <span className="font-mono">{trace.userId}</span>
                </div>
              )}
              {trace.tags?.map((tag) => (
                <div key={tag} className="flex items-center gap-1 rounded bg-muted px-2 py-0.5 font-mono text-[11px]">
                  <Tag className="h-3 w-3" />
                  <span>{tag}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Waterfall & Inspector */}
      <TraceWaterfall steps={serializedSteps} />
    </div>
  );
}
