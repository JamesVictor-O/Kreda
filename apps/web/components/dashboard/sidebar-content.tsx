"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount, useDisconnect } from "wagmi";
import { cn } from "@/lib/cn";
import { formatCurrency, truncateAddress } from "@/lib/dashboard/format";
import { useInvestorBalance } from "@/lib/contracts/use-investor-balance";
import { ROLE_CONFIG, type DashboardRole } from "@/lib/dashboard/role-config";

export function SidebarContent({
  role,
  onNavigate,
}: {
  role: DashboardRole;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const { navItems, brandLabel, identity } = ROLE_CONFIG[role];
  const overviewHref = navItems[0]!.href;
  const balanceState = useInvestorBalance();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-5 pt-5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background text-xs font-semibold text-foreground">
          {brandLabel.slice(0, 1)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-foreground">{brandLabel}</span>
        </span>
      </div>

      <nav aria-label="Primary" className="mt-6 flex-1 space-y-1 px-3">
        {navItems.map((item) => {
          const isActive =
            item.href === overviewHref ? pathname === item.href : pathname?.startsWith(item.href);
          const Icon = item.icon;

          if (!item.enabled) {
            return (
              <div
                key={item.label}
                aria-disabled="true"
                className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground/50"
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                  {item.label}
                </span>
                <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                  Soon
                </span>
              </div>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={onNavigate}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-background",
              )}
            >
              <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {role === "investor" ? (
        <button
          type="button"
          onClick={() => disconnect()}
          title="Disconnect wallet"
          className="mx-3 mb-3 rounded-xl border border-border px-3 py-2.5 text-left transition-colors duration-150 hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <span className="block truncate font-mono text-sm font-medium text-foreground">
            {address ? truncateAddress(address) : "Not connected"}
          </span>
          <span className="mt-0.5 block font-mono text-xs leading-tight text-muted-foreground">
            {balanceState.status === "ready"
              ? `${formatCurrency(balanceState.balance)} USDT available`
              : balanceState.status === "error"
                ? "Couldn't load balance"
                : "Loading balance…"}
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => disconnect()}
          title="Disconnect wallet"
          className="mx-3 mb-3 flex items-center gap-3 rounded-xl border border-border px-3 py-2.5 text-left transition-colors duration-150 hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {identity.name
              .split(" ")
              .map((part) => part[0])
              .join("")}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-foreground">
              {identity.name}
            </span>
            <span className="block font-mono text-xs leading-tight text-muted-foreground">
              {address ? truncateAddress(address) : "Not connected"}
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
