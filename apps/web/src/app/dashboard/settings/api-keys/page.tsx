import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { projects, apiKeys } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { maskKeyPrefix } from "@/lib/api-keys";
import { ApiKeyManager } from "@/components/settings/api-key-manager";
import { SdkSetupGuide } from "@/components/settings/sdk-setup-guide";
import Link from "next/link";
import { KeyRound, Settings2 } from "lucide-react";

export default async function ApiKeysSettingsPage() {
  const session = await auth();
  if (!session?.user) return null;

  const project = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, session.user.id))
    .limit(1)
    .then((r) => r[0]);

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
  // Pick the active key prefix or fallback string
  const activeKeyHint = activeKeys[0]?.keyPrefix
    ? `${activeKeys[0].keyPrefix}...`
    : "tg_live_your_key_here";

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">API Keys & Integrations</h1>
        <p className="text-muted-foreground">
          Create API keys and find copy-ready integration examples for all major LLMs.
        </p>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex border-b">
        <Link
          href="/dashboard/settings/api-keys"
          className="flex items-center gap-2 border-b-2 border-primary px-4 py-2.5 text-sm font-semibold text-primary"
        >
          <KeyRound className="h-4 w-4" />
          API Keys & SDKs
        </Link>
        <Link
          href="/dashboard/settings/project"
          className="flex items-center gap-2 border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <Settings2 className="h-4 w-4" />
          Project Settings
        </Link>
      </div>

      {/* API Key Management */}
      <ApiKeyManager
        projectId={project.id}
        initialKeys={activeKeys.map((k) => ({
          ...k,
          displayKey: maskKeyPrefix(k.keyPrefix),
          lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
          createdAt: k.createdAt.toISOString(),
        }))}
      />

      {/* Full SDK & Platform Setup Guide */}
      <SdkSetupGuide apiKey={activeKeyHint} />
    </div>
  );
}
