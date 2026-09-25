"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TokenGuardLogo } from "@/components/brand/tokenguard-logo";

interface LandingNavbarProps {
  isAuthenticated: boolean;
}

export function LandingNavbar({ isAuthenticated }: LandingNavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <TokenGuardLogo href="/" iconSize={32} />

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <Link href="#features" className="hover:text-foreground transition-colors">
            Features
          </Link>
          <Link href="#differentiators" className="hover:text-foreground transition-colors">
            Why TokenGuard
          </Link>
          <Link href="#code" className="hover:text-foreground transition-colors">
            SDKs
          </Link>
          <Link href="#pricing" className="hover:text-foreground transition-colors">
            Pricing
          </Link>
          <Link href="/docs" className="hover:text-foreground transition-colors">
            Docs
          </Link>
          <Link
            href="/roadmap"
            className="hover:text-foreground transition-colors flex items-center gap-1"
          >
            <span>Roadmap</span>
            <span className="text-[10px] uppercase font-bold bg-primary/15 text-primary px-1.5 py-0.5 rounded">
              Live
            </span>
          </Link>
        </nav>

        {/* Desktop Actions */}
        <div className="hidden sm:flex items-center gap-3">
          {isAuthenticated ? (
            <Button asChild size="sm">
              <Link href="/dashboard" className="flex items-center gap-1.5">
                <span>Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/signup">Start Free →</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex sm:hidden items-center gap-2">
          {isAuthenticated ? (
            <Button asChild size="sm" className="h-8 text-xs px-2.5">
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          ) : (
            <Button asChild size="sm" className="h-8 text-xs px-2.5">
              <Link href="/signup">Start Free</Link>
            </Button>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="h-8 w-8 text-foreground"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Mobile Slide-down Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b bg-background px-4 py-4 space-y-3 shadow-lg animate-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col space-y-2 text-sm font-medium">
            <Link
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              Features
            </Link>
            <Link
              href="#differentiators"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              Why TokenGuard
            </Link>
            <Link
              href="#code"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              SDKs
            </Link>
            <Link
              href="#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/docs"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              Docs & SDKs
            </Link>
            <Link
              href="/roadmap"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-between"
            >
              <span>Roadmap</span>
              <span className="text-[10px] uppercase font-bold bg-primary/15 text-primary px-1.5 py-0.5 rounded">
                Live
              </span>
            </Link>
          </nav>

          <div className="pt-2 border-t flex flex-col gap-2">
            {isAuthenticated ? (
              <Button asChild className="w-full">
                <Link href="/dashboard">Open Dashboard →</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button asChild className="w-full">
                  <Link href="/signup">Get Started Free →</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
