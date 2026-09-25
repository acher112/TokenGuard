"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Menu, Zap } from "lucide-react";
import Link from "next/link";

import { TokenGuardLogo } from "@/components/brand/tokenguard-logo";

interface HeaderProps {
  userEmail?: string | null;
  userPlan?: string;
  onOpenMobileMenu?: () => void;
  signOutAction?: () => Promise<void>;
}

export function Header({
  userEmail,
  userPlan = "free",
  onOpenMobileMenu,
  signOutAction,
}: HeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b bg-background px-4 sm:px-6">
      {/* Mobile Menu Button & Mobile Brand */}
      <div className="flex items-center gap-3">
        {onOpenMobileMenu && (
          <Button
            variant="outline"
            size="icon"
            onClick={onOpenMobileMenu}
            className="h-9 w-9 md:hidden text-foreground"
            aria-label="Open mobile navigation menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}

        <TokenGuardLogo className="md:hidden" iconSize={26} />
      </div>

      {/* User info & Actions */}
      <div className="flex items-center gap-2.5 sm:gap-4">
        {/* Plan badge */}
        <Badge
          variant={userPlan === "free" ? "secondary" : userPlan === "pro" ? "default" : "success"}
          className="capitalize text-xs px-2 py-0.5"
        >
          {userPlan}
        </Badge>

        {/* User email (desktop only) */}
        {userEmail && (
          <span className="hidden sm:inline-block text-xs text-muted-foreground truncate max-w-[200px]">
            {userEmail}
          </span>
        )}

        {/* Sign out */}
        {signOutAction && (
          <form action={signOutAction}>
            <Button variant="ghost" size="sm" type="submit" className="text-xs h-8 px-2.5">
              Sign out
            </Button>
          </form>
        )}
      </div>
    </header>
  );
}
