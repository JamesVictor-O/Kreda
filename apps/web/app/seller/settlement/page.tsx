import { formatCurrency, formatDate, daysUntil, daysBetween } from "@/lib/dashboard/format";
import { ACTIVE_ADVANCES, OVERVIEW_STATS, SETTLED_ADVANCES, STORE } from "@/lib/dashboard/fixtures";
import type { Advance } from "@/lib/dashboard/types";
import { HashLink } from "@/components/dashboard/hash-link";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ProgressBar } from "@/components/dashboard/progress-bar";
import { ButtonLink } from "@/components/ui/button";

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

function SettledRow({ advance }: { advance: Advance }) {
  return (
    <tr>
      <td className="px-4 py-3 font-mono text-foreground">#{advance.receivableId}</td>
      <td className="px-4 py-3 text-muted-foreground">{formatDate(advance.settledAt!)}</td>
      <td className="px-4 py-3 text-right font-mono text-foreground">
        {formatCurrency(advance.faceValue)}
      </td>
      <td className="px-4 py-3">
        {advance.vaultAddress ? <HashLink label="Vault" hash={advance.vaultAddress} /> : "—"}
      </td>
      <td className="px-4 py-3">
        {advance.settlementTxHash ? (
          <HashLink label="Settlement tx" hash={advance.settlementTxHash} />
        ) : (
          "—"
        )}
      </td>
    </tr>
  );
}

function SettledCard({ advance }: { advance: Advance }) {
  return (
    <li className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-sm text-foreground">#{advance.receivableId}</span>
        <span className="font-mono text-sm font-semibold text-foreground">
          {formatCurrency(advance.faceValue)}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Settled {formatDate(advance.settledAt!)}</p>
      <dl className="mt-3 space-y-1.5 text-xs">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">Vault</dt>
          <dd>
            {advance.vaultAddress ? <HashLink label="Vault" hash={advance.vaultAddress} /> : "—"}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">Settlement tx</dt>
          <dd>
            {advance.settlementTxHash ? (
              <HashLink label="Settlement tx" hash={advance.settlementTxHash} />
            ) : (
              "—"
            )}
          </dd>
        </div>
      </dl>
    </li>
  );
}

function PendingRow({ advance }: { advance: Advance }) {
  const remaining = daysUntil(advance.expectedSettlementAt);
  const total = daysBetween(advance.createdAt, advance.expectedSettlementAt);
  const fraction = total > 0 ? 1 - Math.max(remaining, 0) / total : 1;

  return (
    <li className="py-4">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2">
          <span className="font-mono text-sm text-foreground">#{advance.receivableId}</span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
            Awaiting payout confirmation
          </span>
        </span>
        <span className="font-mono text-sm font-semibold text-foreground">
          {formatCurrency(advance.faceValue)}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>Expected {formatDate(advance.expectedSettlementAt)}</span>
        <span>{remaining > 0 ? `${remaining} days` : "Settling"}</span>
      </div>
      <div className="mt-2.5">
        <ProgressBar
          fraction={fraction}
          label={`Settlement progress for receivable #${advance.receivableId}`}
        />
      </div>
    </li>
  );
}

export default function SettlementPage() {
  const settled = [...SETTLED_ADVANCES].sort(
    (a, b) => new Date(b.settledAt!).getTime() - new Date(a.settledAt!).getTime(),
  );
  const pending = [...ACTIVE_ADVANCES].sort(
    (a, b) => new Date(a.expectedSettlementAt).getTime() - new Date(b.expectedSettlementAt).getTime(),
  );
  const totalConfirmed = settled.reduce((sum, advance) => sum + advance.faceValue, 0);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-0">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Settlement</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Payout confirmations for {STORE.storeName}, one Settlement.confirmPayout() call per
          vault.
        </p>
      </div>

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
            <Stat label="Next settlement" value={`${OVERVIEW_STATS.nextSettlementInDays} days`} />
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
                  {settled.map((advance) => (
                    <SettledRow key={advance.id} advance={advance} />
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="mt-4 space-y-3 md:hidden">
              {settled.map((advance) => (
                <SettledCard key={advance.id} advance={advance} />
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
              {pending.map((advance) => (
                <PendingRow key={advance.id} advance={advance} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
