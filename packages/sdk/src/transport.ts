import type { TracePayload, StepPayload } from "./types";

export interface TransportOptions {
  apiKey: string;
  baseUrl: string;
  debug?: boolean;
  dryRun?: boolean;
  maxBatchSize?: number;
  flushIntervalMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  fetch?: typeof fetch;
}

const MAX_STRING_LENGTH = 32_000; // Truncate oversized JSON payloads to 32KB max per field

/**
 * Truncates very large strings to protect network bandwidth and ingestion limits.
 */
function truncateString(str: string | undefined): string | undefined {
  if (!str) return str;
  if (str.length <= MAX_STRING_LENGTH) return str;
  return str.slice(0, MAX_STRING_LENGTH) + "... [truncated by AgentWatch SDK]";
}

/**
 * Sanitizes and caps step payloads before serialization.
 */
function sanitizeStep(step: StepPayload): StepPayload {
  const sanitized = { ...step };

  if (sanitized.llmCall) {
    sanitized.llmCall = {
      ...sanitized.llmCall,
      requestJson: truncateString(sanitized.llmCall.requestJson),
      responseJson: truncateString(sanitized.llmCall.responseJson),
    };
  }

  if (sanitized.toolCall) {
    sanitized.toolCall = {
      ...sanitized.toolCall,
      argumentsJson: truncateString(sanitized.toolCall.argumentsJson),
      resultJson: truncateString(sanitized.toolCall.resultJson),
    };
  }

  if (sanitized.error) {
    sanitized.error = {
      ...sanitized.error,
      stackTrace: truncateString(sanitized.error.stackTrace),
    };
  }

  return sanitized;
}

export class Transport {
  private readonly options: Required<TransportOptions>;
  private queue: TracePayload[] = [];
  private timer: NodeJS.Timeout | null = null;
  private isFlushing = false;
  private isClosed = false;
  private readonly customFetch: typeof fetch;

  constructor(options: TransportOptions) {
    this.customFetch = options.fetch ?? (globalThis.fetch ? globalThis.fetch.bind(globalThis) : (fetch as any));
    this.options = {
      apiKey: options.apiKey,
      baseUrl: options.baseUrl.replace(/\/$/, ""),
      debug: options.debug ?? false,
      dryRun: options.dryRun ?? false,
      maxBatchSize: options.maxBatchSize ?? 10,
      flushIntervalMs: options.flushIntervalMs ?? 1000,
      maxRetries: options.maxRetries ?? 3,
      retryDelayMs: options.retryDelayMs ?? 500,
      fetch: this.customFetch,
    };

    this.startTimer();
  }

  private startTimer(): void {
    if (this.options.dryRun || this.timer) return;
    this.timer = setInterval(() => {
      this.flush().catch((err) => {
        if (this.options.debug) {
          console.error("[AgentWatch Transport] Scheduled flush error:", err);
        }
      });
    }, this.options.flushIntervalMs);

    // Don't keep Node event loop alive for timer if no other work exists
    if (this.timer && typeof this.timer.unref === "function") {
      this.timer.unref();
    }
  }

  /**
   * Enqueue a trace to be sent asynchronously.
   */
  enqueue(payload: TracePayload): void {
    if (this.isClosed) {
      if (this.options.debug) {
        console.warn("[AgentWatch Transport] Transport is closed, dropping trace:", payload.agentName);
      }
      return;
    }

    const sanitizedPayload: TracePayload = {
      ...payload,
      steps: payload.steps.map(sanitizeStep),
    };

    if (this.options.dryRun) {
      if (this.options.debug) {
        console.log("[AgentWatch Transport] Dry run — trace recorded:", JSON.stringify(sanitizedPayload, null, 2));
      }
      return;
    }

    this.queue.push(sanitizedPayload);

    if (this.queue.length >= this.options.maxBatchSize) {
      this.flush().catch((err) => {
        if (this.options.debug) {
          console.error("[AgentWatch Transport] Batch flush error:", err);
        }
      });
    }
  }

  /**
   * Immediately flush all queued traces.
   */
  async flush(): Promise<void> {
    if (this.isFlushing || this.queue.length === 0 || this.options.dryRun) {
      return;
    }

    this.isFlushing = true;
    const batch = this.queue.splice(0, this.options.maxBatchSize);

    try {
      await Promise.all(batch.map((trace) => this.sendWithRetry(trace)));
    } finally {
      this.isFlushing = false;
      // If items accumulated while flushing, schedule another flush
      if (this.queue.length > 0) {
        void this.flush();
      }
    }
  }

  /**
   * Send a single trace with exponential backoff retries.
   */
  private async sendWithRetry(payload: TracePayload, attempt = 1): Promise<void> {
    const url = `${this.options.baseUrl}/api/v1/ingest`;

    try {
      const res = await this.customFetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.options.apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.status >= 200 && res.status < 300) {
        if (this.options.debug) {
          console.log(`[AgentWatch Transport] Trace sent successfully (${payload.agentName})`);
        }
        return;
      }

      // Do not retry 4xx errors (client errors: invalid API key, validation failure, payload too large)
      if (res.status >= 400 && res.status < 500) {
        if (this.options.debug) {
          const errText = await res.text().catch(() => "");
          console.error(`[AgentWatch Transport] Ingestion rejected (${res.status}): ${errText}`);
        }
        return;
      }

      // 5xx Server error — eligible for retry
      throw new Error(`Ingest API returned HTTP ${res.status}`);
    } catch (err) {
      if (attempt < this.options.maxRetries) {
        const delay = this.options.retryDelayMs * Math.pow(2, attempt - 1);
        if (this.options.debug) {
          console.warn(`[AgentWatch Transport] Attempt ${attempt} failed, retrying in ${delay}ms...`, err);
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.sendWithRetry(payload, attempt + 1);
      } else {
        if (this.options.debug) {
          console.error(`[AgentWatch Transport] Failed to send trace after ${attempt} attempts:`, err);
        }
      }
    }
  }

  /**
   * Close the transport and ensure all pending traces are flushed.
   */
  async close(): Promise<void> {
    this.isClosed = true;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    await this.flush();
  }
}
