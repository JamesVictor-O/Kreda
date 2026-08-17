import { formatCurrency } from "@/lib/dashboard/format";
import { ProgressBar } from "@/components/dashboard/progress-bar";

/** The only social signal on the vaults screen — a nearly-full vault should
 *  read as urgent, an empty one as an open question. Given real weight
 *  rather than a throwaway sliver. */
export function VaultFillMeter({
  raisedAmount,
  targetAmount,
}: {
  raisedAmount: number;
  targetAmount: number;
}) {
  const fraction = targetAmount > 0 ? raisedAmount / targetAmount : 0;
  const remaining = Math.max(0, targetAmount - raisedAmount);
  const pct = Math.round(fraction * 100);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-mono text-sm font-semibold text-foreground">{pct}% filled</span>
        <span className="text-xs text-muted-foreground">
          {formatCurrency(raisedAmount)} of {formatCurrency(targetAmount)} · {formatCurrency(remaining)}{" "}
          remaining
        </span>
      </div>
      <div className="mt-2">
        <ProgressBar
          fraction={fraction}
          label={`${pct}% of raise target filled`}
          className="h-1.5"
        />
      </div>
    </div>
  );
}
