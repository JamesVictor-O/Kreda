"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { formatCurrency, formatDate, daysUntil } from "@/lib/dashboard/format";
import { useSellerAttestations } from "@/lib/contracts/use-seller-attestations";
import { storeDisplayName } from "@/lib/agent-api-map";
import type { IndexedAttestation } from "@/lib/contracts/indexer";
import { GradeBadge } from "@/components/dashboard/grade-badge";
import { HashLink } from "@/components/dashboard/hash-link";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ButtonLink } from "@/components/ui/button";

const CONNECTED_STORE_ID = "northfield-outfitters.myshopify.com";

type Filter = "all" | "approved" | "declined";

const FILTERS: { label: string; value: Filter }[] = [
  { label: "All", value: "all" },
  { label: "Approved", value: "approved" },
  { label: "Declined", value: "declined" },
];

function AdvanceRow({ attestation }: { attestation: IndexedAttestation }) {
  const remaining = daysUntil(attestation.expectedSettlementAt);

  return (
    <li className="py-4">
      <div className="flex items-center justify-between gap-3">
        <span className="flex flex-wrap items-center gap-2">
          <HashLink label="Attestation" hash={attestation.attestationId} />
          <GradeBadge confidenceBps={attestation.confidenceBps} grade={attestation.gradeLabel} />
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-medium",
              attestation.approved ? "bg-primary/10 text-primary" : "bg-danger/10 text-danger",
            )}
          >
            {attestation.approved ? "Approved" : "Declined"}
          </span>
        </span>
        <span className="font-mono text-sm font-semibold text-foreground">
          {formatCurrency(attestation.faceValue)}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>{formatDate(attestation.committedAt.slice(0, 10))}</span>
        {attestation.approved && (
          <span className="shrink-0">
            {remaining > 0 ? `${remaining} days to settlement` : "Settling"}
          </span>
        )}
      </div>
    </li>
  );
}

export default function AdvancesPage() {
  const state = useSellerAttestations();
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    const attestations = state.status === "ready" ? state.attestations : [];
    if (filter === "all") return attestations;
    return attestations.filter((a) => (filter === "approved" ? a.approved : !a.approved));
  }, [state, filter]);

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-0">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Advances</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Every receivable assigned from {storeDisplayName(CONNECTED_STORE_ID)}
          </p>
        </div>
        <ButtonLink href="/seller/new-advance">New advance</ButtonLink>
      </div>

      {state.status === "error" && (
        <p role="alert" className="mt-6 text-sm text-danger">
          Couldn&apos;t load your advances from chain: {state.message}
        </p>
      )}

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
        {filtered.length === 0 ? (
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
            {filtered.map((attestation) => (
              <AdvanceRow key={attestation.attestationId} attestation={attestation} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
