"use client";

import { useState } from "react";
import { formatCost, formatRelativeTime } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, ChevronRight, Clock, DollarSign, Bot, Bug } from "lucide-react";

export interface AggregatedError {
  errorType: string;
  occurrences: number;
  totalWastedCost: number;
  firstSeen: string;
  lastSeen: string;
  affectedAgents: { agentName: string; count: number }[];
  sampleMessages: string[];
}

interface Props {
  errors: AggregatedError[];
}

export function ErrorList({ errors }: Props) {
  const [selectedErrorType, setSelectedErrorType] = useState<string>(
    errors[0]?.errorType ?? ""
  );

  if (errors.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <Bug className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
          <p className="text-base font-semibold">Zero Errors Recorded</p>
          <p className="mt-1 text-sm text-muted-foreground">
            No agent failures, timeouts, or tool exceptions have occurred in this project.
          </p>
        </CardContent>
      </Card>
    );
  }

  const selected = errors.find((e) => e.errorType === selectedErrorType) || errors[0]!;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Aggregated Errors Table (Left 7 cols) */}
      <div className="lg:col-span-7">
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base">Recurring Errors</CardTitle>
            <CardDescription>
              Ranked by total estimated cost wasted on failed attempts
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {errors.map((err) => {
                const isSelected = err.errorType === selected?.errorType;

                return (
                  <div
                    key={err.errorType}
                    onClick={() => setSelectedErrorType(err.errorType)}
                    className={`flex cursor-pointer items-center justify-between p-4 transition-colors ${
                      isSelected
                        ? "bg-primary/5 ring-1 ring-inset ring-primary"
                        : "hover:bg-muted/40"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-foreground">
                          {err.errorType}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {err.occurrences} {err.occurrences === 1 ? "time" : "times"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Last seen {formatRelativeTime(err.lastSeen)} ·{" "}
                        {err.affectedAgents.length} {err.affectedAgents.length === 1 ? "agent" : "agents"} affected
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="font-mono text-sm font-bold text-rose-600 dark:text-rose-400">
                          {formatCost(err.totalWastedCost)}
                        </span>
                        <p className="text-[10px] text-muted-foreground">wasted</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Deep Dive Inspector (Right 5 cols) */}
      <div className="lg:col-span-5">
        <div className="sticky top-6">
          <Card>
            <CardHeader className="border-b pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Error Deep Dive</CardTitle>
                <Badge variant="destructive" className="font-mono text-xs">
                  {selected.occurrences} events
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 pt-4">
              {/* Header Info */}
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Error Type
                </span>
                <h3 className="font-mono text-lg font-bold text-foreground">
                  {selected.errorType}
                </h3>
              </div>

              {/* Stats Box */}
              <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/40 p-3 text-xs">
                <div>
                  <span className="text-muted-foreground">Total Wasted Cost:</span>
                  <p className="font-mono text-sm font-bold text-rose-600 dark:text-rose-400">
                    {formatCost(selected.totalWastedCost)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Occurrences:</span>
                  <p className="font-mono text-sm font-bold">{selected.occurrences}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">First Seen:</span>
                  <p className="font-medium text-foreground">
                    {formatRelativeTime(selected.firstSeen)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Last Seen:</span>
                  <p className="font-medium text-foreground">
                    {formatRelativeTime(selected.lastSeen)}
                  </p>
                </div>
              </div>

              {/* Affected Agents Breakdown */}
              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Affected Agents
                </span>
                <div className="divide-y rounded-md border text-xs">
                  {selected.affectedAgents.map((a) => (
                    <div key={a.agentName} className="flex items-center justify-between p-2.5">
                      <div className="flex items-center gap-2">
                        <Bot className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-mono font-medium">{a.agentName}</span>
                      </div>
                      <Badge variant="secondary" className="font-mono text-[10px]">
                        {a.count} {a.count === 1 ? "failure" : "failures"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sample Messages */}
              {selected.sampleMessages.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Sample Error Messages
                  </span>
                  <div className="space-y-1.5">
                    {selected.sampleMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        className="rounded-md border bg-muted/30 p-2.5 font-mono text-xs text-foreground"
                      >
                        {msg}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
