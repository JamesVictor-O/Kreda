"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { formatBps, formatCurrency, daysUntil } from "@/lib/dashboard/format";
import { estimateInvestorPosition } from "@/lib/dashboard/calc";
import { gradeFromConfidence } from "@/lib/dashboard/grade";
import { getAllRealVaultOfferings } from "@/lib/contracts/real-vault";
import type { VaultOffering } from "@/lib/dashboard/types";
import { GradeBadge } from "@/components/dashboard/grade-badge";
import { VaultFillMeter } from "@/components/dashboard/vault/fill-meter";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ButtonLink } from "@/components/ui/button";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; vaults: VaultOffering[] };

type GradeFilter = "all" | "A" | "B+" | "B" | "C/D";
type DurationFilter = "all" | "short" | "medium" | "long";
type RemainingFilter = "all" | "under10k" | "over10k";

const GRADE_OPTIONS: { label: string; value: GradeFilter }[] = [
  { label: "All grades", value: "all" },
  { label: "A", value: "A" },
  { label: "B+", value: "B+" },
  { label: "B", value: "B" },
  { label: "C/D", value: "C/D" },
];

const DURATION_OPTIONS: { label: string; value: DurationFilter }[] = [
  { label: "All durations", value: "all" },
  { label: "< 30 days", value: "short" },
  { label: "30–60 days", value: "medium" },
  { label: "60+ days", value: "long" },
];

const REMAINING_OPTIONS: { label: string; value: RemainingFilter }[] = [
  { label: "Any amount", value: "all" },
  { label: "< $10k remaining", value: "under10k" },
  { label: "$10k+ remaining", value: "over10k" },
];

function gradeBucket(confidenceBps: number, gradeOverride?: string): GradeFilter {
  const grade = gradeOverride ?? gradeFromConfidence(confidenceBps);
  return grade === "C" || grade === "D" || grade === "DECLINE" ? "C/D" : (grade as GradeFilter);
}

function durationBucket(days: number): DurationFilter {
  if (days < 30) return "short";
  if (days <= 60) return "medium";
  return "long";
}

function FilterGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="sr-only">{label}</span>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            value === option.value
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function VaultRow({ vault }: { vault: VaultOffering & { gradeLabel?: string } }) {
  const position = estimateInvestorPosition(vault.faceValue);
  const days = daysUntil(vault.expectedSettlementAt);

  return (
    <li>
      <Link
        href={`/investor/vaults/${vault.receivableId}`}
        className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg px-3 py-3.5 transition-colors duration-150 hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:grid-cols-[1.6fr_repeat(4,0.9fr)_1.3fr] sm:items-center sm:gap-3"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-foreground">#{vault.receivableId}</span>
            <GradeBadge confidenceBps={vault.decision.confidenceBps} grade={vault.gradeLabel} />
          </div>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">{vault.storeName}</p>
        </div>

        <div className="sm:text-right">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground sm:hidden">
            Face value
          </p>
          <p className="font-mono text-sm text-foreground">{formatCurrency(vault.faceValue)}</p>
        </div>

        <div className="sm:text-right">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground sm:hidden">
            Advance
          </p>
          <p className="font-mono text-sm text-foreground">{formatCurrency(vault.targetAmount)}</p>
        </div>

        <div className="sm:text-right">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground sm:hidden">
            Target yield
          </p>
          <p className="font-mono text-sm text-foreground">{formatBps(position.returnBps)}</p>
        </div>

        <div className="sm:text-right">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground sm:hidden">
            Settlement
          </p>
          <p className="font-mono text-sm text-foreground">
            {days > 0 ? `${days}d` : "Settling"}
          </p>
        </div>

        <div className="col-span-2 sm:col-span-1">
          <VaultFillMeter raisedAmount={vault.raisedAmount} targetAmount={vault.targetAmount} />
        </div>
      </Link>
    </li>
  );
}

export default function VaultsPage() {
  const [grade, setGrade] = useState<GradeFilter>("all");
  const [duration, setDuration] = useState<DurationFilter>("all");
  const [remaining, setRemaining] = useState<RemainingFilter>("all");
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    getAllRealVaultOfferings()
      .then((vaults) => {
        if (!cancelled) setLoadState({ status: "ready", vaults });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadState({
            status: "error",
            message: error instanceof Error ? error.message : "Couldn't load vaults.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const openVaults = useMemo(() => (loadState.status === "ready" ? loadState.vaults : []), [loadState]);

  const totalCapacity = useMemo(
    () => openVaults.reduce((sum, vault) => sum + Math.max(0, vault.targetAmount - vault.raisedAmount), 0),
    [openVaults],
  );

  const vaults = useMemo(() => {
    return openVaults.filter((vault) => {
      const gradeLabel = "gradeLabel" in vault ? (vault as { gradeLabel?: string }).gradeLabel : undefined;
      if (grade !== "all" && gradeBucket(vault.decision.confidenceBps, gradeLabel) !== grade) return false;
      if (duration !== "all" && durationBucket(daysUntil(vault.expectedSettlementAt)) !== duration) {
        return false;
      }
      const remainingAmount = Math.max(0, vault.targetAmount - vault.raisedAmount);
      if (remaining === "under10k" && remainingAmount >= 10_000) return false;
      if (remaining === "over10k" && remainingAmount < 10_000) return false;
      return true;
    });
  }, [openVaults, grade, duration, remaining]);

  const filtersActive = grade !== "all" || duration !== "all" || remaining !== "all";

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-0">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Open vaults</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {formatCurrency(totalCapacity)} of capacity currently open across {openVaults.length} vault
          {openVaults.length === 1 ? "" : "s"}.
        </p>
      </div>

      {loadState.status === "error" && (
        <p role="alert" className="mt-4 text-sm text-danger">
          Couldn&apos;t load vaults from chain: {loadState.message}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <FilterGroup label="Grade" options={GRADE_OPTIONS} value={grade} onChange={setGrade} />
        <FilterGroup label="Duration" options={DURATION_OPTIONS} value={duration} onChange={setDuration} />
        <FilterGroup label="Amount remaining" options={REMAINING_OPTIONS} value={remaining} onChange={setRemaining} />
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-3 sm:p-4">
        {loadState.status === "loading" ? (
          <p className="p-6 text-sm text-muted-foreground">Loading vaults from chain…</p>
        ) : openVaults.length === 0 ? (
          <div className="p-4 sm:p-6">
            <EmptyState
              title="No open vaults right now"
              description="New receivables appear here once they clear underwriting. In the meantime, the agent's declines are published too."
              action={
                <ButtonLink href="/investor/activity#declines" size="sm">
                  See recent declines
                </ButtonLink>
              }
            />
          </div>
        ) : vaults.length === 0 ? (
          <div className="p-4 sm:p-6">
            <EmptyState
              title="No vaults match these filters"
              description="Try widening the grade, duration, or amount range."
              action={
                filtersActive ? (
                  <button
                    type="button"
                    onClick={() => {
                      setGrade("all");
                      setDuration("all");
                      setRemaining("all");
                    }}
                    className="text-sm font-medium text-foreground underline decoration-border underline-offset-4 hover:text-primary hover:decoration-primary"
                  >
                    Clear filters
                  </button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {vaults.map((vault) => (
              <VaultRow key={vault.receivableId} vault={vault} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
