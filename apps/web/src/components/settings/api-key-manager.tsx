"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Copy, Trash2, Plus, Key } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

interface ApiKeyItem {
  id: string;
  name: string;
  displayKey: string;
  lastUsedAt: string | null;
  createdAt: string;
}

interface Props {
  projectId: string;
  initialKeys: ApiKeyItem[];
}

export function ApiKeyManager({ projectId, initialKeys }: Props) {
  const [keys, setKeys] = useState<ApiKeyItem[]>(initialKeys);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    setIsCreating(true);

    try {
      const res = await fetch("/api/v1/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, name: newKeyName }),
      });

      const data = await res.json() as {
        apiKey?: { id: string; name: string; keyPrefix: string; createdAt: string; rawKey: string };
        error?: string;
        message?: string;
      };

      if (!res.ok) {
        toast({ title: "Error", description: data.error ?? "Failed to create key", variant: "destructive" });
        return;
      }

      if (data.apiKey) {
        setCreatedKey(data.apiKey.rawKey);
        setKeys((prev) => [
          ...prev,
          {
            id: data.apiKey!.id,
            name: data.apiKey!.name,
            displayKey: `${data.apiKey!.keyPrefix}••••••••`,
            lastUsedAt: null,
            createdAt: data.apiKey!.createdAt,
          },
        ]);
        setNewKeyName("");
        setShowForm(false);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevoke = async (keyId: string) => {
    const res = await fetch("/api/v1/api-keys", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyId, projectId }),
    });

    if (res.ok) {
      setKeys((prev) => prev.filter((k) => k.id !== keyId));
      toast({ title: "API key revoked" });
    } else {
      toast({ title: "Failed to revoke key", variant: "destructive" });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>API Keys</CardTitle>
            <CardDescription>
              Keys used by the TokenGuard SDK to send traces. A raw key is only shown once at creation.
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setShowForm((v) => !v)}>
            <Plus className="mr-2 h-4 w-4" /> New Key
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* New key form */}
        {showForm && (
          <div className="flex gap-2 rounded-md border p-4">
            <div className="flex-1 space-y-1">
              <Label>Key name</Label>
              <Input
                placeholder="e.g. Production"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={handleCreate} disabled={isCreating || !newKeyName.trim()}>
                {isCreating ? "Creating..." : "Create"}
              </Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Newly created key — shown once */}
        {createdKey && (
          <div className="rounded-md border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
            <p className="mb-2 text-sm font-semibold text-green-800 dark:text-green-200">
              ✓ Key created — save it now, it won&apos;t be shown again
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-white px-3 py-2 font-mono text-sm dark:bg-black">
                {createdKey}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(createdKey)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 text-muted-foreground"
              onClick={() => setCreatedKey(null)}
            >
              I&apos;ve saved it
            </Button>
          </div>
        )}

        {/* Keys list */}
        {keys.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <Key className="mx-auto mb-2 h-8 w-8 opacity-30" />
            <p>No API keys yet. Create one to get started.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {keys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{key.name}</span>
                    <Badge variant="outline" className="font-mono text-xs">
                      {key.displayKey}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Created {formatRelativeTime(key.createdAt)}
                    {key.lastUsedAt && ` · Last used ${formatRelativeTime(key.lastUsedAt)}`}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRevoke(key.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
