import { AsyncLocalStorage } from "node:async_hooks";
import type { TraceContext } from "./types";

/**
 * AsyncLocalStorage container for ambient trace context.
 * Enables transparent tracking across nested asynchronous calls.
 */
class TraceContextManager {
  private storage: AsyncLocalStorage<TraceContext> | null = null;

  constructor() {
    try {
      this.storage = new AsyncLocalStorage<TraceContext>();
    } catch {
      // Graceful fallback for runtimes without AsyncLocalStorage
      this.storage = null;
    }
  }

  /**
   * Run a callback inside an active trace context.
   */
  run<T>(context: TraceContext, fn: () => Promise<T>): Promise<T> {
    if (this.storage) {
      return this.storage.run(context, fn);
    }
    return fn();
  }

  /**
   * Retrieve the current active trace context, if any.
   */
  getActiveContext(): TraceContext | null {
    if (this.storage) {
      return this.storage.getStore() ?? null;
    }
    return null;
  }
}

export const traceContextManager = new TraceContextManager();
