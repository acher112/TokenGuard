import { db } from "@/lib/db/client";
import { alerts, alertEvents, traces, errors } from "@/lib/db/schema";
import { eq, and, gte, desc, sql } from "drizzle-orm";
import { Resend } from "resend";
import { formatCost } from "@/lib/utils";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "alerts@tokenguard.dev";

export interface AlertEvaluationResult {
  alertId: string;
  triggered: boolean;
  metric: string;
  currentValue: number;
  threshold: number;
  operator: string;
  message?: string;
}

/**
 * Evaluates all active alerts for a project against current metrics.
 * Dispatches notifications (Email / Webhook) and records to alert_events.
 */
export async function evaluateAlertsForProject(projectId: string): Promise<AlertEvaluationResult[]> {
  const activeAlerts = await db
    .select()
    .from(alerts)
    .where(and(eq(alerts.projectId, projectId), eq(alerts.isActive, true)));

  if (activeAlerts.length === 0) return [];

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  // 1. Pre-calculate today's metrics for the project
  const todayTraces = await db
    .select({
      id: traces.id,
      status: traces.status,
      cost: traces.totalCostUsd,
      startedAt: traces.startedAt,
    })
    .from(traces)
    .where(and(eq(traces.projectId, projectId), gte(traces.startedAt, startOfToday)));

  const totalCostToday = todayTraces.reduce((sum, t) => sum + parseFloat(t.cost || "0"), 0);
  const totalTracesToday = todayTraces.length;
  const failedTracesToday = todayTraces.filter((t) => t.status === "failed").length;
  const errorRateToday = totalTracesToday > 0 ? (failedTracesToday / totalTracesToday) * 100 : 0;

  const maxSingleCostToday = todayTraces.reduce(
    (max, t) => Math.max(max, parseFloat(t.cost || "0")),
    0
  );

  const results: AlertEvaluationResult[] = [];

  for (const rule of activeAlerts) {
    const threshold = parseFloat(rule.threshold);
    let currentValue = 0;
    let message = "";

    switch (rule.metric) {
      case "daily_cost":
        currentValue = totalCostToday;
        message = `Daily AI spend reached ${formatCost(currentValue)}, exceeding threshold of ${formatCost(threshold)}.`;
        break;
      case "error_rate":
        currentValue = errorRateToday;
        message = `Error rate today reached ${currentValue.toFixed(1)}%, exceeding threshold of ${threshold}%.`;
        break;
      case "error_count":
        currentValue = failedTracesToday;
        message = `Total errors today reached ${currentValue}, exceeding threshold of ${threshold}.`;
        break;
      case "per_request_cost":
        currentValue = maxSingleCostToday;
        message = `Single request cost reached ${formatCost(currentValue)}, exceeding threshold of ${formatCost(threshold)}.`;
        break;
      default:
        continue;
    }

    // Evaluate operator
    let triggered = false;
    if (rule.operator === "gt" && currentValue > threshold) triggered = true;
    else if (rule.operator === "gte" && currentValue >= threshold) triggered = true;
    else if (rule.operator === "lt" && currentValue < threshold) triggered = true;
    else if (rule.operator === "lte" && currentValue <= threshold) triggered = true;

    results.push({
      alertId: rule.id,
      triggered,
      metric: rule.metric,
      currentValue,
      threshold,
      operator: rule.operator,
      message,
    });

    if (triggered) {
      // Cooldown check: don't fire if alert triggered within the last 1 hour
      const recentEvent = await db
        .select({ id: alertEvents.id })
        .from(alertEvents)
        .where(and(eq(alertEvents.alertId, rule.id), gte(alertEvents.triggeredAt, oneHourAgo)))
        .limit(1)
        .then((r) => r[0]);

      if (!recentEvent) {
        // Record alert event
        await db.insert(alertEvents).values({
          alertId: rule.id,
          value: currentValue.toString(),
          message,
          triggeredAt: new Date(),
        });

        // Update alert lastTriggeredAt
        await db
          .update(alerts)
          .set({ lastTriggeredAt: new Date() })
          .where(eq(alerts.id, rule.id));

        // Dispatch notification
        await dispatchNotification(rule, message, currentValue, threshold);
      }
    }
  }

  return results;
}

/**
 * Dispatches an alert event to the configured channel (Email via Resend, Webhook, or Slack).
 */
async function dispatchNotification(
  rule: { id: string; channel: string; destination: string; metric: string; name: string },
  message: string,
  currentValue: number,
  threshold: number
): Promise<void> {
  const subject = `🚨 [TokenGuard Alert] ${rule.name}: ${rule.metric.replace("_", " ").toUpperCase()} Triggered`;

  // 1. Email Channel
  if (rule.channel === "email" && rule.destination) {
    if (resend) {
      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: rule.destination,
          subject,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h2 style="color: #0f172a; margin-top: 0;">TokenGuard Alert: ${rule.name}</h2>
              <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 16px; margin: 16px 0;">
                <p style="color: #991b1b; font-weight: 600; margin: 0;">${message}</p>
              </div>
              <p style="color: #64748b; font-size: 14px;">
                Log into your <a href="https://tokenguard.dev/dashboard" style="color: #6366f1; text-decoration: underline;">TokenGuard Dashboard</a> to review traces and take corrective action.
              </p>
              <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">TokenGuard Monitoring System</p>
            </div>
          `,
        });
      } catch (err) {
        console.error("[TokenGuard Alerts] Failed to send email via Resend:", err);
      }
    } else {
      console.log(`[TokenGuard Alerts (Local Dev - No RESEND_API_KEY)] To: ${rule.destination} | Subject: ${subject} | ${message}`);
    }
  }

  // 2. Slack Channel — rich block-kit message with action button
  if (rule.channel === "slack" && rule.destination) {
    try {
      await fetch(rule.destination, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blocks: [
            {
              type: "header",
              text: { type: "plain_text", text: "🚨 TokenGuard Alert Triggered", emoji: true },
            },
            {
              type: "section",
              fields: [
                { type: "mrkdwn", text: `*Alert:*\n${rule.name}` },
                { type: "mrkdwn", text: `*Metric:*\n${rule.metric.replace(/_/g, " ").toUpperCase()}` },
                { type: "mrkdwn", text: `*Current Value:*\n${currentValue.toFixed(4)}` },
                { type: "mrkdwn", text: `*Threshold:*\n${threshold}` },
              ],
            },
            {
              type: "section",
              text: { type: "mrkdwn", text: `*Details:*\n${message}` },
            },
            {
              type: "actions",
              elements: [
                {
                  type: "button",
                  text: { type: "plain_text", text: "View Dashboard →", emoji: true },
                  url: "https://tokenguard.dev/dashboard",
                  style: "primary",
                },
              ],
            },
            {
              type: "context",
              elements: [
                { type: "mrkdwn", text: `TokenGuard Monitoring • ${new Date().toUTCString()}` },
              ],
            },
          ],
        }),
      });
    } catch (err) {
      console.error("[TokenGuard Alerts] Failed to dispatch Slack alert:", err);
    }
  }

  // 3. Generic Webhook Channel (Discord / Custom API)
  if (rule.channel === "webhook" && rule.destination) {
    try {
      await fetch(rule.destination, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `🚨 *TokenGuard Alert*: ${rule.name}\n${message}`,
          metric: rule.metric,
          currentValue,
          threshold,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (err) {
      console.error("[TokenGuard Alerts] Failed to dispatch webhook:", err);
    }
  }
}
