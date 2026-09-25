import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { db } from "@/lib/db/client";
import { projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { SELECTED_PROJECT_COOKIE } from "@/lib/get-selected-project";
import { ProjectSwitcher } from "@/components/layout/project-switcher";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Load all user projects
  const userProjects = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(eq(projects.userId, session.user.id))
    .orderBy(projects.createdAt);

  if (userProjects.length === 0) {
    redirect("/onboarding");
  }

  // Resolve selected project from cookie
  const cookieStore = cookies();
  const selectedId = cookieStore.get(SELECTED_PROJECT_COOKIE)?.value;
  const selectedProject =
    (selectedId ? userProjects.find((p) => p.id === selectedId) : null) ??
    userProjects[0];

  const user = {
    name: session.user.name,
    email: session.user.email,
    plan: (session.user as { plan?: string }).plan ?? "free",
  };

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <DashboardShell
      user={user}
      signOutAction={handleSignOut}
      projectSwitcher={
        <ProjectSwitcher
          projects={userProjects}
          selectedProjectId={selectedProject!.id}
        />
      }
    >
      {children}
    </DashboardShell>
  );
}
