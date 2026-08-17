import type { ReactNode } from "react";
import { formatDate, formatDateTime } from "@/lib/dashboard/format";
import { STORE } from "@/lib/dashboard/fixtures";
import { IconCheck, IconStore } from "@/components/ui/icons";

const SCOPE_LABELS: Record<string, string> = {
  read_orders: "Orders — order history, line items, amounts",
  read_fulfillments: "Fulfilments — shipment and delivery status",
};

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-mono text-sm font-medium text-foreground">{children}</dd>
    </div>
  );
}

export default function StorePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-0">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Store</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          The Shopify connection your underwriter reads from.
        </p>
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-surface p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-background text-foreground"
            >
              <IconStore className="h-5 w-5" />
            </span>
            <div>
              <p className="text-lg font-semibold text-foreground">{STORE.storeName}</p>
              <p className="font-mono text-sm text-muted-foreground">{STORE.domain}</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-positive/10 px-3 py-1 text-xs font-medium text-positive">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-positive" />
            {STORE.connected ? "Connected" : "Not connected"}
          </span>
        </div>

        <dl className="mt-6 divide-y divide-border border-t border-border">
          <Row label="Platform">Shopify</Row>
          <Row label="Connected since">{formatDate(STORE.connectedAt)}</Row>
          <Row label="Last synced">{formatDateTime(STORE.lastSyncedAt)}</Row>
        </dl>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-foreground">Permissions granted</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          Read-only, via a custom app Admin API access token. The underwriter reads this data —
          it never writes to your store.
        </p>
        <ul className="mt-5 divide-y divide-border">
          {STORE.scopes.map((scope) => (
            <li key={scope} className="flex items-center gap-3 py-3">
              <IconCheck className="h-4 w-4 shrink-0 text-positive" aria-hidden="true" />
              <span className="text-sm text-foreground">{SCOPE_LABELS[scope] ?? scope}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
