import Link from "next/link";
import { auth } from "@/lib/auth";
import {
  Zap,
  ArrowRight,
  ShieldCheck,
  TrendingDown,
  Activity,
  Layers,
  Bell,
  Cpu,
  Download,
  Terminal,
  ChevronRight,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LandingPricingTable } from "@/components/landing/pricing-table";
import { LandingCodeTabs } from "@/components/landing/code-tabs";
import { LandingNavbar } from "@/components/landing/landing-navbar";

export const metadata = {
  title: "TokenGuard — LLM Observability & Cost Waste Engine",
  description:
    "The developer-first LLM observability platform for production AI agents. Real-time cost waste detection, multi-turn session tracing, and hard spend enforcement.",
};

export default async function HomePage() {
  const session = await auth();
  const isAuthenticated = !!session?.user;

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      {/* ─── Responsive Navigation Header ─────────────────────────────────── */}
      <LandingNavbar isAuthenticated={isAuthenticated} />

      <main>
        {/* ─── Hero Section ─────────────────────────────────────────────────── */}
        <section className="relative pt-20 pb-24 md:pt-28 md:pb-32 overflow-hidden border-b">
          {/* Subtle background glow */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-primary/10 blur-[120px] rounded-full pointer-events-none -z-10" />

          <div className="max-w-5xl mx-auto px-6 text-center">
            {/* Announcement Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border/80 bg-muted/60 backdrop-blur text-xs font-medium mb-8 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>v0.1.0 Released — Cost Waste Engine & Session Tracing</span>
              <Link href="/roadmap" className="text-primary hover:underline font-semibold flex items-center gap-0.5">
                <span>View Roadmap</span>
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6">
              Stop overpaying for LLMs. <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-indigo-500 to-sky-500">
                Observe, optimize & enforce.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="max-w-3xl mx-auto text-lg sm:text-xl text-muted-foreground leading-relaxed mb-10">
              The developer-first LLM observability platform built for production AI agents.
              Proactive AI cost waste detection, multi-turn session tracing, and real-time spend blocking
              before budget overruns happen.
            </p>

            {/* Primary Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Button asChild size="lg" className="w-full sm:w-auto text-base px-8 py-6 rounded-xl shadow-lg shadow-primary/20">
                <Link href={isAuthenticated ? "/dashboard" : "/signup"}>
                  {isAuthenticated ? "Open Dashboard" : "Get Started Free (10k traces/mo)"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto text-base px-8 py-6 rounded-xl">
                <Link href="/roadmap">
                  Explore Product Roadmap
                </Link>
              </Button>
            </div>

            {/* Framework Logos & Compatibility */}
            <div className="pt-8 border-t border-border/50">
              <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-4">
                Works seamlessly with any framework & provider
              </p>
              <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 opacity-70 grayscale hover:grayscale-0 transition-all text-sm font-semibold">
                <span className="flex items-center gap-2">⚡ Groq</span>
                <span className="flex items-center gap-2">🟢 OpenAI</span>
                <span className="flex items-center gap-2">🟣 Anthropic</span>
                <span className="flex items-center gap-2">🦜🔗 LangChain</span>
                <span className="flex items-center gap-2">🦙 LlamaIndex</span>
                <span className="flex items-center gap-2">🔭 OpenTelemetry</span>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Dashboard Preview Mockup ─────────────────────────────────────── */}
        <section className="py-16 md:py-24 bg-muted/20 border-b">
          <div className="max-w-6xl mx-auto px-6">
            <div className="rounded-2xl border border-border/80 bg-card shadow-2xl overflow-hidden">
              {/* Fake browser bar */}
              <div className="px-4 py-3 border-b bg-muted/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <span className="ml-2 text-xs font-mono text-muted-foreground">app.tokenguard.dev/dashboard/traces/tr_89a12e</span>
                </div>
                <div className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live Ingest Active
                </div>
              </div>

              {/* Mockup Content */}
              <div className="p-6 md:p-8 space-y-6">
                {/* AI Cost Waste Recommendation Banner (Competitive Edge #1) */}
                <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <TrendingDown className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                        Cost Waste Engine Recommendation: 38% Estimated Savings
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Trace step 1 used <code className="text-xs bg-muted px-1 py-0.5 rounded font-mono">gpt-4o</code> for classification.
                        Switching this step to <code className="text-xs bg-muted px-1 py-0.5 rounded font-mono">gpt-4o-mini</code> will save ~$380/mo without accuracy loss.
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/20 px-2.5 py-1 rounded-full whitespace-nowrap">
                    AI Auto-Detected
                  </span>
                </div>

                {/* Trace Waterfall Header */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-muted/30 border">
                  <div>
                    <span className="text-xs text-muted-foreground">Agent</span>
                    <p className="text-sm font-bold">customer-support-v2</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Status</span>
                    <p className="text-sm font-bold text-emerald-500 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Success (200)
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Total Tokens / Cost</span>
                    <p className="text-sm font-bold">3,842 tokens • $0.0142</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Latency</span>
                    <p className="text-sm font-bold">842ms</p>
                  </div>
                </div>

                {/* Steps Waterfall */}
                <div className="space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-background">
                    <div className="flex items-center gap-3">
                      <span className="w-5 text-muted-foreground">1</span>
                      <span className="font-semibold text-primary">LLM</span>
                      <span>openai / gpt-4o (Intent Classifier)</span>
                    </div>
                    <div className="flex items-center gap-4 text-muted-foreground">
                      <span>420 tokens</span>
                      <span>$0.0031</span>
                      <span className="text-foreground font-semibold">180ms</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border bg-background">
                    <div className="flex items-center gap-3">
                      <span className="w-5 text-muted-foreground">2</span>
                      <span className="font-semibold text-indigo-500">TOOL</span>
                      <span>fetch_user_order_history</span>
                    </div>
                    <div className="flex items-center gap-4 text-muted-foreground">
                      <span>API Call</span>
                      <span>$0.0000</span>
                      <span className="text-foreground font-semibold">94ms</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border bg-background">
                    <div className="flex items-center gap-3">
                      <span className="w-5 text-muted-foreground">3</span>
                      <span className="font-semibold text-primary">LLM</span>
                      <span>groq / llama-3.3-70b-versatile (Final Response)</span>
                    </div>
                    <div className="flex items-center gap-4 text-muted-foreground">
                      <span>3,422 tokens</span>
                      <span>$0.0111</span>
                      <span className="text-foreground font-semibold">568ms</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── The 2 Core Differentiators (Competitive Wedges) ──────────────── */}
        <section id="differentiators" className="py-20 md:py-28 border-b">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-xs uppercase tracking-widest font-bold text-primary mb-3">
                Built Different By Design
              </h2>
              <h3 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
                Two capabilities no other platform offers.
              </h3>
              <p className="text-muted-foreground mt-4 text-base sm:text-lg">
                Other observability tools report what you spent after the invoice arrives.
                TokenGuard proactively reduces your costs and stops overspend before it happens.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Wedge 1 */}
              <div className="rounded-2xl border border-primary/40 bg-gradient-to-b from-primary/5 to-transparent p-8 relative overflow-hidden">
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-6">
                  <TrendingDown className="w-6 h-6" />
                </div>
                <h4 className="text-2xl font-bold tracking-tight mb-3">
                  1. Cost Waste Engine with AI Recommendations
                </h4>
                <p className="text-muted-foreground leading-relaxed text-sm mb-6">
                  Traditional LLM monitors give you retrospective spend graphs. TokenGuard scans production traces in real time for:
                </p>
                <ul className="space-y-2.5 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span><strong>Prompt Bloat & Oversized Context:</strong> Detects static repetitive instructions that can be cached or compressed.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span><strong>Model Mismatch:</strong> Identifies reasoning models utilized for simple classifications and proposes cheaper alternatives.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span><strong>Retry & Loop Waste:</strong> Highlights failing loops and calculates exact dollars burned per incident.</span>
                  </li>
                </ul>
              </div>

              {/* Wedge 2 */}
              <div className="rounded-2xl border border-indigo-500/40 bg-gradient-to-b from-indigo-500/5 to-transparent p-8 relative overflow-hidden">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 mb-6">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h4 className="text-2xl font-bold tracking-tight mb-3">
                  2. Spend Enforcement (Block Before Overspend)
                </h4>
                <p className="text-muted-foreground leading-relaxed text-sm mb-6">
                  Most platforms send an alert email <em>after</em> an infinite agent loop generates a \$5,000 credit card bill.
                </p>
                <ul className="space-y-2.5 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                    <span><strong>Hard Ingestion Quotas:</strong> Set monthly trace or spend ceilings per project.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                    <span><strong>Automatic Throttling:</strong> When quota is reached, TokenGuard returns HTTP 429 to protect your cloud billing.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                    <span><strong>Slack & Webhook Early Warnings:</strong> Receive progressive alerts at 75%, 90%, and 100% consumption.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Full Feature Grid ───────────────────────────────────────────── */}
        <section id="features" className="py-20 md:py-28 border-b bg-muted/10">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-xs uppercase tracking-widest font-bold text-primary mb-3">
                Full-Stack Observability
              </h2>
              <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Everything required to run reliable agents in production.
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl border bg-card/60 hover:border-primary/50 transition-all">
                <Layers className="w-8 h-8 text-primary mb-4" />
                <h4 className="text-lg font-bold mb-2">Multi-Turn Session Tracing</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Group sequential calls into unified conversation sessions with <code className="text-xs bg-muted px-1 py-0.5 rounded">sessionId</code>. Track multi-turn context drift easily.
                </p>
              </div>

              <div className="p-6 rounded-2xl border bg-card/60 hover:border-primary/50 transition-all">
                <Bell className="w-8 h-8 text-primary mb-4" />
                <h4 className="text-lg font-bold mb-2">Slack & Webhook Alerts</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Get rich Block-Kit Slack messages or custom webhooks when error rates spike or single requests breach cost thresholds.
                </p>
              </div>

              <div className="p-6 rounded-2xl border bg-card/60 hover:border-primary/50 transition-all">
                <Download className="w-8 h-8 text-primary mb-4" />
                <h4 className="text-lg font-bold mb-2">Dataset Export (JSONL/CSV)</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Export production traces directly as JSONL datasets for model fine-tuning and evaluation, or as CSV for analysis.
                </p>
              </div>

              <div className="p-6 rounded-2xl border bg-card/60 hover:border-primary/50 transition-all">
                <Terminal className="w-8 h-8 text-primary mb-4" />
                <h4 className="text-lg font-bold mb-2">OpenTelemetry (OTel) Native</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Forward standard OTLP JSON traces from any collector or OTel SDK directly to TokenGuard without proprietary lock-in.
                </p>
              </div>

              <div className="p-6 rounded-2xl border bg-card/60 hover:border-primary/50 transition-all">
                <Cpu className="w-8 h-8 text-primary mb-4" />
                <h4 className="text-lg font-bold mb-2">Model & Provider Analytics</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Breakdown costs and latency across Groq, OpenAI, Anthropic, Mistral, and custom open-source deployments.
                </p>
              </div>

              <div className="p-6 rounded-2xl border bg-card/60 hover:border-primary/50 transition-all">
                <Activity className="w-8 h-8 text-primary mb-4" />
                <h4 className="text-lg font-bold mb-2">Error & Retry Diagnostics</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Correlate agent crashes with exact prompt payloads, error types, stack traces, and wasted dollar figures.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 1-Line SDK Integration Section ──────────────────────────────── */}
        <section id="code" className="py-20 md:py-28 border-b">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <h2 className="text-xs uppercase tracking-widest font-bold text-primary mb-3">
                Developer Experience
              </h2>
              <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Integrate in literally one line of code.
              </h3>
              <p className="text-muted-foreground mt-3 text-base">
                No complex instrumentation code. Wrap your existing Groq, OpenAI, or OTel client and start tracking immediately.
              </p>
            </div>

            <LandingCodeTabs />
          </div>
        </section>

        {/* ─── Pricing Section ─────────────────────────────────────────────── */}
        <section id="pricing" className="py-20 md:py-28 border-b bg-muted/15">
          <div className="text-center max-w-3xl mx-auto px-6 mb-12">
            <h2 className="text-xs uppercase tracking-widest font-bold text-primary mb-3">
              Transparent Pricing
            </h2>
            <h3 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
              Pay for value, not artificial seat gouging.
            </h3>
            <p className="text-muted-foreground mt-4 text-base sm:text-lg">
              Start free. Upgrade as your agent traffic scales. Save 17% with annual billing.
            </p>
          </div>

          <LandingPricingTable isAuthenticated={isAuthenticated} />
        </section>

        {/* ─── FAQ Section ─────────────────────────────────────────────────── */}
        <section className="py-20 border-b">
          <div className="max-w-4xl mx-auto px-6">
            <div className="text-center mb-14">
              <h3 className="text-3xl font-extrabold tracking-tight">Frequently Asked Questions</h3>
              <p className="text-muted-foreground mt-2 text-sm">Have a question? We have answers.</p>
            </div>

            <div className="space-y-6">
              <div className="p-6 rounded-xl border bg-card/60">
                <h4 className="font-semibold text-base mb-2">Does TokenGuard add latency to my LLM calls?</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  No. Our SDKs use an asynchronous in-memory background transport with batching and backoff retries.
                  Your API calls execute at native speed, adding less than 2ms total process overhead.
                </p>
              </div>

              <div className="p-6 rounded-xl border bg-card/60">
                <h4 className="font-semibold text-base mb-2">Is prompt and response data secure?</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Yes. All payloads are encrypted in transit via TLS and at rest. You can configure data retention
                  limits per project and choose to mask sensitive user credentials before ingestion.
                </p>
              </div>

              <div className="p-6 rounded-xl border bg-card/60">
                <h4 className="font-semibold text-base mb-2">Can we self-host TokenGuard on our own cloud?</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Yes! For enterprise teams with strict data residency, HIPAA, or SOC2 requirements,
                  we offer on-premise Docker and Kubernetes Helm deployments. Contact our enterprise team to get started.
                </p>
              </div>

              <div className="p-6 rounded-xl border bg-card/60">
                <h4 className="font-semibold text-base mb-2">Can I cancel or switch plans at any time?</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Yes, you can upgrade, downgrade, or cancel your subscription at any time directly through the
                  dashboard billing portal. There are no lock-in contracts or cancellation penalties.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Bottom CTA ──────────────────────────────────────────────────── */}
        <section className="py-24 relative overflow-hidden text-center bg-gradient-to-b from-card to-background">
          <div className="max-w-4xl mx-auto px-6">
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-4">
              Ready to take control of your LLM spend?
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg mb-8 max-w-2xl mx-auto">
              Join developers using TokenGuard to trace, optimize, and enforce agent spend in production.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild size="lg" className="w-full sm:w-auto px-8 py-6 rounded-xl text-base shadow-xl shadow-primary/20">
                <Link href={isAuthenticated ? "/dashboard" : "/signup"}>
                  {isAuthenticated ? "Open Dashboard" : "Start Free in 2 Minutes"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto px-8 py-6 rounded-xl text-base">
                <Link href="/roadmap">View Product Roadmap</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* ─── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t py-12 bg-muted/20 text-sm text-muted-foreground">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2">
            <div className="flex items-center gap-2 font-bold text-base text-foreground mb-3">
              <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center text-primary-foreground">
                <Zap className="w-3.5 h-3.5 fill-current" />
              </div>
              <span>TokenGuard</span>
            </div>
            <p className="text-xs text-muted-foreground max-w-sm leading-relaxed mb-4">
              Production LLM observability, proactive cost waste detection, and hard spend enforcement for AI agents.
            </p>
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} TokenGuard Inc. All rights reserved.
            </p>
          </div>

          <div>
            <h5 className="font-semibold text-foreground text-xs uppercase tracking-wider mb-3">Product</h5>
            <ul className="space-y-2 text-xs">
              <li><Link href="#features" className="hover:text-foreground">Features</Link></li>
              <li><Link href="#differentiators" className="hover:text-foreground">Why TokenGuard</Link></li>
              <li><Link href="#pricing" className="hover:text-foreground">Pricing</Link></li>
              <li><Link href="/roadmap" className="hover:text-foreground">Roadmap</Link></li>
            </ul>
          </div>

          <div>
            <h5 className="font-semibold text-foreground text-xs uppercase tracking-wider mb-3">Developers</h5>
            <ul className="space-y-2 text-xs">
              <li><Link href="#code" className="hover:text-foreground">Python SDK</Link></li>
              <li><Link href="#code" className="hover:text-foreground">Node.js SDK</Link></li>
              <li><Link href="#code" className="hover:text-foreground">OpenTelemetry</Link></li>
              <li><Link href="/dashboard" className="hover:text-foreground">API Keys</Link></li>
            </ul>
          </div>

          <div>
            <h5 className="font-semibold text-foreground text-xs uppercase tracking-wider mb-3">Company</h5>
            <ul className="space-y-2 text-xs">
              <li><Link href="mailto:hello@tokenguard.dev" className="hover:text-foreground">Contact</Link></li>
              <li><Link href="mailto:sales@tokenguard.dev" className="hover:text-foreground">Enterprise Sales</Link></li>
              <li><Link href="/roadmap" className="hover:text-foreground">Changelog</Link></li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
