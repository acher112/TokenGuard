import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { alerts, projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const createAlertSchema = z.object({
  name: z.string().min(1).max(100).default("Alert Rule"),
  metric: z.enum(["daily_cost", "per_request_cost", "error_rate", "error_count"]),
  operator: z.enum(["gt", "gte", "lt", "lte"]).default("gt"),
  threshold: z.number().positive(),
  channel: z.enum(["email", "webhook"]),
  destination: z.string().min(3).max(255),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, session.user.id))
    .limit(1)
    .then((r) => r[0]);

  if (!project) {
    return NextResponse.json({ error: "No project found" }, { status: 404 });
  }

  const alertList = await db
    .select()
    .from(alerts)
    .where(eq(alerts.projectId, project.id))
    .orderBy(alerts.createdAt);

  return NextResponse.json({ alerts: alertList });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, session.user.id))
    .limit(1)
    .then((r) => r[0]);

  if (!project) {
    return NextResponse.json({ error: "No project found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createAlertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, metric, operator, threshold, channel, destination } = parsed.data;

  const [newAlert] = await db
    .insert(alerts)
    .values({
      projectId: project.id,
      name,
      metric,
      operator,
      threshold: threshold.toString(),
      channel,
      destination,
      isActive: true,
    })
    .returning();

  return NextResponse.json({ alert: newAlert }, { status: 201 });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const { id, isActive } = body ?? {};
  if (!id || typeof isActive !== "boolean") {
    return NextResponse.json({ error: "Missing id or isActive" }, { status: 400 });
  }

  const [updated] = await db
    .update(alerts)
    .set({ isActive })
    .where(eq(alerts.id, id))
    .returning();

  return NextResponse.json({ alert: updated });
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  await db.delete(alerts).where(eq(alerts.id, id));
  return NextResponse.json({ success: true });
}
