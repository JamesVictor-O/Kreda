import { cn } from "@/lib/cn";
import { formatCurrency, daysUntil } from "@/lib/dashboard/format";
import type { IndexedAttestation } from "@/lib/contracts/indexer";

/** Real numbers derived from on-chain attestations for the connected
 * seller — no "available to advance" figure, since that would need a
 * credit-limit concept the product doesn't have; declined count instead,
 * since the decline path is real data too, not something to hide. */
export function StatRow({ attestations }: { attestations: IndexedAttestation[] }) {
  const approved = attestations.filter((a) => a.approved);
  const declined = attestations.filter((a) => !a.approved);
  const totalFaceValue = approved.reduce((sum, a) => sum + a.faceValue, 0);

  const nextSettlementDays = approved
    .map((a) => daysUntil(a.expectedSettlementAt))
    .filter((days) => days >= 0)
    .sort((a, b) => a - b)[0];

  const stats = [
    { label: "Total advanced", value: formatCurrency(totalFaceValue) },
    { label: "Active advances", value: String(approved.length) },
    { label: "Next settlement", value: nextSettlementDays !== undefined ? `${nextSettlementDays} days` : "—" },
    { label: "Declined", value: String(declined.length) },
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
