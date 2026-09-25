"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Copy, Terminal, Code2, Sparkles, KeyRound, ExternalLink, BookOpen, Layers } from "lucide-react";

interface SdkSetupGuideProps {
  apiKey?: string;
  baseUrl?: string;
}

type TabKey = "openai-ts" | "openai-py" | "anthropic-ts" | "anthropic-py" | "gemini-ts" | "langchain" | "curl";

export function SdkSetupGuide({
  apiKey = "YOUR_API_KEY",
  baseUrl = "https://tokenguard-app-two.vercel.app",
}: SdkSetupGuideProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("openai-ts");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const platforms: { id: TabKey; label: string; badge?: string }[] = [
    { id: "openai-ts", label: "OpenAI (Node.js)", badge: "TypeScript" },
    { id: "openai-py", label: "OpenAI (Python)", badge: "Python" },
    { id: "anthropic-ts", label: "Anthropic Claude (Node)", badge: "Claude 3.5" },
    { id: "anthropic-py", label: "Anthropic Claude (Python)", badge: "Claude 3.5" },
    { id: "gemini-ts", label: "Google Gemini", badge: "Gemini 1.5" },
    { id: "langchain", label: "LangChain / Agents", badge: "Multi-Agent" },
    { id: "curl", label: "REST / cURL", badge: "HTTP" },
  ];

  const snippets: Record<TabKey, { install: string; code: string; explanation: string; linesHighlight: string }> = {
    "openai-ts": {
      install: "npm install @tokenguard/sdk openai",
      linesHighlight: "Only 2 lines added to your existing OpenAI code",
      code: `import { TokenGuard, wrapOpenAI } from "@tokenguard/sdk";
import OpenAI from "openai";

// 1. Initialize TokenGuard (reads TOKENGUARD_API_KEY from environment)
const tg = new TokenGuard({
  apiKey: process.env.TOKENGUARD_API_KEY || "${apiKey}",
  baseUrl: "${baseUrl}", // Live TokenGuard server
});

// 2. Wrap your OpenAI client — 100% of calls are tracked automatically!
const openai = wrapOpenAI(new OpenAI({ apiKey: process.env.OPENAI_API_KEY }), tg);

// 3. Make AI calls as usual (prompts, tokens & costs log directly to your dashboard)
const response = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Summarize this customer support ticket." }],
});

console.log(response.choices[0].message.content);`,
      explanation:
        "wrapOpenAI wraps your standard OpenAI instance. It measures token counts, request duration, calculates exact model costs, and uploads traces in the background without slowing down your app.",
    },
    "openai-py": {
      install: "pip install tokenguard openai",
      linesHighlight: "Only 2 lines added to existing Python OpenAI script",
      code: `import os
from tokenguard import TokenGuard, wrap_openai
from openai import OpenAI

# 1. Initialize TokenGuard
tg = TokenGuard(
    api_key=os.environ.get("TOKENGUARD_API_KEY", "${apiKey}"),
    base_url="${baseUrl}"  # Live TokenGuard server
)

# 2. Wrap standard OpenAI client
client = wrap_openai(
    OpenAI(api_key=os.environ.get("OPENAI_API_KEY")),
    tg
)

# 3. Use standard OpenAI calls — telemetry is captured automatically
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello from Python AI agent!"}]
)

print(response.choices[0].message.content)`,
      explanation:
        "Works across FastAPI, Django, Flask, Celery, CrewAI, AutoGen, and custom Python LLM pipelines.",
    },
    "anthropic-ts": {
      install: "npm install @tokenguard/sdk @anthropic-ai/sdk",
      linesHighlight: "Automatic token tracking for Claude 3.5 Sonnet, Opus & Haiku",
      code: `import { TokenGuard, wrapAnthropic } from "@tokenguard/sdk";
import Anthropic from "@anthropic-ai/sdk";

// 1. Initialize TokenGuard
const tg = new TokenGuard({
  apiKey: process.env.TOKENGUARD_API_KEY || "${apiKey}",
  baseUrl: "${baseUrl}",
});

// 2. Wrap Anthropic client
const anthropic = wrapAnthropic(
  new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }),
  tg
);

// 3. Call Claude as usual
const message = await anthropic.messages.create({
  model: "claude-3-5-sonnet-20241022",
  max_tokens: 1024,
  messages: [{ role: "user", content: "Analyze these logs for anomalies." }],
});

console.log(message.content);`,
      explanation:
        "Captures Claude prompt tokens, completion tokens, prompt caching savings, and calculates cost based on Anthropic official pricing.",
    },
    "anthropic-py": {
      install: "pip install tokenguard anthropic",
      linesHighlight: "Python client for Anthropic Claude models",
      code: `import os
from tokenguard import TokenGuard, wrap_anthropic
from anthropic import Anthropic

tg = TokenGuard(
    api_key=os.environ.get("TOKENGUARD_API_KEY", "${apiKey}"),
    base_url="${baseUrl}"
)

client = wrap_anthropic(
    Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY")),
    tg
)

response = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Help me optimize my LLM spending."}]
)

print(response.content[0].text)`,
      explanation:
        "Logs full multi-turn conversations and token usage for all Claude 3.5 and Claude 3 models in Python.",
    },
    "gemini-ts": {
      install: "npm install @tokenguard/sdk @google/genai",
      linesHighlight: "Full instrumentation for Google Gemini 1.5 Pro & Flash",
      code: `import { TokenGuard, wrapGemini } from "@tokenguard/sdk";
import { GoogleGenAI } from "@google/genai";

// 1. Initialize TokenGuard
const tg = new TokenGuard({
  apiKey: process.env.TOKENGUARD_API_KEY || "${apiKey}",
  baseUrl: "${baseUrl}",
});

// 2. Wrap Gemini client
const ai = wrapGemini(
  new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }),
  tg
);

// 3. Run generation
const response = await ai.models.generateContent({
  model: "gemini-1.5-pro",
  contents: "Explain token pruning for long contexts.",
});

console.log(response.text);`,
      explanation:
        "Measures input/output tokens and latency for Gemini 1.5 Pro, Flash, and 2.0 experimental models.",
    },
    langchain: {
      install: "npm install @tokenguard/sdk",
      linesHighlight: "Custom waterfall tracing for multi-step agent loops & tools",
      code: `import { TokenGuard } from "@tokenguard/sdk";

const tg = new TokenGuard({
  apiKey: process.env.TOKENGUARD_API_KEY || "${apiKey}",
  baseUrl: "${baseUrl}",
});

// Wrap multi-step workflows, agent loops, or tool calls
const result = await tg.trace("customer-support-agent", async (trace) => {
  // Step 1: Log LLM reasoning step
  const llmSpan = trace.llm({ model: "gpt-4o", temperature: "0.7" });
  // ... run LLM ...
  llmSpan.end({
    inputTokens: 450,
    outputTokens: 120,
    request: { prompt: "Find user order #1234" },
    response: { tool: "fetch_order", orderId: "1234" },
  });

  // Step 2: Log Tool execution step
  const toolSpan = trace.tool("fetch_order", {
    arguments: { orderId: "1234" }
  });
  // ... run database search ...
  toolSpan.end({ result: { status: "shipped", trackingNumber: "TRK-98765" } });

  return "Order #1234 has shipped.";
});`,
      explanation:
        "Use manual tracing to construct execution waterfalls for complex AI workflows, vector DB lookups, tool calls, and retries.",
    },
    curl: {
      install: "# Direct HTTP ingestion — supported by all languages (Go, Rust, Ruby, Elixir, C#)",
      linesHighlight: "Universal HTTP POST endpoint",
      code: `curl -X POST "${baseUrl}/api/v1/ingest" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agentName": "my-custom-agent",
    "status": "success",
    "startedAt": "2026-09-25T10:00:00Z",
    "endedAt": "2026-09-25T10:00:02Z",
    "durationMs": 2000,
    "steps": [{
      "stepType": "llm",
      "sequence": 1,
      "startedAt": "2026-09-25T10:00:00Z",
      "endedAt": "2026-09-25T10:00:02Z",
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
        "Direct ingestion endpoint with token and cost calculation. Returns HTTP 200 with calculated USD cost and trace ID.",
    },
  };

  const current = snippets[activeTab];

  return (
    <Card className="border-border">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Code2 className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">SDK & Integration Guides</CardTitle>
            </div>
            <CardDescription className="mt-1">
              Select your AI framework to view production-ready setup code with your API key.
            </CardDescription>
          </div>

          <Link
            href="/docs"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-md transition-colors shrink-0"
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Open Complete Docs</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>

        {/* Environment variable helper */}
        <div className="mt-4 rounded-md border border-primary/20 bg-primary/5 p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            <span>
              Add to your project&apos;s <code className="font-mono font-semibold bg-muted px-1.5 py-0.5 rounded">.env</code> file:
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
              onClick={() => copy(`TOKENGUARD_API_KEY=${apiKey}\nTOKENGUARD_BASE_URL=${baseUrl}`, "env-key")}
            >
              {copiedKey === "env-key" ? (
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
        </div>

        {/* Platform tabs */}
        <div className="flex flex-wrap gap-1.5 pt-3 border-b">
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
        {/* Banner highlighting ease of adoption */}
        <div className="rounded-md bg-muted/40 border border-muted px-3 py-2 text-xs flex items-center justify-between">
          <span className="text-muted-foreground">
            ⚡ <strong>Setup effort:</strong> {current.linesHighlight}
          </span>
          <span className="text-[11px] font-mono text-primary font-semibold">Zero latency impact</span>
        </div>

        {/* Install command */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Terminal className="h-3.5 w-3.5" /> Package Installation
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
          <pre className="max-h-[420px] overflow-x-auto rounded-md border bg-muted/40 p-3 font-mono text-xs leading-relaxed text-foreground">
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
