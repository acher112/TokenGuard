"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Zap,
  ArrowRight,
  Check,
  Cpu,
  DollarSign,
  AlertTriangle,
  Activity,
  Layers,
  Sparkles,
  Compass,
  KeyRound,
  Bot,
  Terminal,
} from "lucide-react";

type Step = 1 | 2 | 3 | 4;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [projectName, setProjectName] = useState("");
  const [selectedStack, setSelectedStack] = useState<string>("openai");
  const [selectedGoal, setSelectedGoal] = useState<string>("cost");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/v1/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: projectName }),
      });

      const data = (await res.json()) as { error?: string; apiKey?: string };

      if (!res.ok) {
        setError(data.error ?? "Failed to create project.");
        setIsLoading(false);
        return;
      }

      setIsLoading(false);
      setStep(2);
    } catch {
      setError("Network error. Please try again.");
      setIsLoading(false);
    }
  };

  const stackOptions = [
    { id: "openai", label: "OpenAI", desc: "GPT-4o, o1, mini", icon: "🟢" },
    { id: "anthropic", label: "Anthropic Claude", desc: "Sonnet 3.5, Opus", icon: "🟣" },
    { id: "gemini", label: "Google Gemini", desc: "1.5 Pro, Flash", icon: "🔵" },
    { id: "langchain", label: "LangChain / Agents", desc: "Multi-agent workflows", icon: "🟠" },
    { id: "python", label: "Python SDK", desc: "FastAPI, CrewAI, AutoGen", icon: "🐍" },
    { id: "custom", label: "Direct REST / cURL", desc: "Any backend language", icon: "⚡" },
  ];

  const goalOptions = [
    {
      id: "cost",
      title: "Reduce AI Spend & Waste",
      desc: "Detect expensive token leaks, redundant prompt tokens, and retry loops automatically.",
      icon: DollarSign,
      color: "text-emerald-500 bg-emerald-500/10",
    },
    {
      id: "errors",
      title: "Debug Agent Errors & Retries",
      desc: "Instantly pinpoint tool failures, model rate limits, and timeout crashes.",
      icon: AlertTriangle,
      color: "text-rose-500 bg-rose-500/10",
    },
    {
      id: "latency",
      title: "Trace Latency & Execution Waterfall",
      desc: "Visualize multi-step agent executions and tool call durations step by step.",
      icon: Activity,
      color: "text-blue-500 bg-blue-500/10",
    },
    {
      id: "governance",
      title: "Budget Enforcement & Alerts",
      desc: "Set real-time alerts via Slack, Email, or Webhooks before budget overruns occur.",
      icon: Layers,
      color: "text-purple-500 bg-purple-500/10",
    },
  ];

  const steps = [
    { number: 1, label: "Project Name" },
    { number: 2, label: "AI Stack" },
    { number: 3, label: "Goals" },
    { number: 4, label: "Ready" },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-8 sm:py-12">
      <div className="w-full max-w-xl space-y-6">
        {/* Header */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Zap className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome to TokenGuard</h1>
          <p className="text-sm text-muted-foreground">
            Get your AI observability workspace ready in 3 simple steps.
          </p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 sm:gap-3">
          {steps.map((s, i) => (
            <div key={s.number} className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
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
                  step === s.number ? "font-semibold text-foreground" : "text-muted-foreground"
                }`}
              >
                {s.label}
              </span>
              {i < steps.length - 1 && (
                <div
                  className={`h-px w-6 sm:w-10 ${
                    step > s.number ? "bg-primary" : "bg-border"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* ─── Step 1: Create Project ────────────────────────────────────── */}
        {step === 1 && (
          <Card className="border-border shadow-xs">
            <CardHeader>
              <CardTitle className="text-lg">Name your AI project</CardTitle>
              <CardDescription>
                Each project organizes its own API keys, traces, and cost analytics.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateProject} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="project-name">Project Name</Label>
                  <Input
                    id="project-name"
                    type="text"
                    placeholder="e.g. Customer Support Agent, Coding Copilot"
                    required
                    autoFocus
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                  />
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-[11px] text-muted-foreground mr-1">Suggestions:</span>
                    {["Support Agent", "Chatbot API", "Research Assistant"].map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => setProjectName(sug)}
                        className="text-[11px] bg-muted hover:bg-accent px-2 py-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                </div>

                {error && <p className="text-xs text-destructive">{error}</p>}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || !projectName.trim()}
                >
                  {isLoading ? "Setting up..." : "Continue"}
                  {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* ─── Step 2: Choose AI Stack ──────────────────────────────────── */}
        {step === 2 && (
          <Card className="border-border shadow-xs">
            <CardHeader>
              <CardTitle className="text-lg">What AI stack do you use?</CardTitle>
              <CardDescription>
                We will highlight the matching SDK guides and wrapper snippets for you.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2.5">
                {stackOptions.map((opt) => {
                  const isSelected = selectedStack === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedStack(opt.id)}
                      className={`flex flex-col items-start p-3 rounded-lg border text-left transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <span className="text-lg mb-1">{opt.icon}</span>
                      <span className="text-xs font-semibold text-foreground">{opt.label}</span>
                      <span className="text-[11px] text-muted-foreground mt-0.5 truncate w-full">
                        {opt.desc}
                      </span>
                    </button>
                  );
                })}
              </div>

              <Button className="w-full mt-2" onClick={() => setStep(3)}>
                Next: Observability Goals <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ─── Step 3: Observability Goals ──────────────────────────────── */}
        {step === 3 && (
          <Card className="border-border shadow-xs">
            <CardHeader>
              <CardTitle className="text-lg">What matters most to your team?</CardTitle>
              <CardDescription>
                Select your primary monitoring goal for <strong>{projectName}</strong>:
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                {goalOptions.map((opt) => {
                  const isSelected = selectedGoal === opt.id;
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedGoal(opt.id)}
                      className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${opt.color} mt-0.5`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-foreground">{opt.title}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                          {opt.desc}
                        </div>
                      </div>
                      {isSelected && <Check className="h-4 w-4 text-primary shrink-0 mt-1" />}
                    </button>
                  );
                })}
              </div>

              <Button className="w-full mt-3" onClick={() => setStep(4)}>
                Complete Setup <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ─── Step 4: Ready to Launch ──────────────────────────────────── */}
        {step === 4 && (
          <Card className="border-border shadow-xs">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Sparkles className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl">🎉 Workspace Ready!</CardTitle>
              <CardDescription>
                Project <strong>{projectName}</strong> is configured and ready to ingest traces.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 pt-2">
              {/* Quick Orientation Cards */}
              <div className="space-y-2.5">
                <div className="flex items-start gap-3 rounded-lg border bg-card p-3 shadow-xs">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary mt-0.5">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-foreground">
                      API Keys & SDK Setup
                    </div>
                    <div className="text-[11px] text-muted-foreground leading-relaxed">
                      Your API key is generated and waiting for you in{" "}
                      <strong>Settings → API Keys & SDKs</strong> with copy-paste code for OpenAI,
                      Anthropic, Gemini, Python, and cURL.
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-lg border bg-card p-3 shadow-xs">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-500/10 text-blue-500 mt-0.5">
                    <Activity className="h-4 w-4" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-foreground">
                      Real-Time Trace Monitoring
                    </div>
                    <div className="text-[11px] text-muted-foreground leading-relaxed">
                      Every LLM call, prompt, response, latency waterfall, and token count will
                      appear live in your <strong>Traces</strong> view.
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-lg border bg-card p-3 shadow-xs">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-500 mt-0.5">
                    <DollarSign className="h-4 w-4" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-foreground">
                      Cost Waste Engine
                    </div>
                    <div className="text-[11px] text-muted-foreground leading-relaxed">
                      Automated cost intelligence calculates your exact spend across models and
                      highlights wasted tokens.
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
