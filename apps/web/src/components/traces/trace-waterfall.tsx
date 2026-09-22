"use client";

import { useState } from "react";
import { formatCost, formatDuration } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Cpu,
  Wrench,
  AlertTriangle,
  Copy,
  Check,
  ChevronDown,
  ArrowDown,
  Clock,
  Coins,
  FileCode,
} from "lucide-react";

export interface SerializedStep {
  id: string;
  sequence: number;
  stepType: "llm" | "tool" | "error" | "custom";
  name: string | null;
  durationMs: number | null;
  startedAt: string;
  endedAt: string | null;
  llmCall?: {
    id: string;
    modelName: string;
    provider: string | null;
    inputTokens: number;
    outputTokens: number;
    estimatedCostUsd: string;
    temperature: string | null;
    requestJson: string | null;
    responseJson: string | null;
    durationMs: number | null;
  } | null;
  toolCall?: {
    id: string;
    toolName: string;
    status: "success" | "failed" | "timeout";
    argumentsJson: string | null;
    resultJson: string | null;
    durationMs: number | null;
  } | null;
  error?: {
    id: string;
    errorType: string;
    message: string;
    stackTrace: string | null;
    retryCount: number;
    wastedCostUsd: string;
  } | null;
}

interface Props {
  steps: SerializedStep[];
}

function CodeBlock({ title, content }: { title: string; content: string | null | undefined }) {
  const [copied, setCopied] = useState(false);

  if (!content) {
    return (
      <div className="space-y-1.5">
        <span className="text-xs font-semibold text-muted-foreground">{title}</span>
        <div className="rounded-md border bg-muted/40 p-3 text-xs italic text-muted-foreground">
          No data recorded
        </div>
      </div>
    );
  }

  // Attempt to pretty-print if valid JSON
  let formatted = content;
  try {
    const parsed = JSON.parse(content);
    formatted = JSON.stringify(parsed, null, 2);
  } catch {
    // Keep as string
  }

  const copy = () => {
    navigator.clipboard.writeText(formatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">{title}</span>
        <Button variant="ghost" size="sm" onClick={copy} className="h-7 px-2 text-xs">
          {copied ? (
            <>
              <Check className="mr-1 h-3.5 w-3.5 text-green-500" /> Copied
            </>
          ) : (
            <>
              <Copy className="mr-1 h-3.5 w-3.5" /> Copy
            </>
          )}
        </Button>
      </div>
      <pre className="max-h-64 overflow-x-auto rounded-md border bg-muted/40 p-3 font-mono text-xs text-foreground">
        {formatted}
      </pre>
    </div>
  );
}

export function TraceWaterfall({ steps }: Props) {
  const [selectedStepId, setSelectedStepId] = useState<string>(
    steps[0]?.id ?? ""
  );

  if (steps.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        No step events were captured on this trace.
      </div>
    );
  }

  const selectedStep = steps.find((s) => s.id === selectedStepId) || steps[0]!;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Waterfall Sequence (Left 7 cols) */}
      <div className="space-y-3 lg:col-span-7">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Execution Waterfall ({steps.length} steps)
        </h2>

        <div className="space-y-2">
          {steps.map((step, idx) => {
            const isSelected = step.id === selectedStep?.id;
            const isLlm = step.stepType === "llm";
            const isTool = step.stepType === "tool";
            const isError = step.stepType === "error" || Boolean(step.error);

            // Labels
            let title = step.name ?? "Step";
            if (isLlm && step.llmCall) {
              title = `LLM: ${step.llmCall.modelName}`;
            } else if (isTool && step.toolCall) {
              title = `Tool: ${step.toolCall.toolName}`;
            } else if (isError && step.error) {
              title = `Error: ${step.error.errorType}`;
            }

            return (
              <div key={step.id} className="space-y-2">
                <div
                  onClick={() => setSelectedStepId(step.id)}
                  className={`flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary"
                      : "bg-card hover:border-muted-foreground/30 hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Icon */}
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-md ${
                        isError
                          ? "bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400"
                          : isLlm
                          ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400"
                          : "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400"
                      }`}
                    >
                      {isError ? (
                        <AlertTriangle className="h-4 w-4" />
                      ) : isLlm ? (
                        <Cpu className="h-4 w-4" />
                      ) : (
                        <Wrench className="h-4 w-4" />
                      )}
                    </div>

                    <div>
                      <p className="font-mono text-sm font-semibold text-foreground">
                        {title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Step #{step.sequence} · {formatDuration(step.durationMs)}
                      </p>
                    </div>
                  </div>

                  {/* Metrics Badges */}
                  <div className="flex items-center gap-2">
                    {isLlm && step.llmCall && (
                      <>
                        <Badge variant="outline" className="font-mono text-xs">
                          {(step.llmCall.inputTokens + step.llmCall.outputTokens).toLocaleString()} tok
                        </Badge>
                        <Badge variant="secondary" className="font-mono text-xs font-semibold text-primary">
                          {formatCost(step.llmCall.estimatedCostUsd)}
                        </Badge>
                      </>
                    )}

                    {isTool && step.toolCall && (
                      <Badge
                        variant={step.toolCall.status === "success" ? "success" : "destructive"}
                        className="text-xs font-mono"
                      >
                        {step.toolCall.status.toUpperCase()}
                      </Badge>
                    )}

                    {isError && step.error && (
                      <Badge variant="destructive" className="text-xs font-mono">
                        FAILED
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Down Arrow connector between steps */}
                {idx < steps.length - 1 && (
                  <div className="flex justify-center py-0.5">
                    <ArrowDown className="h-3.5 w-3.5 text-muted-foreground/40" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Inspector Detail Drawer (Right 5 cols) */}
      <div className="lg:col-span-5">
        <div className="sticky top-6">
          <Card>
            <CardHeader className="border-b pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Step Details</CardTitle>
                <Badge variant="outline" className="font-mono text-xs">
                  Step #{selectedStep.sequence}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {/* LLM Call Inspector */}
              {selectedStep.llmCall && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 rounded-md bg-muted/40 p-3 text-xs">
                    <div>
                      <span className="text-muted-foreground">Model:</span>
                      <p className="font-mono font-semibold">{selectedStep.llmCall.modelName}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Estimated Cost:</span>
                      <p className="font-mono font-semibold text-primary">
                        {formatCost(selectedStep.llmCall.estimatedCostUsd)}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Tokens (In / Out):</span>
                      <p className="font-mono font-semibold">
                        {selectedStep.llmCall.inputTokens.toLocaleString()} /{" "}
                        {selectedStep.llmCall.outputTokens.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Duration:</span>
                      <p className="font-mono font-semibold">
                        {formatDuration(selectedStep.durationMs)}
                      </p>
                    </div>
                    {selectedStep.llmCall.temperature != null && (
                      <div>
                        <span className="text-muted-foreground">Temperature:</span>
                        <p className="font-mono font-semibold">{selectedStep.llmCall.temperature}</p>
                      </div>
                    )}
                  </div>

                  <CodeBlock title="Request / Prompt" content={selectedStep.llmCall.requestJson} />
                  <CodeBlock title="Response" content={selectedStep.llmCall.responseJson} />
                </div>
              )}

              {/* Tool Call Inspector */}
              {selectedStep.toolCall && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 rounded-md bg-muted/40 p-3 text-xs">
                    <div>
                      <span className="text-muted-foreground">Tool:</span>
                      <p className="font-mono font-semibold">{selectedStep.toolCall.toolName}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <p className="font-mono font-semibold capitalize">
                        {selectedStep.toolCall.status}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Duration:</span>
                      <p className="font-mono font-semibold">
                        {formatDuration(selectedStep.durationMs)}
                      </p>
                    </div>
                  </div>

                  <CodeBlock title="Arguments" content={selectedStep.toolCall.argumentsJson} />
                  <CodeBlock title="Result" content={selectedStep.toolCall.resultJson} />
                </div>
              )}

              {/* Error Call Inspector */}
              {selectedStep.error && (
                <div className="space-y-4">
                  <div className="rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/50">
                    <p className="text-xs font-bold text-red-800 dark:text-red-300">
                      {selectedStep.error.errorType}
                    </p>
                    <p className="mt-1 text-xs text-red-700 dark:text-red-400">
                      {selectedStep.error.message}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 rounded-md bg-muted/40 p-3 text-xs">
                    <div>
                      <span className="text-muted-foreground">Retries:</span>
                      <p className="font-mono font-semibold">{selectedStep.error.retryCount}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Wasted Cost:</span>
                      <p className="font-mono font-semibold text-rose-600">
                        {formatCost(selectedStep.error.wastedCostUsd)}
                      </p>
                    </div>
                  </div>

                  {selectedStep.error.stackTrace && (
                    <CodeBlock title="Stack Trace" content={selectedStep.error.stackTrace} />
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
