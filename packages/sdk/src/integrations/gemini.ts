import { traceContextManager } from "../context";
import type { TokenGuard } from "../client";
import type { TraceContext } from "../types";

export interface WrapGeminiOptions {
  /** Optional TokenGuard instance to use for auto-tracing outside of trace() blocks */
  tokenGuard?: TokenGuard;
  /** Optional explicit trace to attach calls to */
  trace?: TraceContext;
  /** Default agent name when an LLM call occurs outside of any trace() block */
  fallbackAgentName?: string;
  /** Model name override — Gemini SDK doesn't always expose the model name on the client object */
  modelName?: string;
}

/**
 * Wraps a Gemini GenerativeModel instance to automatically record all generateContent() and
 * generateContentStream() calls into TokenGuard traces, capturing model, tokens from
 * usageMetadata, latency, and errors.
 *
 * @param model - The GenerativeModel instance (from `genai.getGenerativeModel()`)
 * @param options - Optional configuration
 *
 * @example
 * ```typescript
 * import { GoogleGenerativeAI } from "@google/generative-ai";
 * import { TokenGuard, wrapGemini } from "@tokenguard/sdk";
 *
 * const aw = new TokenGuard({ apiKey: process.env.TOKENGUARD_API_KEY! });
 * const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
 * const model = wrapGemini(
 *   genai.getGenerativeModel({ model: "gemini-1.5-pro" }),
 *   { tokenGuard: aw, modelName: "gemini-1.5-pro" }
 * );
 *
 * await aw.trace("gemini-agent", async () => {
 *   const result = await model.generateContent("Explain quantum computing.");
 * });
 * ```
 */
export function wrapGemini<T extends object>(
  model: T,
  options: WrapGeminiOptions = {}
): T {
  const handler: ProxyHandler<any> = {
    get(target, prop, receiver) {
      if (prop === "generateContent" || prop === "generateContentStream") {
        const originalFn = Reflect.get(target, prop, receiver);
        const isStream = prop === "generateContentStream";

        return async function (this: any, ...args: any[]) {
          // Determine current active trace: explicit option > ambient AsyncLocalStorage context
          const activeContext =
            options.trace ?? traceContextManager.getActiveContext();

          // Resolve model name: explicit option > SDK property > fallback
          const modelName =
            options.modelName ??
            (target as any)?.model ??
            "gemini-unknown";

          const recordSpan = async (trace: TraceContext) => {
            const llmSpan = trace.llm({
              model: modelName,
              provider: "google",
              request: args[0],
            });

            try {
              const result = await originalFn.apply(this, args);

              // Non-streaming: result.response.usageMetadata contains token counts.
              // Streaming responses don't have upfront usage, so we record 0.
              const usage = !isStream
                ? result?.response?.usageMetadata
                : undefined;

              llmSpan.end({
                inputTokens: usage?.promptTokenCount ?? 0,
                outputTokens: usage?.candidatesTokenCount ?? 0,
                response: !isStream ? result?.response?.text?.() : "[streaming]",
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
            const agentName = options.fallbackAgentName ?? "gemini-agent";
            return options.tokenGuard.trace(agentName, (trace) =>
              recordSpan.call(this, trace)
            );
          }

          // Fallback: invoke unmodified if no trace and no TokenGuard instance
          return originalFn.apply(this, args);
        };
      }
      return Reflect.get(target, prop, receiver);
    },
  };

  return new Proxy(model, handler);
}
