"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";

/**
 * Both example receivables below are illustrative — a real attestation
 * would carry a real receivable ID, seller, and hash. The checks shown are
 * exactly the two the agent runs today (see services/agent/app/stages/check.py):
 * order-history presence and an 80% fulfilment-rate threshold. Confidence is
 * the fraction of checks passed, matching decide.py's `_confidence`.
 */

const EVIDENCE_HASH = "0x5c49a8c7a3af84e53509f53c80f247deda75ad37ecebdeaed72aa1068164fc79";
const ATTESTATION_TX = "0xa8d745913bc72405e961e25ed89f1d9f302f3599f760ad60cc5658c3077b1aa6";
const DECLINE_BLOB = "0xc545e0dc2ace4de900f59e278074df7df7dbbb041ef487eff1a0dc37d2d1bca6";

function truncateHash(hash: string, prefix = 10, suffix = 7): string {
  return `${hash.slice(0, prefix)}…${hash.slice(-suffix)}`;
}

function HashLink({ label, hash }: { label: string; hash: string }) {
  return (
    <Row label={label}>
      {/* TODO: point href at the BOT Chain explorer once this attestation is deployed on-chain. */}
      <a
        href="#"
        onClick={(event) => event.preventDefault()}
        title={hash}
        aria-label={`${label}: ${hash} — link to BOT Chain explorer, not yet live`}
        className="font-mono text-sm text-foreground underline decoration-border underline-offset-4 transition-colors duration-150 hover:text-primary hover:decoration-primary"
      >
        {truncateHash(hash)}
      </a>
    </Row>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
      <dt className="text-sm text-foreground">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}

function CheckMark({ passed }: { passed: boolean }) {
  return (
    <span aria-hidden="true" className={cn("font-mono", passed ? "text-foreground/50" : "text-danger")}>
      {passed ? "✓" : "✗"}
    </span>
  );
}

function CheckRow({ label, detail, passed }: { label: string; detail: string; passed: boolean }) {
  return (
    <Row label={label}>
      <span className="inline-flex items-baseline gap-2">
        <CheckMark passed={passed} />
        <span className="sr-only">{passed ? "Pass — " : "Fail — "}</span>
        <span className={cn("font-mono text-sm", passed ? "text-foreground" : "text-danger")}>
          {detail}
        </span>
      </span>
    </Row>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

export function Evidence() {
  const reduceMotion = useReducedMotion();
  const rise = (delay: number) => ({
    initial: reduceMotion ? undefined : { opacity: 0, y: 12 },
    whileInView: reduceMotion ? undefined : { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0 } as const,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const, delay: reduceMotion ? 0 : delay },
  });

  return (
    <section aria-labelledby="evidence-heading" className="relative bg-background py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="max-w-2xl">
          <h2
            id="evidence-heading"
            className="text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl"
          >
            Every lender gives you a grade. Kreda shows you the working.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            The inputs, the checks, and the reasoning behind every decision are committed
            on-chain &mdash; including the ones that get declined.
          </p>
        </div>

        <div className="mt-16 lg:mt-24 lg:flex lg:items-start lg:gap-10">
          {/* Approved attestation — the primary artifact */}
          <motion.article {...rise(0)} aria-label="Approved receivable attestation" className="lg:w-[60%]">
            <div className="border border-border p-6 sm:p-8">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="font-mono text-sm text-muted-foreground">Receivable #2847</p>
                <p className="text-sm font-medium text-foreground">Ada Commerce Store</p>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 border-t border-border pt-6 sm:grid-cols-3 sm:gap-6">
                <Stat label="Outcome" value="Approved" />
                <Stat label="Confidence" value="100%" />
                <Stat label="Advance rate" value="80%" />
              </div>

              <dl className="mt-6 divide-y divide-border border-t border-border">
                <CheckRow
                  label="Order history"
                  detail="312 orders in the last 90 days"
                  passed
                />
                <CheckRow
                  label="Fulfilment rate"
                  detail="306/312 orders fulfilled (98%)"
                  passed
                />
              </dl>

              <dl className="mt-2 divide-y divide-border border-t border-border">
                <HashLink label="Evidence hash" hash={EVIDENCE_HASH} />
                <HashLink label="Attestation tx" hash={ATTESTATION_TX} />
              </dl>
            </div>
          </motion.article>

          {/* Decline — secondary, smaller, offset, still fully visible */}
          <motion.div {...rise(0.12)} className="mt-12 lg:mt-20 lg:w-[40%]">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Declines are published too. An underwriter that only approves is a rules
              engine &mdash; the refusal is what makes the agent&rsquo;s accuracy score mean
              anything.
            </p>

            <article
              aria-label="Declined receivable record"
              className="mt-6 border border-border p-6"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="font-mono text-sm text-muted-foreground">Receivable #2903</p>
                <p className="text-sm font-medium text-danger">Declined</p>
              </div>

              <dl className="mt-5 divide-y divide-border border-t border-border">
                <CheckRow
                  label="Order history"
                  detail="289 orders in the last 90 days"
                  passed
                />
                <CheckRow
                  label="Fulfilment rate"
                  detail="201/289 orders fulfilled (70%, below 80% bar)"
                  passed={false}
                />
                <Row label="Vault created">
                  <span className="font-mono text-sm text-foreground">No</span>
                </Row>
                <Row label="Attestation minted">
                  <span className="font-mono text-sm text-foreground">No</span>
                </Row>
              </dl>

              <dl className="mt-2 divide-y divide-border border-t border-border">
                <HashLink label="Decision blob" hash={DECLINE_BLOB} />
              </dl>
            </article>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
