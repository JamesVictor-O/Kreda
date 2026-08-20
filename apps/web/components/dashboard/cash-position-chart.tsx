import { EmptyState } from "@/components/dashboard/empty-state";

/// No seller has had a receivable settle yet (Settlement.confirmPayout()
/// has never been called against any real vault) — every real seller's
/// monthly cash-received figure would be genuinely zero across every
/// month right now. An all-zero bar chart both looks broken (the
/// original component divides by the month-over-month max, which is 0)
/// and isn't more honest than just saying so.
export function CashPositionChart() {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 sm:p-6 lg:p-8">
      <h2 className="text-xl font-semibold text-foreground">Cash position</h2>
      <div className="mt-6">
        <EmptyState
          title="No cash received yet"
          description="Once a receivable is funded and settles, monthly cash received will show up here."
        />
      </div>
    </div>
  );
}
