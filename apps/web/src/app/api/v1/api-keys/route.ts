import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { projects, apiKeys } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { generateApiKey, maskKeyPrefix } from "@/lib/api-keys";
import { PLAN_LIMITS } from "@/lib/billing";

const createKeySchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1).max(50).trim().default("Default"),
});

const revokeKeySchema = z.object({
  keyId: z.string().min(1),
  projectId: z.string().min(1),
});

// GET /api/v1/api-keys?projectId=xxx — list API keys for a project
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");

  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  // Verify project belongs to user
  const project = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, session.user.id)))
    .limit(1)
    .then((r) => r[0]);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

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
    .where(eq(apiKeys.projectId, projectId));

  // Return masked display of prefix — raw key never returned after creation
  return NextResponse.json({
    apiKeys: keys.map((k) => ({
      ...k,
      displayKey: maskKeyPrefix(k.keyPrefix),
    })),
  });
}

// POST /api/v1/api-keys — create a new API key
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createKeySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Verify project belongs to user
  const project = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.id, parsed.data.projectId),
        eq(projects.userId, session.user.id)
      )
    )
    .limit(1)
    .then((r) => r[0]);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Enforce plan API key limits
  const plan = (session.user as { plan?: string }).plan ?? "free";
  const limits = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS];
  const existingCount = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.projectId, parsed.data.projectId)))
    .then((r) => r.filter((k) => !k.revokedAt).length);

  if (existingCount >= limits.maxApiKeysPerProject) {
    return NextResponse.json(
      {
        error: "API key limit reached",
        code: "PLAN_LIMIT_EXCEEDED",
      },
      { status: 403 }
    );
  }

  const { rawKey, keyHash, keyPrefix } = generateApiKey();

  const [key] = await db
    .insert(apiKeys)
    .values({
      projectId: parsed.data.projectId,
      name: parsed.data.name,
      keyHash,
      keyPrefix,
    })
    .returning({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      createdAt: apiKeys.createdAt,
    });

  // Return rawKey ONCE — it is never stored and cannot be retrieved again
  return NextResponse.json(
    {
      apiKey: {
        ...key,
        // This is the only time the raw key is returned
        rawKey,
        message: "Save this key now — it will not be shown again.",
      },
    },
    { status: 201 }
  );
}

// DELETE /api/v1/api-keys — revoke an API key
export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = revokeKeySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Verify project belongs to user (project isolation)
  const project = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.id, parsed.data.projectId),
        eq(projects.userId, session.user.id)
      )
    )
    .limit(1)
    .then((r) => r[0]);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(apiKeys.id, parsed.data.keyId),
        eq(apiKeys.projectId, parsed.data.projectId)
      )
    );

  return NextResponse.json({ success: true });
}
