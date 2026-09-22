import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const SELECTED_PROJECT_COOKIE = "aw_selected_project";

/**
 * Server-side helper that resolves the currently selected project for a user.
 * Reads the aw_selected_project cookie; falls back to the user's first project.
 *
 * Returns null if the user has no projects.
 */
export async function getSelectedProject() {
  const session = await auth();
  if (!session?.user) return null;

  const cookieStore = cookies();
  const selectedId = cookieStore.get(SELECTED_PROJECT_COOKIE)?.value;

  // Get all user projects ordered by creation date
  const userProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, session.user.id))
    .orderBy(projects.createdAt);

  if (userProjects.length === 0) return null;

  // Use cookie-selected project if valid, otherwise first project
  const selected = selectedId
    ? (userProjects.find((p) => p.id === selectedId) ?? userProjects[0])
    : userProjects[0];

  return {
    project: selected,
    allProjects: userProjects,
  };
}
