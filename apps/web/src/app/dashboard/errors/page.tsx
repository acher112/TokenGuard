import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { errors, traces, projects } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCost } from "@/lib/utils";
import { ErrorList, type AggregatedError } from "@/components/errors/error-list";
import { AlertOctagon, DollarSign, Bug } from "lucide-react";

export default async function ErrorsPage() {
  const session = await auth();
  if (!session?.user) return null;

  const project = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, session.user.id))
    .limit(1)
    .then((r) => r[0]);

  if (!project) return null;

  // Query all errors joined with traces for project
  const errorRecords = await db
    .select({
      id: errors.id,
      errorType: errors.errorType,
      message: errors.message,
      stackTrace: errors.stackTrace,
      retryCount: errors.retryCount,
      wastedCostUsd: errors.wastedCostUsd,
      occurredAt: errors.occurredAt,
      agentName: traces.agentName,
      traceId: traces.id,
    })
    .from(errors)
    .innerJoin(traces, eq(errors.traceId, traces.id))
    .where(eq(errors.projectId, project.id))
    .orderBy(desc(errors.occurredAt));

  // Aggregate by errorType
  const groupMap = new Map<
    string,
    {
      occurrences: number;
      totalWastedCost: number;
      firstSeen: Date;
      lastSeen: Date;
      agentsMap: Map<string, number>;
      messages: Set<string>;
    }
  >();

  let grandTotalErrors = 0;
  let grandTotalWastedCost = 0;

  for (const err of errorRecords) {
    grandTotalErrors += 1;
    const cost = parseFloat(err.wastedCostUsd || "0");
    grandTotalWastedCost += cost;

    const type = err.errorType || "Unclassified Error";
    if (!groupMap.has(type)) {
      groupMap.set(type, {
        occurrences: 0,
        totalWastedCost: 0,
        firstSeen: err.occurredAt,
        lastSeen: err.occurredAt,
        agentsMap: new Map<string, number>(),
        messages: new Set<string>(),
      });
    }

    const current = groupMap.get(type)!;
    current.occurrences += 1;
    current.totalWastedCost += cost;

    if (err.occurredAt < current.firstSeen) {
      current.firstSeen = err.occurredAt;
    }
    if (err.occurredAt > current.lastSeen) {
      current.lastSeen = err.occurredAt;
    }

    const agent = err.agentName || "unknown-agent";
    current.agentsMap.set(agent, (current.agentsMap.get(agent) ?? 0) + 1);

    if (current.messages.size < 3 && err.message) {
      current.messages.add(err.message);
    }
  }

  // Convert to sorted array (highest wasted cost first)
  const aggregatedErrors: AggregatedError[] = Array.from(groupMap.entries())
    .map(([errorType, data]) => ({
      errorType,
      occurrences: data.occurrences,
      totalWastedCost: Number(data.totalWastedCost.toFixed(4)),
      firstSeen: data.firstSeen.toISOString(),
      lastSeen: data.lastSeen.toISOString(),
      affectedAgents: Array.from(data.agentsMap.entries()).map(([agentName, count]) => ({
        agentName,
        count,
      })),
      sampleMessages: Array.from(data.messages),
    }))
    .sort((a, b) => b.totalWastedCost - a.totalWastedCost);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Errors & Failures</h1>
        <p className="text-sm text-muted-foreground">
          Track recurring failure patterns, identify broken tools, and quantify wasted AI budget.
        </p>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Wasted Spend</CardTitle>
            <DollarSign className="h-4 w-4 text-rose-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              {formatCost(grandTotalWastedCost)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Estimated tokens burnt on failing attempts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Errors</CardTitle>
            <AlertOctagon className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {grandTotalErrors.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Recorded error events</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Categories</CardTitle>
            <Bug className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {aggregatedErrors.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Distinct failure types detected</p>
          </CardContent>
        </Card>
      </div>

      {/* Aggregated Error Table & Deep Dive Inspector */}
      <ErrorList errors={aggregatedErrors} />
    </div>
  );
}
