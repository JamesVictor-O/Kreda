import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/dashboard/format";
import { OVERVIEW_STATS } from "@/lib/dashboard/fixtures";

export function StatRow() {
  const stats = [
    { label: "Available to advance", value: formatCurrency(OVERVIEW_STATS.availableToAdvance) },
    { label: "Active advances", value: formatCurrency(OVERVIEW_STATS.activeAdvancesTotal) },
    { label: "Next settlement", value: `${OVERVIEW_STATS.nextSettlementInDays} days` },
    { label: "Advances completed", value: String(OVERVIEW_STATS.advancesCompleted) },
  ];

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
      <div className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4 sm:divide-x sm:divide-border">
        {stats.map((stat, index) => (
          <div key={stat.label} className={cn(index > 0 && "sm:pl-6")}>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className="mt-2 font-mono text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {stat.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
