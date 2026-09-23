"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  GitBranch,
  AlertCircle,
  DollarSign,
  Bot,
  Cpu,
  Bell,
  Settings,
  Zap,
  KeyRound,
  Settings2,
  ChevronDown,
  Sparkles,
  ArrowUpRight,
  LogOut,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/traces", label: "Traces", icon: GitBranch },
  { href: "/dashboard/errors", label: "Errors", icon: AlertCircle },
  { href: "/dashboard/costs", label: "Costs", icon: DollarSign },
  { href: "/dashboard/agents", label: "Agents", icon: Bot },
  { href: "/dashboard/models", label: "Models", icon: Cpu },
  { href: "/dashboard/alerts", label: "Alerts", icon: Bell },
];

interface SidebarUser {
  name?: string | null;
  email?: string | null;
  plan?: string;
}

interface SidebarProps {
  projectSwitcher?: React.ReactNode;
  user?: SidebarUser;
  signOutAction?: () => Promise<void>;
}

export function Sidebar({ projectSwitcher, user, signOutAction }: SidebarProps = {}) {
  const pathname = usePathname();
  const isSettingsActive = pathname.startsWith("/dashboard/settings");
  const [settingsOpen, setSettingsOpen] = useState(true);

  const plan = user?.plan ?? "free";
  const userDisplayName = user?.name || user?.email?.split("@")[0] || "User";
  const userInitials = (userDisplayName[0] || "U").toUpperCase();

  return (
    <aside className="flex h-full w-[var(--sidebar-width)] flex-col border-r bg-card select-none">
      {/* Brand Logo */}
      <div className="flex h-16 items-center gap-2.5 border-b px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-sm">
          <Zap className="h-4 w-4 text-primary-foreground" />
        </div>
        <div className="flex flex-col">
          <span className="text-base font-bold tracking-tight">TokenGuard</span>
          <span className="text-[10px] text-muted-foreground font-mono -mt-1">AI Observability</span>
        </div>
      </div>

      {/* Project Switcher */}
      {projectSwitcher && <div className="border-b py-2">{projectSwitcher}</div>}

      {/* Main Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}

        {/* Settings with Collapsible Dropdown Sub-links */}
        <div className="pt-2">
          <button
            onClick={() => setSettingsOpen((prev) => !prev)}
            className={cn(
              "w-full flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isSettingsActive
                ? "text-primary font-semibold"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <div className="flex items-center gap-3">
              <Settings className="h-4 w-4 flex-shrink-0" />
              <span>Settings</span>
            </div>
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition-transform duration-200 text-muted-foreground",
                settingsOpen && "rotate-180 text-foreground"
              )}
            />
          </button>

          {/* Sub-links */}
          {settingsOpen && (
            <div className="mt-1 space-y-1 pl-6">
              <Link
                href="/dashboard/settings/api-keys"
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  pathname.startsWith("/dashboard/settings/api-keys")
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <KeyRound className="h-3.5 w-3.5" />
                <span>API Keys & SDKs</span>
              </Link>

              <Link
                href="/dashboard/settings/project"
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  pathname.startsWith("/dashboard/settings/project")
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Settings2 className="h-3.5 w-3.5" />
                <span>Project Settings</span>
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* ChatGPT-style Bottom User & Plans Widget */}
      <div className="border-t p-3 bg-muted/20">
        <div className="rounded-lg border bg-card p-3 shadow-xs space-y-2.5">
          {/* User Profile Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 font-semibold text-xs text-primary">
                {userInitials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-foreground">
                  {userDisplayName}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {user?.email || "Signed in"}
                </p>
              </div>
            </div>

            {/* Plan Badge (ChatGPT style) */}
            <Badge
              variant={plan === "free" ? "outline" : plan === "pro" ? "default" : "success"}
              className="text-[10px] font-semibold uppercase px-1.5 py-0 shrink-0"
            >
              {plan}
            </Badge>
          </div>

          {/* Action Trigger: View Plans / Upgrade */}
          <div className="flex items-center gap-1.5 pt-1 border-t">
            <Link
              href="/dashboard/billing"
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                pathname === "/dashboard/billing"
                  ? "bg-primary text-primary-foreground font-semibold"
                  : plan === "free"
                  ? "bg-primary/10 text-primary hover:bg-primary/20"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {plan === "free" ? (
                <>
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span>Upgrade Plan</span>
                </>
              ) : (
                <>
                  <CreditCard className="h-3.5 w-3.5" />
                  <span>Manage Plan</span>
                </>
              )}
            </Link>

            {signOutAction && (
              <form action={signOutAction}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  title="Sign out"
                  type="submit"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
