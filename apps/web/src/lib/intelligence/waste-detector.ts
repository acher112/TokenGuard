export interface WasteInsight {
  id: string;
  category: "excessive_retries" | "model_mismatch" | "oversized_prompts" | "duplicate_tool_calls";
  title: string;
  description: string;
  severity: "high" | "medium" | "low";
  estimatedMonthlySavingsUsd: number;
  recommendation: string;
  affectedCount: number;
}

export interface WasteAnalysisInput {
  traces: {
    id: string;
    agentName: string;
    totalCostUsd: string;
    startedAt: Date;
    durationMs: number | null;
  }[];
  llmCalls: {
    id: string;
    traceId: string;
    modelName: string;
    inputTokens: number;
    outputTokens: number;
    estimatedCostUsd: string;
  }[];
  toolCalls: {
    id: string;
    traceId: string;
    toolName: string;
    argumentsJson: string | null;
  }[];
  errors: {
    id: string;
    traceId: string;
    errorType: string;
    retryCount: number;
    wastedCostUsd: string;
  }[];
}

/**
 * Analyzes execution telemetry to detect AI budget waste patterns
 * and compute estimated monthly savings.
 */
export function analyzeCostWaste(data: WasteAnalysisInput): {
  insights: WasteInsight[];
  totalPotentialMonthlySavingsUsd: number;
} {
  const insights: WasteInsight[] = [];

  // 1. Pattern: Excessive Retries & Burnt Error Budget
  let totalRetries = 0;
  let retryWastedCost = 0;
  const retriedErrors = data.errors.filter((e) => e.retryCount > 1 || parseFloat(e.wastedCostUsd || "0") > 0);

  for (const err of retriedErrors) {
    totalRetries += Math.max(1, err.retryCount);
    retryWastedCost += parseFloat(err.wastedCostUsd || "0");
  }

  if (retriedErrors.length > 0) {
    const monthlySavings = Number((retryWastedCost * 4.2).toFixed(2)); // Projected from recent sample
    insights.push({
      id: "excessive-retries",
      category: "excessive_retries",
      title: "Costly Tool & Network Retry Loops",
      description: `Detected ${totalRetries} retried failing steps burning an estimated $${retryWastedCost.toFixed(2)} in wasted tokens.`,
      severity: retryWastedCost > 10 ? "high" : "medium",
      estimatedMonthlySavingsUsd: Math.max(monthlySavings, 5),
      recommendation: "Implement circuit-breaker thresholds and cap automated retries to 2 attempts max.",
      affectedCount: retriedErrors.length,
    });
  }

  // 2. Pattern: Flagship Model Mismatch on Lightweight Tasks
  // Using GPT-4o or Claude 3.5 Sonnet on small prompts (< 400 in, < 100 out) where GPT-4o-mini is 10x cheaper
  const flagshipModels = ["gpt-4o", "gpt-4", "claude-3-5-sonnet", "claude-3-opus"];
  const mismatchedCalls = data.llmCalls.filter((call) => {
    const isFlagship = flagshipModels.some((m) => call.modelName.toLowerCase().includes(m));
    return isFlagship && call.inputTokens < 500 && call.outputTokens < 120;
  });

  if (mismatchedCalls.length >= 3) {
    let currentCost = 0;
    for (const call of mismatchedCalls) {
      currentCost += parseFloat(call.estimatedCostUsd || "0");
    }
    // gpt-4o-mini saves ~90% on these requests
    const potentialSavings = currentCost * 0.9;
    const monthlySavings = Number((potentialSavings * 4.2).toFixed(2));

    insights.push({
      id: "model-mismatch",
      category: "model_mismatch",
      title: "Expensive Model Used for Simple Classification",
      description: `${mismatchedCalls.length} lightweight requests (<500 tokens) used flagship models (${mismatchedCalls[0]?.modelName}) instead of mini models.`,
      severity: "high",
      estimatedMonthlySavingsUsd: Math.max(monthlySavings, 15),
      recommendation: "Switch routing or intent classification steps to gpt-4o-mini or claude-3-haiku for a ~90% cost drop.",
      affectedCount: mismatchedCalls.length,
    });
  }

  // 3. Pattern: Oversized Prompts Without Caching (>12,000 tokens)
  const heavyPromptCalls = data.llmCalls.filter((call) => call.inputTokens > 12_000);
  if (heavyPromptCalls.length >= 2) {
    let heavyCost = 0;
    for (const call of heavyPromptCalls) {
      heavyCost += parseFloat(call.estimatedCostUsd || "0");
    }
    // Prompt caching saves 50% on input tokens
    const cacheSavings = heavyCost * 0.5;
    const monthlySavings = Number((cacheSavings * 4.2).toFixed(2));

    insights.push({
      id: "oversized-prompts",
      category: "oversized_prompts",
      title: "Uncached Heavy System Prompts",
      description: `${heavyPromptCalls.length} calls sent prompts exceeding 12,000 tokens without caching or document trimming.`,
      severity: "medium",
      estimatedMonthlySavingsUsd: Math.max(monthlySavings, 20),
      recommendation: "Enable OpenAI/Anthropic prompt caching on static system instructions or trim redundant RAG context.",
      affectedCount: heavyPromptCalls.length,
    });
  }

  // 4. Pattern: Duplicate Tool Calls within Same Trace
  const tracesWithDuplicates = new Set<string>();
  const traceToolMap = new Map<string, Set<string>>();

  for (const tool of data.toolCalls) {
    if (!tool.argumentsJson) continue;
    const key = `${tool.toolName}:${tool.argumentsJson}`;
    const seen = traceToolMap.get(tool.traceId) ?? new Set<string>();
    if (seen.has(key)) {
      tracesWithDuplicates.add(tool.traceId);
    } else {
      seen.add(key);
      traceToolMap.set(tool.traceId, seen);
    }
  }

  if (tracesWithDuplicates.size > 0) {
    insights.push({
      id: "duplicate-tool-calls",
      category: "duplicate_tool_calls",
      title: "Duplicate Tool Invocations Detected",
      description: `${tracesWithDuplicates.size} traces called the same tool multiple times with identical arguments.`,
      severity: "low",
      estimatedMonthlySavingsUsd: Number((tracesWithDuplicates.size * 1.5).toFixed(2)),
      recommendation: "Cache tool query responses in memory during the agent execution cycle.",
      affectedCount: tracesWithDuplicates.size,
    });
  }

  // Total potential monthly savings
  const totalPotentialMonthlySavingsUsd = insights.reduce(
    (sum, item) => sum + item.estimatedMonthlySavingsUsd,
    0
  );

  return {
    insights,
    totalPotentialMonthlySavingsUsd: Number(totalPotentialMonthlySavingsUsd.toFixed(2)),
  };
}
