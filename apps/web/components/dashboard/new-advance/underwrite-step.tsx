"use client";

import { cn } from "@/lib/cn";
import type { CheckResult } from "@/lib/dashboard/types";
import { IconSpinner } from "@/components/ui/icons";

/// Fixed emission order from services/agent/app/stages/check.py's
/// run_checks() — the agent always runs (and streams) checks in this
/// order, so "which one is currently running" is just "the first name in
/// this list not yet in `checks`," no separate index needs to be tracked.
const CHECK_ORDER = [
  "fulfilment_coverage",
  "sales_velocity",
  "chargeback_rate",
  "return_rate",
  "address_clustering",
  "synthetic_order_patterns",
] as const;

export type UnderwriteStatus = "checking" | "deciding" | "committing" | "error";

const MILESTONES: { key: "deciding" | "committing"; label: string; runningLabel: string }[] = [
  { key: "deciding", label: "Underwriting decision", runningLabel: "Weighing the checks…" },
  { key: "committing", label: "Committing on-chain", runningLabel: "Signing and submitting…" },
];

function StatusIcon({
  resolved,
  pending,
  failed,
}: {
  resolved: boolean;
  pending: boolean;
  failed?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-sm",
        resolved && !failed && "bg-foreground/[0.06] text-foreground/60",
        resolved && failed && "bg-danger/10 text-danger",
        !resolved && pending && "border border-border text-muted-foreground",
        !resolved && !pending && "border border-border text-muted-foreground",
      )}
    >
      {resolved ? (
        failed ? (
          "✗"
        ) : (
          "✓"
        )
      ) : pending ? (
        <IconSpinner className="h-4 w-4 animate-spin" />
      ) : (
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
      )}
    </span>
  );
}

/** Driven by the real POST /underwrite SSE stream — `checks` grows one at
 * a time as check.completed events arrive (see lib/agent-api.ts), and
 * `status` tracks the decide/commit milestones after all six land. No
 * simulated timing: what's shown is exactly the pipeline's real pace. */
export function UnderwriteStep({
  checks,
  status,
  errorMessage,
}: {
  checks: CheckResult[];
  status: UnderwriteStatus;
  errorMessage?: string;
}) {
  const byName = new Map(checks.map((check) => [check.name, check]));
  const firstUnresolvedIndex = CHECK_ORDER.findIndex((name) => !byName.has(name));

  return (
    <div>
      <h2 className="text-xl font-semibold text-foreground">Underwriting</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        The agent is checking this receivable against your store&rsquo;s history.
      </p>

      <div className="mt-6 divide-y divide-border rounded-2xl border border-border bg-surface p-6 sm:p-8">
        {CHECK_ORDER.map((name, index) => {
          const check = byName.get(name);
          const resolved = Boolean(check);
          const pending = !resolved && status === "checking" && index === firstUnresolvedIndex;

          return (
            <div key={name} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
              <StatusIcon resolved={resolved} pending={pending} failed={check && !check.passed} />

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {check ? check.detail : pending ? "Checking…" : "Waiting"}
                </p>
              </div>

              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {check ? (
                  <span className={check.passed ? "text-foreground/60" : "text-danger"}>
                    {check.passed ? "Pass" : "Flag"}
                  </span>
                ) : pending ? (
                  "Running"
                ) : (
                  ""
                )}
              </span>
            </div>
          );
        })}

        {MILESTONES.map(({ key, label, runningLabel }) => {
          const order: UnderwriteStatus[] = ["checking", "deciding", "committing"];
          const resolved = order.indexOf(status) > order.indexOf(key);
          const pending = status === key;

          return (
            <div key={key} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
              <StatusIcon resolved={resolved} pending={pending} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {resolved ? "Done" : pending ? runningLabel : "Waiting"}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {status === "error" && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {errorMessage ?? "Underwriting failed."}
        </p>
      )}

      <p aria-live="polite" className="sr-only">
        {status === "checking"
          ? `${checks.length} of ${CHECK_ORDER.length} checks complete.`
          : status === "deciding"
            ? "All checks complete. Weighing the decision."
            : status === "committing"
              ? "Decision made. Committing on-chain."
              : status === "error"
                ? "Underwriting failed."
                : "Underwriting complete."}
      </p>
    </div>
  );
}
