import { auth, signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export async function Header() {
  const session = await auth();
  const plan = (session?.user as { plan?: string })?.plan ?? "free";

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      <div />

      <div className="flex items-center gap-4">
        {/* Plan badge */}
        <Badge
          variant={plan === "free" ? "secondary" : plan === "pro" ? "default" : "success"}
          className="capitalize"
        >
          {plan}
        </Badge>

        {/* User info */}
        {session?.user && (
          <span className="text-sm text-muted-foreground">
            {session.user.email}
          </span>
        )}

        {/* Sign out */}
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <Button variant="ghost" size="sm" type="submit">
            Sign out
          </Button>
        </form>
      </div>
    </header>
  );
}
