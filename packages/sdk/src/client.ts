import type {
  AgentWatchConfig,
  TraceContext,
  TracePayload,
  TraceOptions,
  LlmSpan,
  LlmSpanOptions,
  LlmSpanResult,
  ToolSpan,
  ToolSpanOptions,
  ToolSpanResult,
  ErrorOptions,
  StepPayload,
} from "./types";
import { Transport } from "./transport";
import { traceContextManager } from "./context";
import { wrapOpenAI, type WrapOpenAIOptions } from "./integrations/openai";
import { wrapAnthropic, type WrapAnthropicOptions } from "./integrations/anthropic";
import { wrapGemini, type WrapGeminiOptions } from "./integrations/gemini";

const DEFAULT_BASE_URL = "https://agentwatch.dev";

/**
 * AgentWatch Client — production developer SDK for monitoring AI agents and applications.
 */
export class AgentWatch {
  private readonly config: Required<AgentWatchConfig>;
  private readonly transport: Transport;

  constructor(config: AgentWatchConfig) {
    if (!config.apiKey) {
      throw new Error("AgentWatch: apiKey is required.");
    }

    this.config = {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl ?? DEFAULT_BASE_URL,
      debug: config.debug ?? false,
      dryRun: config.dryRun ?? false,
      maxBatchSize: config.maxBatchSize ?? 10,
      flushIntervalMs: config.flushIntervalMs ?? 1000,
      maxRetries: config.maxRetries ?? 3,
      retryDelayMs: config.retryDelayMs ?? 500,
      fetch: config.fetch ?? (globalThis.fetch ? globalThis.fetch.bind(globalThis) : (fetch as any)),
    };

    this.transport = new Transport({
      apiKey: this.config.apiKey,
      baseUrl: this.config.baseUrl,
      debug: this.config.debug,
      dryRun: this.config.dryRun,
      maxBatchSize: this.config.maxBatchSize,
      flushIntervalMs: this.config.flushIntervalMs,
      maxRetries: this.config.maxRetries,
      retryDelayMs: this.config.retryDelayMs,
      fetch: this.config.fetch,
    });
  }

  /**
   * Instrument an OpenAI client instance to automatically record all calls
   * directly into AgentWatch.
   *
   * @param openai - The OpenAI client instance
   * @param options - Optional configuration
   */
  wrapOpenAI<T extends object>(openai: T, options?: WrapOpenAIOptions): T {
    return wrapOpenAI(openai, { agentWatch: this, ...options });
  }

  /**
   * Instrument an Anthropic client instance to automatically record all messages.create() calls.
   *
   * @param anthropic - The Anthropic client instance
   * @param options - Optional configuration
   */
  wrapAnthropic<T extends object>(anthropic: T, options?: WrapAnthropicOptions): T {
    return wrapAnthropic(anthropic, { agentWatch: this, ...options });
  }

  /**
   * Instrument a Gemini GenerativeModel to automatically record all generateContent() calls.
   *
   * @param model - The GenerativeModel instance (from `genai.getGenerativeModel()`)
   * @param options - Optional configuration
   */
  wrapGemini<T extends object>(model: T, options?: WrapGeminiOptions): T {
    return wrapGemini(model, { agentWatch: this, ...options });
  }

  /**
   * Wraps an async function in a trace execution.
   *
   * @param agentName - Name of the agent (e.g. "customer-support")
   * @param fn - The async function executing the agent workflow
   * @param options - Optional metadata (tags, userId)
   * @returns The return value of fn
   *
   * @example
   * ```typescript
   * const result = await aw.trace("customer-agent", async (trace) => {
   *   const tool = trace.tool("db_search");
   *   const data = await search();
   *   tool.end({ result: data });
   *   return data;
   * });
   * ```
   */
  async trace<T>(
    agentName: string,
    fn: (trace: TraceContext) => Promise<T>,
    options?: TraceOptions
  ): Promise<T> {
    const startedAt = new Date();
    const traceId = crypto.randomUUID();
    const steps: StepPayload[] = [];
    let sequence = 0;

    const context: TraceContext = {
      id: traceId,

      llm(opts: LlmSpanOptions): LlmSpan {
        const stepSeq = ++sequence;
        const stepStart = new Date();

        return {
          end(result: LlmSpanResult) {
            const endedAt = new Date();
            steps.push({
              stepType: "llm",
              sequence: stepSeq,
              startedAt: stepStart.toISOString(),
              endedAt: endedAt.toISOString(),
              durationMs: endedAt.getTime() - stepStart.getTime(),
              llmCall: {
                modelName: opts.model,
                provider: opts.provider,
                inputTokens: result.inputTokens,
                outputTokens: result.outputTokens,
                temperature: opts.temperature != null ? String(opts.temperature) : undefined,
                requestJson: opts.request != null ? JSON.stringify(opts.request) : undefined,
                responseJson: result.response != null ? JSON.stringify(result.response) : undefined,
              },
            });
          },
          fail(error: Error | string) {
            const endedAt = new Date();
            const message = error instanceof Error ? error.message : error;
            steps.push({
              stepType: "error",
              sequence: stepSeq,
              startedAt: stepStart.toISOString(),
              endedAt: endedAt.toISOString(),
              durationMs: endedAt.getTime() - stepStart.getTime(),
              error: { errorType: "LLMError", message },
            });
          },
        };
      },

      tool(name: string, opts?: ToolSpanOptions): ToolSpan {
        const stepSeq = ++sequence;
        const stepStart = new Date();

        return {
          end(result?: ToolSpanResult) {
            const endedAt = new Date();
            steps.push({
              stepType: "tool",
              sequence: stepSeq,
              startedAt: stepStart.toISOString(),
              endedAt: endedAt.toISOString(),
              durationMs: endedAt.getTime() - stepStart.getTime(),
              toolCall: {
                toolName: name,
                status: result?.status ?? "success",
                argumentsJson: opts?.arguments != null ? JSON.stringify(opts.arguments) : undefined,
                resultJson: result?.result != null ? JSON.stringify(result.result) : undefined,
              },
            });
          },
          fail(error: Error | string) {
            const endedAt = new Date();
            const message = error instanceof Error ? error.message : error;
            steps.push({
              stepType: "error",
              sequence: stepSeq,
              startedAt: stepStart.toISOString(),
              endedAt: endedAt.toISOString(),
              durationMs: endedAt.getTime() - stepStart.getTime(),
              error: { errorType: "ToolError", message },
            });
          },
        };
      },

      error(error: Error | string, opts?: ErrorOptions) {
        const stepSeq = ++sequence;
        const message = error instanceof Error ? error.message : error;
        const stackTrace = error instanceof Error ? error.stack : undefined;
        steps.push({
          stepType: "error",
          sequence: stepSeq,
          startedAt: new Date().toISOString(),
          error: {
            errorType: error instanceof Error ? error.constructor.name : "Error",
            message,
            stackTrace,
            retryCount: opts?.retryCount,
            wastedCostUsd: opts?.wastedCostUsd != null ? String(opts.wastedCostUsd) : undefined,
          },
        });
      },
    };

    let status: "success" | "failed" = "success";
    let result: T;

    try {
      // Execute within AsyncLocalStorage so downstream integrations (e.g. wrapOpenAI)
      // can automatically discover the active trace:
      result = await traceContextManager.run(context, () => fn(context));
    } catch (err) {
      status = "failed";
      context.error(err instanceof Error ? err : new Error(String(err)));
      throw err;
    } finally {
      const endedAt = new Date();
      const payload: TracePayload = {
        agentName,
        status,
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
        durationMs: endedAt.getTime() - startedAt.getTime(),
        tags: options?.tags,
        userId: options?.userId,
        steps,
      };

      this.transport.enqueue(payload);
    }

    return result!;
  }

  /**
   * Flush all buffered traces immediately to the ingestion API.
   */
  async flush(): Promise<void> {
    return this.transport.flush();
  }

  /**
   * Close the client, flush any remaining traces, and tear down timers.
   */
  async close(): Promise<void> {
    return this.transport.close();
  }
}
