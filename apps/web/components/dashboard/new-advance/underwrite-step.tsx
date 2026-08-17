"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";
import type { CheckResult } from "@/lib/dashboard/types";
import { IconSpinner } from "@/components/ui/icons";

const STEP_DELAY_MS = 900;
const SETTLE_DELAY_MS = 700;

export function UnderwriteStep({
  checks,
  onComplete,
}: {
  checks: CheckResult[];
  onComplete: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const [resolvedCount, setResolvedCount] = useState(0);

  useEffect(() => {
    const stepDelay = reduceMotion ? 0 : STEP_DELAY_MS;
    const settleDelay = reduceMotion ? 0 : SETTLE_DELAY_MS;

    const timers: ReturnType<typeof setTimeout>[] = [];
    checks.forEach((_, index) => {
      timers.push(setTimeout(() => setResolvedCount((c) => Math.max(c, index + 1)), stepDelay * (index + 1)));
    });
    timers.push(setTimeout(onComplete, stepDelay * checks.length + settleDelay));

    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);

  return (
    <div>
      <h2 className="text-xl font-semibold text-foreground">Underwriting</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        The agent is checking this receivable against your store&rsquo;s history.
      </p>

      <div className="mt-6 divide-y divide-border rounded-2xl border border-border bg-surface p-6 sm:p-8">
        {checks.map((check, index) => {
          const resolved = index < resolvedCount;
          const pending = index === resolvedCount;

          return (
            <div key={check.name} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
              <span
                aria-hidden="true"
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-sm",
                  resolved && check.passed && "bg-foreground/[0.06] text-foreground/60",
                  resolved && !check.passed && "bg-danger/10 text-danger",
                  !resolved && "border border-border text-muted-foreground",
                )}
              >
                {resolved ? (
                  check.passed ? "✓" : "✗"
                ) : pending ? (
                  <IconSpinner className={cn("h-4 w-4", !reduceMotion && "animate-spin")} />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                )}
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{check.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {resolved ? check.detail : pending ? "Checking…" : "Waiting"}
                </p>
              </div>

              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {resolved ? (
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
      </div>

      <p aria-live="polite" className="sr-only">
        {resolvedCount === 0
          ? "Underwriting started."
          : resolvedCount < checks.length
            ? `${resolvedCount} of ${checks.length} checks complete.`
            : "All checks complete. Preparing result."}
      </p>
    </div>
  );
}
