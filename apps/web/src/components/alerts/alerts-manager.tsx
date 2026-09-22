"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Bell, Plus, Trash2, Mail, Webhook } from "lucide-react";

export interface SerializedAlert {
  id: string;
  name: string;
  metric: string;
  operator: string;
  threshold: string;
  channel: string;
  destination: string;
  isActive: boolean;
  createdAt: string;
}

interface Props {
  initialAlerts: SerializedAlert[];
}

export function AlertsManager({ initialAlerts }: Props) {
  const { toast } = useToast();
  const [alertList, setAlertList] = useState<SerializedAlert[]>(initialAlerts);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [name, setName] = useState<string>("Daily Cost Guard");
  const [metric, setMetric] = useState<"daily_cost" | "per_request_cost" | "error_rate" | "error_count">("daily_cost");
  const [operator, setOperator] = useState<"gt" | "gte" | "lt" | "lte">("gt");
  const [threshold, setThreshold] = useState<string>("50");
  const [channel, setChannel] = useState<"email" | "webhook" | "slack">("email");
  const [destination, setDestination] = useState<string>("");

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!threshold || !destination.trim()) {
      toast({
        title: "Validation Error",
        description: "Please specify both a threshold and a destination address.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/v1/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || "Alert Rule",
          metric,
          operator,
          threshold: parseFloat(threshold),
          channel,
          destination: destination.trim(),
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to create alert rule");
      }

      const { alert } = await res.json();
      setAlertList((prev) => [...prev, alert]);
      setIsOpen(false);
      setDestination("");

      toast({
        title: "Alert Created",
        description: `Alert rule configured for ${metric.replace("_", " ")}.`,
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to create alert",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (alert: SerializedAlert) => {
    const nextState = !alert.isActive;
    setAlertList((prev) =>
      prev.map((a) => (a.id === alert.id ? { ...a, isActive: nextState } : a))
    );

    try {
      await fetch("/api/v1/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: alert.id, isActive: nextState }),
      });

      toast({
        title: nextState ? "Alert Enabled" : "Alert Paused",
        description: `Alert rule is now ${nextState ? "active" : "paused"}.`,
      });
    } catch {
      // Revert on error
      setAlertList((prev) =>
        prev.map((a) => (a.id === alert.id ? { ...a, isActive: alert.isActive } : a))
      );
    }
  };

  const handleDelete = async (id: string) => {
    setAlertList((prev) => prev.filter((a) => a.id !== id));

    try {
      await fetch(`/api/v1/alerts?id=${id}`, { method: "DELETE" });
      toast({ title: "Alert Deleted", description: "The rule has been removed." });
    } catch (err) {
      console.error(err);
    }
  };

  const formatMetricLabel = (m: string, thresh: string, op: string) => {
    const symbol = op === "gt" ? ">" : op === "gte" ? "≥" : op === "lt" ? "<" : "≤";
    if (m === "daily_cost") return `Daily Spend ${symbol} $${thresh}`;
    if (m === "per_request_cost") return `Request Cost ${symbol} $${thresh}`;
    if (m === "error_rate") return `Error Rate ${symbol} ${thresh}%`;
    if (m === "error_count") return `Daily Errors ${symbol} ${thresh}`;
    return `${m} ${symbol} ${thresh}`;
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Configured Alert Rules</h2>
          <p className="text-xs text-muted-foreground">
            Get notified immediately when budgets are exceeded or errors surge.
          </p>
        </div>

        <Button onClick={() => setIsOpen(true)} size="sm">
          <Plus className="mr-1.5 h-4 w-4" /> New Alert Rule
        </Button>
      </div>

      {/* Creation Modal / Inline Form */}
      {isOpen && (
        <Card className="border-primary/50 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Configure New Alert Rule</CardTitle>
            <CardDescription>
              Specify a threshold condition and choose where to send notifications.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateAlert} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Rule Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Daily Budget Warning"
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {/* Metric */}
                <div className="space-y-1.5">
                  <Label htmlFor="metric">Alert Metric</Label>
                  <select
                    id="metric"
                    value={metric}
                    onChange={(e) => setMetric(e.target.value as any)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="daily_cost">Daily AI Spend ($)</option>
                    <option value="per_request_cost">Single Request Spend ($)</option>
                    <option value="error_rate">Error Rate (%)</option>
                    <option value="error_count">Daily Error Count</option>
                  </select>
                </div>

                {/* Operator */}
                <div className="space-y-1.5">
                  <Label htmlFor="operator">Condition</Label>
                  <select
                    id="operator"
                    value={operator}
                    onChange={(e) => setOperator(e.target.value as any)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="gt">Exceeds (&gt;)</option>
                    <option value="gte">At least (&ge;)</option>
                    <option value="lt">Below (&lt;)</option>
                  </select>
                </div>

                {/* Threshold */}
                <div className="space-y-1.5">
                  <Label htmlFor="threshold">Threshold Value</Label>
                  <Input
                    id="threshold"
                    type="number"
                    step="any"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    placeholder={metric.includes("cost") ? "50.00" : "5"}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Channel */}
                <div className="space-y-1.5">
                  <Label htmlFor="channel">Delivery Channel</Label>
                  <select
                    id="channel"
                    value={channel}
                    onChange={(e) => setChannel(e.target.value as any)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="email">📧 Email Notification</option>
                    <option value="slack">💬 Slack (Block-kit)</option>
                    <option value="webhook">🔗 Webhook URL (Discord / Custom API)</option>
                  </select>
                </div>

                {/* Destination */}
                <div className="space-y-1.5">
                  <Label htmlFor="destination">
                    {channel === "email"
                      ? "Recipient Email Address"
                      : channel === "slack"
                      ? "Slack Incoming Webhook URL"
                      : "Webhook Endpoint URL"}
                  </Label>
                  <Input
                    id="destination"
                    type={channel === "email" ? "email" : "url"}
                    placeholder={
                      channel === "email"
                        ? "dev@company.com"
                        : channel === "slack"
                        ? "https://hooks.slack.com/services/T.../B.../..."
                        : "https://your-api.com/webhook"
                    }
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    required
                  />
                  {channel === "slack" && (
                    <p className="text-xs text-muted-foreground">
                      Create an Incoming Webhook at{" "}
                      <a
                        href="https://api.slack.com/apps"
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                      >
                        api.slack.com/apps
                      </a>
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Save Alert Rule"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Alerts Table */}
      <Card>
        <CardContent className="p-0">
          {alertList.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <Bell className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
              <p className="font-semibold text-foreground">No Alert Rules Set</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Set an alert to receive notifications when spending spikes or error rates rise.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {alertList.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between p-4 transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                      {alert.channel === "email" ? (
                        <Mail className="h-4 w-4" />
                      ) : (
                        <Webhook className="h-4 w-4" />
                      )}
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">
                          {alert.name}
                        </span>
                        <Badge variant="outline" className="font-mono text-xs">
                          {formatMetricLabel(alert.metric, alert.threshold, alert.operator)}
                        </Badge>
                        <Badge
                          variant={alert.isActive ? "success" : "secondary"}
                          className="text-[10px]"
                        >
                          {alert.isActive ? "Active" : "Paused"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">
                        Destination: {alert.destination}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(alert)}
                      className="text-xs"
                    >
                      {alert.isActive ? "Pause" : "Enable"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(alert.id)}
                      className="text-muted-foreground hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
