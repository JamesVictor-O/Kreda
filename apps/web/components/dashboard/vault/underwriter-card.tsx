import Link from "next/link";
import { AGENT_STATS, UNDERWRITER_AGENT } from "@/lib/dashboard/agent";
import { HashLink } from "@/components/dashboard/hash-link";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

export function UnderwriterCard() {
  const hasTrackRecord = AGENT_STATS.settledCount > 0;

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Underwriter</h2>
          <p className="mt-0.5 font-mono text-sm text-muted-foreground">{UNDERWRITER_AGENT.name}</p>
        </div>
        <HashLink label="Agent registry" hash={UNDERWRITER_AGENT.registryAddress} />
      </div>

      <dl className="mt-5 grid grid-cols-3 gap-x-4 gap-y-4">
        <Stat label="Decisions" value={String(AGENT_STATS.decisionsCount)} />
        <Stat label="Declined" value={String(AGENT_STATS.declinedCount)} />
        <Stat
          label="Repaid in full"
          value={
            hasTrackRecord ? `${AGENT_STATS.settledRepaidInFullCount}/${AGENT_STATS.settledCount}` : "—"
          }
        />
      </dl>

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        {hasTrackRecord
          ? `Small sample — ${AGENT_STATS.settledCount} receivable${AGENT_STATS.settledCount === 1 ? "" : "s"} settled so far, all repaid in full. No default rate is claimed until there's enough history for one to mean anything.`
          : "No settled receivables yet, so there's no track record to show. A placeholder accuracy figure would be worse than none."}
      </p>

      <Link
        href="/investor/activity#declines"
        className="mt-4 inline-block text-sm text-foreground underline decoration-border underline-offset-4 transition-colors duration-150 hover:text-primary hover:decoration-primary"
      >
        View decision history, including declines
      </Link>
    </div>
  );
}
