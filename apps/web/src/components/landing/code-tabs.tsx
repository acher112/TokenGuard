"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

const SNIPPETS = {
  python_groq: {
    title: "Python (Groq)",
    language: "python",
    code: `from groq import Groq
from agentwatch import AgentWatch

aw = AgentWatch(api_key="aw_live_...", base_url="https://agentwatch.dev")
# 1-Line auto-instrumentation
client = aw.wrap_groq(Groq(), session_id="user_session_101")

# Use client normally — tokens, latency, and cost are automatically tracked
response = client.chat.completions.create(
    model="llama-3.3-70b-versatile",
    messages=[{"role": "user", "content": "Analyze system requirements..."}]
)`,
  },
  python_openai: {
    title: "Python (OpenAI)",
    language: "python",
    code: `from openai import OpenAI
from agentwatch import AgentWatch

aw = AgentWatch(api_key="aw_live_...")
# Automatically captures token usage and calculates USD cost per call
client = aw.wrap_openai(OpenAI())

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Explain vector embeddings..."}]
)`,
  },
  python_anthropic: {
    title: "Python (Anthropic)",
    language: "python",
    code: `import anthropic
from agentwatch import AgentWatch

aw = AgentWatch(api_key="aw_live_...")
# Wraps Anthropic — captures input/output tokens and USD cost automatically
client = aw.wrap_anthropic(anthropic.Anthropic())

with aw.trace("claude-agent") as trace:
    message = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=1024,
        messages=[{"role": "user", "content": "Hello, Claude!"}]
    )`,
  },
  nodejs: {
    title: "Node.js (OpenAI)",
    language: "typescript",
    code: `import { AgentWatch } from "@agentwatch/sdk";
import OpenAI from "openai";

const aw = new AgentWatch({ apiKey: "aw_live_..." });
const openai = aw.wrapOpenAI(new OpenAI());

// Fully typed, non-blocking telemetry stream
const res = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Summarize transcript..." }],
});`,
  },
  nodejs_anthropic: {
    title: "Node.js (Anthropic)",
    language: "typescript",
    code: `import { AgentWatch } from "@agentwatch/sdk";
import Anthropic from "@anthropic-ai/sdk";

const aw = new AgentWatch({ apiKey: "aw_live_..." });
const anthropic = aw.wrapAnthropic(new Anthropic());

// Automatically tracked — model, tokens, cost, latency
await aw.trace("claude-agent", async () => {
  const msg = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 1024,
    messages: [{ role: "user", content: "Hello!" }],
  });
});`,
  },
  otel: {
    title: "OpenTelemetry (OTel)",
    language: "yaml",
    code: `# Standard OTLP Exporter Configuration
exporters:
  otlp/agentwatch:
    endpoint: "https://agentwatch.dev/api/v1/otel/traces"
    headers:
      Authorization: "Bearer aw_live_..."

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/agentwatch]`,
  },
};

type TabKey = keyof typeof SNIPPETS;

export function LandingCodeTabs() {
  const [activeTab, setActiveTab] = useState<TabKey>("python_groq");
  const [copied, setCopied] = useState(false);

  const activeSnippet = SNIPPETS[activeTab];

  const handleCopy = () => {
    navigator.clipboard.writeText(activeSnippet.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-4xl mx-auto rounded-2xl border border-border/70 bg-card/90 shadow-2xl overflow-hidden backdrop-blur">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/40">
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
          {(Object.keys(SNIPPETS) as TabKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeTab === key
                  ? "bg-background text-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {SNIPPETS[key].title}
            </button>
          ))}
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors shrink-0"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? "Copied!" : "Copy"}</span>
        </button>
      </div>

      {/* Code window */}
      <div className="p-6 bg-zinc-950 font-mono text-xs sm:text-sm overflow-x-auto text-zinc-100 leading-relaxed selection:bg-primary/30">
        <pre>
          <code>{activeSnippet.code}</code>
        </pre>
      </div>

      {/* Footer info */}
      <div className="px-6 py-3 border-t bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
        <span>⚡ Overhead: &lt;2ms per call (async background queue)</span>
        <span className="hidden sm:inline">Zero external telemetry bloat</span>
      </div>
    </div>
  );
}
