"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LandingPricingTable({ isAuthenticated }: { isAuthenticated?: boolean }) {
  const [interval, setInterval] = useState<"monthly" | "annual">("monthly");

  const plans = [
    {
      name: "Free",
      badge: null,
      price: "$0",
      period: "forever",
      description: "For individual developers and hobby projects getting started with LLM observability.",
      cta: isAuthenticated ? "Go to Dashboard" : "Start Free",
      ctaHref: isAuthenticated ? "/dashboard" : "/signup",
      ctaVariant: "outline" as const,
      features: [
        "10,000 traces / month",
        "7-day data retention",
        "1 project · 1 seat",
        "Basic Cost Waste Engine",
        "Python & Node.js SDKs",
        "Community support",
      ],
    },
    {
      name: "Pro",
      badge: "Most Popular",
      price: interval === "annual" ? "$490" : "$49",
      period: interval === "annual" ? "/year" : "/month",
      subtext: interval === "annual" ? "Save $98 per year (17% off)" : "Billed monthly",
      description: "For growing teams building production AI agents that need cost protection and collaboration.",
      cta: isAuthenticated ? "Upgrade to Pro" : "Start 14-Day Trial",
      ctaHref: isAuthenticated ? "/dashboard/settings" : "/signup?plan=pro",
      ctaVariant: "default" as const,
      highlight: true,
      features: [
        "100,000 traces / month",
        "30-day data retention",
        "5 projects included",
        "3 team seats included (+$10/seat)",
        "Full AI Cost Waste Engine with proactive recommendations",
        "Slack (Block-Kit) + Email + Webhook alerts",
        "Multi-turn session tracing",
        "Dataset export (JSONL & CSV)",
        "Email support with 24h SLA",
      ],
    },
    {
      name: "Enterprise",
      badge: "High Scale",
      price: interval === "annual" ? "$2,490" : "$249",
      period: interval === "annual" ? "/year" : "/month",
      subtext: interval === "annual" ? "Save $498 per year (17% off)" : "Billed monthly",
      description: "For organizations scaling high-volume LLM workloads needing governance, compliance, and custom SLAs.",
      cta: "Contact Sales",
      ctaHref: "mailto:sales@tokenguard.dev?subject=TokenGuard%20Enterprise%20Inquiry",
      ctaVariant: "outline" as const,
      features: [
        "1,000,000 traces / month (usage-based overage)",
        "90-day retention (180-day add-on available)",
        "Unlimited projects · Unlimited seats",
        "Custom waste rules + hard spend blocking",
        "OpenTelemetry (OTel) OTLP native ingestion",
        "Role-Based Access Control (RBAC)",
        "SSO (Google Workspace / Okta)",
        "Self-hosting deployment option (Docker/Helm)",
        "Priority dedicated Slack channel support",
      ],
    },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto px-4">
      {/* Interval Toggle */}
      <div className="flex justify-center mb-12">
        <div className="inline-flex items-center gap-2 p-1.5 rounded-full border bg-card/60 backdrop-blur shadow-sm">
          <button
            onClick={() => setInterval("monthly")}
            className={`px-5 py-2 text-sm font-medium rounded-full transition-all ${
              interval === "monthly"
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Monthly Billing
          </button>
          <button
            onClick={() => setInterval("annual")}
            className={`flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-full transition-all ${
              interval === "annual"
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>Annual Billing</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              Save 17%
            </span>
          </button>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
        {plans.map((p) => (
          <div
            key={p.name}
            className={`relative flex flex-col rounded-2xl p-8 transition-all border ${
              p.highlight
                ? "border-primary bg-card/90 shadow-xl shadow-primary/10 ring-1 ring-primary/40 md:-translate-y-2"
                : "border-border/60 bg-card/50 hover:border-border"
            }`}
          >
            {p.badge && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-primary text-primary-foreground shadow-md">
                  <Sparkles className="w-3 h-3" />
                  {p.badge}
                </span>
              </div>
            )}

            <div className="mb-6">
              <h3 className="text-xl font-bold tracking-tight mb-2">{p.name}</h3>
              <p className="text-sm text-muted-foreground min-h-[40px] leading-relaxed">
                {p.description}
              </p>
            </div>

            <div className="mb-6 pb-6 border-b">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold tracking-tight">{p.price}</span>
                <span className="text-sm font-medium text-muted-foreground">{p.period}</span>
              </div>
              {p.subtext && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                  {p.subtext}
                </p>
              )}
            </div>

            {/* Features */}
            <ul className="space-y-3.5 flex-1 mb-8">
              {p.features.map((feat) => (
                <li key={feat} className="flex items-start gap-2.5 text-sm">
                  <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground/90">{feat}</span>
                </li>
              ))}
            </ul>

            {/* CTA Button */}
            <Button
              asChild
              variant={p.ctaVariant}
              className={`w-full py-5 text-sm font-semibold rounded-xl transition-all ${
                p.highlight ? "shadow-md hover:shadow-primary/25" : ""
              }`}
            >
              <Link href={p.ctaHref} className="flex items-center justify-center gap-2">
                {p.cta}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        ))}
      </div>

      {/* Enterprise Self-Hosting Callout */}
      <div className="mt-12 rounded-2xl border border-border/60 bg-muted/40 p-6 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
        <div>
          <h4 className="font-semibold text-base">Need HIPAA compliance or On-Premise deployment?</h4>
          <p className="text-sm text-muted-foreground mt-0.5">
            TokenGuard offers isolated Docker / Helm chart deployments for regulated enterprise workloads.
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="whitespace-nowrap">
          <Link href="mailto:sales@tokenguard.dev?subject=On-Premise%20Self-Hosting%20Inquiry">
            Talk to Enterprise Engineering →
          </Link>
        </Button>
      </div>
    </div>
  );
}
