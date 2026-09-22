/**
 * AgentWatch SDK — Official TypeScript/JavaScript client
 *
 * Trace every AI call, debug failures, analyze token usage, and find where your AI budget is being wasted.
 */

export { AgentWatch } from "./client";
export { wrapOpenAI, type WrapOpenAIOptions } from "./integrations/openai";
export { wrapAnthropic, type WrapAnthropicOptions } from "./integrations/anthropic";
export { wrapGemini, type WrapGeminiOptions } from "./integrations/gemini";
export { Transport, type TransportOptions } from "./transport";
export { traceContextManager } from "./context";
export type {
  AgentWatchConfig,
  TraceContext,
  TraceOptions,
  LlmSpan,
  LlmSpanOptions,
  LlmSpanResult,
  ToolSpan,
  ToolSpanOptions,
  ToolSpanResult,
  ErrorOptions,
  TracePayload,
  StepPayload,
} from "./types";
