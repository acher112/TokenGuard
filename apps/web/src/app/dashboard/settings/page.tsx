import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { projects, apiKeys } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { maskKeyPrefix } from "@/lib/api-keys";
import { ApiKeyManager } from "@/components/settings/api-key-manager";
import { PlanCard } from "@/components/settings/plan-card";
import { ProfileCard } from "@/components/settings/profile-card";
import { DangerZone } from "@/components/settings/danger-zone";
import { getUserUsageSummary } from "@/lib/billing/usage";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) return null;

  const [project, usageSummary] = await Promise.all([
    db
      .select()
      .from(projects)
      .where(eq(projects.userId, session.user.id))
      .limit(1)
      .then((r) => r[0]),
    getUserUsageSummary(session.user.id),
  ]);

  if (!project) return null;

  const keys = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      lastUsedAt: apiKeys.lastUsedAt,
      createdAt: apiKeys.createdAt,
      revokedAt: apiKeys.revokedAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.projectId, project.id));

  const activeKeys = keys.filter((k) => !k.revokedAt);

  // Pro/Team plans can extend retention
  const canExtendRetention = usageSummary.plan !== "free";

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your plan, project, and API keys.</p>
      </div>

      {/* Plan & Usage */}
      <PlanCard usage={usageSummary} />

      {/* Project name + Account info */}
      <ProfileCard
        projectId={project.id}
        currentName={project.name}
        userEmail={session.user.email ?? ""}
      />

      {/* API Keys */}
      <ApiKeyManager
        projectId={project.id}
        initialKeys={activeKeys.map((k) => ({
          ...k,
          displayKey: maskKeyPrefix(k.keyPrefix),
          lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
          createdAt: k.createdAt.toISOString(),
        }))}
      />

      {/* Danger Zone — retention, delete project, delete account */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-destructive">Danger Zone</h2>
        <DangerZone
          projectId={project.id}
          projectName={project.name}
          currentRetention={project.retentionDays as "7" | "30" | "90"}
          canExtendRetention={canExtendRetention}
        />
      </div>
    </div>
  );
}
