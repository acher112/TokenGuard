/**
 * Public Roadmap Page — /roadmap
 * No auth required. Shows planned, in-progress, and live features
 * from the competitive analysis document.
 */

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Roadmap — AgentWatch",
  description: "See what's live, what's in progress, and what's coming next to AgentWatch.",
};

type FeatureStatus = "live" | "progress" | "planned" | "considering";

interface Feature {
  name: string;
  description: string;
  status: FeatureStatus;
  tier?: string;
}

const STATUS_CONFIG: Record<FeatureStatus, { label: string; color: string; dot: string }> = {
  live: { label: "Live", color: "bg-green-100 text-green-800 border-green-200", dot: "bg-green-500" },
  progress: { label: "In Progress", color: "bg-blue-100 text-blue-800 border-blue-200", dot: "bg-blue-500" },
  planned: { label: "Planned", color: "bg-amber-100 text-amber-800 border-amber-200", dot: "bg-amber-500" },
  considering: { label: "Considering", color: "bg-slate-100 text-slate-700 border-slate-200", dot: "bg-slate-400" },
};

const FEATURES: { category: string; items: Feature[] }[] = [
  {
    category: "Core Observability",
    items: [
      {
        name: "Trace logging + cost tracking",
        description: "Record every LLM call with full token counts, latency, and estimated cost.",
        status: "live",
      },
      {
        name: "Framework-agnostic SDK",
        description: "Python and Node.js SDKs that wrap any OpenAI-compatible client with one line of code.",
        status: "live",
      },
      {
        name: "Trace waterfall view",
        description: "Step-by-step execution timeline with prompt/response inspector.",
        status: "live",
      },
      {
        name: "Multi-turn session tracing",
        description: "Group multiple traces into a single session to track multi-turn conversations end-to-end.",
        status: "live",
        tier: "Pro+",
      },
      {
        name: "OpenTelemetry (OTel) OTLP ingestion",
        description: "Send spans from any OTel-compatible SDK directly to AgentWatch.",
        status: "live",
        tier: "Enterprise",
      },
    ],
  },
  {
    category: "Cost Intelligence",
    items: [
      {
        name: "Proactive cost-saving recommendations",
        description: "AI-powered waste detection that identifies oversized prompts, retry loops, and model mismatches — and tells you how to fix them.",
        status: "live",
      },
      {
        name: "Spend enforcement (block before overspend)",
        description: "Set monthly trace or cost budgets. AgentWatch blocks ingest when limits are hit — not just alerts after the fact.",
        status: "live",
      },
      {
        name: "7-day cost trend chart",
        description: "Daily estimated spend chart on the dashboard overview.",
        status: "live",
      },
      {
        name: "Response caching",
        description: "Cache identical prompts to eliminate redundant LLM spend (cuts 20–40% for high-repetition workloads).",
        status: "considering",
      },
    ],
  },
  {
    category: "Alerts",
    items: [
      {
        name: "Email alerts (via Resend)",
        description: "Trigger email notifications when daily cost, error rate, or per-request cost crosses a threshold.",
        status: "live",
      },
      {
        name: "Webhook alerts",
        description: "POST to any URL when an alert fires — works with Discord, Zapier, and custom APIs.",
        status: "live",
      },
      {
        name: "Slack alerts (block-kit)",
        description: "Rich Slack notifications with metric details, threshold, and a direct link to the dashboard.",
        status: "live",
        tier: "Pro+",
      },
    ],
  },
  {
    category: "Data & Evaluation",
    items: [
      {
        name: "Dataset export (JSONL / CSV)",
        description: "Export production traces as JSONL for fine-tuning or as CSV for analysis.",
        status: "live",
        tier: "Pro+",
      },
      {
        name: "Dataset building from traces",
        description: "Annotate and curate production traces into labelled datasets for regression testing.",
        status: "planned",
        tier: "Pro+",
      },
      {
        name: "Evaluation pipelines",
        description: "Auto-grade agent outputs using LLM-as-judge or custom scoring functions.",
        status: "planned",
      },
      {
        name: "Prompt versioning & rollback",
        description: "Track prompt templates across versions and roll back to any previous version.",
        status: "planned",
      },
    ],
  },
  {
    category: "Team & Access Control",
    items: [
      {
        name: "Multi-seat billing",
        description: "Pro includes 3 seats with +$10/seat add-ons. Enterprise has unlimited seats.",
        status: "live",
      },
      {
        name: "RBAC (roles: Owner, Admin, Viewer)",
        description: "Assign fine-grained roles to team members per project.",
        status: "planned",
        tier: "Enterprise",
      },
      {
        name: "SSO (Google Workspace / Okta)",
        description: "Single sign-on for enterprise teams.",
        status: "planned",
        tier: "Enterprise",
      },
    ],
  },
  {
    category: "Infrastructure",
    items: [
      {
        name: "Self-hosting option",
        description: "Deploy AgentWatch on your own infrastructure for data-residency-sensitive workloads.",
        status: "considering",
        tier: "Enterprise",
      },
    ],
  },
];

function StatusBadge({ status }: { status: FeatureStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

export default function RoadmapPage() {
  const liveCounts = FEATURES.flatMap((c) => c.items).filter((f) => f.status === "live").length;
  const totalCount = FEATURES.flatMap((c) => c.items).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
            <span className="text-primary">⚡</span> AgentWatch
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Sign in
            </Link>
            <Link
              href="/signup"
              className="text-sm bg-primary text-primary-foreground px-4 py-1.5 rounded-md hover:bg-primary/90 transition-colors"
            >
              Get started free
            </Link>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold tracking-tight mb-4">Product Roadmap</h1>
          <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
            AgentWatch is moving fast. {liveCounts} of {totalCount} planned features are already live.
            This page is updated as we ship.
          </p>

          {/* Status legend */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {(Object.entries(STATUS_CONFIG) as [FeatureStatus, typeof STATUS_CONFIG[FeatureStatus]][]).map(([key, cfg]) => (
              <span key={key} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${cfg.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                {cfg.label}
              </span>
            ))}
          </div>
        </div>

        {/* Competitive edge callout */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 mb-12">
          <h2 className="font-semibold text-primary mb-2">🏆 Our Unique Competitive Edge</h2>
          <p className="text-sm text-muted-foreground">
            Two capabilities that <strong>no other observability platform</strong> in this space currently offers:
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span><strong>Cost Waste Engine with AI recommendations</strong> — AgentWatch doesn&apos;t just show you spend. It proactively identifies what&apos;s wasting money and tells you how to fix it.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span><strong>Spend enforcement (block before overspend)</strong> — Set hard limits. AgentWatch throttles ingest when you&apos;re about to go over budget. Competitors only alert after the fact.</span>
            </li>
          </ul>
        </div>

        {/* Feature grid by category */}
        <div className="space-y-12">
          {FEATURES.map((category) => (
            <section key={category.category}>
              <h2 className="text-xl font-semibold mb-4 pb-2 border-b">{category.category}</h2>
              <div className="space-y-3">
                {category.items.map((feature) => (
                  <div
                    key={feature.name}
                    className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{feature.name}</span>
                        {feature.tier && (
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                            {feature.tier}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                    </div>
                    <div className="flex-shrink-0 pt-0.5">
                      <StatusBadge status={feature.status} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* CTA footer */}
        <div className="mt-16 text-center p-8 bg-muted/50 rounded-xl border">
          <h3 className="font-semibold text-lg mb-2">Have a feature request?</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Tell us what you need. We prioritize based on real user demand.
          </p>
          <a
            href="mailto:hello@agentwatch.dev"
            className="inline-flex items-center gap-2 text-sm bg-primary text-primary-foreground px-6 py-2.5 rounded-md hover:bg-primary/90 transition-colors"
          >
            Request a feature →
          </a>
        </div>
      </main>

      <footer className="border-t mt-8 py-8 text-center text-xs text-muted-foreground">
        AgentWatch v0.1.0 — Competitive data sourced September 2026. Pricing pages change frequently; re-verify before finalizing.
      </footer>
    </div>
  );
}
