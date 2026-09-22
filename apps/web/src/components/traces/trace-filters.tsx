"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { useState, useTransition } from "react";

interface Props {
  agents: string[];
}

export function TraceFilters({ agents }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const currentStatus = searchParams.get("status") ?? "all";
  const currentAgent = searchParams.get("agent") ?? "all";

  const updateParam = (key: string, val: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!val || val === "all") {
      params.delete(key);
    } else {
      params.set(key, val);
    }
    params.delete("page"); // reset to page 1 on filter change
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParam("q", search.trim() || null);
  };

  const clearFilters = () => {
    setSearch("");
    startTransition(() => {
      router.push(pathname);
    });
  };

  const hasActiveFilters = Boolean(searchParams.get("q") || searchParams.get("status") || searchParams.get("agent"));

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Search Input */}
      <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Filter by agent or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 pr-4 text-sm"
        />
      </form>

      {/* Filter Dropdowns */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
        {/* Status Filter */}
        <select
          value={currentStatus}
          onChange={(e) => updateParam("status", e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">All Statuses</option>
          <option value="success">✓ Success</option>
          <option value="failed">✕ Failed</option>
        </select>

        {/* Agent Filter */}
        {agents.length > 0 && (
          <select
            value={currentAgent}
            onChange={(e) => updateParam("agent", e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Agents</option>
            {agents.map((agent) => (
              <option key={agent} value={agent}>
                {agent}
              </option>
            ))}
          </select>
        )}

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
            <X className="mr-1 h-3.5 w-3.5" /> Clear
          </Button>
        )}
      </div>
    </div>
  );
}
