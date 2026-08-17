import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/dashboard/format";
import { PORTFOLIO_STATS } from "@/lib/dashboard/investor";

export function PortfolioStatRow() {
  const stats = [
    { label: "Deposited", value: formatCurrency(PORTFOLIO_STATS.deposited) },
    { label: "Active positions", value: String(PORTFOLIO_STATS.activePositions) },
    { label: "Accrued yield", value: formatCurrency(PORTFOLIO_STATS.accruedYield) },
    { label: "Next settlement", value: `${PORTFOLIO_STATS.nextSettlementInDays} days` },
  ];

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4 sm:divide-x sm:divide-border">
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
