import { describe, it, expect } from "vitest";
import { analyzeCostWaste } from "../intelligence/waste-detector";

describe("Cost Waste Detector", () => {
  it("detects excessive tool retries and computes savings", () => {
    const result = analyzeCostWaste({
      traces: [],
      llmCalls: [],
      toolCalls: [],
      errors: [
        {
          id: "e1",
          traceId: "t1",
          errorType: "ConnectionTimeout",
          retryCount: 4,
          wastedCostUsd: "0.45",
        },
      ],
    });

    expect(result.insights).toHaveLength(1);
    expect(result.insights[0]!.category).toBe("excessive_retries");
    expect(result.insights[0]!.severity).toBe("medium");
    expect(result.insights[0]!.estimatedMonthlySavingsUsd).toBeGreaterThan(0);
  });

  it("detects flagship model mismatch on small prompts", () => {
    const result = analyzeCostWaste({
      traces: [],
      llmCalls: [
        { id: "l1", traceId: "t1", modelName: "gpt-4o", inputTokens: 150, outputTokens: 20, estimatedCostUsd: "0.003" },
        { id: "l2", traceId: "t1", modelName: "gpt-4o", inputTokens: 200, outputTokens: 30, estimatedCostUsd: "0.004" },
        { id: "l3", traceId: "t1", modelName: "gpt-4o", inputTokens: 180, outputTokens: 25, estimatedCostUsd: "0.0035" },
      ],
      toolCalls: [],
      errors: [],
    });

    expect(result.insights.some((i) => i.category === "model_mismatch")).toBe(true);
    const mismatch = result.insights.find((i) => i.category === "model_mismatch")!;
    expect(mismatch.severity).toBe("high");
    expect(mismatch.recommendation).toContain("gpt-4o-mini");
  });

  it("detects oversized prompts without caching", () => {
    const result = analyzeCostWaste({
      traces: [],
      llmCalls: [
        { id: "l1", traceId: "t1", modelName: "gpt-4o", inputTokens: 24_000, outputTokens: 300, estimatedCostUsd: "0.15" },
        { id: "l2", traceId: "t1", modelName: "gpt-4o", inputTokens: 22_000, outputTokens: 400, estimatedCostUsd: "0.14" },
      ],
      toolCalls: [],
      errors: [],
    });

    expect(result.insights.some((i) => i.category === "oversized_prompts")).toBe(true);
    const promptInsight = result.insights.find((i) => i.category === "oversized_prompts")!;
    expect(promptInsight.recommendation).toContain("prompt caching");
  });

  it("detects duplicate tool calls with identical arguments", () => {
    const result = analyzeCostWaste({
      traces: [],
      llmCalls: [],
      toolCalls: [
        { id: "tc1", traceId: "t1", toolName: "search_db", argumentsJson: JSON.stringify({ q: "apple" }) },
        { id: "tc2", traceId: "t1", toolName: "search_db", argumentsJson: JSON.stringify({ q: "apple" }) },
      ],
      errors: [],
    });

    expect(result.insights.some((i) => i.category === "duplicate_tool_calls")).toBe(true);
  });

  it("returns zero insights for optimal execution", () => {
    const result = analyzeCostWaste({
      traces: [],
      llmCalls: [
        { id: "l1", traceId: "t1", modelName: "gpt-4o-mini", inputTokens: 400, outputTokens: 100, estimatedCostUsd: "0.0001" },
      ],
      toolCalls: [
        { id: "tc1", traceId: "t1", toolName: "calculator", argumentsJson: JSON.stringify({ expr: "2+2" }) },
      ],
      errors: [],
    });

    expect(result.insights).toHaveLength(0);
    expect(result.totalPotentialMonthlySavingsUsd).toBe(0);
  });
});
