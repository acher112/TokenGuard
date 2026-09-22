import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { traces, projects } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCost, formatDuration, formatRelativeTime } from "@/lib/utils";
import Link from "next/link";
import { Bot, ArrowRight, CheckCircle2, XCircle } from "lucide-react";

export default async function AgentsPage() {
  const session = await auth();
  if (!session?.user) return null;

  const project = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, session.user.id))
    .limit(1)
    .then((r) => r[0]);

  if (!project) return null;

  // Retrieve all traces for project
  const allTraces = await db
    .select({
      id: traces.id,
      agentName: traces.agentName,
      status: traces.status,
      durationMs: traces.durationMs,
      totalCostUsd: traces.totalCostUsd,
      totalInputTokens: traces.totalInputTokens,
      totalOutputTokens: traces.totalOutputTokens,
      startedAt: traces.startedAt,
    })
    .from(traces)
    .where(eq(traces.projectId, project.id))
    .orderBy(desc(traces.startedAt));

  // Aggregate by agent
  const agentMap = new Map<
    string,
    {
      totalTraces: number;
      successfulTraces: number;
      failedTraces: number;
      totalCost: number;
      totalTokens: number;
      totalDurationMs: number;
      lastRun: Date;
    }
  >();

  for (const t of allTraces) {
    const name = t.agentName;
    if (!agentMap.has(name)) {
      agentMap.set(name, {
        totalTraces: 0,
        successfulTraces: 0,
        failedTraces: 0,
        totalCost: 0,
        totalTokens: 0,
        totalDurationMs: 0,
        lastRun: t.startedAt,
      });
    }

    const current = agentMap.get(name)!;
    current.totalTraces += 1;
    if (t.status === "success") {
      current.successfulTraces += 1;
    } else {
      current.failedTraces += 1;
    }
    current.totalCost += parseFloat(t.totalCostUsd || "0");
    current.totalTokens += (t.totalInputTokens || 0) + (t.totalOutputTokens || 0);
    current.totalDurationMs += t.durationMs || 0;
    if (t.startedAt > current.lastRun) {
      current.lastRun = t.startedAt;
    }
  }

  const agentsList = Array.from(agentMap.entries())
    .map(([name, data]) => ({
      name,
      totalTraces: data.totalTraces,
      successRate: data.totalTraces > 0 ? (data.successfulTraces / data.totalTraces) * 100 : 100,
      totalCost: Number(data.totalCost.toFixed(4)),
      avgCost: data.totalTraces > 0 ? Number((data.totalCost / data.totalTraces).toFixed(4)) : 0,
      avgDurationMs: data.totalTraces > 0 ? Math.round(data.totalDurationMs / data.totalTraces) : 0,
      totalTokens: data.totalTokens,
      lastRun: data.lastRun.toISOString(),
    }))
    .sort((a, b) => b.totalCost - a.totalCost);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Agents</h1>
        <p className="text-sm text-muted-foreground">
          Performance, reliability, and cost breakdown per individual AI agent workflow.
        </p>
      </div>

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base">Monitored Agents ({agentsList.length})</CardTitle>
          <CardDescription>
            Sorted by total AI spend
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {agentsList.length === 0 ? (
            <div className="py-16 text-center">
              <Bot className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="text-base font-semibold">No Agents Detected</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Run an agent using <code className="font-mono text-xs">aw.trace(&quot;my-agent&quot;, ...)</code> to see it here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="py-3 pl-4 pr-2 sm:pl-6">Agent Name</th>
                    <th className="px-3 py-3">Executions</th>
                    <th className="px-3 py-3">Success Rate</th>
                    <th className="px-3 py-3">Avg Latency</th>
                    <th className="px-3 py-3">Avg Cost</th>
                    <th className="px-3 py-3">Total Spend</th>
                    <th className="py-3 pl-3 pr-4 sm:pr-6 text-right">Last Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {agentsList.map((a) => (
                    <tr key={a.name} className="transition-colors hover:bg-muted/50">
                      <td className="py-3.5 pl-4 pr-2 sm:pl-6 font-medium text-foreground">
                        <Link
                          href={`/dashboard/traces?agent=${encodeURIComponent(a.name)}`}
                          className="flex items-center gap-2 hover:underline"
                        >
                          <Bot className="h-4 w-4 text-primary" />
                          <span className="font-mono">{a.name}</span>
                        </Link>
                      </td>

                      <td className="px-3 py-3.5 text-xs text-muted-foreground font-mono">
                        {a.totalTraces.toLocaleString()}
                      </td>

                      <td className="px-3 py-3.5">
                        <Badge
                          variant={a.successRate >= 95 ? "success" : a.successRate >= 80 ? "outline" : "destructive"}
                          className="font-mono text-xs"
                        >
                          {a.successRate.toFixed(1)}%
                        </Badge>
                      </td>

                      <td className="px-3 py-3.5 text-xs text-muted-foreground font-mono">
                        {formatDuration(a.avgDurationMs)}
                      </td>

                      <td className="px-3 py-3.5 text-xs text-muted-foreground font-mono">
                        {formatCost(a.avgCost)}
                      </td>

                      <td className="px-3 py-3.5 font-mono text-sm font-semibold text-foreground">
                        {formatCost(a.totalCost)}
                      </td>

                      <td className="py-3.5 pl-3 pr-4 sm:pr-6 text-right text-xs text-muted-foreground">
                        <Link
                          href={`/dashboard/traces?agent=${encodeURIComponent(a.name)}`}
                          className="inline-flex items-center text-primary hover:underline"
                        >
                          {formatRelativeTime(a.lastRun)} <ArrowRight className="ml-1 h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
