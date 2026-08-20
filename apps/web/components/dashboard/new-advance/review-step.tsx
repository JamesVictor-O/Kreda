"use client";

import { formatCurrency } from "@/lib/dashboard/format";
import { estimateAdvance } from "@/lib/dashboard/calc";
import type { OrderSummary } from "@/lib/agent-api";
import { Button } from "@/components/ui/button";
import { IconArrowLeft } from "@/components/ui/icons";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 font-mono text-2xl font-semibold tracking-tight text-foreground">{value}</p>
    </div>
  );
}

export function ReviewStep({
  orders,
  onBack,
  onSubmit,
  submitting,
}: {
  orders: OrderSummary[];
  onBack: () => void;
  onSubmit: () => void;
  submitting?: boolean;
}) {
  const faceValue = orders.reduce((sum, order) => sum + order.total_amount, 0);
  const estimate = estimateAdvance(faceValue);

  return (
    <div>
      <h2 className="text-xl font-semibold text-foreground">Review</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Confirm what you&rsquo;re submitting before the agent underwrites it.
      </p>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-6 sm:p-8">
        <div className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4 sm:divide-x sm:divide-border">
          <Stat label="Receivables" value={String(orders.length)} />
          <div className="sm:pl-6">
            <Stat label="Face value" value={formatCurrency(faceValue)} />
          </div>
          <div className="sm:pl-6">
            <Stat label="Est. advance (80%)" value={formatCurrency(estimate.advance)} />
          </div>
          <div className="sm:pl-6">
            <Stat label="Est. fee (2%)" value={formatCurrency(estimate.fee)} />
          </div>
        </div>

        <dl className="mt-6 max-h-64 divide-y divide-border overflow-y-auto border-t border-border">
          {orders.map((order) => (
            <div key={order.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <dt className="min-w-0 truncate font-mono text-foreground">{order.id}</dt>
              <dd className="shrink-0 font-mono text-foreground">
                {formatCurrency(order.total_amount)}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-6 flex items-center justify-between gap-4">
        <Button type="button" variant="ghost" onClick={onBack} disabled={submitting}>
          <IconArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </Button>
        <Button type="button" onClick={onSubmit} disabled={submitting} aria-busy={submitting}>
          {submitting ? "Submitting…" : "Submit for underwriting"}
        </Button>
      </div>
    </div>
  );
}
