import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { traces, errors, projects } from "@/lib/db/schema";
import { eq, count, and, gte, desc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCost, formatDuration, formatNumber, formatRelativeTime } from "@/lib/utils";
import { DollarSign, Activity, AlertCircle, Clock, ArrowRight } from "lucide-react";
import Link from "next/link";
import { CostChart, type DailyCostPoint } from "@/components/dashboard/cost-chart";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) return null;

  // Get user's active project
  const project = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, session.user.id))
    .limit(1)
    .then((r) => r[0]);

  if (!project) return null;

  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Overall 30-day KPIs — fetch raw rows and sum in JS
  // (totalCostUsd is stored as text; PostgreSQL sum() doesn't work on text)
  const thirtyDayTraces = await db
    .select({
      totalCostUsd: traces.totalCostUsd,
      durationMs: traces.durationMs,
    })
    .from(traces)
    .where(
      and(
        eq(traces.projectId, project.id),
        gte(traces.startedAt, thirtyDaysAgo)
      )
    );

  const stats = {
    totalTraces: thirtyDayTraces.length,
    totalCost: thirtyDayTraces
      .reduce((acc, t) => acc + parseFloat(t.totalCostUsd || "0"), 0)
      .toString(),
    avgDuration:
      thirtyDayTraces.length > 0
        ? (
            thirtyDayTraces.reduce((acc, t) => acc + (t.durationMs ?? 0), 0) /
            thirtyDayTraces.length
          ).toString()
        : "0",
  };

  const [errorStats] = await db
    .select({ totalErrors: count(errors.id) })
    .from(errors)
    .where(
      and(
        eq(errors.projectId, project.id),
        gte(errors.occurredAt, thirtyDaysAgo)
      )
    );

  // 7-day daily data for chart
  const weekTraces = await db
    .select({
      startedAt: traces.startedAt,
      totalCostUsd: traces.totalCostUsd,
    })
    .from(traces)
    .where(
      and(
        eq(traces.projectId, project.id),
        gte(traces.startedAt, sevenDaysAgo)
      )
    );

  // Group by day of week
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dailyMap = new Map<string, { cost: number; requests: number }>();

  // Initialize the last 7 days in order
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = `${dayNames[d.getDay()]} ${d.getDate()}`;
    dailyMap.set(key, { cost: 0, requests: 0 });
  }

  for (const t of weekTraces) {
    const d = new Date(t.startedAt);
    const key = `${dayNames[d.getDay()]} ${d.getDate()}`;
    if (dailyMap.has(key)) {
      const current = dailyMap.get(key)!;
      current.cost += parseFloat(t.totalCostUsd || "0");
      current.requests += 1;
    }
  }

  const chartData: DailyCostPoint[] = Array.from(dailyMap.entries()).map(([date, val]) => ({
    date,
    cost: Number(val.cost.toFixed(4)),
    requests: val.requests,
  }));

  // Recent 10 traces
  const recentTraces = await db
    .select()
    .from(traces)
    .where(eq(traces.projectId, project.id))
    .orderBy(desc(traces.startedAt))
    .limit(10);

  const totalCost = parseFloat(stats?.totalCost ?? "0");
  const avgDurationMs = parseFloat(stats?.avgDuration ?? "0");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
          <p className="text-sm text-muted-foreground">
            Project: <span className="font-semibold text-foreground">{project.name}</span> · Last 30 days
          </p>
        </div>
        <Link
          href="/dashboard/traces"
          className="inline-flex items-center text-sm font-medium text-primary hover:underline"
        >
          View all traces <ArrowRight className="ml-1 h-4 w-4" />
        </Link>
      </div>

      {/* 4 Stat KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-50 dark:bg-indigo-950">
              <DollarSign className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCost(totalCost)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Estimated AI spend (last 30 days)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Requests</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-50 dark:bg-blue-950">
              <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(stats?.totalTraces ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total agent executions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Errors</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-rose-50 dark:bg-rose-950">
              <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(errorStats?.totalErrors ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Failed calls & tool errors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-50 dark:bg-amber-950">
              <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(avgDurationMs || null)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Average execution time</p>
          </CardContent>
        </Card>
      </div>

      {/* AI COST Chart Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>AI Cost</CardTitle>
            <CardDescription>Daily estimated spend over the last 7 days</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <CostChart data={chartData} height={280} />
        </CardContent>
      </Card>

      {/* Recent Traces Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Traces</CardTitle>
            <CardDescription>Latest agent workflows recorded by TokenGuard</CardDescription>
          </div>
          <Link
            href="/dashboard/traces"
            className="text-xs font-semibold text-primary hover:underline"
          >
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {recentTraces.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">
                No traces yet. Install the SDK to record your first agent workflow:
              </p>
              <pre className="mt-3 inline-block rounded-md bg-muted px-4 py-2 font-mono text-xs">
                npm install @tokenguard/sdk
              </pre>
            </div>
          ) : (
            <div className="divide-y rounded-md border">
              {recentTraces.map((trace) => {
                const isSuccess = trace.status === "success";
                const costNum = parseFloat(trace.totalCostUsd || "0");

                return (
                  <Link
                    key={trace.id}
                    href={`/dashboard/traces/${trace.id}`}
                    className="flex items-center justify-between p-3.5 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                          isSuccess
                            ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
                            : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
                        }`}
                      >
                        {isSuccess ? "✓" : "✕"}
                      </span>
                      <div>
                        <p className="font-mono text-sm font-medium text-foreground">
                          {trace.agentName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatRelativeTime(trace.startedAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="font-mono text-sm font-semibold text-foreground">
                          {formatCost(costNum)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDuration(trace.durationMs)}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
