"use server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { SELECTED_PROJECT_COOKIE } from "@/lib/get-selected-project";

export async function switchProject(projectId: string): Promise<void> {
  const session = await auth();
  if (!session?.user) return;

  // Verify the project belongs to this user
  const project = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.id, projectId))
    .then((r) => r[0]);

  if (!project) return;

  const cookieStore = cookies();
  cookieStore.set(SELECTED_PROJECT_COOKIE, projectId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });

  revalidatePath("/dashboard", "layout");
}
