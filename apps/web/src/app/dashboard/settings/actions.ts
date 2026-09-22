/**
 * Settings page server actions.
 * Handles project rename, data retention changes, project deletion, and account deletion.
 */
"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { projects, users, traces, apiKeys } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { signOut } from "@/lib/auth";
import { z } from "zod";

// ─── Rename Project ───────────────────────────────────────────────────────────

const RenameSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1).max(80),
});

export async function renameProject(
  projectId: string,
  name: string
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };

  const parsed = RenameSchema.safeParse({ projectId, name });
  if (!parsed.success) return { error: "Invalid input" };

  // Verify ownership
  const project = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, session.user.id)))
    .then((r) => r[0]);

  if (!project) return { error: "Project not found" };

  await db
    .update(projects)
    .set({ name: name.trim(), updatedAt: new Date() })
    .where(eq(projects.id, projectId));

  revalidatePath("/dashboard/settings");
  return {};
}

// ─── Set Data Retention ───────────────────────────────────────────────────────

const RetentionSchema = z.object({
  projectId: z.string().min(1),
  days: z.enum(["7", "30", "90"]),
});

export async function setDataRetention(
  projectId: string,
  days: "7" | "30" | "90"
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };

  const parsed = RetentionSchema.safeParse({ projectId, days });
  if (!parsed.success) return { error: "Invalid retention value" };

  // Verify ownership
  const project = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, session.user.id)))
    .then((r) => r[0]);

  if (!project) return { error: "Project not found" };

  await db
    .update(projects)
    .set({ retentionDays: days, updatedAt: new Date() })
    .where(eq(projects.id, projectId));

  revalidatePath("/dashboard/settings");
  return {};
}

// ─── Delete Project ───────────────────────────────────────────────────────────

export async function deleteProject(
  projectId: string
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };

  // Verify ownership
  const project = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, session.user.id)))
    .then((r) => r[0]);

  if (!project) return { error: "Project not found" };

  // Cascade delete (DB schema has onDelete: cascade for traces/keys/alerts)
  await db.delete(projects).where(eq(projects.id, projectId));

  // Check if user has other projects; if not, redirect to onboarding
  const remaining = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.userId, session.user.id))
    .limit(1);

  revalidatePath("/dashboard", "layout");

  if (remaining.length === 0) {
    redirect("/onboarding");
  }

  redirect("/dashboard");
}

// ─── Delete Account ───────────────────────────────────────────────────────────

export async function deleteAccount(): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };

  // Cascade delete user (DB schema cascades all related data)
  await db.delete(users).where(eq(users.id, session.user.id));

  await signOut({ redirectTo: "/" });
  return {};
}
