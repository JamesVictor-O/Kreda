"use client";

import { ButtonLink } from "@/components/ui/button";
import { StatRow } from "@/components/dashboard/stat-row";
import { CashPositionChart } from "@/components/dashboard/cash-position-chart";
import { ActiveAdvancesList } from "@/components/dashboard/active-advances-list";
import { useSellerAttestations } from "@/lib/contracts/use-seller-attestations";
import { storeDisplayName } from "@/lib/agent-api-map";

const CONNECTED_STORE_ID = "northfield-outfitters.myshopify.com";

export default function SellerOverviewPage() {
  const state = useSellerAttestations();
  const attestations = state.status === "ready" ? state.attestations : [];

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-0">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Dashboard</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Connected to {storeDisplayName(CONNECTED_STORE_ID)}
          </p>
        </div>
        <ButtonLink href="/seller/new-advance">New advance</ButtonLink>
      </div>

      {state.status === "error" && (
        <p role="alert" className="mt-6 text-sm text-danger">
          Couldn&apos;t load your advances from chain: {state.message}
        </p>
      )}

      <div className="mt-8">
        <StatRow attestations={attestations} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.7fr_1fr]">
        <CashPositionChart />
        <ActiveAdvancesList attestations={attestations} />
      </div>
    </div>
  );
}
