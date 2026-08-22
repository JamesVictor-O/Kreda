"use client";

import Link from "next/link";
import { useReadContract } from "wagmi";
import { HashLink } from "@/components/dashboard/hash-link";
import { agentRegistryAbi } from "@/lib/contracts/abis";
import { ACTIVE_CHAIN_ID, contractAddresses } from "@/lib/contracts/addresses";

/// Matches AGENT_NAME in contracts/.env at deploy time (see
/// contracts/script/Deploy.s.sol) — the registered name is fetchable via
/// AgentRegistry.agents(address).name, but it's a fixed, already-known
/// constant, not worth a second read alongside agentStats().
const AGENT_NAME = "Kreda Underwriter v1";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

/** Real AgentRegistry.agentStats() read — see contracts/src/AgentRegistry.sol.
 * `accurate` doubles as "settled and repaid in full": Settlement.confirmPayout()
 * only ever calls recordOutcome(agent, true) in v1 (no default-tracking path
 * yet), so the two numbers are the same thing on-chain today. */
export function UnderwriterCard() {
  const addresses = contractAddresses(ACTIVE_CHAIN_ID);

  const { data, isLoading, isError } = useReadContract({
    address: addresses.agentRegistry as `0x${string}`,
    abi: agentRegistryAbi,
    functionName: "agentStats",
    args: [addresses.agent as `0x${string}`],
    chainId: ACTIVE_CHAIN_ID,
  });

  const zero = BigInt(0);
  const [decisions, , declines, accurate] = data ?? [zero, zero, zero, zero];
  const decisionsCount = Number(decisions);
  const declinedCount = Number(declines);
  const settledCount = Number(accurate);
  const hasTrackRecord = settledCount > 0;

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Underwriter</h2>
          <p className="mt-0.5 font-mono text-sm text-muted-foreground">{AGENT_NAME}</p>
        </div>
        <HashLink label="Agent registry" hash={addresses.agentRegistry} kind="address" />
      </div>

      {isError ? (
        <p className="mt-5 text-sm text-danger">Couldn&apos;t read agent stats from the registry.</p>
      ) : (
        <dl className="mt-5 grid grid-cols-3 gap-x-4 gap-y-4">
          <Stat label="Decisions" value={isLoading ? "…" : String(decisionsCount)} />
          <Stat label="Declined" value={isLoading ? "…" : String(declinedCount)} />
          <Stat
            label="Repaid in full"
            value={isLoading ? "…" : hasTrackRecord ? `${settledCount}/${settledCount}` : "—"}
          />
        </dl>
      )}

      {!isLoading && !isError && (
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          {hasTrackRecord
            ? `Small sample — ${settledCount} receivable${settledCount === 1 ? "" : "s"} settled so far, all repaid in full. No default rate is claimed until there's enough history for one to mean anything.`
            : "No settled receivables yet, so there's no track record to show. A placeholder accuracy figure would be worse than none."}
        </p>
      )}

      <Link
        href="/investor/activity#declines"
        className="mt-4 inline-block text-sm text-foreground underline decoration-border underline-offset-4 transition-colors duration-150 hover:text-primary hover:decoration-primary"
      >
        View decision history, including declines
      </Link>
    </div>
  );
}
