import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { llmCalls, traces, modelPricing, projects } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCost } from "@/lib/utils";
import { Cpu, DollarSign, Zap } from "lucide-react";

export default async function ModelsPage() {
  const session = await auth();
  if (!session?.user) return null;

  const project = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, session.user.id))
    .limit(1)
    .then((r) => r[0]);

  if (!project) return null;

  // Query project LLM calls and model pricing table in parallel
  const [projectCalls, pricingTable] = await Promise.all([
    db
      .select({
        modelName: llmCalls.modelName,
        provider: llmCalls.provider,
        inputTokens: llmCalls.inputTokens,
        outputTokens: llmCalls.outputTokens,
        cost: llmCalls.estimatedCostUsd,
      })
      .from(llmCalls)
      .innerJoin(traces, eq(llmCalls.traceId, traces.id))
      .where(eq(traces.projectId, project.id)),
    db
      .select()
      .from(modelPricing)
      .orderBy(modelPricing.provider, modelPricing.modelName),
  ]);

  // Aggregate observed model metrics
  const modelStats = new Map<
    string,
    {
      calls: number;
      inputTokens: number;
      outputTokens: number;
      totalCost: number;
      provider?: string;
    }
  >();

  for (const c of projectCalls) {
    const key = c.modelName;
    if (!modelStats.has(key)) {
      modelStats.set(key, {
        calls: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalCost: 0,
        provider: c.provider ?? undefined,
      });
    }

    const current = modelStats.get(key)!;
    current.calls += 1;
    current.inputTokens += c.inputTokens || 0;
    current.outputTokens += c.outputTokens || 0;
    current.totalCost += parseFloat(c.cost || "0");
  }

  const observedModels = Array.from(modelStats.entries())
    .map(([modelName, data]) => {
      const pricing = pricingTable.find(
        (p) => p.modelName.toLowerCase() === modelName.toLowerCase()
      );
      return {
        modelName,
        provider: data.provider || pricing?.provider || "OpenAI",
        calls: data.calls,
        inputTokens: data.inputTokens,
        outputTokens: data.outputTokens,
        totalCost: Number(data.totalCost.toFixed(4)),
        inputPricePer1k: pricing?.inputPricePer1k,
        outputPricePer1k: pricing?.outputPricePer1k,
      };
    })
    .sort((a, b) => b.totalCost - a.totalCost);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Models</h1>
        <p className="text-sm text-muted-foreground">
          LLM token volume, cost efficiency, and active pricing catalog.
        </p>
      </div>

      {/* Observed Models In Project */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base">Active Models in Your Project</CardTitle>
          <CardDescription>
            Models called by your agents, ordered by total expenditure
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {observedModels.length === 0 ? (
            <div className="py-16 text-center">
              <Cpu className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="text-base font-semibold">No LLM Calls Recorded</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Run an agent that calls OpenAI, Anthropic, or Gemini to see metrics here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="py-3 pl-4 pr-2 sm:pl-6">Model</th>
                    <th className="px-3 py-3">Provider</th>
                    <th className="px-3 py-3">Total Calls</th>
                    <th className="px-3 py-3">Input Tokens</th>
                    <th className="px-3 py-3">Output Tokens</th>
                    <th className="py-3 pl-3 pr-4 sm:pr-6 text-right">Total Spend</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {observedModels.map((m) => (
                    <tr key={m.modelName} className="transition-colors hover:bg-muted/50">
                      <td className="py-3.5 pl-4 pr-2 sm:pl-6 font-mono text-xs font-semibold text-foreground">
                        {m.modelName}
                      </td>

                      <td className="px-3 py-3.5">
                        <Badge variant="outline" className="text-xs capitalize">
                          {m.provider}
                        </Badge>
                      </td>

                      <td className="px-3 py-3.5 font-mono text-xs text-muted-foreground">
                        {m.calls.toLocaleString()}
                      </td>

                      <td className="px-3 py-3.5 font-mono text-xs text-muted-foreground">
                        {m.inputTokens.toLocaleString()}
                      </td>

                      <td className="px-3 py-3.5 font-mono text-xs text-muted-foreground">
                        {m.outputTokens.toLocaleString()}
                      </td>

                      <td className="py-3.5 pl-3 pr-4 sm:pr-6 text-right font-mono text-sm font-semibold text-foreground">
                        {formatCost(m.totalCost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pricing Catalog Reference */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Standard Pricing Catalog</CardTitle>
              <CardDescription>
                Reference rates used to estimate costs (per 1,000 tokens)
              </CardDescription>
            </div>
            <Zap className="h-5 w-5 text-muted-foreground/50" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="py-3 pl-4 pr-2 sm:pl-6">Model</th>
                  <th className="px-3 py-3">Provider</th>
                  <th className="px-3 py-3">Input / 1k Tokens</th>
                  <th className="py-3 pl-3 pr-4 sm:pr-6 text-right">Output / 1k Tokens</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pricingTable.map((p) => (
                  <tr key={p.id} className="transition-colors hover:bg-muted/50">
                    <td className="py-2.5 pl-4 pr-2 sm:pl-6 font-mono text-xs font-medium">
                      {p.modelName}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground capitalize">
                      {p.provider}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">
                      ${parseFloat(p.inputPricePer1k).toFixed(5)}
                    </td>
                    <td className="py-2.5 pl-3 pr-4 sm:pr-6 text-right font-mono text-xs text-muted-foreground">
                      ${parseFloat(p.outputPricePer1k).toFixed(5)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
