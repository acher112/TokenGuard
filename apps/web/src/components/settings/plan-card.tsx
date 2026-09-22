"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { UsageSummary } from "@/lib/billing/usage";

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
      <div
        className="h-2 rounded-full bg-primary transition-all"
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  );
}

interface PlanCardProps {
  usage: UsageSummary;
}

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  pro: "Pro",
  team: "Enterprise",
};

const PLAN_BADGE_VARIANTS: Record<string, "outline" | "secondary" | "success"> = {
  free: "outline",
  pro: "secondary",
  team: "success",
};

const PLAN_FEATURES: Record<string, string[]> = {
  free: [
    "10,000 traces / month",
    "7-day data retention",
    "1 project · 1 seat",
    "Basic Cost Waste Engine",
    "Community support",
  ],
  pro: [
    "100,000 traces / month",
    "30-day data retention",
    "5 projects · 3 seats (+$10/seat after)",
    "Full AI cost waste recommendations",
    "Slack + email + webhook alerts",
    "Session tracing (multi-turn grouping)",
    "Dataset export (JSONL / CSV)",
    "Email support",
  ],
  team: [
    "1,000,000 traces / month (usage overage)",
    "90-day retention (180-day add-on available)",
    "Unlimited projects · Unlimited seats",
    "Custom rules + auto-enforcement alerts",
    "OpenTelemetry (OTel) OTLP ingestion",
    "RBAC (Owner / Admin / Viewer)",
    "SSO (Google Workspace / Okta) — coming soon",
    "Priority + dedicated Slack support",
  ],
};

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

export function PlanCard({ usage }: PlanCardProps) {
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [billingInterval, setBillingInterval] = useState<"monthly" | "annual">("monthly");

  const plan = usage.plan;
  const tracePercent = Math.min(
    Math.round((usage.tracesThisMonth / usage.traceLimit) * 100),
    100
  );
  const projectPercent =
    usage.projectLimit === Infinity || usage.projectLimit < 0
      ? 0
      : Math.min(Math.round((usage.projectCount / usage.projectLimit) * 100), 100);

  async function handleUpgrade(targetPlan: "pro" | "team") {
    setLoadingCheckout(true);
    try {
      const res = await fetch("/api/v1/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: targetPlan, interval: billingInterval }),
      });
      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        alert(data.error ?? "Failed to create checkout session");
      }
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setLoadingCheckout(false);
    }
  }

  async function handleManageSubscription() {
    setLoadingPortal(true);
    try {
      const res = await fetch("/api/v1/billing/portal", { method: "POST" });
      const data = await res.json();
      if (data.portalUrl) {
        window.location.href = data.portalUrl;
      } else {
        alert(data.error ?? "Failed to open customer portal");
      }
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setLoadingPortal(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Subscription Plan</CardTitle>
            <CardDescription>Your current plan and usage this month.</CardDescription>
          </div>
          <Badge variant={PLAN_BADGE_VARIANTS[plan] ?? "outline"} className="text-sm px-3 py-1">
            {PLAN_LABELS[plan] ?? plan} Plan
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Usage meters */}
        <div className="space-y-4">
          {/* Traces */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Traces this month</span>
              <span className="text-muted-foreground">
                {usage.tracesThisMonth.toLocaleString()} / {formatNumber(usage.traceLimit)}
              </span>
            </div>
            <ProgressBar value={tracePercent} />
            {tracePercent >= 90 && (
              <p className="text-xs text-destructive">
                ⚠️ You&apos;ve used {tracePercent}% of your monthly trace quota.
                {plan !== "team" && " Upgrade to avoid interruptions."}
              </p>
            )}
          </div>

          {/* Projects */}
          {usage.projectLimit > 0 && usage.projectLimit !== Infinity && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Projects</span>
                <span className="text-muted-foreground">
                  {usage.projectCount} / {usage.projectLimit}
                </span>
              </div>
              <ProgressBar value={projectPercent} />
            </div>
          )}

          {/* Seats */}
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Team seats</span>
            <span className="text-muted-foreground">
              {usage.maxSeats === Infinity ? (
                "Unlimited"
              ) : usage.maxSeats === 1 ? (
                "1 seat"
              ) : (
                `${usage.maxSeats} included (+$10/seat after)`
              )}
            </span>
          </div>

          {/* Retention */}
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Data retention</span>
            <span className="text-muted-foreground">
              {usage.retentionDays} days {plan === "team" && "(180-day add-on available)"}
            </span>
          </div>
        </div>

        {/* Plan features */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            {PLAN_LABELS[plan]} plan includes:
          </p>
          <ul className="space-y-1">
            {(PLAN_FEATURES[plan] ?? []).map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-sm">
                <span className="text-green-500">✓</span>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {/* Annual / Monthly toggle — shown only for non-Enterprise plans */}
        {plan !== "team" && (
          <div className="flex items-center justify-center gap-1 p-1 bg-muted rounded-lg">
            <button
              onClick={() => setBillingInterval("monthly")}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                billingInterval === "monthly"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingInterval("annual")}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 ${
                billingInterval === "annual"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Annual
              <span className="text-xs text-green-600 font-semibold">Save 17%</span>
            </button>
          </div>
        )}

        {/* CTAs */}
        <div className="flex flex-col gap-2 sm:flex-row">
          {plan === "free" && (
            <>
              <Button
                onClick={() => handleUpgrade("pro")}
                disabled={loadingCheckout}
                className="flex-1"
              >
                {loadingCheckout
                  ? "Redirecting…"
                  : billingInterval === "annual"
                  ? "Upgrade to Pro — $490/yr"
                  : "Upgrade to Pro — $49/mo"}
              </Button>
              <Button
                variant="outline"
                onClick={() => handleUpgrade("team")}
                disabled={loadingCheckout}
                className="flex-1"
              >
                {billingInterval === "annual"
                  ? "Enterprise — $2,490/yr"
                  : "Enterprise — $249/mo"}
              </Button>
            </>
          )}
          {plan === "pro" && (
            <>
              <Button
                variant="outline"
                onClick={() => handleUpgrade("team")}
                disabled={loadingCheckout}
                className="flex-1"
              >
                {loadingCheckout
                  ? "Redirecting…"
                  : billingInterval === "annual"
                  ? "Upgrade to Enterprise — $2,490/yr"
                  : "Upgrade to Enterprise — $249/mo"}
              </Button>
              <Button
                variant="ghost"
                onClick={handleManageSubscription}
                disabled={loadingPortal}
                className="flex-1"
              >
                {loadingPortal ? "Loading…" : "Manage Subscription"}
              </Button>
            </>
          )}
          {plan === "team" && (
            <Button
              variant="ghost"
              onClick={handleManageSubscription}
              disabled={loadingPortal}
              className="flex-1"
            >
              {loadingPortal ? "Loading…" : "Manage Subscription"}
            </Button>
          )}
        </div>

      </CardContent>
    </Card>
  );
}
