import { describe, it, expect, vi, beforeEach } from "vitest";
import { Transport } from "../transport";
import type { TracePayload } from "../types";

function createMockPayload(overrides: Partial<TracePayload> = {}): TracePayload {
  return {
    agentName: "test-agent",
    status: "success",
    startedAt: new Date().toISOString(),
    endedAt: new Date().toISOString(),
    durationMs: 1500,
    steps: [
      {
        stepType: "llm",
        sequence: 1,
        startedAt: new Date().toISOString(),
        llmCall: {
          modelName: "gpt-4o",
          inputTokens: 100,
          outputTokens: 50,
        },
      },
    ],
    ...overrides,
  };
}

describe("Transport", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends traces via fetch on flush", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      status: 201,
      ok: true,
      text: async () => JSON.stringify({ success: true, traceId: "t1" }),
    });

    const transport = new Transport({
      apiKey: "aw_live_test",
      baseUrl: "https://agentwatch.dev",
      fetch: mockFetch as unknown as typeof fetch,
      flushIntervalMs: 10000, // don't auto-flush
    });

    transport.enqueue(createMockPayload());
    await transport.flush();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("https://agentwatch.dev/api/v1/ingest");
    expect(init.method).toBe("POST");
    expect(init.headers["Authorization"]).toBe("Bearer aw_live_test");

    const sentBody = JSON.parse(init.body);
    expect(sentBody.agentName).toBe("test-agent");
    expect(sentBody.steps).toHaveLength(1);

    await transport.close();
  });

  it("retries on 500 server errors with exponential backoff", async () => {
    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount < 3) {
        return { status: 500, ok: false, text: async () => "Internal Error" };
      }
      return { status: 201, ok: true, text: async () => JSON.stringify({ success: true }) };
    });

    const transport = new Transport({
      apiKey: "aw_live_test",
      baseUrl: "https://agentwatch.dev",
      fetch: mockFetch as unknown as typeof fetch,
      maxRetries: 3,
      retryDelayMs: 10, // fast retry for tests
    });

    transport.enqueue(createMockPayload());
    await transport.flush();

    expect(mockFetch).toHaveBeenCalledTimes(3);
    await transport.close();
  });

  it("does not retry on 4xx client errors", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      status: 401,
      ok: false,
      text: async () => JSON.stringify({ error: "Invalid API key" }),
    });

    const transport = new Transport({
      apiKey: "aw_live_invalid",
      baseUrl: "https://agentwatch.dev",
      fetch: mockFetch as unknown as typeof fetch,
      maxRetries: 3,
      retryDelayMs: 10,
    });

    transport.enqueue(createMockPayload());
    await transport.flush();

    // Only called once — 401 should not be retried
    expect(mockFetch).toHaveBeenCalledTimes(1);
    await transport.close();
  });

  it("truncates extremely large string fields", async () => {
    const hugeString = "x".repeat(100_000);

    let sentPayload: any = null;
    const mockFetch = vi.fn().mockImplementation(async (_url, init) => {
      sentPayload = JSON.parse(init.body);
      return { status: 201, ok: true, text: async () => "{}" };
    });

    const transport = new Transport({
      apiKey: "aw_live_test",
      baseUrl: "https://agentwatch.dev",
      fetch: mockFetch as unknown as typeof fetch,
    });

    transport.enqueue(
      createMockPayload({
        steps: [
          {
            stepType: "llm",
            sequence: 1,
            startedAt: new Date().toISOString(),
            llmCall: {
              modelName: "gpt-4o",
              inputTokens: 100,
              outputTokens: 50,
              requestJson: hugeString,
            },
          },
        ],
      })
    );

    await transport.flush();

    expect(sentPayload).toBeDefined();
    expect(sentPayload.steps[0].llmCall.requestJson.length).toBeLessThan(40_000);
    expect(sentPayload.steps[0].llmCall.requestJson).toContain("[truncated by AgentWatch SDK]");

    await transport.close();
  });

  it("flushes cleanly on close()", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      status: 201,
      ok: true,
      text: async () => "{}",
    });

    const transport = new Transport({
      apiKey: "aw_live_test",
      baseUrl: "https://agentwatch.dev",
      fetch: mockFetch as unknown as typeof fetch,
    });

    transport.enqueue(createMockPayload());
    await transport.close();

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
