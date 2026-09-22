"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Copy, Check, ArrowRight, Terminal, Package } from "lucide-react";

type Step = 1 | 2 | 3 | 4;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [projectName, setProjectName] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [copied, setCopied] = useState(false);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const res = await fetch("/api/v1/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: projectName }),
    });

    const data = await res.json() as { error?: string; apiKey?: string };

    if (!res.ok) {
      setError(data.error ?? "Failed to create project.");
      setIsLoading(false);
      return;
    }

    // Store the API key from project creation response
    if (data.apiKey) {
      setApiKey(data.apiKey);
    }
    setIsLoading(false);
    setStep(2);
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const curlSnippet = `curl -X POST https://agentwatch.dev/api/v1/ingest \\
  -H "Authorization: Bearer ${apiKey || "YOUR_API_KEY"}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agentName": "my-first-agent",
    "status": "success",
    "startedAt": "2024-01-01T00:00:00Z",
    "endedAt": "2024-01-01T00:00:02Z",
    "durationMs": 2000,
    "steps": [{
      "stepType": "llm",
      "sequence": 1,
      "startedAt": "2024-01-01T00:00:00Z",
      "endedAt": "2024-01-01T00:00:02Z",
      "durationMs": 2000,
      "llmCall": {
        "modelName": "gpt-4o",
        "inputTokens": 500,
        "outputTokens": 150
      }
    }]
  }'`;

  const sdkSnippet = `import { AgentWatch } from "@agentwatch/sdk";
import OpenAI from "openai";

const aw = new AgentWatch({ apiKey: "${apiKey || "YOUR_API_KEY"}" });
const openai = aw.wrapOpenAI(new OpenAI());

const result = await aw.trace("my-agent", async (trace) => {
  const res = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: "Hello!" }],
  });
  return res.choices[0].message.content;
});`;

  const steps = [
    { number: 1, label: "Create project" },
    { number: 2, label: "Get API key" },
    { number: 3, label: "Instrument" },
    { number: 4, label: "Done" },
  ];

  return (
    <div className="flex min-h-screen items-start justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-xl space-y-6">
        {/* Header */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Welcome to AgentWatch</h1>
          <p className="text-center text-muted-foreground">Set up your monitoring in 4 steps.</p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2">
          {steps.map((s, i) => (
            <div key={s.number} className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  step > s.number
                    ? "bg-primary text-primary-foreground"
                    : step === s.number
                    ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step > s.number ? <Check className="h-3.5 w-3.5" /> : s.number}
              </div>
              <span
                className={`text-xs hidden sm:block ${
                  step === s.number ? "font-medium" : "text-muted-foreground"
                }`}
              >
                {s.label}
              </span>
              {i < steps.length - 1 && (
                <div className={`h-px w-8 ${step > s.number ? "bg-primary" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Create Project */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Create your first project</CardTitle>
              <CardDescription>
                Each project has its own API keys, traces, and analytics.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateProject} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="project-name">Project name</Label>
                  <Input
                    id="project-name"
                    type="text"
                    placeholder="e.g. My AI App, Customer Support Bot"
                    required
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || !projectName.trim()}
                >
                  {isLoading ? "Creating..." : "Create project"}
                  {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Step 2: API Key */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Your API Key</CardTitle>
              <CardDescription>
                Copy this now — it&apos;s only shown once. You&apos;ll need it to send traces.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 rounded-md border bg-muted p-3">
                <code className="flex-1 break-all font-mono text-sm">
                  {apiKey || "aw_live_..."}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0"
                  onClick={() => copyToClipboard(apiKey)}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-900 dark:bg-yellow-950/30 dark:text-yellow-200">
                ⚠️ Store this key securely. It will not be shown again.
              </div>
              <Button className="w-full" onClick={() => setStep(3)}>
                I&apos;ve saved my key <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Send first trace */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Send your first trace</CardTitle>
              <CardDescription>Choose how to instrument your AI agent:</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* SDK option */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  <span className="text-sm font-medium">Option A — TypeScript SDK</span>
                  <Badge variant="secondary" className="text-xs">
                    Recommended
                  </Badge>
                </div>
                <div className="relative rounded-md bg-muted p-3">
                  <pre className="overflow-x-auto whitespace-pre font-mono text-xs">
                    {sdkSnippet}
                  </pre>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-2 h-7 w-7"
                    onClick={() => copyToClipboard(sdkSnippet)}
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Install:{" "}
                  <code className="rounded bg-muted px-1">npm install @agentwatch/sdk</code>
                </p>
              </div>

              <div className="relative flex items-center">
                <div className="flex-1 border-t" />
                <span className="mx-3 text-xs text-muted-foreground">or</span>
                <div className="flex-1 border-t" />
              </div>

              {/* cURL option */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4" />
                  <span className="text-sm font-medium">Option B — Quick test with cURL</span>
                </div>
                <div className="relative rounded-md bg-muted p-3">
                  <pre className="overflow-x-auto whitespace-pre font-mono text-xs">
                    {curlSnippet}
                  </pre>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-2 h-7 w-7"
                    onClick={() => copyToClipboard(curlSnippet)}
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>

              <Button className="w-full" onClick={() => setStep(4)}>
                I&apos;ve sent a trace <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Done */}
        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>🎉 You&apos;re all set!</CardTitle>
              <CardDescription>
                Your project <strong>{projectName}</strong> is ready. Head to your dashboard to
                see incoming traces.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border p-3">
                  <div className="font-medium">Traces</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    Every agent run captured
                  </div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="font-medium">Cost Analytics</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">Token usage + spend</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="font-medium">Error Tracking</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">Detect failures fast</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="font-medium">Alerts</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    Slack, Email, Webhook
                  </div>
                </div>
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  router.push("/dashboard");
                  router.refresh();
                }}
              >
                Go to dashboard <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
