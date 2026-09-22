"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { renameProject } from "@/app/dashboard/settings/actions";
import { Check, Pencil } from "lucide-react";

interface ProfileCardProps {
  projectId: string;
  currentName: string;
  userEmail: string;
}

export function ProfileCard({ projectId, currentName, userEmail }: ProfileCardProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(currentName);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!name.trim() || name.trim() === currentName) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setError("");
    const result = await renameProject(projectId, name.trim());
    setSaving(false);
    if (result.error) {
      setError(result.error);
    } else {
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Settings</CardTitle>
        <CardDescription>Manage your project name and account details.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Project Name */}
        <div className="space-y-2">
          <Label>Project Name</Label>
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSave();
                    if (e.key === "Escape") { setEditing(false); setName(currentName); }
                  }}
                />
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setName(currentName); }}>
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm font-medium">
                  {name}
                  {saved && <Check className="inline ml-2 h-3.5 w-3.5 text-green-500" />}
                </span>
                <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        {/* Account Email (read-only) */}
        <div className="space-y-2">
          <Label>Account Email</Label>
          <div className="flex items-center rounded-md border bg-muted px-3 py-2">
            <span className="text-sm text-muted-foreground">{userEmail}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Email cannot be changed. Contact support if you need to update it.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
