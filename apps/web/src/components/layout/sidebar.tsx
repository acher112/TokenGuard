"use client";

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
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/traces", label: "Traces", icon: GitBranch },
  { href: "/dashboard/errors", label: "Errors", icon: AlertCircle },
  { href: "/dashboard/costs", label: "Costs", icon: DollarSign },
  { href: "/dashboard/agents", label: "Agents", icon: Bot },
  { href: "/dashboard/models", label: "Models", icon: Cpu },
  { href: "/dashboard/alerts", label: "Alerts", icon: Bell },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  projectSwitcher?: React.ReactNode;
}

export function Sidebar({ projectSwitcher }: SidebarProps = {}) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-[var(--sidebar-width)] flex-col border-r bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Zap className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-lg font-bold tracking-tight">TokenGuard</span>
      </div>

      {/* Project Switcher */}
      {projectSwitcher && (
        <div className="border-b py-2">
          {projectSwitcher}
        </div>
      )}

      {/* Navigation */}
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
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t p-4 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">TokenGuard v0.1.0</p>
        <Link
          href="/roadmap"
          target="_blank"
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          <span>Roadmap</span>
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </aside>
  );
}

