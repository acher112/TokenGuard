import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { traces, projects } from "@/lib/db/schema";
import { eq, and, desc, sql, ilike, or } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCost, formatDuration, formatRelativeTime } from "@/lib/utils";
import { TraceFilters } from "@/components/traces/trace-filters";
import Link from "next/link";
import { ChevronLeft, ChevronRight, GitBranch } from "lucide-react";

interface Props {
  searchParams: {
    q?: string;
    status?: string;
    agent?: string;
    page?: string;
  };
}

const PAGE_SIZE = 25;

export default async function TracesPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) return null;

  const project = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, session.user.id))
    .limit(1)
    .then((r) => r[0]);

  if (!project) return null;

  // Parse filters
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  const filterConditions = [eq(traces.projectId, project.id)];

  if (searchParams.status && searchParams.status !== "all") {
    filterConditions.push(eq(traces.status, searchParams.status as any));
  }

  if (searchParams.agent && searchParams.agent !== "all") {
    filterConditions.push(eq(traces.agentName, searchParams.agent));
  }

  if (searchParams.q && searchParams.q.trim()) {
    const q = `%${searchParams.q.trim()}%`;
    filterConditions.push(
      or(ilike(traces.agentName, q), ilike(traces.id, q))!
    );
  }

  const whereClause = and(...filterConditions);

  // Fetch paginated traces, total count, and distinct agents simultaneously
  const [traceRows, [countResult], distinctAgents] = await Promise.all([
    db
      .select()
      .from(traces)
      .where(whereClause)
      .orderBy(desc(traces.startedAt))
      .limit(PAGE_SIZE)
      .offset(offset),
    db
      .select({ totalCount: sql<number>`count(*)::int` })
      .from(traces)
      .where(whereClause),
    db
      .selectDistinct({ agentName: traces.agentName })
      .from(traces)
      .where(eq(traces.projectId, project.id)),
  ]);

  const agentsList = distinctAgents.map((a) => a.agentName);

  const totalCount = countResult?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Traces</h1>
        <p className="text-sm text-muted-foreground">
          Monitor every agent execution, inspect tool calls, and analyze token spend.
        </p>
      </div>

      {/* Filter toolbar */}
      <TraceFilters agents={agentsList} />

      {/* Traces table card */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">All Executions</CardTitle>
              <CardDescription>
                Showing {traceRows.length} of {totalCount} total traces
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {traceRows.length === 0 ? (
            <div className="py-16 text-center">
              <GitBranch className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-base font-medium">No traces found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {filterConditions.length > 1
                  ? "Try adjusting your filters or search query."
                  : "Run your AI agent with the SDK to record your first trace."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="py-3 pl-4 pr-2 sm:pl-6">Status</th>
                    <th className="px-3 py-3">Agent</th>
                    <th className="px-3 py-3">Trace ID</th>
                    <th className="px-3 py-3">Tokens</th>
                    <th className="px-3 py-3">Latency</th>
                    <th className="px-3 py-3">Cost</th>
                    <th className="py-3 pl-3 pr-4 sm:pr-6 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {traceRows.map((t) => {
                    const isSuccess = t.status === "success";
                    const cost = parseFloat(t.totalCostUsd || "0");
                    const totalTokens = (t.totalInputTokens || 0) + (t.totalOutputTokens || 0);

                    return (
                      <tr
                        key={t.id}
                        className="group transition-colors hover:bg-muted/50"
                      >
                        <td className="py-3.5 pl-4 pr-2 sm:pl-6">
                          <Link href={`/dashboard/traces/${t.id}`} className="block">
                            <Badge
                              variant={isSuccess ? "success" : "destructive"}
                              className="font-mono text-[11px]"
                            >
                              {isSuccess ? "✓ SUCCESS" : "✕ FAILED"}
                            </Badge>
                          </Link>
                        </td>

                        <td className="px-3 py-3.5 font-medium text-foreground">
                          <Link href={`/dashboard/traces/${t.id}`} className="hover:underline">
                            {t.agentName}
                          </Link>
                        </td>

                        <td className="px-3 py-3.5 font-mono text-xs text-muted-foreground">
                          <Link href={`/dashboard/traces/${t.id}`} className="hover:text-primary">
                            #{t.id.slice(0, 8)}
                          </Link>
                        </td>

                        <td className="px-3 py-3.5 font-mono text-xs text-muted-foreground">
                          {totalTokens.toLocaleString()}
                        </td>

                        <td className="px-3 py-3.5 font-mono text-xs text-muted-foreground">
                          {formatDuration(t.durationMs)}
                        </td>

                        <td className="px-3 py-3.5 font-mono text-sm font-semibold text-foreground">
                          {formatCost(cost)}
                        </td>

                        <td className="py-3.5 pl-3 pr-4 sm:pr-6 text-right text-xs text-muted-foreground">
                          {formatRelativeTime(t.startedAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t p-4">
              <p className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Link
                  href={`/dashboard/traces?page=${page - 1}`}
                  aria-disabled={page <= 1}
                  className={`inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-medium ${
                    page <= 1
                      ? "pointer-events-none opacity-50"
                      : "hover:bg-accent"
                  }`}
                >
                  <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Previous
                </Link>
                <Link
                  href={`/dashboard/traces?page=${page + 1}`}
                  aria-disabled={page >= totalPages}
                  className={`inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-medium ${
                    page >= totalPages
                      ? "pointer-events-none opacity-50"
                      : "hover:bg-accent"
                  }`}
                >
                  Next <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
