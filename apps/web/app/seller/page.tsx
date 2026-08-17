import { ButtonLink } from "@/components/ui/button";
import { StatRow } from "@/components/dashboard/stat-row";
import { CashPositionChart } from "@/components/dashboard/cash-position-chart";
import { ActiveAdvancesList } from "@/components/dashboard/active-advances-list";
import { STORE } from "@/lib/dashboard/fixtures";

export default function SellerOverviewPage() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-0">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Dashboard</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Connected to {STORE.storeName}
          </p>
        </div>
        <ButtonLink href="/seller/new-advance">
          New advance
        </ButtonLink>
      </div>

      <div className="mt-8">
        <StatRow />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.7fr_1fr]">
        <CashPositionChart />
        <ActiveAdvancesList />
      </div>
    </div>
  );
}
