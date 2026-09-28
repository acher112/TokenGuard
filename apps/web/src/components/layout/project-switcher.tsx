"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { switchProject } from "@/app/dashboard/actions";
import {
  FolderOpen,
  Plus,
  ChevronDown,
  Check,
  Sparkles,
  X,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Project {
  id: string;
  name: string;
}

interface ProjectSwitcherProps {
  projects: Project[];
  selectedProjectId: string;
  userPlan?: "free" | "pro" | "team";
  maxProjects?: number;
}

export function ProjectSwitcher({
  projects,
  selectedProjectId,
  userPlan = "free",
  maxProjects = 1,
}: ProjectSwitcherProps) {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [retentionDays, setRetentionDays] = useState<"7" | "30" | "90">("7");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedProject =
    projects.find((p) => p.id === selectedProjectId) ?? projects[0];

  const isLimitReached = projects.length >= maxProjects;
  const isEnterprise = userPlan === "team";
  const isPro = userPlan === "pro" || isEnterprise;

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = async (projectId: string) => {
    setDropdownOpen(false);
    if (projectId === selectedProjectId) return;
    await switchProject(projectId);
    router.refresh();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Project name is required");
      return;
    }

    setCreating(true);
    setError("");

    try {
      const res = await fetch("/api/v1/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          retentionDays,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message ?? data.error ?? "Failed to create project");
        setCreating(false);
        return;
      }

      if (data.project?.id) {
        await switchProject(data.project.id);
      }

      setName("");
      setDescription("");
      setModalOpen(false);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="relative px-2 py-1" ref={dropdownRef}>
      {/* Switcher Bar */}
      <div className="flex items-center gap-1.5 rounded-lg border bg-background/80 hover:bg-muted/50 p-1.5 transition-colors">
        <button
          onClick={() => setDropdownOpen((prev) => !prev)}
          className="flex flex-1 items-center gap-2 min-w-0 text-left px-1.5 py-1 rounded-md transition-colors"
          title="Switch project"
        >
          <FolderOpen className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-semibold truncate text-foreground flex-1">
            {selectedProject?.name ?? "Select Project"}
          </span>
          <ChevronDown
            className={`h-3.5 w-3.5 text-muted-foreground transition-transform shrink-0 ${
              dropdownOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {/* Plus / Add Project Button */}
        <button
          onClick={() => {
            setDropdownOpen(false);
            setModalOpen(true);
          }}
          className="h-7 w-7 flex items-center justify-center rounded-md border border-border bg-muted/30 hover:bg-primary hover:text-primary-foreground transition-all shrink-0 text-muted-foreground"
          title="Create New Project"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Dropdown Menu */}
      {dropdownOpen && (
        <div className="absolute left-2 right-2 top-full mt-1.5 z-50 rounded-lg border bg-popover text-popover-foreground shadow-lg overflow-hidden py-1">
          <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground border-b flex items-center justify-between">
            <span>Projects</span>
            <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded">
              {projects.length} / {maxProjects === Infinity ? "∞" : maxProjects}
            </span>
          </div>

          <div className="max-h-56 overflow-y-auto py-1">
            {projects.map((p) => {
              const isSelected = p.id === selectedProjectId;
              return (
                <button
                  key={p.id}
                  onClick={() => handleSelect(p.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-muted/70 transition-colors ${
                    isSelected ? "font-semibold text-primary bg-primary/5" : ""
                  }`}
                >
                  <span className="truncate">{p.name}</span>
                  {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>

          <div className="border-t p-1.5">
            <button
              onClick={() => {
                setDropdownOpen(false);
                setModalOpen(true);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-2 text-sm font-medium rounded-md hover:bg-primary hover:text-primary-foreground transition-colors text-muted-foreground"
            >
              <Plus className="h-4 w-4" />
              <span>Create New Project</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal Dialog */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-xl border bg-card p-6 shadow-2xl text-card-foreground">
            {/* Close Button */}
            <button
              onClick={() => setModalOpen(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>

            {isLimitReached ? (
              // Plan Limit Reached View
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Project Limit Reached</h3>
                    <p className="text-xs text-muted-foreground">
                      Current plan: <strong className="capitalize">{userPlan}</strong> (
                      {projects.length}/{maxProjects} projects used)
                    </p>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed">
                  Your <strong>{userPlan}</strong> plan allows up to{" "}
                  <strong>{maxProjects}</strong> project. To create additional
                  projects with separate traces, cost analytics, and API keys,
                  please upgrade to Pro (5 projects) or Enterprise (Unlimited projects).
                </p>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setModalOpen(false)}>
                    Close
                  </Button>
                  <Button asChild>
                    <Link
                      href="/dashboard/billing"
                      onClick={() => setModalOpen(false)}
                    >
                      Upgrade Plan
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              // Create Project Form
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold">Create New Project</h3>
                  <p className="text-xs text-muted-foreground">
                    Organize traces, cost analytics, and API keys for a separate agent or workload.
                  </p>
                </div>

                {error && (
                  <div className="p-3 text-xs rounded-md bg-destructive/10 text-destructive border border-destructive/20 font-medium">
                    {error}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="project-name" className="text-xs font-semibold">
                    Project Name *
                  </Label>
                  <Input
                    id="project-name"
                    placeholder="e.g. Customer Support Agent"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="project-desc" className="text-xs font-semibold">
                    Description (Optional)
                  </Label>
                  <Input
                    id="project-desc"
                    placeholder="e.g. Production triage agent with LangChain"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="project-retention" className="text-xs font-semibold">
                    Data Retention
                  </Label>
                  <select
                    id="project-retention"
                    value={retentionDays}
                    onChange={(e) =>
                      setRetentionDays(e.target.value as "7" | "30" | "90")
                    }
                    className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="7">7 days (Standard)</option>
                    <option value="30" disabled={!isPro}>
                      30 days {!isPro ? "(Requires Pro)" : "(Included in Pro)"}
                    </option>
                    <option value="90" disabled={!isEnterprise}>
                      90 days {!isEnterprise ? "(Requires Enterprise)" : "(Included in Enterprise)"}
                    </option>
                  </select>
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-xs text-muted-foreground font-mono">
                    {projects.length + 1} of{" "}
                    {maxProjects === Infinity ? "Unlimited" : maxProjects}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setModalOpen(false)}
                      disabled={creating}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={creating}>
                      {creating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating…
                        </>
                      ) : (
                        "Create Project"
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
