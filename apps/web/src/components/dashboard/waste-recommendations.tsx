import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCost } from "@/lib/utils";
import { Sparkles, ArrowRight, TrendingDown, CheckCircle } from "lucide-react";
import type { WasteInsight } from "@/lib/intelligence/waste-detector";

interface Props {
  insights: WasteInsight[];
  totalSavings: number;
}

export function WasteRecommendations({ insights, totalSavings }: Props) {
  if (insights.length === 0) {
    return (
      <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20">
        <CardContent className="flex items-center gap-4 py-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400">
            <CheckCircle className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-semibold text-emerald-900 dark:text-emerald-300">
              Optimal AI Cost Efficiency
            </h4>
            <p className="text-xs text-emerald-700 dark:text-emerald-400">
              No excessive retries, model mismatches, or oversized prompt leaks detected in your recent workloads.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-200 bg-gradient-to-br from-amber-50/50 to-orange-50/30 dark:border-amber-900/40 dark:from-amber-950/10 dark:to-orange-950/10">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">
                Cost Intelligence & Savings Insights
              </CardTitle>
              <CardDescription>
                Automated waste detection algorithms identified potential savings
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 font-mono text-xs font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            <TrendingDown className="h-3.5 w-3.5" />
            Save up to {formatCost(totalSavings)}/mo
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-1">
        <div className="divide-y divide-amber-200/60 rounded-lg border border-amber-200/80 bg-background/80 dark:divide-amber-900/40 dark:border-amber-900/40">
          {insights.map((insight) => {
            const isHigh = insight.severity === "high";

            return (
              <div key={insight.id} className="p-3.5 sm:p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">
                        {insight.title}
                      </span>
                      <Badge
                        variant={isHigh ? "destructive" : "secondary"}
                        className="text-[10px] uppercase tracking-wider"
                      >
                        {insight.severity} impact
                      </Badge>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {insight.description}
                    </p>

                    <p className="mt-2 flex items-center text-xs font-medium text-primary">
                      <ArrowRight className="mr-1 h-3.5 w-3.5" />
                      {insight.recommendation}
                    </p>
                  </div>

                  <div className="shrink-0 text-left sm:text-right">
                    <span className="font-mono text-sm font-bold text-amber-600 dark:text-amber-400">
                      +{formatCost(insight.estimatedMonthlySavingsUsd)}/mo
                    </span>
                    <p className="text-[10px] text-muted-foreground">
                      {insight.affectedCount} events
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
