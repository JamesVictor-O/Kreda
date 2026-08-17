import { notFound } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { formatBps, formatCurrency, formatNumber } from "@/lib/dashboard/format";
import { elapsedFraction, getPositionById, getRedemptionEvent } from "@/lib/dashboard/investor";
import { GradeBadge } from "@/components/dashboard/grade-badge";
import { ReceivableFacts } from "@/components/dashboard/vault/receivable-facts";
import { UnderwriterCard } from "@/components/dashboard/vault/underwriter-card";
import { AttestationArtifact } from "@/components/dashboard/attestation-artifact";
import { HashLink } from "@/components/dashboard/hash-link";
import { IconArrowLeft } from "@/components/ui/icons";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-mono text-sm text-foreground">{children}</dd>
    </div>
  );
}

export default async function PositionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const position = getPositionById(id);
  if (!position) notFound();

  const { advance, principal, returnAmount, returnBps } = position;
  const settled = advance.status === "settled";
  const accrued = settled ? returnAmount : returnAmount * elapsedFraction(advance);
  const redemption = settled ? getRedemptionEvent(advance.receivableId) : undefined;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-0">
      <Link
        href="/investor/portfolio"
        className="inline-flex items-center gap-1.5 rounded-sm text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <IconArrowLeft className="h-4 w-4" aria-hidden="true" />
        Portfolio
      </Link>

      <div className="mt-4 rounded-2xl border border-border bg-surface p-5 sm:p-6 lg:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-sm text-muted-foreground">
              Receivable #{advance.receivableId}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                {advance.storeName}
              </h1>
              <GradeBadge confidenceBps={advance.decision.confidenceBps} />
            </div>
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

        <div className="mt-6 grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:divide-x lg:divide-border">
          <div>
            <ReceivableFacts
              vault={{
                faceValue: advance.faceValue,
                targetAmount: principal,
                raisedAmount: principal,
                expectedSettlementAt: advance.expectedSettlementAt,
                decision: advance.decision,
              }}
            />
          </div>
          <div className="lg:pl-8">
            <div className="rounded-xl border border-border bg-background p-5 sm:p-6">
              <h2 className="text-sm font-medium text-foreground">Your position</h2>
              <dl className="mt-2 divide-y divide-border">
                <Row label="Principal deposited">{formatCurrency(principal)}</Row>
                <Row label="Shares">{formatNumber(principal)}</Row>
                <Row label={settled ? "Realized yield" : "Accrued yield"}>
                  {formatCurrency(accrued)}
                </Row>
                <Row label="Target return">{formatBps(returnBps)}</Row>
                {settled && redemption && (
                  <Row label="Redemption tx">
                    <HashLink label="Redemption tx" hash={redemption.txHash} />
                  </Row>
                )}
              </dl>
              {!settled && (
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  Redeemable once Settlement.confirmPayout() runs for this vault.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="text-xl font-semibold text-foreground">Evidence</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          The reasoning stays accessible for the life of the position, not just at funding time.
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

      <div className="mt-6">
        <UnderwriterCard />
      </div>
    </div>
  );
}
