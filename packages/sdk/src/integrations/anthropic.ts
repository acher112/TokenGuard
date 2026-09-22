import { traceContextManager } from "../context";
import type { TokenGuard } from "../client";
import type { TraceContext } from "../types";

export interface WrapAnthropicOptions {
  /** Optional TokenGuard instance to use for auto-tracing outside of trace() blocks */
  tokenGuard?: TokenGuard;
  /** Optional explicit trace to attach calls to */
  trace?: TraceContext;
  /** Default agent name when an LLM call occurs outside of any trace() block */
  fallbackAgentName?: string;
}

/**
 * Wraps an Anthropic client instance to automatically record all messages.create() calls
 * into TokenGuard traces, capturing model, tokens, latency, and errors.
 *
 * @param anthropic - The Anthropic client instance
 * @param options - Optional configuration
 *
 * @example
 * ```typescript
 * import Anthropic from "@anthropic-ai/sdk";
 * import { TokenGuard, wrapAnthropic } from "@tokenguard/sdk";
 *
 * const aw = new TokenGuard({ apiKey: process.env.TOKENGUARD_API_KEY! });
 * const anthropic = wrapAnthropic(new Anthropic(), { tokenGuard: aw });
 *
 * await aw.trace("claude-agent", async () => {
 *   const msg = await anthropic.messages.create({
 *     model: "claude-3-5-sonnet-20241022",
 *     max_tokens: 1024,
 *     messages: [{ role: "user", content: "Hello!" }],
 *   });
 * });
 * ```
 */
export function wrapAnthropic<T extends object>(
  anthropic: T,
  options: WrapAnthropicOptions = {}
): T {
  const handler: ProxyHandler<any> = {
    get(target, prop, receiver) {
      if (prop === "messages") {
        const messages = Reflect.get(target, prop, receiver);
        return new Proxy(messages, {
          get(msgTarget, msgProp, msgReceiver) {
            if (msgProp === "create") {
              const originalCreate = Reflect.get(msgTarget, msgProp, msgReceiver);
              return async function (this: any, params: any, ...args: any[]) {
                // Determine current active trace: explicit option > ambient AsyncLocalStorage context
                const activeContext =
                  options.trace ?? traceContextManager.getActiveContext();

                const recordSpan = async (trace: TraceContext) => {
                  const llmSpan = trace.llm({
                    model: params?.model ?? "unknown-anthropic",
                    provider: "anthropic",
                    temperature: params?.temperature,
                    request: params?.messages,
                  });

                  try {
                    const result = await originalCreate.apply(this, [params, ...args]);

                    // Anthropic usage shape: { input_tokens, output_tokens }
                    const usage = result?.usage;
                    llmSpan.end({
                      inputTokens: usage?.input_tokens ?? 0,
                      outputTokens: usage?.output_tokens ?? 0,
                      response: result?.content,
                    });

                    return result;
                  } catch (err: any) {
                    llmSpan.fail(err);
                    throw err;
                  }
                };

                if (activeContext) {
                  // Already inside a trace block — attach span directly
                  return recordSpan.call(this, activeContext);
                }

                if (options.tokenGuard) {
                  // Outside any trace: auto-wrap this standalone call in its own trace
                  const agentName = options.fallbackAgentName ?? "anthropic-agent";
                  return options.tokenGuard.trace(agentName, (trace) =>
                    recordSpan.call(this, trace)
                  );
                }

                // Fallback: invoke unmodified if no trace and no TokenGuard instance
                return originalCreate.apply(this, [params, ...args]);
              };
            }
            return Reflect.get(msgTarget, msgProp, msgReceiver);
          },
        });
      }
      return Reflect.get(target, prop, receiver);
    },
  };

  return new Proxy(anthropic, handler);
}
