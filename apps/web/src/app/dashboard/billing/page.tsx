import { auth } from "@/lib/auth";
import { getUserUsageSummary } from "@/lib/billing/usage";
import { PlanCard } from "@/components/settings/plan-card";
import { CreditCard, Sparkles } from "lucide-react";

export default async function BillingPage() {
  const session = await auth();
  if (!session?.user) return null;

  const usageSummary = await getUserUsageSummary(session.user.id);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <div className="flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Subscription Plans & Usage</h1>
        </div>
        <p className="text-muted-foreground mt-1">
          Monitor your trace quota, active seats, and choose a plan that fits your agent workload.
        </p>
      </div>

      {/* Plan & Usage Details */}
      <PlanCard usage={usageSummary} />
    </div>
  );
}
