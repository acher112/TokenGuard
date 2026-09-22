import { describe, it, expect, vi } from "vitest";
import { wrapOpenAI } from "../integrations/openai";
import { AgentWatch } from "../client";

function createMockOpenAI(createImpl?: (...args: any[]) => Promise<any>) {
  return {
    chat: {
      completions: {
        create:
          createImpl ??
          vi.fn().mockResolvedValue({
            id: "chatcmpl-123",
            model: "gpt-4o",
            usage: {
              prompt_tokens: 1200,
              completion_tokens: 250,
              total_tokens: 1450,
            },
            choices: [
              {
                message: { role: "assistant", content: "Your order is on the way!" },
                finish_reason: "stop",
              },
            ],
          }),
      },
    },
    // Other properties should be preserved through proxy
    models: {
      list: vi.fn().mockResolvedValue({ data: [] }),
    },
  };
}

describe("wrapOpenAI", () => {
  it("preserves untouched properties through proxy", async () => {
    const rawMock = createMockOpenAI();
    const wrapped = wrapOpenAI(rawMock);

    expect(wrapped.models).toBeDefined();
    await wrapped.models.list();
    expect(rawMock.models.list).toHaveBeenCalled();
  });

  it("intercepts chat.completions.create within an active trace", async () => {
    let sentPayload: any = null;
    const mockFetch = vi.fn().mockImplementation(async (_url, init) => {
      sentPayload = JSON.parse(init.body);
      return { status: 201, ok: true, text: async () => "{}" };
    });

    const aw = new AgentWatch({
      apiKey: "aw_live_test",
      fetch: mockFetch as unknown as typeof fetch,
    });

    const mockOpenAI = createMockOpenAI();
    const wrappedOpenAI = wrapOpenAI(mockOpenAI);

    const result = await aw.trace("customer-support", async () => {
      const completion = await wrappedOpenAI.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: "Where is my order?" }],
        temperature: 0.7,
      });

      return completion.choices[0].message.content;
    });

    expect(result).toBe("Your order is on the way!");

    // Flush to inspect sent payload
    await aw.flush();

    expect(sentPayload).toBeDefined();
    expect(sentPayload.agentName).toBe("customer-support");
    expect(sentPayload.status).toBe("success");
    expect(sentPayload.steps).toHaveLength(1);

    const step = sentPayload.steps[0];
    expect(step.stepType).toBe("llm");
    expect(step.llmCall).toBeDefined();
    expect(step.llmCall.modelName).toBe("gpt-4o");
    expect(step.llmCall.inputTokens).toBe(1200);
    expect(step.llmCall.outputTokens).toBe(250);
    expect(step.llmCall.temperature).toBe("0.7");
    expect(step.llmCall.responseJson).toContain("Your order is on the way!");

    await aw.close();
  });

  it("creates standalone trace when called outside trace() with agentWatch provided", async () => {
    let sentPayload: any = null;
    const mockFetch = vi.fn().mockImplementation(async (_url, init) => {
      sentPayload = JSON.parse(init.body);
      return { status: 201, ok: true, text: async () => "{}" };
    });

    const aw = new AgentWatch({
      apiKey: "aw_live_test",
      fetch: mockFetch as unknown as typeof fetch,
    });

    const mockOpenAI = createMockOpenAI();
    const wrappedOpenAI = aw.wrapOpenAI(mockOpenAI, {
      fallbackAgentName: "standalone-chatbot",
    });

    const completion = await wrappedOpenAI.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "Hi" }],
    });

    expect(completion.id).toBe("chatcmpl-123");

    await aw.flush();

    expect(sentPayload).toBeDefined();
    expect(sentPayload.agentName).toBe("standalone-chatbot");
    expect(sentPayload.steps[0].llmCall.modelName).toBe("gpt-4o-mini");

    await aw.close();
  });

  it("intercepts errors and records failure when OpenAI throws", async () => {
    let sentPayload: any = null;
    const mockFetch = vi.fn().mockImplementation(async (_url, init) => {
      sentPayload = JSON.parse(init.body);
      return { status: 201, ok: true, text: async () => "{}" };
    });

    const aw = new AgentWatch({
      apiKey: "aw_live_test",
      fetch: mockFetch as unknown as typeof fetch,
    });

    const failingMock = createMockOpenAI(async () => {
      throw new Error("Rate limit exceeded (429)");
    });
    const wrapped = aw.wrapOpenAI(failingMock);

    await expect(
      aw.trace("failing-agent", async () => {
        await wrapped.chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "user", content: "Test" }],
        });
      })
    ).rejects.toThrow("Rate limit exceeded (429)");

    await aw.flush();

    expect(sentPayload).toBeDefined();
    expect(sentPayload.status).toBe("failed");
    // Should have recorded both the failed LLM step and the trace error
    expect(sentPayload.steps.some((s: any) => s.stepType === "error")).toBe(true);

    await aw.close();
  });
});
