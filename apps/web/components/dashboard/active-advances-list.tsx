import Link from "next/link";
import { formatCurrency, daysUntil, daysBetween } from "@/lib/dashboard/format";
import { ACTIVE_ADVANCES } from "@/lib/dashboard/fixtures";
import type { Advance } from "@/lib/dashboard/types";
import { GradeBadge } from "@/components/dashboard/grade-badge";
import { ProgressBar } from "@/components/dashboard/progress-bar";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ButtonLink } from "@/components/ui/button";

function AdvanceRow({ advance }: { advance: Advance }) {
  const remaining = daysUntil(advance.expectedSettlementAt);
  const total = daysBetween(advance.createdAt, advance.expectedSettlementAt);
  const fraction = total > 0 ? 1 - Math.max(remaining, 0) / total : 1;

  return (
    <li>
      <Link
        href={`/seller/advances/${advance.id}`}
        className="block rounded-lg px-2 py-3 transition-colors duration-150 hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 -mx-2"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <span className="font-mono text-sm text-foreground">#{advance.receivableId}</span>
            <GradeBadge confidenceBps={advance.decision.confidenceBps} />
          </span>
          <span className="font-mono text-sm font-semibold text-foreground">
            {formatCurrency(advance.faceValue)}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span className="truncate">{advance.storeName}</span>
          <span className="shrink-0">
            {remaining > 0 ? `${remaining} days to settlement` : "Settling"}
          </span>
        </div>
        <div className="mt-2.5">
          <ProgressBar
            fraction={fraction}
            label={`Settlement progress for receivable #${advance.receivableId}`}
          />
        </div>
      </Link>
    </li>
  );
}

export function ActiveAdvancesList() {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
      <h2 className="text-xl font-semibold text-foreground">Active advances</h2>

      {ACTIVE_ADVANCES.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No active advances"
            description="Fund a receivable and it will show up here with its settlement countdown."
            action={
              <ButtonLink href="/seller/new-advance" size="sm">
                New advance
              </ButtonLink>
            }
          />
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {ACTIVE_ADVANCES.map((advance) => (
            <AdvanceRow key={advance.id} advance={advance} />
          ))}
        </ul>
      )}
    </div>
  );
}
