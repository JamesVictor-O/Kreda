"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { formatBps, formatCurrency, formatDate } from "@/lib/dashboard/format";
import { gradeFromConfidence } from "@/lib/dashboard/grade";
import type { Decision } from "@/lib/dashboard/types";
import { HashLink } from "@/components/dashboard/hash-link";

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

function HashRow({ label, hash }: { label: string; hash: string }) {
  return (
    <Row label={label}>
      <HashLink label={label} hash={hash} />
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

export function AttestationArtifact({
  decision,
  storeName,
  faceValue,
  expectedSettlementAt,
}: {
  decision: Decision;
  storeName: string;
  faceValue?: number;
  expectedSettlementAt?: string;
}) {
  const approved = decision.outcome === "approved";

  return (
    <article
      aria-label={approved ? "Approved receivable attestation" : "Declined receivable record"}
      className="border border-border bg-surface p-6 sm:p-8"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="font-mono text-sm text-muted-foreground">
          Receivable #{decision.receivableId}
        </p>
        <p className={cn("text-sm font-medium", approved ? "text-foreground" : "text-danger")}>
          {approved ? storeName : "Declined"}
        </p>
      </div>

      {approved ? (
        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-6 sm:grid-cols-4 sm:gap-6">
          <Stat label="Grade" value={gradeFromConfidence(decision.confidenceBps)} />
          <Stat label="Confidence" value={formatBps(decision.confidenceBps)} />
          <Stat
            label="Advance rate"
            value={decision.advanceRateBps !== null ? formatBps(decision.advanceRateBps) : "—"}
          />
          <Stat
            label="Settlement"
            value={expectedSettlementAt ? formatDate(expectedSettlementAt) : "—"}
          />
        </div>
      ) : (
        <div className="mt-6 border-t border-border pt-4">
          <p className="text-sm leading-relaxed text-muted-foreground">{decision.declineReason}</p>
        </div>
      )}

      <dl className="mt-2 divide-y divide-border border-t border-border">
        {decision.checks.map((check) => (
          <CheckRow key={check.name} label={check.name} detail={check.detail} passed={check.passed} />
        ))}
        {!approved && (
          <>
            <Row label="Vault created">
              <span className="font-mono text-sm text-foreground">No</span>
            </Row>
            <Row label="Attestation minted">
              <span className="font-mono text-sm text-foreground">No</span>
            </Row>
          </>
        )}
      </dl>

      {approved && faceValue !== undefined && decision.advanceRateBps !== null && (
        <dl className="mt-2 divide-y divide-border border-t border-border">
          <Row label="Face value">
            <span className="font-mono text-sm text-foreground">{formatCurrency(faceValue)}</span>
          </Row>
        </dl>
      )}

      <dl className="mt-2 divide-y divide-border border-t border-border">
        <HashRow label="Evidence hash" hash={decision.evidenceHash} />
        {approved && decision.attestationTx ? (
          <HashRow label="Attestation tx" hash={decision.attestationTx} />
        ) : (
          <HashRow label="Decision blob" hash={decision.decisionBlobHash} />
        )}
      </dl>
    </article>
  );
}
