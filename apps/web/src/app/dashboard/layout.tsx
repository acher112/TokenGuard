import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
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

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        projectSwitcher={
          <ProjectSwitcher
            projects={userProjects}
            selectedProjectId={selectedProject!.id}
          />
        }
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
