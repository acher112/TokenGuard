import { traceContextManager } from "../context";
import type { AgentWatch } from "../client";
import type { TraceContext } from "../types";

export interface WrapOpenAIOptions {
  /** Optional AgentWatch instance to use for auto-tracing */
  agentWatch?: AgentWatch;

  /** Optional explicit trace to attach calls to */
  trace?: TraceContext;

  /** Default agent name when an LLM call occurs outside of any trace() block */
  fallbackAgentName?: string;
}

/**
 * Wraps an OpenAI client instance to automatically record all chat completions
 * into AgentWatch traces, capturing model, tokens, latency, temperature, and errors.
 *
 * @param openai - The OpenAI client instance (or compatible mock)
 * @param options - Optional configuration
 *
 * @example
 * ```typescript
 * import OpenAI from "openai";
 * import { AgentWatch, wrapOpenAI } from "@agentwatch/sdk";
 *
 * const aw = new AgentWatch({ apiKey: process.env.AGENTWATCH_API_KEY! });
 * const openai = wrapOpenAI(new OpenAI(), { agentWatch: aw });
 *
 * // Automatically recorded under "customer-agent" trace:
 * await aw.trace("customer-agent", async () => {
 *   const res = await openai.chat.completions.create({
 *     model: "gpt-4o",
 *     messages: [{ role: "user", content: "Hello!" }],
 *   });
 * });
 * ```
 */
export function wrapOpenAI<T extends object>(
  openai: T,
  options: WrapOpenAIOptions = {}
): T {
  const handler: ProxyHandler<any> = {
    get(target, prop, receiver) {
      if (prop === "chat") {
        const chat = Reflect.get(target, prop, receiver);
        return new Proxy(chat, {
          get(chatTarget, chatProp, chatReceiver) {
            if (chatProp === "completions") {
              const completions = Reflect.get(chatTarget, chatProp, chatReceiver);
              return new Proxy(completions, {
                get(compTarget, compProp, compReceiver) {
                  if (compProp === "create") {
                    const originalCreate = Reflect.get(compTarget, compProp, compReceiver);
                    return async function (this: any, params: any, ...args: any[]) {
                      // Determine current active trace: explicit option > ambient context
                      const activeContext =
                        options.trace ?? traceContextManager.getActiveContext();

                      if (activeContext) {
                        // We are already inside a trace: record an LLM span
                        const llmSpan = activeContext.llm({
                          model: params?.model ?? "unknown-openai",
                          provider: "openai",
                          temperature: params?.temperature,
                          request: params?.messages,
                        });

                        try {
                          const result = await originalCreate.apply(this, [params, ...args]);

                          // Capture non-streaming response usage
                          if (result && typeof result === "object" && "usage" in result) {
                            llmSpan.end({
                              inputTokens: result.usage?.prompt_tokens ?? 0,
                              outputTokens: result.usage?.completion_tokens ?? 0,
                              response: result.choices?.[0]?.message,
                            });
                          } else {
                            // Streaming or custom response without explicit usage
                            llmSpan.end({
                              inputTokens: 0,
                              outputTokens: 0,
                              response: result,
                            });
                          }

                          return result;
                        } catch (err: any) {
                          llmSpan.fail(err);
                          throw err;
                        }
                      }

                      // If outside of an active trace and an agentWatch instance was provided,
                      // automatically wrap this standalone call in its own trace:
                      if (options.agentWatch) {
                        const agentName = options.fallbackAgentName ?? "openai-chat";
                        return options.agentWatch.trace(agentName, async (trace) => {
                          const llmSpan = trace.llm({
                            model: params?.model ?? "unknown-openai",
                            provider: "openai",
                            temperature: params?.temperature,
                            request: params?.messages,
                          });

                          try {
                            const result = await originalCreate.apply(this, [params, ...args]);
                            if (result && typeof result === "object" && "usage" in result) {
                              llmSpan.end({
                                inputTokens: result.usage?.prompt_tokens ?? 0,
                                outputTokens: result.usage?.completion_tokens ?? 0,
                                response: result.choices?.[0]?.message,
                              });
                            } else {
                              llmSpan.end({
                                inputTokens: 0,
                                outputTokens: 0,
                                response: result,
                              });
                            }
                            return result;
                          } catch (err: any) {
                            llmSpan.fail(err);
                            throw err;
                          }
                        });
                      }

                      // Fallback: invoke unmodified if no trace and no AgentWatch instance
                      return originalCreate.apply(this, [params, ...args]);
                    };
                  }
                  return Reflect.get(compTarget, compProp, compReceiver);
                },
              });
            }
            return Reflect.get(chatTarget, chatProp, chatReceiver);
          },
        });
      }
      return Reflect.get(target, prop, receiver);
    },
  };

  return new Proxy(openai, handler);
}
