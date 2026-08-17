import Link from "next/link";
import { cn } from "@/lib/cn";
import { formatCurrency, formatDate, formatNumber, daysUntil } from "@/lib/dashboard/format";
import {
  ACTIVE_POSITIONS,
  SETTLED_POSITIONS,
  elapsedFraction,
  type InvestorPosition,
} from "@/lib/dashboard/investor";
import { PortfolioStatRow } from "@/components/dashboard/portfolio/stat-row";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ButtonLink } from "@/components/ui/button";

function PositionRow({ position, settled }: { position: InvestorPosition; settled: boolean }) {
  const { advance, principal, returnAmount } = position;
  const accrued = settled ? returnAmount : returnAmount * elapsedFraction(advance);
  const days = daysUntil(advance.expectedSettlementAt);

  return (
    <li>
      <Link
        href={`/investor/portfolio/${advance.id}`}
        className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg px-3 py-3.5 transition-colors duration-150 hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:grid-cols-[1.6fr_repeat(3,0.9fr)_1fr] sm:items-center sm:gap-3"
      >
        <div className="min-w-0">
          <span className="font-mono text-sm text-foreground">#{advance.receivableId}</span>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">{advance.storeName}</p>
        </div>

        <div className="sm:text-right">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground sm:hidden">
            Amount
          </p>
          <p className="font-mono text-sm text-foreground">{formatCurrency(principal)}</p>
        </div>

        <div className="sm:text-right">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground sm:hidden">
            Shares
          </p>
          <p className="font-mono text-sm text-foreground">{formatNumber(principal)}</p>
        </div>

        <div className="sm:text-right">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground sm:hidden">
            {settled ? "Realized yield" : "Accrued yield"}
          </p>
          <p className="font-mono text-sm text-foreground">{formatCurrency(accrued)}</p>
        </div>

        <div className="sm:text-right">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground sm:hidden">
            Status
          </p>
          <span
            className={cn(
              "inline-block rounded-full px-2 py-0.5 text-[11px] font-medium",
              settled ? "bg-foreground/[0.06] text-foreground" : "bg-primary/10 text-primary",
            )}
          >
            {settled ? `Settled ${formatDate(advance.settledAt!)}` : days > 0 ? `${days}d left` : "Settling"}
          </span>
        </div>
      </Link>
    </li>
  );
}

function PositionSection({
  title,
  positions,
  settled,
  emptyTitle,
  emptyDescription,
}: {
  title: string;
  positions: InvestorPosition[];
  settled: boolean;
  emptyTitle: string;
  emptyDescription: string;
}) {
  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      <div className="mt-4 rounded-2xl border border-border bg-surface p-3 sm:p-4">
        {positions.length === 0 ? (
          <div className="p-4 sm:p-6">
            <EmptyState
              title={emptyTitle}
              description={emptyDescription}
              action={
                !settled ? (
                  <ButtonLink href="/investor" size="sm">
                    Browse open vaults
                  </ButtonLink>
                ) : undefined
              }
            />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {positions.map((position) => (
              <PositionRow key={position.advance.id} position={position} settled={settled} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function PortfolioPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-0">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Portfolio</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Receivables you&rsquo;re funding on Kreda</p>
      </div>

      <div className="mt-8">
        <PortfolioStatRow />
      </div>

      <PositionSection
        title="Active"
        positions={ACTIVE_POSITIONS}
        settled={false}
        emptyTitle="No active positions"
        emptyDescription="Fund a receivable and it will show up here with its settlement countdown."
      />

      <PositionSection
        title="Settled"
        positions={SETTLED_POSITIONS}
        settled={true}
        emptyTitle="Nothing settled yet"
        emptyDescription="Positions move here once Settlement.confirmPayout() has run and proceeds are redeemable."
      />
    </div>
  );
}
