"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Copy, Check, ArrowRight, Terminal, Package, KeyRound, GitBranch, DollarSign, Sparkles, Compass } from "lucide-react";

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

  const curlSnippet = `curl -X POST https://tokenguard.dev/api/v1/ingest \\
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

  const sdkSnippet = `import { TokenGuard } from "@tokenguard/sdk";
import OpenAI from "openai";

const aw = new TokenGuard({ apiKey: "${apiKey || "YOUR_API_KEY"}" });
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
          <h1 className="text-2xl font-bold">Welcome to TokenGuard</h1>
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
                  {apiKey || "tg_live_..."}
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
                  <code className="rounded bg-muted px-1">npm install @tokenguard/sdk</code>
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
          <Card className="border-border shadow-sm">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Compass className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl">🎉 You&apos;re All Set!</CardTitle>
              <CardDescription>
                Project <strong>{projectName}</strong> is created. Here is how to navigate your new dashboard:
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              {/* Dashboard Guidance Grid */}
              <div className="space-y-2.5">
                <div className="flex items-start gap-3 rounded-lg border bg-card p-3 shadow-xs">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary mt-0.5">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-foreground">
                      1. Settings → API Keys & SDKs
                    </div>
                    <div className="text-[11px] text-muted-foreground leading-relaxed">
                      Generate keys anytime, view your active key prefixes, and copy complete setup code for OpenAI, Anthropic, Gemini, Python, and cURL.
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-lg border bg-card p-3 shadow-xs">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-500/10 text-blue-500 mt-0.5">
                    <GitBranch className="h-4 w-4" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-foreground">
                      2. Follow Incoming Traces
                    </div>
                    <div className="text-[11px] text-muted-foreground leading-relaxed">
                      Click the <strong>Traces</strong> tab to watch agent executions live. Click any trace to inspect prompts, responses, duration, and token counts.
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-lg border bg-card p-3 shadow-xs">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-500 mt-0.5">
                    <DollarSign className="h-4 w-4" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-foreground">
                      3. Cost Analytics & Alerts
                    </div>
                    <div className="text-[11px] text-muted-foreground leading-relaxed">
                      Analyze which models cost the most and set up automated budget alerts via Slack, Email, or Webhooks.
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-lg border bg-card p-3 shadow-xs">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-purple-500/10 text-purple-500 mt-0.5">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-foreground">
                      4. Monitor Quotas & Plans
                    </div>
                    <div className="text-[11px] text-muted-foreground leading-relaxed">
                      Look at the bottom-left corner of your sidebar to check your monthly quota and upgrade your plan anytime.
                    </div>
                  </div>
                </div>
              </div>

              <Button
                className="w-full mt-2"
                onClick={() => {
                  router.push("/dashboard");
                  router.refresh();
                }}
              >
                Enter Dashboard <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
