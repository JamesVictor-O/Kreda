"use client";

import { useAccount, useDisconnect } from "wagmi";
import { truncateAddress } from "@/lib/dashboard/format";
import { ROLE_CONFIG, type DashboardRole } from "@/lib/dashboard/role-config";
import { IconBell, IconChevronDown, IconMenu, IconSearch } from "@/components/ui/icons";

export function Topbar({
  role,
  onMenuClick,
  menuButtonRef,
}: {
  role: DashboardRole;
  onMenuClick: () => void;
  menuButtonRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const { identity } = ROLE_CONFIG[role];

  return (
    <header className="flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-sm sm:px-6 lg:border-none lg:bg-transparent lg:px-0 lg:py-0 lg:backdrop-blur-none">
      <button
        ref={menuButtonRef}
        type="button"
        onClick={onMenuClick}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border text-foreground transition-colors duration-150 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:hidden"
        aria-label="Open navigation menu"
      >
        <IconMenu className="h-5 w-5" aria-hidden="true" />
      </button>

      <div className="relative flex-1 lg:max-w-md">
        <IconSearch
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          type="search"
          placeholder="Search"
          aria-label="Search"
          className="h-11 w-full rounded-xl border border-border bg-surface pl-10 pr-14 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-border px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground sm:block">
          &#8984;K
        </kbd>
      </div>

      <button
        type="button"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border text-foreground transition-colors duration-150 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label="Notifications"
      >
        <IconBell className="h-[18px] w-[18px]" aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={() => disconnect()}
        title="Disconnect wallet"
        className="flex shrink-0 items-center gap-2 rounded-full border border-border py-1 pl-1 pr-2.5 transition-colors duration-150 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          {identity.name
            .split(" ")
            .map((part) => part[0])
            .join("")}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block text-sm font-medium leading-tight text-foreground">
            {identity.name}
          </span>
          <span className="block font-mono text-xs leading-tight text-muted-foreground">
            {address ? truncateAddress(address) : "Not connected"}
          </span>
        </span>
        <IconChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" aria-hidden="true" />
      </button>
    </header>
  );
}
