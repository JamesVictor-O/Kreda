import { cn } from "@/lib/cn";
import { formatCurrency, formatCurrencyCompact } from "@/lib/dashboard/format";
import { CASH_POSITION } from "@/lib/dashboard/fixtures";
import { DeltaPill } from "@/components/dashboard/delta-pill";

const MAX_BAR_HEIGHT = 160;

export function CashPositionChart() {
  const max = Math.max(...CASH_POSITION.map((month) => month.amountReceived));
  const average =
    CASH_POSITION.reduce((sum, month) => sum + month.amountReceived, 0) / CASH_POSITION.length;
  const averagePx = (average / max) * MAX_BAR_HEIGHT;

  const currentIndex = CASH_POSITION.findIndex((month) => month.isCurrent);
  const current = CASH_POSITION[currentIndex];
  const previous = currentIndex > 0 ? CASH_POSITION[currentIndex - 1] : undefined;
  const delta =
    current && previous
      ? ((current.amountReceived - previous.amountReceived) / previous.amountReceived) * 100
      : 0;

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Cash position</h2>
          <p className="mt-2 font-mono text-3xl font-semibold tracking-tight text-foreground">
            {current ? formatCurrency(current.amountReceived) : "—"}
          </p>
        </div>
        {previous && (
          <div className="flex items-center gap-2">
            <DeltaPill value={delta} />
            <span className="text-sm text-muted-foreground">vs last month</span>
          </div>
        )}
      </div>

      <div className="relative mt-10">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 border-t border-dashed border-muted-foreground/40"
          style={{ bottom: averagePx }}
        >
          <span className="absolute right-0 -translate-y-full rounded-md bg-foreground px-2 py-1 font-mono text-[11px] font-medium text-background">
            Avg {formatCurrencyCompact(average)}
          </span>
        </div>

        <div
          className="flex items-end gap-1.5 sm:gap-4 lg:gap-6"
          style={{ height: MAX_BAR_HEIGHT + 56 }}
          role="img"
          aria-label={`Monthly cash received, ${CASH_POSITION.map((m) => `${m.month} ${formatCurrency(m.amountReceived)}`).join(", ")}. Average ${formatCurrency(Math.round(average))} per month.`}
        >
          {CASH_POSITION.map((month) => {
            const barHeight = (month.amountReceived / max) * MAX_BAR_HEIGHT;

            return (
              <div
                key={month.month}
                aria-hidden="true"
                className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2"
              >
                <span
                  className={cn(
                    "font-mono text-xs",
                    month.isCurrent ? "font-semibold text-foreground" : "text-muted-foreground",
                  )}
                >
                  {formatCurrencyCompact(month.amountReceived)}
                </span>
                <div
                  className={cn("w-full rounded-t-lg", month.isCurrent ? "bg-primary" : "bg-border")}
                  style={{ height: barHeight }}
                />
                <span
                  className={cn(
                    "text-xs",
                    month.isCurrent ? "font-semibold text-foreground" : "text-muted-foreground",
                  )}
                >
                  {month.month}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
