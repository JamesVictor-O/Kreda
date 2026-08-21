"use client";

import { formatCurrency, formatDate, daysUntil, daysBetween } from "@/lib/dashboard/format";
import { useSellerSettlements, type SellerSettlement } from "@/lib/contracts/use-seller-settlements";
import { storeDisplayName } from "@/lib/agent-api-map";
import { HashLink } from "@/components/dashboard/hash-link";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ProgressBar } from "@/components/dashboard/progress-bar";
import { ButtonLink } from "@/components/ui/button";

const CONNECTED_STORE_ID = "northfield-outfitters.myshopify.com";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 font-mono text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        {value}
      </p>
    </div>
  );
}

function SettledRow({ settlement }: { settlement: SellerSettlement }) {
  return (
    <tr>
      <td className="px-4 py-3 font-mono text-foreground">#{settlement.receivableId}</td>
      <td className="px-4 py-3 text-muted-foreground">{formatDate(settlement.settledAt!)}</td>
      <td className="px-4 py-3 text-right font-mono text-foreground">
        {formatCurrency(settlement.payoutAmount ?? settlement.faceValue)}
      </td>
      <td className="px-4 py-3">
        <HashLink label="Vault" hash={settlement.vaultAddress} kind="address" />
      </td>
      <td className="px-4 py-3">
        {settlement.settlementTxHash ? (
          <HashLink label="Settlement tx" hash={settlement.settlementTxHash} kind="tx" />
        ) : (
          "—"
        )}
      </td>
    </tr>
  );
}

function SettledCard({ settlement }: { settlement: SellerSettlement }) {
  return (
    <li className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-sm text-foreground">#{settlement.receivableId}</span>
        <span className="font-mono text-sm font-semibold text-foreground">
          {formatCurrency(settlement.payoutAmount ?? settlement.faceValue)}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Settled {formatDate(settlement.settledAt!)}</p>
      <dl className="mt-3 space-y-1.5 text-xs">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">Vault</dt>
          <dd>
            <HashLink label="Vault" hash={settlement.vaultAddress} kind="address" />
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">Settlement tx</dt>
          <dd>
            {settlement.settlementTxHash ? (
              <HashLink label="Settlement tx" hash={settlement.settlementTxHash} kind="tx" />
            ) : (
              "—"
            )}
          </dd>
        </div>
      </dl>
    </li>
  );
}

function PendingRow({ settlement }: { settlement: SellerSettlement }) {
  const remaining = daysUntil(settlement.expectedSettlementAt);
  const total = daysBetween(settlement.committedAt, settlement.expectedSettlementAt);
  const fraction = total > 0 ? 1 - Math.max(remaining, 0) / total : 1;

  return (
    <li className="py-4">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2">
          <span className="font-mono text-sm text-foreground">#{settlement.receivableId}</span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
            Awaiting payout confirmation
          </span>
        </span>
        <span className="font-mono text-sm font-semibold text-foreground">
          {formatCurrency(settlement.faceValue)}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>Expected {formatDate(settlement.expectedSettlementAt)}</span>
        <span>{remaining > 0 ? `${remaining} days` : "Settling"}</span>
      </div>
      <div className="mt-2.5">
        <ProgressBar
          fraction={fraction}
          label={`Settlement progress for receivable #${settlement.receivableId}`}
        />
      </div>
    </li>
  );
}

export default function SettlementPage() {
  const state = useSellerSettlements();
  const settlements = state.status === "ready" ? state.settlements : [];

  const settled = [...settlements]
    .filter((s) => s.settled)
    .sort((a, b) => new Date(b.settledAt!).getTime() - new Date(a.settledAt!).getTime());
  const pending = [...settlements]
    .filter((s) => s.funded && !s.settled)
    .sort(
      (a, b) => new Date(a.expectedSettlementAt).getTime() - new Date(b.expectedSettlementAt).getTime(),
    );

  const totalConfirmed = settled.reduce((sum, s) => sum + (s.payoutAmount ?? s.faceValue), 0);
  const nextSettlementDays = pending.length > 0 ? Math.max(daysUntil(pending[0].expectedSettlementAt), 0) : null;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-0">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Settlement</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Payout confirmations for {storeDisplayName(CONNECTED_STORE_ID)}, one
          Settlement.confirmPayout() call per vault.
        </p>
      </div>

      {state.status === "error" && (
        <p role="alert" className="mt-6 text-sm text-danger">
          Couldn&apos;t load settlements from chain: {state.message}
        </p>
      )}

      {state.status === "loading" ? (
        <p className="mt-8 text-sm text-muted-foreground">Loading settlements from chain…</p>
      ) : (
        <>
          <div className="mt-8 rounded-2xl border border-border bg-surface p-6 sm:p-8">
            <div className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4 sm:divide-x sm:divide-border">
              <Stat label="Settlements confirmed" value={String(settled.length)} />
              <div className="sm:pl-6">
                <Stat label="Total payout confirmed" value={formatCurrency(totalConfirmed)} />
              </div>
              <div className="sm:pl-6">
                <Stat label="Pending settlement" value={String(pending.length)} />
              </div>
              <div className="sm:pl-6">
                <Stat
                  label="Next settlement"
                  value={nextSettlementDays !== null ? `${nextSettlementDays} days` : "—"}
                />
              </div>
            </div>
          </div>

          <div className="mt-10">
            <h2 className="text-xl font-semibold text-foreground">Confirmed</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Proceeds moved into the vault for pro-rata investor redemption.
            </p>

            {settled.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-border bg-surface p-6 sm:p-8">
                <EmptyState
                  title="No settlements yet"
                  description="Once a payout is confirmed on-chain, it will show up here with its vault and settlement tx."
                />
              </div>
            ) : (
              <>
                <div className="mt-4 hidden overflow-hidden rounded-2xl border border-border bg-surface md:block">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-border bg-background/60">
                      <tr>
                        <th scope="col" className="px-4 py-3 font-medium text-muted-foreground">
                          Receivable
                        </th>
                        <th scope="col" className="px-4 py-3 font-medium text-muted-foreground">
                          Settled
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-3 text-right font-medium text-muted-foreground"
                        >
                          Payout
                        </th>
                        <th scope="col" className="px-4 py-3 font-medium text-muted-foreground">
                          Vault
                        </th>
                        <th scope="col" className="px-4 py-3 font-medium text-muted-foreground">
                          Settlement tx
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {settled.map((settlement) => (
                        <SettledRow key={settlement.receivableId} settlement={settlement} />
                      ))}
                    </tbody>
                  </table>
                </div>

                <ul className="mt-4 space-y-3 md:hidden">
                  {settled.map((settlement) => (
                    <SettledCard key={settlement.receivableId} settlement={settlement} />
                  ))}
                </ul>
              </>
            )}
          </div>

          <div className="mt-10">
            <h2 className="text-xl font-semibold text-foreground">Pending</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Funded receivables awaiting payout confirmation from the connected store.
            </p>

            <div className="mt-4 rounded-2xl border border-border bg-surface p-6 sm:p-8">
              {pending.length === 0 ? (
                <EmptyState
                  title="Nothing pending"
                  description="Fund a receivable and it will appear here until its payout is confirmed."
                  action={
                    <ButtonLink href="/seller/new-advance" size="sm">
                      New advance
                    </ButtonLink>
                  }
                />
              ) : (
                <ul className="divide-y divide-border">
                  {pending.map((settlement) => (
                    <PendingRow key={settlement.receivableId} settlement={settlement} />
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
