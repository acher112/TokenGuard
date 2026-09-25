"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

interface DashboardShellProps {
  children: React.ReactNode;
  user: {
    name?: string | null;
    email?: string | null;
    plan?: string;
  };
  projectSwitcher: React.ReactNode;
  signOutAction: () => Promise<void>;
}

export function DashboardShell({
  children,
  user,
  projectSwitcher,
  signOutAction,
}: DashboardShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile drawer whenever route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Persistent Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:shrink-0">
        <Sidebar
          user={user}
          projectSwitcher={projectSwitcher}
          signOutAction={signOutAction}
        />
      </div>

      {/* Mobile Drawer (Slide-over overlay) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer content */}
          <div className="relative z-50 flex h-full w-72 max-w-[85vw] flex-col shadow-2xl bg-card animate-in slide-in-from-left duration-200">
            <Sidebar
              user={user}
              projectSwitcher={projectSwitcher}
              signOutAction={signOutAction}
              onClose={() => setMobileMenuOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0 w-full">
        <Header
          userEmail={user.email}
          userPlan={user.plan}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          signOutAction={signOutAction}
        />
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 min-w-0 w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
