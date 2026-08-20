"use client";

import { cn } from "@/lib/cn";
import { formatCurrency, formatDate } from "@/lib/dashboard/format";
import { estimateAdvance } from "@/lib/dashboard/calc";
import type { OrderSummary } from "@/lib/agent-api";
import { Button } from "@/components/ui/button";
import { FulfilmentBadge } from "@/components/dashboard/fulfilment-badge";

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-mono text-base font-semibold text-foreground">{value}</p>
    </div>
  );
}

interface RowProps {
  order: OrderSummary;
  selected: boolean;
  onToggle: (id: string) => void;
}

function OrderRow({ order, selected, onToggle }: RowProps) {
  return (
    <tr className={cn(selected && "bg-primary/[0.04]")}>
      <td className="w-12 px-4 py-3">
        <label className="sr-only" htmlFor={`order-${order.id}`}>
          Select order {order.id}
        </label>
        <input
          id={`order-${order.id}`}
          type="checkbox"
          checked={selected}
          onChange={() => onToggle(order.id)}
          className="h-4 w-4 rounded border-border accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </td>
      <td className="px-4 py-3 font-mono text-foreground">{order.id}</td>
      <td className="px-4 py-3 text-muted-foreground">{formatDate(order.placed_at.slice(0, 10))}</td>
      <td className="px-4 py-3 text-right font-mono text-foreground">
        {formatCurrency(order.total_amount)}
      </td>
      <td className="px-4 py-3">
        <FulfilmentBadge fulfilled={order.fulfilled} />
      </td>
    </tr>
  );
}

function OrderCard({ order, selected, onToggle }: RowProps) {
  return (
    <li>
      <label
        htmlFor={`order-card-${order.id}`}
        className={cn(
          "flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface p-4 transition-colors duration-150",
          selected && "border-primary/40 bg-primary/[0.04]",
        )}
      >
        <input
          id={`order-card-${order.id}`}
          type="checkbox"
          checked={selected}
          onChange={() => onToggle(order.id)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-3">
            <span className="font-mono text-sm text-foreground">{order.id}</span>
            <span className="font-mono text-sm font-semibold text-foreground">
              {formatCurrency(order.total_amount)}
            </span>
          </span>
          <span className="mt-1 flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>{formatDate(order.placed_at.slice(0, 10))}</span>
          </span>
          <span className="mt-2 block">
            <FulfilmentBadge fulfilled={order.fulfilled} />
          </span>
        </span>
      </label>
    </li>
  );
}

export function SelectStep({
  orders,
  selectedIds,
  onToggle,
  onToggleAll,
  onContinue,
}: {
  orders: OrderSummary[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onContinue: () => void;
}) {
  const selectedOrders = orders.filter((order) => selectedIds.has(order.id));
  const faceValue = selectedOrders.reduce((sum, order) => sum + order.total_amount, 0);
  const estimate = estimateAdvance(faceValue);
  const allSelected = orders.length > 0 && selectedIds.size === orders.length;

  return (
    <div>
      <h2 className="text-xl font-semibold text-foreground">Select receivables</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Orders from the last 90 days. Select the ones to advance against.
      </p>

      <div className="mt-6 hidden overflow-hidden rounded-2xl border border-border bg-surface md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-background/60">
            <tr>
              <th scope="col" className="w-12 px-4 py-3">
                <label className="sr-only" htmlFor="select-all">
                  Select all orders
                </label>
                <input
                  id="select-all"
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleAll}
                  className="h-4 w-4 rounded border-border accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </th>
              <th scope="col" className="px-4 py-3 font-medium text-muted-foreground">
                Order
              </th>
              <th scope="col" className="px-4 py-3 font-medium text-muted-foreground">
                Date
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium text-muted-foreground">
                Amount
              </th>
              <th scope="col" className="px-4 py-3 font-medium text-muted-foreground">
                Fulfilment
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {orders.map((order) => (
              <OrderRow key={order.id} order={order} selected={selectedIds.has(order.id)} onToggle={onToggle} />
            ))}
          </tbody>
        </table>
      </div>

      <ul className="mt-6 space-y-3 md:hidden">
        {orders.map((order) => (
          <OrderCard key={order.id} order={order} selected={selectedIds.has(order.id)} onToggle={onToggle} />
        ))}
      </ul>

      <div className="sticky bottom-3 z-10 mt-6 rounded-2xl border border-border bg-surface/95 p-4 shadow-lg backdrop-blur-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <SummaryStat label="Selected" value={String(selectedOrders.length)} />
            <SummaryStat label="Face value" value={formatCurrency(faceValue)} />
            <SummaryStat label="Est. advance (80%)" value={formatCurrency(estimate.advance)} />
            <SummaryStat label="Est. fee" value={formatCurrency(estimate.fee)} />
          </div>
          <Button type="button" size="sm" onClick={onContinue} disabled={selectedOrders.length === 0}>
            Continue to review
          </Button>
        </div>
      </div>
    </div>
  );
}
