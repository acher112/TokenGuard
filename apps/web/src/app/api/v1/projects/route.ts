import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { projects } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { PLAN_LIMITS } from "@/lib/billing";

const createProjectSchema = z.object({
  name: z.string().min(1).max(50).trim(),
  description: z.string().max(200).trim().optional(),
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
  const plan = (session.user as { plan?: string }).plan ?? "free";
  const limits = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS];
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

  const [project] = await db
    .insert(projects)
    .values({
      userId: session.user.id,
      name: parsed.data.name,
      description: parsed.data.description,
      retentionDays: "7", // Default; user can change in settings
    })
    .returning();

  return NextResponse.json({ project }, { status: 201 });
}
