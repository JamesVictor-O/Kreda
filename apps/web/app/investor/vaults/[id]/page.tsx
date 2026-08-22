import { notFound } from "next/navigation";
import Link from "next/link";
import { getVaultById } from "@/lib/dashboard/fixtures";
import { GradeBadge } from "@/components/dashboard/grade-badge";
import { ReceivableFacts } from "@/components/dashboard/vault/receivable-facts";
import { DepositPanel } from "@/components/dashboard/vault/deposit-panel";
import { UnderwriterCard } from "@/components/dashboard/vault/underwriter-card";
import { AttestationArtifact } from "@/components/dashboard/attestation-artifact";
import { IconArrowLeft } from "@/components/ui/icons";
import { getRealVaultOfferingById } from "@/lib/contracts/real-vault";
import type { VaultOffering } from "@/lib/dashboard/types";

export default async function VaultDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // A receivable with a real deployed vault reads live from
  // Attestation.get() and the vault's own state — see
  // lib/contracts/real-vault.ts. Every other id stays on fixtures.
  let vault: VaultOffering | undefined;
  let gradeLabel: string | undefined;
  const real = await getRealVaultOfferingById(id);
  if (real) {
    vault = real;
    gradeLabel = real.gradeLabel;
  } else {
    vault = getVaultById(id);
  }
  if (!vault) notFound();

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-0">
      <Link
        href="/investor"
        className="inline-flex items-center gap-1.5 rounded-sm text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <IconArrowLeft className="h-4 w-4" aria-hidden="true" />
        Open vaults
      </Link>

      {/* Region one — the receivable, with the deposit action visible
          without scrolling. */}
      <div className="mt-4 rounded-2xl border border-border bg-surface p-5 sm:p-6 lg:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-sm text-muted-foreground">
              Receivable #{vault.receivableId}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                {vault.storeName}
              </h1>
              <GradeBadge confidenceBps={vault.decision.confidenceBps} grade={gradeLabel} />
            </div>
          </div>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            Open for funding
          </span>
        </div>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:divide-x lg:divide-border">
          <div>
            <ReceivableFacts vault={vault} />
          </div>
          <div className="lg:pl-8">
            <DepositPanel vault={vault} />
          </div>
        </div>
      </div>

      {/* Region two — the evidence. The centrepiece: full detail, no
          summarised score hidden behind a toggle. */}
      <div className="mt-6">
        <h2 className="text-xl font-semibold text-foreground">Evidence</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Everything the agent checked before this receivable was approved.
        </p>
        <div className="mt-4">
          <AttestationArtifact
            decision={vault.decision}
            storeName={vault.storeName}
            faceValue={vault.faceValue}
            expectedSettlementAt={vault.expectedSettlementAt}
          />
        </div>
      </div>

      {/* Region three — the underwriter. */}
      <div className="mt-6">
        <UnderwriterCard />
      </div>
    </div>
  );
}
