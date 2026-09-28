"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setDataRetention, deleteProject, deleteAccount } from "@/app/dashboard/settings/actions";
import { Trash2, AlertTriangle } from "lucide-react";

interface DangerZoneProps {
  projectId: string;
  projectName: string;
  currentRetention: "7" | "30" | "90";
  userPlan?: "free" | "pro" | "team";
}

export function DangerZone({
  projectId,
  projectName,
  currentRetention,
  userPlan = "free",
}: DangerZoneProps) {
  const router = useRouter();
  const [retention, setRetention] = useState(currentRetention);
  const [savingRetention, setSavingRetention] = useState(false);
  const [retentionSaved, setRetentionSaved] = useState(false);
  const [retentionError, setRetentionError] = useState("");

  const can30Days = userPlan === "pro" || userPlan === "team";
  const can90Days = userPlan === "team";

  const [confirmDeleteProject, setConfirmDeleteProject] = useState("");
  const [deletingProject, setDeletingProject] = useState(false);
  const [showDeleteProject, setShowDeleteProject] = useState(false);

  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);

  const handleRetentionChange = async (val: string) => {
    const v = val as "7" | "30" | "90";
    if (v === "90" && !can90Days) {
      alert("90-day retention is exclusively available on the Enterprise plan ($249/mo).");
      return;
    }
    if (v === "30" && !can30Days) {
      alert("30-day retention requires a Pro or Enterprise plan.");
      return;
    }
    setRetention(v);
    setSavingRetention(true);
    setRetentionError("");
    const res = await setDataRetention(projectId, v);
    setSavingRetention(false);
    if (res?.error) {
      setRetentionError(res.error);
      setRetention(currentRetention);
    } else {
      setRetentionSaved(true);
      setTimeout(() => setRetentionSaved(false), 2000);
      router.refresh();
    }
  };

  const handleDeleteProject = async () => {
    if (confirmDeleteProject !== projectName) return;
    setDeletingProject(true);
    await deleteProject(projectId);
    // redirect handled by server action
  };

  const handleDeleteAccount = async () => {
    if (confirmDeleteAccount !== "DELETE") return;
    setDeletingAccount(true);
    await deleteAccount();
    // redirect handled by server action
  };

  return (
    <div className="space-y-4">
      {/* Data Retention */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data Retention</CardTitle>
          <CardDescription>
            How long traces and errors are stored for this project.
            {userPlan === "free" && " Free plan includes 7 days. Upgrade to Pro for 30 days or Enterprise for 90 days."}
            {userPlan === "pro" && " Pro plan includes up to 30 days. Upgrade to Enterprise for 90-day retention."}
            {userPlan === "team" && " Enterprise plan includes full 90-day data retention."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 flex-wrap">
            <select
              value={retention}
              onChange={(e) => handleRetentionChange(e.target.value)}
              disabled={savingRetention}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 w-56"
            >
              <option value="7">7 days (Free tier)</option>
              <option value="30" disabled={!can30Days}>
                30 days{!can30Days ? " (Requires Pro)" : " (Pro Plan)"}
              </option>
              <option value="90" disabled={!can90Days}>
                90 days{!can90Days ? " (Requires Enterprise)" : " (Enterprise Plan)"}
              </option>
            </select>
            {savingRetention && <span className="text-xs text-muted-foreground">Saving…</span>}
            {retentionSaved && <span className="text-xs text-green-600">Saved ✓</span>}
            {retentionError && <span className="text-xs text-destructive">{retentionError}</span>}
          </div>
        </CardContent>
      </Card>

      {/* Delete Project */}
      <Card className="border-destructive/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <CardTitle className="text-base text-destructive">Delete Project</CardTitle>
          </div>
          <CardDescription>
            Permanently deletes all traces, API keys, and settings for <strong>{projectName}</strong>.
            This cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!showDeleteProject ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteProject(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Project
            </Button>
          ) : (
            <div className="space-y-3">
              <Label className="text-sm">
                Type <strong>{projectName}</strong> to confirm:
              </Label>
              <Input
                value={confirmDeleteProject}
                onChange={(e) => setConfirmDeleteProject(e.target.value)}
                placeholder={projectName}
                className="border-destructive/50 focus-visible:ring-destructive"
              />
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={confirmDeleteProject !== projectName || deletingProject}
                  onClick={handleDeleteProject}
                >
                  {deletingProject ? "Deleting…" : "Confirm Delete"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setShowDeleteProject(false); setConfirmDeleteProject(""); }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Account */}
      <Card className="border-destructive/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <CardTitle className="text-base text-destructive">Delete Account</CardTitle>
          </div>
          <CardDescription>
            Permanently deletes your account and all associated projects, traces, and data.
            This cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!showDeleteAccount ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteAccount(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete My Account
            </Button>
          ) : (
            <div className="space-y-3">
              <Label className="text-sm">
                Type <strong>DELETE</strong> to confirm account deletion:
              </Label>
              <Input
                value={confirmDeleteAccount}
                onChange={(e) => setConfirmDeleteAccount(e.target.value)}
                placeholder="DELETE"
                className="border-destructive/50 focus-visible:ring-destructive"
              />
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={confirmDeleteAccount !== "DELETE" || deletingAccount}
                  onClick={handleDeleteAccount}
                >
                  {deletingAccount ? "Deleting…" : "Confirm Delete Account"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setShowDeleteAccount(false); setConfirmDeleteAccount(""); }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
