import { formatCurrency, daysUntil } from "@/lib/dashboard/format";
import type { IndexedAttestation } from "@/lib/contracts/indexer";
import { HashLink } from "@/components/dashboard/hash-link";
import { GradeBadge } from "@/components/dashboard/grade-badge";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ButtonLink } from "@/components/ui/button";

function AdvanceRow({ attestation }: { attestation: IndexedAttestation }) {
  const remaining = daysUntil(attestation.expectedSettlementAt);

  return (
    <li className="px-2 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2">
          <HashLink label="Attestation" hash={attestation.attestationId} />
          <GradeBadge confidenceBps={attestation.confidenceBps} grade={attestation.gradeLabel} />
        </span>
        <span className="font-mono text-sm font-semibold text-foreground">
          {formatCurrency(attestation.faceValue)}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>{attestation.approved ? "Approved" : "Declined"}</span>
        <span className="shrink-0">{remaining > 0 ? `${remaining} days to settlement` : "Settling"}</span>
      </div>
    </li>
  );
}

export function ActiveAdvancesList({ attestations }: { attestations: IndexedAttestation[] }) {
  const active = attestations.filter((a) => a.approved);

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
      <h2 className="text-xl font-semibold text-foreground">Active advances</h2>

      {active.length === 0 ? (
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
          {active.map((attestation) => (
            <AdvanceRow key={attestation.attestationId} attestation={attestation} />
          ))}
        </ul>
      )}
    </div>
  );
}
