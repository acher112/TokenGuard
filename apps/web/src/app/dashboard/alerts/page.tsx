import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { alerts, alertEvents, projects } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/utils";
import { AlertsManager, type SerializedAlert } from "@/components/alerts/alerts-manager";
import { History, CheckCircle, AlertOctagon } from "lucide-react";

export default async function AlertsPage() {
  const session = await auth();
  if (!session?.user) return null;

  const project = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, session.user.id))
    .limit(1)
    .then((r) => r[0]);

  if (!project) return null;

  // 1. Fetch configured alerts
  const projectAlerts = await db
    .select()
    .from(alerts)
    .where(eq(alerts.projectId, project.id))
    .orderBy(desc(alerts.createdAt));

  const serializedAlerts: SerializedAlert[] = projectAlerts.map((a) => ({
    id: a.id,
    name: a.name,
    metric: a.metric,
    operator: a.operator,
    threshold: a.threshold,
    channel: a.channel,
    destination: a.destination,
    isActive: a.isActive,
    createdAt: a.createdAt.toISOString(),
  }));

  // 2. Fetch triggered alert events
  const historyEvents = await db
    .select({
      id: alertEvents.id,
      value: alertEvents.value,
      message: alertEvents.message,
      triggeredAt: alertEvents.triggeredAt,
      metric: alerts.metric,
      channel: alerts.channel,
      destination: alerts.destination,
      name: alerts.name,
    })
    .from(alertEvents)
    .innerJoin(alerts, eq(alertEvents.alertId, alerts.id))
    .where(eq(alerts.projectId, project.id))
    .orderBy(desc(alertEvents.triggeredAt))
    .limit(20);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Alerts & Notifications</h1>
        <p className="text-sm text-muted-foreground">
          Define automated thresholds to receive notifications via Email or Webhook when AI costs or error rates spike.
        </p>
      </div>

      {/* Rules Manager */}
      <AlertsManager initialAlerts={serializedAlerts} />

      {/* Triggered Alert History */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-base">Triggered Alert History</CardTitle>
              <CardDescription>
                Audit trail of all alerts fired for this project
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {historyEvents.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <CheckCircle className="mx-auto mb-2 h-8 w-8 text-emerald-500/50" />
              <p className="font-semibold text-foreground">No Alerts Triggered</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                All metrics are currently running within configured thresholds.
              </p>
            </div>
          ) : (
            <div className="divide-y text-sm">
              {historyEvents.map((evt) => (
                <div key={evt.id} className="flex items-center justify-between p-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <AlertOctagon className="h-4 w-4 text-rose-500" />
                      <span className="font-mono text-xs font-semibold capitalize">
                        {evt.name || evt.metric.replace("_", " ")}
                      </span>
                      <Badge variant="outline" className="font-mono text-[10px] capitalize">
                        via {evt.channel}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {evt.message || `Triggered value: ${evt.value}`}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="font-mono text-xs font-bold text-foreground">
                      {evt.value}
                    </span>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {formatRelativeTime(evt.triggeredAt)}
                    </p>
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
