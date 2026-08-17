"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { formatCurrency, formatDate, daysUntil, daysBetween } from "@/lib/dashboard/format";
import { ALL_ADVANCES, STORE } from "@/lib/dashboard/fixtures";
import type { Advance, AdvanceStatus } from "@/lib/dashboard/types";
import { GradeBadge } from "@/components/dashboard/grade-badge";
import { ProgressBar } from "@/components/dashboard/progress-bar";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ButtonLink } from "@/components/ui/button";

type Filter = "all" | AdvanceStatus;

const FILTERS: { label: string; value: Filter }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Settled", value: "settled" },
];

function AdvanceRow({ advance }: { advance: Advance }) {
  const settled = advance.status === "settled";
  const remaining = daysUntil(advance.expectedSettlementAt);
  const total = daysBetween(advance.createdAt, advance.expectedSettlementAt);
  const fraction = total > 0 ? 1 - Math.max(remaining, 0) / total : 1;

  return (
    <li>
      <Link
        href={`/seller/advances/${advance.id}`}
        className="-mx-2 block rounded-lg px-2 py-4 transition-colors duration-150 hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm text-foreground">#{advance.receivableId}</span>
            <GradeBadge confidenceBps={advance.decision.confidenceBps} />
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-medium",
                settled ? "bg-foreground/[0.06] text-foreground" : "bg-primary/10 text-primary",
              )}
            >
              {settled ? "Settled" : "Active"}
            </span>
          </span>
          <span className="font-mono text-sm font-semibold text-foreground">
            {formatCurrency(advance.faceValue)}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span className="truncate">{advance.storeName}</span>
          <span className="shrink-0">
            {settled
              ? `Settled ${formatDate(advance.settledAt!)}`
              : remaining > 0
                ? `${remaining} days to settlement`
                : "Settling"}
          </span>
        </div>
        {!settled && (
          <div className="mt-2.5">
            <ProgressBar
              fraction={fraction}
              label={`Settlement progress for receivable #${advance.receivableId}`}
            />
          </div>
        )}
      </Link>
    </li>
  );
}

export default function AdvancesPage() {
  const [filter, setFilter] = useState<Filter>("all");

  const advances = useMemo(() => {
    const sorted = [...ALL_ADVANCES].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return filter === "all" ? sorted : sorted.filter((advance) => advance.status === filter);
  }, [filter]);

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-0">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Advances</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Every receivable assigned from {STORE.storeName}
          </p>
        </div>
        <ButtonLink href="/seller/new-advance">New advance</ButtonLink>
      </div>

      <div className="mt-6 flex w-fit gap-1 rounded-full border border-border bg-surface p-1">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            aria-pressed={filter === f.value}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              filter === f.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-6 sm:p-8">
        {advances.length === 0 ? (
          <EmptyState
            title="No advances yet"
            description="Fund a receivable and it will show up here with its settlement countdown."
            action={
              <ButtonLink href="/seller/new-advance" size="sm">
                New advance
              </ButtonLink>
            }
          />
        ) : (
          <ul className="divide-y divide-border">
            {advances.map((advance) => (
              <AdvanceRow key={advance.id} advance={advance} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
