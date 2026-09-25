import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { traces, llmCalls, projects } from "@/lib/db/schema";
import { eq, and, gte, lt, desc, sql } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCost, formatDuration, formatRelativeTime } from "@/lib/utils";
import { CostChart, type DailyCostPoint } from "@/components/dashboard/cost-chart";
import { ModelBreakdownChart, type ModelSpendItem } from "@/components/dashboard/model-breakdown-chart";
import { AgentCostChart, type AgentSpendItem } from "@/components/dashboard/agent-cost-chart";
import { WasteRecommendations } from "@/components/dashboard/waste-recommendations";
import { analyzeCostWaste } from "@/lib/intelligence/waste-detector";
import { toolCalls, errors } from "@/lib/db/schema";
import Link from "next/link";
import { ArrowUpRight, ArrowDownRight, DollarSign, TrendingUp, AlertTriangle } from "lucide-react";

export default async function CostsPage() {
  const session = await auth();
  if (!session?.user) return null;

  const project = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, session.user.id))
    .limit(1)
    .then((r) => r[0]);

  if (!project) return null;

  const now = new Date();

  // Current Month Boundaries
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Execute all 8 analytics queries simultaneously in parallel for maximum speed
  const [
    thisMonthTraces,
    prevMonthTraces,
    recentTraces,
    modelCalls,
    allProjectTraces,
    expensiveTraces,
    projectToolCalls,
    projectErrors,
  ] = await Promise.all([
    // 1. This Month Total Cost
    db
      .select({ totalCost: traces.totalCostUsd })
      .from(traces)
      .where(
        and(
          eq(traces.projectId, project.id),
          gte(traces.startedAt, startOfThisMonth)
        )
      ),

    // 2. Previous Month Total Cost
    db
      .select({ totalCost: traces.totalCostUsd })
      .from(traces)
      .where(
        and(
          eq(traces.projectId, project.id),
          gte(traces.startedAt, startOfPrevMonth),
          lt(traces.startedAt, startOfThisMonth)
        )
      ),

    // 3. 30-Day Daily Spending Trend
    db
      .select({ startedAt: traces.startedAt, cost: traces.totalCostUsd })
      .from(traces)
      .where(
        and(
          eq(traces.projectId, project.id),
          gte(traces.startedAt, thirtyDaysAgo)
        )
      ),

    // 4. Breakdown by Model
    db
      .select({
        modelName: llmCalls.modelName,
        cost: llmCalls.estimatedCostUsd,
        inputTokens: llmCalls.inputTokens,
        outputTokens: llmCalls.outputTokens,
      })
      .from(llmCalls)
      .innerJoin(traces, eq(llmCalls.traceId, traces.id))
      .where(eq(traces.projectId, project.id)),

    // 5. Breakdown by Agent
    db
      .select({
        agentName: traces.agentName,
        cost: traces.totalCostUsd,
        durationMs: traces.durationMs,
      })
      .from(traces)
      .where(eq(traces.projectId, project.id)),

    // 6. Top Most Expensive Individual Requests
    db
      .select()
      .from(traces)
      .where(eq(traces.projectId, project.id))
      .orderBy(desc(sql<number>`CAST(${traces.totalCostUsd} AS NUMERIC)`))
      .limit(5),

    // 7. Tool calls for cost waste
    db
      .select({
        id: toolCalls.id,
        traceId: toolCalls.traceId,
        toolName: toolCalls.toolName,
        argumentsJson: toolCalls.argumentsJson,
      })
      .from(toolCalls)
      .innerJoin(traces, eq(toolCalls.traceId, traces.id))
      .where(eq(traces.projectId, project.id)),

    // 8. Errors for cost waste
    db
      .select({
        id: errors.id,
        traceId: errors.traceId,
        errorType: errors.errorType,
        retryCount: errors.retryCount,
        wastedCostUsd: errors.wastedCostUsd,
      })
      .from(errors)
      .where(eq(errors.projectId, project.id)),
  ]);

  const thisMonthCost = thisMonthTraces.reduce(
    (acc, t) => acc + parseFloat(t.totalCost || "0"),
    0
  );

  const prevMonthCost = prevMonthTraces.reduce(
    (acc, t) => acc + parseFloat(t.totalCost || "0"),
    0
  );

  // Percentage change
  let pctChange: number | null = null;
  if (prevMonthCost > 0) {
    pctChange = ((thisMonthCost - prevMonthCost) / prevMonthCost) * 100;
  } else if (thisMonthCost > 0) {
    pctChange = 100;
  }

  // 3. Process 30-Day Daily Spending Trend
  const dailyMap = new Map<string, { cost: number; requests: number }>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = `${d.getMonth() + 1}/${d.getDate()}`;
    dailyMap.set(key, { cost: 0, requests: 0 });
  }

  for (const t of recentTraces) {
    const d = new Date(t.startedAt);
    const key = `${d.getMonth() + 1}/${d.getDate()}`;
    if (dailyMap.has(key)) {
      const entry = dailyMap.get(key)!;
      entry.cost += parseFloat(t.cost || "0");
      entry.requests += 1;
    }
  }

  const dailyChartData: DailyCostPoint[] = Array.from(dailyMap.entries()).map(([date, val]) => ({
    date,
    cost: Number(val.cost.toFixed(4)),
    requests: val.requests,
  }));

  // 4. Process Breakdown by Model
  const modelMap = new Map<string, { cost: number; tokens: number; calls: number }>();
  for (const call of modelCalls) {
    const model = call.modelName || "unknown";
    const current = modelMap.get(model) ?? { cost: 0, tokens: 0, calls: 0 };
    current.cost += parseFloat(call.cost || "0");
    current.tokens += (call.inputTokens || 0) + (call.outputTokens || 0);
    current.calls += 1;
    modelMap.set(model, current);
  }

  const modelSpendList = Array.from(modelMap.entries())
    .map(([name, data]) => ({
      name,
      value: Number(data.cost.toFixed(4)),
      tokens: data.tokens,
      calls: data.calls,
    }))
    .sort((a, b) => b.value - a.value);

  // 5. Process Breakdown by Agent
  const agentMap = new Map<string, { cost: number; traces: number }>();
  for (const t of allProjectTraces) {
    const current = agentMap.get(t.agentName) ?? { cost: 0, traces: 0 };
    current.cost += parseFloat(t.cost || "0");
    current.traces += 1;
    agentMap.set(t.agentName, current);
  }

  const agentSpendList: AgentSpendItem[] = Array.from(agentMap.entries())
    .map(([agentName, data]) => ({
      agentName,
      cost: Number(data.cost.toFixed(4)),
      traces: data.traces,
    }))
    .sort((a, b) => b.cost - a.cost);

  const wasteReport = analyzeCostWaste({
    traces: allProjectTraces.map((t, idx) => ({
      id: `t-${idx}`,
      agentName: t.agentName,
      totalCostUsd: t.cost,
      startedAt: new Date(),
      durationMs: t.durationMs,
    })),
    llmCalls: modelCalls.map((c, idx) => ({
      id: `l-${idx}`,
      traceId: "t-0",
      modelName: c.modelName,
      inputTokens: c.inputTokens,
      outputTokens: c.outputTokens,
      estimatedCostUsd: c.cost,
    })),
    toolCalls: projectToolCalls,
    errors: projectErrors,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cost Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Analyze AI spending trends, model efficiency, and individual request costs.
        </p>
      </div>

      {/* Monthly Cost KPI Comparison */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {formatCost(thisMonthCost)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Current billing period (estimated)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Previous Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-muted-foreground">
              {formatCost(prevMonthCost)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Prior month total spend
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Month-over-Month</CardTitle>
          </CardHeader>
          <CardContent>
            {pctChange === null ? (
              <div className="text-2xl font-bold text-muted-foreground">—</div>
            ) : (
              <div className="flex items-center gap-2">
                <span
                  className={`flex items-center text-2xl font-bold ${
                    pctChange > 0 ? "text-amber-600" : "text-green-600"
                  }`}
                >
                  {pctChange > 0 ? (
                    <ArrowUpRight className="mr-1 h-6 w-6" />
                  ) : (
                    <ArrowDownRight className="mr-1 h-6 w-6" />
                  )}
                  {Math.abs(pctChange).toFixed(1)}%
                </span>
                <span className="text-xs text-muted-foreground">
                  {pctChange > 0 ? "increase" : "savings"}
                </span>
              </div>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              Compared to prior 30-day window
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Automated Cost Waste Recommendations */}
      <WasteRecommendations
        insights={wasteReport.insights}
        totalSavings={wasteReport.totalPotentialMonthlySavingsUsd}
      />

      {/* Daily Spending Trend (Recharts Area Chart) */}
      <Card>
        <CardHeader>
          <CardTitle>Daily AI Spending (30 Days)</CardTitle>
          <CardDescription>Daily estimated expenditure and request volume</CardDescription>
        </CardHeader>
        <CardContent>
          <CostChart data={dailyChartData} height={260} />
        </CardContent>
      </Card>

      {/* Model & Agent Breakdowns Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Model Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Spend by Model</CardTitle>
            <CardDescription>Cost distribution across LLM providers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ModelBreakdownChart data={modelSpendList} height={220} />

            <div className="divide-y rounded-md border text-sm">
              {modelSpendList.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  No LLM calls recorded yet
                </div>
              ) : (
                modelSpendList.map((m) => (
                  <div key={m.name} className="flex items-center justify-between p-2.5">
                    <span className="font-mono text-xs font-medium">{m.name}</span>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-muted-foreground">{m.tokens.toLocaleString()} tok</span>
                      <span className="font-mono font-semibold">{formatCost(m.value)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Agent Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Spend by Agent</CardTitle>
            <CardDescription>Highest spending agent workflows</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AgentCostChart data={agentSpendList} height={220} />

            <div className="divide-y rounded-md border text-sm">
              {agentSpendList.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  No agent workflows recorded yet
                </div>
              ) : (
                agentSpendList.map((a) => (
                  <div key={a.agentName} className="flex items-center justify-between p-2.5">
                    <span className="font-mono text-xs font-medium">{a.agentName}</span>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-muted-foreground">{a.traces} traces</span>
                      <span className="font-mono font-semibold">{formatCost(a.cost)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Expensive Requests (Request-level breakdown) */}
      <Card>
        <CardHeader>
          <CardTitle>Most Expensive Requests</CardTitle>
          <CardDescription>Individual agent executions with highest estimated cost</CardDescription>
        </CardHeader>
        <CardContent>
          {expensiveTraces.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              No executions recorded yet
            </div>
          ) : (
            <div className="divide-y rounded-md border text-sm">
              {expensiveTraces.map((t) => (
                <Link
                  key={t.id}
                  href={`/dashboard/traces/${t.id}`}
                  className="flex items-center justify-between p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold">{t.agentName}</span>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        #{t.id.slice(0, 8)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeTime(t.startedAt)} · {formatDuration(t.durationMs)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-sm font-bold text-foreground">
                      {formatCost(t.totalCostUsd)}
                    </span>
                    <p className="text-[10px] text-muted-foreground">
                      {((t.totalInputTokens || 0) + (t.totalOutputTokens || 0)).toLocaleString()} tokens
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
