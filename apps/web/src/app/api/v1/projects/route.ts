import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { projects, apiKeys } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { PLAN_LIMITS, getUserPlan } from "@/lib/billing";
import { generateApiKey } from "@/lib/api-keys";

const createProjectSchema = z.object({
  name: z.string().min(1).max(50).trim(),
  description: z.string().max(200).trim().optional(),
  retentionDays: z.enum(["7", "30", "90"]).optional(),
});

// GET /api/v1/projects — list all projects for the current user
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, session.user.id));

  return NextResponse.json({ projects: userProjects });
}

// POST /api/v1/projects — create a new project
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Enforce plan project limits
  const plan = await getUserPlan(session.user.id);
  const limits = PLAN_LIMITS[plan];
  const existingCount = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, session.user.id))
    .then((r) => r.length);

  if (existingCount >= limits.maxProjects) {
    return NextResponse.json(
      {
        error: "Project limit reached",
        message: `Your ${plan} plan allows ${limits.maxProjects} project(s). Upgrade to create more.`,
        code: "PLAN_LIMIT_EXCEEDED",
      },
      { status: 403 }
    );
  }

  let retention = parsed.data.retentionDays ?? "7";
  if (retention === "90" && plan !== "team") {
    retention = plan === "pro" ? "30" : "7";
  } else if (retention === "30" && plan === "free") {
    retention = "7";
  }

  const [project] = await db
    .insert(projects)
    .values({
      userId: session.user.id,
      name: parsed.data.name,
      description: parsed.data.description,
      retentionDays: retention as "7" | "30" | "90",
    })
    .returning();

  if (!project) {
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }

  // Create initial default API key for the new project
  const { rawKey, keyHash, keyPrefix } = generateApiKey();
  await db.insert(apiKeys).values({
    projectId: project.id,
    name: "Default Key",
    keyHash,
    keyPrefix,
  });

  return NextResponse.json({ project, initialApiKey: rawKey }, { status: 201 });
}
