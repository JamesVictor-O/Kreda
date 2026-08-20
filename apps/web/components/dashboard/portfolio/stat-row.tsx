import { cn } from "@/lib/cn";
import { formatCurrency, daysUntil } from "@/lib/dashboard/format";
import type { InvestorPosition } from "@/lib/contracts/use-investor-positions";

/** Real numbers from the connected wallet's actual on-chain share
 * balances — no accrued-yield estimate, since ERC-4626 share value
 * doesn't move before settlement (no accrual event exists yet to
 * estimate from without also tracking each deposit's timestamp). */
export function PortfolioStatRow({ positions }: { positions: InvestorPosition[] }) {
  const active = positions.filter((p) => !p.settled);
  const deposited = active.reduce((sum, p) => sum + p.principal, 0);

  const nextSettlementDays = active
    .map((p) => daysUntil(p.vault.expectedSettlementAt))
    .filter((days) => days >= 0)
    .sort((a, b) => a - b)[0];

  const stats = [
    { label: "Deposited", value: formatCurrency(deposited) },
    { label: "Active positions", value: String(active.length) },
    { label: "Settled positions", value: String(positions.length - active.length) },
    { label: "Next settlement", value: nextSettlementDays !== undefined ? `${nextSettlementDays} days` : "—" },
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
