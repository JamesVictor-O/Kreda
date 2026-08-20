import { notFound } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { getAdvanceById } from "@/lib/dashboard/fixtures";
import { getRealAdvancePreview } from "@/lib/agent-api-map";
import { formatBps, formatCurrency, formatDate } from "@/lib/dashboard/format";
import { AttestationArtifact } from "@/components/dashboard/attestation-artifact";
import { IconArrowLeft, IconCheck } from "@/components/ui/icons";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-mono text-sm font-medium text-foreground">{children}</dd>
    </div>
  );
}

export default async function AdvanceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Fixtures first (fast, no network); anything not there is checked
  // against the live agent service before giving up — a receivable
  // created through /new-advance has real evidence but no vault yet (that
  // step is still a manual DeployVault.s.sol run — see
  // contracts/deployments/testnet-vaults.json), so it gets a simpler view
  // than a fixture advance with a full funding breakdown.
  const advance = getAdvanceById(id);
  if (advance) {
    const settled = advance.status === "settled";
    const milestones = [
      { label: "Assigned", date: advance.createdAt, done: true },
      { label: "Funded", date: advance.createdAt, done: true },
      {
        label: settled ? "Settled" : "Expected settlement",
        date: settled ? advance.settledAt! : advance.expectedSettlementAt,
        done: settled,
      },
    ];

    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-0">
        <BackLink />

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Receivable #{advance.receivableId}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">{advance.storeName}</p>
          </div>
          <span
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium",
              settled ? "bg-foreground/[0.06] text-foreground" : "bg-primary/10 text-primary",
            )}
          >
            {settled ? "Settled" : "Active"}
          </span>
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-surface p-6 sm:p-8">
          <div className="relative">
            <div aria-hidden="true" className="absolute left-0 right-0 top-3.5 h-px bg-border" />
            <ol className="relative flex justify-between">
              {milestones.map((milestone) => (
                <li key={milestone.label} className="flex flex-1 flex-col items-center text-center">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "relative z-10 flex h-7 w-7 items-center justify-center rounded-full bg-surface",
                      milestone.done
                        ? "border-2 border-primary text-primary"
                        : "border-2 border-border text-muted-foreground",
                    )}
                  >
                    {milestone.done && <IconCheck className="h-3.5 w-3.5" />}
                  </span>
                  <p className="mt-3 text-sm font-medium text-foreground">{milestone.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(milestone.date)}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-surface p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-foreground">Funding breakdown</h2>
          <dl className="mt-2 divide-y divide-border">
            <Row label="Face value">{formatCurrency(advance.faceValue)}</Row>
            <Row label="Advance rate">{formatBps(advance.advanceRateBps)}</Row>
            <Row label="Fee">{formatBps(advance.feeBps)}</Row>
            <Row label="Amount received">{formatCurrency(advance.amountReceived)}</Row>
          </dl>
        </div>

        <div className="mt-6">
          <h2 className="text-xl font-semibold text-foreground">Attestation</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            The evidence behind this decision, committed on-chain.
          </p>
          <div className="mt-4">
            <AttestationArtifact
              decision={advance.decision}
              storeName={advance.storeName}
              faceValue={advance.faceValue}
              expectedSettlementAt={advance.expectedSettlementAt}
            />
          </div>
        </div>
      </div>
    );
  }

  const real = await getRealAdvancePreview(id);
  if (!real) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-0">
      <BackLink />

      <div className="mt-4">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Receivable #{real.decision.receivableId}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{real.storeName}</p>
      </div>

      {real.decision.outcome === "approved" && (
        <div className="mt-6 rounded-xl border border-border bg-surface p-4 text-sm text-muted-foreground">
          Awaiting vault deployment — funding details will appear here once an investor vault is
          opened for this receivable.
        </div>
      )}

      <div className="mt-6">
        <h2 className="text-xl font-semibold text-foreground">Attestation</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          The evidence behind this decision, committed on-chain.
        </p>
        <div className="mt-4">
          <AttestationArtifact
            decision={real.decision}
            storeName={real.storeName}
            faceValue={real.faceValue}
          />
        </div>
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/seller"
      className="inline-flex items-center gap-1.5 rounded-sm text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <IconArrowLeft className="h-4 w-4" aria-hidden="true" />
      Dashboard
    </Link>
  );
}
