"use client";

import { useRouter } from "next/navigation";
import { switchProject } from "@/app/dashboard/actions";
import { ChevronDown, FolderOpen } from "lucide-react";

interface Project {
  id: string;
  name: string;
}

interface ProjectSwitcherProps {
  projects: Project[];
  selectedProjectId: string;
}

export function ProjectSwitcher({ projects, selectedProjectId }: ProjectSwitcherProps) {
  const router = useRouter();

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const projectId = e.target.value;
    await switchProject(projectId);
    router.refresh();
  };

  // Single project — just show the name, no dropdown needed
  if (projects.length <= 1) {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <FolderOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <span className="text-sm font-medium truncate">{projects[0]?.name ?? "Project"}</span>
      </div>
    );
  }

  return (
    <div className="relative px-3 py-1">
      <div className="flex items-center gap-1 rounded-md border bg-background px-2 py-1.5 text-sm">
        <FolderOpen className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        <select
          value={selectedProjectId}
          onChange={handleChange}
          className="flex-1 bg-transparent outline-none cursor-pointer text-sm font-medium pr-4"
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <ChevronDown className="h-3 w-3 text-muted-foreground pointer-events-none" />
      </div>
    </div>
  );
}
