import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ProfileCard } from "@/components/settings/profile-card";
import { DangerZone } from "@/components/settings/danger-zone";
import { getUserUsageSummary } from "@/lib/billing/usage";
import Link from "next/link";
import { KeyRound, Settings2 } from "lucide-react";

export default async function ProjectSettingsPage() {
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

  const canExtendRetention = usageSummary.plan !== "free";

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Project Settings</h1>
        <p className="text-muted-foreground">Manage your project profile, data retention, and workspace.</p>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex border-b">
        <Link
          href="/dashboard/settings/api-keys"
          className="flex items-center gap-2 border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <KeyRound className="h-4 w-4" />
          API Keys & SDKs
        </Link>
        <Link
          href="/dashboard/settings/project"
          className="flex items-center gap-2 border-b-2 border-primary px-4 py-2.5 text-sm font-semibold text-primary"
        >
          <Settings2 className="h-4 w-4" />
          Project Settings
        </Link>
      </div>

      {/* Project name + Account info */}
      <ProfileCard
        projectId={project.id}
        currentName={project.name}
        userEmail={session.user.email ?? ""}
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
