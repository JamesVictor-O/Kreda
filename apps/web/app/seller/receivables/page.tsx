import { formatCurrency, formatDate } from "@/lib/dashboard/format";
import { CONFIRMED_ORDERS, STORE } from "@/lib/dashboard/fixtures";
import type { ShopifyOrder } from "@/lib/dashboard/types";
import { FulfilmentBadge } from "@/components/dashboard/fulfilment-badge";
import { ButtonLink } from "@/components/ui/button";
import { IconCheck, IconClose } from "@/components/ui/icons";

function DeliveryScanMark({ scanned }: { scanned: boolean }) {
  return scanned ? (
    <IconCheck className="h-4 w-4 text-positive" aria-label="Delivery scan confirmed" />
  ) : (
    <IconClose className="h-4 w-4 text-muted-foreground" aria-label="No delivery scan" />
  );
}

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

function ReceivableRow({ order }: { order: ShopifyOrder }) {
  return (
    <tr>
      <td className="px-4 py-3 font-mono text-foreground">{order.orderNumber}</td>
      <td className="px-4 py-3 text-muted-foreground">{formatDate(order.placedAt)}</td>
      <td className="px-4 py-3 text-foreground">{order.customerName}</td>
      <td className="px-4 py-3 text-right font-mono text-foreground">
        {formatCurrency(order.amount)}
      </td>
      <td className="px-4 py-3">
        <FulfilmentBadge fulfilled={order.fulfilled} />
      </td>
      <td className="px-4 py-3">
        <DeliveryScanMark scanned={order.deliveryScan} />
      </td>
    </tr>
  );
}

function ReceivableCard({ order }: { order: ShopifyOrder }) {
  return (
    <li className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-sm text-foreground">{order.orderNumber}</span>
        <span className="font-mono text-sm font-semibold text-foreground">
          {formatCurrency(order.amount)}
        </span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>
          {order.customerName} · {formatDate(order.placedAt)}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between gap-3">
        <FulfilmentBadge fulfilled={order.fulfilled} />
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <DeliveryScanMark scanned={order.deliveryScan} />
          Delivery scan
        </span>
      </div>
    </li>
  );
}

export default function ReceivablesPage() {
  const orders = CONFIRMED_ORDERS;
  const totalValue = orders.reduce((sum, order) => sum + order.amount, 0);
  const fulfilledCount = orders.filter((order) => order.fulfilled).length;
  const fulfilmentRate = orders.length > 0 ? fulfilledCount / orders.length : 0;
  const scannedCount = orders.filter((order) => order.deliveryScan).length;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-0">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Receivables</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Confirmed orders from {STORE.storeName}, eligible to advance against.
          </p>
        </div>
        <ButtonLink href="/seller/new-advance">New advance</ButtonLink>
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-surface p-6 sm:p-8">
        <div className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4 sm:divide-x sm:divide-border">
          <Stat label="Receivables" value={String(orders.length)} />
          <div className="sm:pl-6">
            <Stat label="Total value" value={formatCurrency(totalValue)} />
          </div>
          <div className="sm:pl-6">
            <Stat label="Fulfilment rate" value={`${Math.round(fulfilmentRate * 100)}%`} />
          </div>
          <div className="sm:pl-6">
            <Stat label="Delivery scans" value={`${scannedCount}/${orders.length}`} />
          </div>
        </div>
      </div>

      <div className="mt-6 hidden overflow-hidden rounded-2xl border border-border bg-surface md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-background/60">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium text-muted-foreground">
                Order
              </th>
              <th scope="col" className="px-4 py-3 font-medium text-muted-foreground">
                Date
              </th>
              <th scope="col" className="px-4 py-3 font-medium text-muted-foreground">
                Customer
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium text-muted-foreground">
                Amount
              </th>
              <th scope="col" className="px-4 py-3 font-medium text-muted-foreground">
                Fulfilment
              </th>
              <th scope="col" className="px-4 py-3 font-medium text-muted-foreground">
                Delivery scan
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {orders.map((order) => (
              <ReceivableRow key={order.id} order={order} />
            ))}
          </tbody>
        </table>
      </div>

      <ul className="mt-6 space-y-3 md:hidden">
        {orders.map((order) => (
          <ReceivableCard key={order.id} order={order} />
        ))}
      </ul>
    </div>
  );
}
