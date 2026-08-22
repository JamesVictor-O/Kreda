"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { formatDateTime } from "@/lib/dashboard/format";
import { fetchStoreOrders } from "@/lib/agent-api";
import { storeDisplayName } from "@/lib/agent-api-map";
import { IconCheck, IconStore } from "@/components/ui/icons";

// Same connected store as the rest of the seller flow — see
// /seller/receivables for why.
const CONNECTED_STORE_ID = "northfield-outfitters.myshopify.com";

// The custom app's actual configured Admin API scopes (see CLAUDE.md) --
// fixed by the app setup, not per-store state, so there's no live
// endpoint that returns this back.
const SCOPES: { key: string; label: string }[] = [
  { key: "read_orders", label: "Orders — order history, line items, amounts" },
  { key: "read_fulfillments", label: "Fulfilments — shipment and delivery status" },
];

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; domain: string; lastSyncedAt: string };

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-mono text-sm font-medium text-foreground">{children}</dd>
    </div>
  );
}

export default function StorePage() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetchStoreOrders(CONNECTED_STORE_ID)
      .then((response) => {
        if (!cancelled) {
          setState({ status: "ready", domain: response.domain, lastSyncedAt: new Date().toISOString() });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            status: "error",
            message: error instanceof Error ? error.message : "Couldn't reach the store.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const connected = state.status === "ready";

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-0">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Store</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          The Shopify connection your underwriter reads from.
        </p>
      </div>

      {state.status === "error" && (
        <p role="alert" className="mt-6 text-sm text-danger">
          Couldn&apos;t reach the connected store: {state.message}
        </p>
      )}

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
              <p className="text-lg font-semibold text-foreground">
                {storeDisplayName(CONNECTED_STORE_ID)}
              </p>
              <p className="font-mono text-sm text-muted-foreground">
                {state.status === "ready" ? state.domain : CONNECTED_STORE_ID}
              </p>
            </div>
          </div>
          <span
            className={
              connected
                ? "inline-flex items-center gap-1.5 rounded-full bg-positive/10 px-3 py-1 text-xs font-medium text-positive"
                : "inline-flex items-center gap-1.5 rounded-full bg-foreground/[0.06] px-3 py-1 text-xs font-medium text-muted-foreground"
            }
          >
            <span
              aria-hidden="true"
              className={connected ? "h-1.5 w-1.5 rounded-full bg-positive" : "h-1.5 w-1.5 rounded-full bg-muted-foreground"}
            />
            {state.status === "loading" ? "Checking…" : connected ? "Connected" : "Unreachable"}
          </span>
        </div>

        <dl className="mt-6 divide-y divide-border border-t border-border">
          <Row label="Platform">Shopify</Row>
          <Row label="Last synced">
            {state.status === "ready" ? formatDateTime(state.lastSyncedAt) : "—"}
          </Row>
        </dl>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-foreground">Permissions granted</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          Read-only, via a custom app Admin API access token. The underwriter reads this data —
          it never writes to your store.
        </p>
        <ul className="mt-5 divide-y divide-border">
          {SCOPES.map((scope) => (
            <li key={scope.key} className="flex items-center gap-3 py-3">
              <IconCheck className="h-4 w-4 shrink-0 text-positive" aria-hidden="true" />
              <span className="text-sm text-foreground">{scope.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
