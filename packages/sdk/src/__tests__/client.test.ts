import { describe, it, expect } from "vitest";
import { AgentWatch } from "../client";

describe("AgentWatch SDK", () => {
  it("throws if initialized without apiKey", () => {
    // @ts-expect-error test invalid param
    expect(() => new AgentWatch({})).toThrow("apiKey is required");
  });

  it("initializes successfully with apiKey", () => {
    const aw = new AgentWatch({ apiKey: "aw_live_test123" });
    expect(aw).toBeInstanceOf(AgentWatch);
  });

  it("executes a simple trace and returns the result", async () => {
    const aw = new AgentWatch({
      apiKey: "aw_live_test123",
      dryRun: true,
    });

    const result = await aw.trace("test-agent", async (trace) => {
      expect(trace.id).toBeDefined();
      return "done";
    });

    expect(result).toBe("done");
  });

  it("handles LLM and tool spans correctly within trace", async () => {
    const aw = new AgentWatch({
      apiKey: "aw_live_test123",
      dryRun: true,
    });

    const result = await aw.trace("customer-support", async (trace) => {
      const llm = trace.llm({ model: "gpt-4o", temperature: 0.7 });
      llm.end({ inputTokens: 500, outputTokens: 100 });

      const tool = trace.tool("db_search", { arguments: { q: "order" } });
      tool.end({ result: { status: "shipped" } });

      return { success: true };
    });

    expect(result.success).toBe(true);
  });

  it("records errors when trace function throws", async () => {
    const aw = new AgentWatch({
      apiKey: "aw_live_test123",
      dryRun: true,
    });

    await expect(
      aw.trace("failing-agent", async () => {
        throw new Error("Agent crashed");
      })
    ).rejects.toThrow("Agent crashed");
  });
});
