import type { Metadata } from "next";
import Link from "next/link";
import {
  Zap,
  ArrowRight,
  Terminal,
  Code2,
  Cpu,
  Layers,
  Shield,
  ExternalLink,
  BookOpen,
  Sparkles,
  KeyRound,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Documentation — TokenGuard SDK & API Reference",
  description:
    "Comprehensive guides and setup examples for monitoring OpenAI, Anthropic, Gemini, LangChain, and Python agents with TokenGuard.",
};

export default function DocsPage() {
  const liveBaseUrl = "https://tokenguard-app-two.vercel.app";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 font-bold text-lg tracking-tight">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-xs">
                <Zap className="w-4 h-4 fill-current" />
              </div>
              <span>TokenGuard</span>
            </Link>
            <span className="hidden sm:inline-block text-xs font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground">
              Docs v0.1.0
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/settings/api-keys">Get API Key</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/dashboard" className="flex items-center gap-1.5">
                <span>Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Table of Contents */}
          <aside className="lg:col-span-3 space-y-6">
            <div className="sticky top-24 space-y-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Documentation
              </div>
              <nav className="space-y-1 text-sm">
                <a
                  href="#overview"
                  className="block px-2.5 py-1.5 rounded-md hover:bg-muted font-medium text-foreground transition-colors"
                >
                  🚀 Quickstart Overview
                </a>
                <a
                  href="#openai"
                  className="block px-2.5 py-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  🟢 OpenAI (Node & Python)
                </a>
                <a
                  href="#anthropic"
                  className="block px-2.5 py-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  🟣 Anthropic Claude
                </a>
                <a
                  href="#gemini"
                  className="block px-2.5 py-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  🔵 Google Gemini
                </a>
                <a
                  href="#langchain"
                  className="block px-2.5 py-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  🟠 LangChain & Agent Loops
                </a>
                <a
                  href="#rest-api"
                  className="block px-2.5 py-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  ⚡ Direct REST / cURL
                </a>
                <a
                  href="#privacy"
                  className="block px-2.5 py-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  🛡️ PII & Data Privacy
                </a>
              </nav>

              <div className="p-3.5 rounded-lg border bg-muted/40 space-y-2 text-xs">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-primary" />
                  <span>Your Live Endpoint</span>
                </div>
                <code className="block break-all font-mono text-[11px] bg-background p-1.5 rounded border">
                  {liveBaseUrl}
                </code>
              </div>
            </div>
          </aside>

          {/* Right Content */}
          <main className="lg:col-span-9 space-y-12 max-w-4xl">
            {/* Header */}
            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                TokenGuard Developer Documentation
              </h1>
              <p className="text-base text-muted-foreground leading-relaxed">
                Connect your AI agents and LLM applications to TokenGuard. Capture every prompt, response,
                token count, latency metric, and cost calculation in real time with zero invasive code changes.
              </p>
            </div>

            {/* Section: Overview */}
            <section id="overview" className="space-y-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold">Quickstart Overview</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                TokenGuard instruments your AI framework using standard client wrappers. It operates
                asynchronously in the background: your LLM requests execute with zero added user-perceived
                latency.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3.5 rounded-lg border bg-card space-y-1">
                  <div className="text-xs font-semibold text-foreground">1. Install SDK</div>
                  <p className="text-xs text-muted-foreground">
                    <code>npm install @tokenguard/sdk</code> or <code>pip install tokenguard</code>
                  </p>
                </div>
                <div className="p-3.5 rounded-lg border bg-card space-y-1">
                  <div className="text-xs font-semibold text-foreground">2. Add Environment Variables</div>
                  <p className="text-xs text-muted-foreground">
                    Store <code>TOKENGUARD_API_KEY</code> in your <code>.env</code> file.
                  </p>
                </div>
                <div className="p-3.5 rounded-lg border bg-card space-y-1">
                  <div className="text-xs font-semibold text-foreground">3. Wrap Your Client</div>
                  <p className="text-xs text-muted-foreground">
                    Add 2 lines of wrapper code around OpenAI, Anthropic, or Gemini.
                  </p>
                </div>
              </div>
            </section>

            {/* Section: OpenAI */}
            <section id="openai" className="space-y-4 pt-8 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🟢</span>
                  <h2 className="text-xl font-bold">OpenAI Integration</h2>
                </div>
                <span className="text-xs font-mono text-muted-foreground">Node.js & Python</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Instruments OpenAI <code>chat.completions.create</code> and streaming responses.
              </p>

              <div className="space-y-2">
                <span className="text-xs font-semibold text-muted-foreground">TypeScript / Node.js:</span>
                <pre className="p-4 rounded-lg bg-muted/60 border font-mono text-xs overflow-x-auto leading-relaxed">
{`import { TokenGuard, wrapOpenAI } from "@tokenguard/sdk";
import OpenAI from "openai";

// 1. Initialize TokenGuard
const tg = new TokenGuard({
  apiKey: process.env.TOKENGUARD_API_KEY!,
  baseUrl: "${liveBaseUrl}",
});

// 2. Wrap the OpenAI client
const openai = wrapOpenAI(new OpenAI({ apiKey: process.env.OPENAI_API_KEY! }), tg);

// 3. Normal OpenAI usage (tracked automatically!)
const response = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Summarize today's news." }],
});

console.log(response.choices[0].message.content);`}
                </pre>
              </div>

              <div className="space-y-2 pt-2">
                <span className="text-xs font-semibold text-muted-foreground">Python:</span>
                <pre className="p-4 rounded-lg bg-muted/60 border font-mono text-xs overflow-x-auto leading-relaxed">
{`import os
from tokenguard import TokenGuard, wrap_openai
from openai import OpenAI

# 1. Initialize TokenGuard
tg = TokenGuard(
    api_key=os.environ["TOKENGUARD_API_KEY"],
    base_url="${liveBaseUrl}"
)

# 2. Wrap client
client = wrap_openai(OpenAI(api_key=os.environ["OPENAI_API_KEY"]), tg)

# 3. Call OpenAI as usual
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Explain vector databases."}]
)

print(response.choices[0].message.content)`}
                </pre>
              </div>
            </section>

            {/* Section: Anthropic */}
            <section id="anthropic" className="space-y-4 pt-8 border-t">
              <div className="flex items-center gap-2">
                <span className="text-lg">🟣</span>
                <h2 className="text-xl font-bold">Anthropic Claude Integration</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Automatic instrumentation for Claude 3.5 Sonnet, Haiku, and Opus with prompt caching support.
              </p>

              <pre className="p-4 rounded-lg bg-muted/60 border font-mono text-xs overflow-x-auto leading-relaxed">
{`import { TokenGuard, wrapAnthropic } from "@tokenguard/sdk";
import Anthropic from "@anthropic-ai/sdk";

const tg = new TokenGuard({
  apiKey: process.env.TOKENGUARD_API_KEY!,
  baseUrl: "${liveBaseUrl}",
});

const anthropic = wrapAnthropic(
  new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! }),
  tg
);

const message = await anthropic.messages.create({
  model: "claude-3-5-sonnet-20241022",
  max_tokens: 1024,
  messages: [{ role: "user", content: "Optimize this SQL query for performance." }],
});

console.log(message.content);`}
              </pre>
            </section>

            {/* Section: Gemini */}
            <section id="gemini" className="space-y-4 pt-8 border-t">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔵</span>
                <h2 className="text-xl font-bold">Google Gemini Integration</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Tracks token counts and costs for Gemini 1.5 Flash, 1.5 Pro, and experimental models.
              </p>

              <pre className="p-4 rounded-lg bg-muted/60 border font-mono text-xs overflow-x-auto leading-relaxed">
{`import { TokenGuard, wrapGemini } from "@tokenguard/sdk";
import { GoogleGenAI } from "@google/genai";

const tg = new TokenGuard({
  apiKey: process.env.TOKENGUARD_API_KEY!,
  baseUrl: "${liveBaseUrl}",
});

const ai = wrapGemini(
  new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! }),
  tg
);

const response = await ai.models.generateContent({
  model: "gemini-1.5-pro",
  contents: "Explain the differences between dense and sparse retrieval.",
});

console.log(response.text);`}
              </pre>
            </section>

            {/* Section: LangChain / Agents */}
            <section id="langchain" className="space-y-4 pt-8 border-t">
              <div className="flex items-center gap-2">
                <span className="text-lg">🟠</span>
                <h2 className="text-xl font-bold">LangChain, CrewAI & Custom Agents</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                For custom workflows with multiple steps (LLM reasoning, vector search, API tools, retries),
                use manual trace waterfalls:
              </p>

              <pre className="p-4 rounded-lg bg-muted/60 border font-mono text-xs overflow-x-auto leading-relaxed">
{`import { TokenGuard } from "@tokenguard/sdk";

const tg = new TokenGuard({
  apiKey: process.env.TOKENGUARD_API_KEY!,
  baseUrl: "${liveBaseUrl}",
});

const result = await tg.trace("support-agent", async (trace) => {
  // Step 1: LLM Call
  const llmSpan = trace.llm({ model: "gpt-4o" });
  // ... run LLM ...
  llmSpan.end({
    inputTokens: 350,
    outputTokens: 80,
    request: { prompt: "Lookup order #890" },
    response: { tool: "query_database", id: "890" },
  });

  // Step 2: Database Tool
  const toolSpan = trace.tool("query_database", { arguments: { id: "890" } });
  // ... query DB ...
  toolSpan.end({ result: { status: "Delivered" } });

  return "Order #890 is Delivered.";
});`}
              </pre>
            </section>

            {/* Section: REST API */}
            <section id="rest-api" className="space-y-4 pt-8 border-t">
              <div className="flex items-center gap-2">
                <Terminal className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold">Direct REST / cURL Ingestion</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                If you are developing in Go, Rust, Ruby, Elixir, C#, or PHP, send standard HTTP POST requests:
              </p>

              <pre className="p-4 rounded-lg bg-muted/60 border font-mono text-xs overflow-x-auto leading-relaxed">
{`curl -X POST "${liveBaseUrl}/api/v1/ingest" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agentName": "production-service",
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
        "requestJson": "{\\"prompt\\":\\"Hello\\"}",
        "responseJson": "{\\"reply\\":\\"Hi there\\"}"
      }
    }]
  }'`}
              </pre>
            </section>

            {/* Section: Privacy */}
            <section id="privacy" className="space-y-4 pt-8 border-t pb-16">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-emerald-500" />
                <h2 className="text-xl font-bold">PII & Data Privacy</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                TokenGuard is built with privacy in mind. Logging prompts and responses (<code>requestJson</code>{" "}
                and <code>responseJson</code>) is <strong>completely optional</strong>. If your compliance policies
                (HIPAA, GDPR, SOC2) prohibit sending prompts off-premise, omit those fields: TokenGuard will still
                accurately monitor model latency, token counts, and cost analytics.
              </p>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
