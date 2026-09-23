"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Copy, Terminal, Code2, Sparkles, KeyRound } from "lucide-react";

interface SdkSetupGuideProps {
  apiKey?: string;
}

type TabKey = "openai" | "anthropic" | "gemini" | "langchain" | "python" | "curl";

export function SdkSetupGuide({ apiKey = "YOUR_API_KEY" }: SdkSetupGuideProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("openai");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const platforms: { id: TabKey; label: string; badge?: string }[] = [
    { id: "openai", label: "OpenAI", badge: "Popular" },
    { id: "anthropic", label: "Anthropic Claude" },
    { id: "gemini", label: "Google Gemini" },
    { id: "langchain", label: "LangChain / Agents" },
    { id: "python", label: "Python SDK" },
    { id: "curl", label: "cURL / REST" },
  ];

  const snippets: Record<TabKey, { install: string; code: string; explanation: string }> = {
    openai: {
      install: "npm install @tokenguard/sdk openai",
      code: `import { TokenGuard, wrapOpenAI } from "@tokenguard/sdk";
import OpenAI from "openai";

// 1. Initialize TokenGuard with your API key
const tg = new TokenGuard({
  apiKey: process.env.TOKENGUARD_API_KEY || "${apiKey}",
});

// 2. Wrap your OpenAI client — every chat completion is tracked automatically!
const openai = wrapOpenAI(new OpenAI(), tg);

// 3. Make AI calls as usual
const response = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Summarize this customer ticket." }],
});

console.log(response.choices[0].message.content);`,
      explanation:
        "The wrapOpenAI wrapper instruments your standard OpenAI client. It automatically measures execution duration, token counts, and calculates model costs without changing your application code.",
    },
    anthropic: {
      install: "npm install @tokenguard/sdk @anthropic-ai/sdk",
      code: `import { TokenGuard, wrapAnthropic } from "@tokenguard/sdk";
import Anthropic from "@anthropic-ai/sdk";

// 1. Initialize TokenGuard
const tg = new TokenGuard({
  apiKey: process.env.TOKENGUARD_API_KEY || "${apiKey}",
});

// 2. Wrap Anthropic client
const anthropic = wrapAnthropic(new Anthropic(), tg);

// 3. Create messages with Claude 3.5 Sonnet / Opus
const message = await anthropic.messages.create({
  model: "claude-3-5-sonnet-20241022",
  max_tokens: 1024,
  messages: [{ role: "user", content: "Analyze this dataset for cost anomalies." }],
});

console.log(message.content);`,
      explanation:
        "Tracks all Anthropic message completions, input tokens, output tokens, prompt caching usage, and pricing for Claude 3.5 Sonnet, Haiku, and Opus.",
    },
    gemini: {
      install: "npm install @tokenguard/sdk @google/genai",
      code: `import { TokenGuard, wrapGemini } from "@tokenguard/sdk";
import { GoogleGenAI } from "@google/genai";

// 1. Initialize TokenGuard
const tg = new TokenGuard({
  apiKey: process.env.TOKENGUARD_API_KEY || "${apiKey}",
});

// 2. Wrap Gemini client
const ai = wrapGemini(new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }), tg);

// 3. Generate content with Gemini 1.5 Pro / Flash
const response = await ai.models.generateContent({
  model: "gemini-1.5-pro",
  contents: "Explain token optimization strategies.",
});

console.log(response.text);`,
      explanation:
        "Automatically logs Gemini 1.5 Flash, 1.5 Pro, and 2.0 model calls, token usages, and costs.",
    },
    langchain: {
      install: "npm install @tokenguard/sdk",
      code: `import { TokenGuard } from "@tokenguard/sdk";

const tg = new TokenGuard({
  apiKey: process.env.TOKENGUARD_API_KEY || "${apiKey}",
});

// Wrap multi-step workflows, agent loops, or tool calls
const result = await tg.trace("customer-support-agent", async (trace) => {
  // 1. Log an LLM step
  const llmSpan = trace.llm({ model: "gpt-4o", temperature: "0.7" });
  // ... run LLM ...
  llmSpan.end({
    inputTokens: 450,
    outputTokens: 120,
    request: { prompt: "Find user order #1234" },
    response: { tool: "fetch_order", orderId: "1234" },
  });

  // 2. Log a Tool invocation
  const toolSpan = trace.tool("fetch_order", {
    arguments: { orderId: "1234" }
  });
  // ... run database or API search ...
  toolSpan.end({ result: { status: "shipped", tracking: "XYZ" } });

  return "Order #1234 is currently shipped.";
});`,
      explanation:
        "Use manual tracing for multi-step AI agents, LangChain tools, vector search lookups, and retry loops to build an execution waterfall.",
    },
    python: {
      install: "pip install tokenguard openai",
      code: `import os
from tokenguard import TokenGuard, wrap_openai
from openai import OpenAI

# Initialize TokenGuard
tg = TokenGuard(api_key=os.environ.get("TOKENGUARD_API_KEY", "${apiKey}"))

# Wrap OpenAI client
client = wrap_openai(OpenAI(), tg)

# Calls are logged directly to TokenGuard
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello from Python AI agent!"}]
)

print(response.choices[0].message.content)`,
      explanation:
        "Works seamlessly in Python scripts, FastAPI backends, CrewAI, AutoGen, and LangGraph Python workflows.",
    },
    curl: {
      install: "# Direct HTTP ingestion — no SDK required",
      code: `curl -X POST "https://tokenguard-app-two.vercel.app/api/v1/ingest" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agentName": "my-custom-agent",
    "status": "success",
    "startedAt": "2026-09-23T10:00:00Z",
    "endedAt": "2026-09-23T10:00:02Z",
    "durationMs": 2000,
    "steps": [{
      "stepType": "llm",
      "sequence": 1,
      "startedAt": "2026-09-23T10:00:00Z",
      "endedAt": "2026-09-23T10:00:02Z",
      "durationMs": 2000,
      "llmCall": {
        "modelName": "gpt-4o",
        "inputTokens": 450,
        "outputTokens": 120,
        "requestJson": "{\\"prompt\\":\\"Hello world\\"}",
        "responseJson": "{\\"reply\\":\\"Hello from AI\\"}"
      }
    }]
  }'`,
      explanation:
        "Direct REST API endpoint for custom languages (Go, Rust, Ruby, Elixir, C#) or terminal scripts.",
    },
  };

  const current = snippets[activeTab];

  return (
    <Card className="border-border">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Code2 className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">SDK & LLM Setup Guides</CardTitle>
            </div>
            <CardDescription className="mt-1">
              Connect your AI agent or LLM framework to TokenGuard in under 2 minutes.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 rounded-md bg-muted/60 px-3 py-1.5 text-xs font-mono">
            <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Key:</span>
            <span className="font-semibold text-foreground">
              {apiKey.slice(0, 10)}...{apiKey.slice(-4)}
            </span>
          </div>
        </div>

        {/* Environment variable helper */}
        <div className="mt-4 rounded-md border border-primary/20 bg-primary/5 p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            <span>
              Store in your project&apos;s <code className="font-mono font-semibold bg-muted px-1.5 py-0.5 rounded">.env</code> file:
            </span>
          </div>
          <div className="flex items-center gap-2">
            <code className="font-mono text-[11px] bg-background border px-2 py-1 rounded">
              TOKENGUARD_API_KEY={apiKey}
            </code>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs px-2"
              onClick={() => copy(`TOKENGUARD_API_KEY=${apiKey}`, "env-key")}
            >
              {copiedKey === "env-key" ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>

        {/* Platform tabs */}
        <div className="flex flex-wrap gap-2 pt-2 border-b">
          {platforms.map((p) => (
            <button
              key={p.id}
              onClick={() => setActiveTab(p.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                activeTab === p.id
                  ? "border-primary text-primary font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.label}
              {p.badge && (
                <Badge variant="secondary" className="text-[10px] py-0 px-1 font-normal">
                  {p.badge}
                </Badge>
              )}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        {/* Install command */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Terminal className="h-3.5 w-3.5" /> Installation
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs px-2"
              onClick={() => copy(current.install, "install")}
            >
              {copiedKey === "install" ? (
                <>
                  <Check className="mr-1 h-3 w-3 text-green-500" /> Copied
                </>
              ) : (
                <>
                  <Copy className="mr-1 h-3 w-3" /> Copy
                </>
              )}
            </Button>
          </div>
          <div className="rounded-md bg-muted/60 border p-2.5 font-mono text-xs">
            <code>{current.install}</code>
          </div>
        </div>

        {/* Code Snippet */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Example Code</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs px-2"
              onClick={() => copy(current.code, "code")}
            >
              {copiedKey === "code" ? (
                <>
                  <Check className="mr-1 h-3 w-3 text-green-500" /> Copied
                </>
              ) : (
                <>
                  <Copy className="mr-1 h-3 w-3" /> Copy Code
                </>
              )}
            </Button>
          </div>
          <pre className="max-h-96 overflow-x-auto rounded-md border bg-muted/40 p-3 font-mono text-xs leading-relaxed text-foreground">
            {current.code}
          </pre>
        </div>

        {/* Description / Explanation */}
        <p className="text-xs text-muted-foreground bg-muted/30 p-2.5 rounded border border-muted">
          💡 <strong>How it works:</strong> {current.explanation}
        </p>
      </CardContent>
    </Card>
  );
}
