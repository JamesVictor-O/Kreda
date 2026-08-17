"use client";

import type { ReactNode } from "react";
import { formatCurrency } from "@/lib/dashboard/format";
import { estimateAdvance } from "@/lib/dashboard/calc";
import type { Decision } from "@/lib/dashboard/types";
import { Button } from "@/components/ui/button";
import { IconArrowLeft, IconCheck } from "@/components/ui/icons";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-mono text-sm text-foreground">{children}</dd>
    </div>
  );
}

export function SignStep({
  decision,
  faceValue,
  signing,
  onBack,
  onSign,
}: {
  decision: Decision;
  faceValue: number;
  signing: boolean;
  onBack: () => void;
  onSign: () => void;
}) {
  const estimate = estimateAdvance(faceValue);

  return (
    <div>
      <h2 className="text-xl font-semibold text-foreground">Sign to receive funding</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        One signature. No gas token required.
      </p>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-6 sm:p-8">
        <dl className="divide-y divide-border">
          <Row label="Assigning">Receivable #{decision.receivableId}</Row>
          <Row label="Network">BOT Chain mainnet (677)</Row>
          <Row label="Face value">{formatCurrency(faceValue)}</Row>
          <Row label="Advance rate">80%</Row>
          <Row label="Amount you receive">{formatCurrency(estimate.netToSeller)}</Row>
        </dl>

        <div className="mt-6 rounded-xl border border-primary/20 bg-primary/[0.04] p-5 sm:p-6">
          <p className="text-sm font-medium text-foreground">Gas is sponsored.</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Your BOT balance is zero, and it will stay zero. This signature is bundled with a
            sponsor transaction — you never need to acquire a gas token to assign this
            receivable.
          </p>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-4">
        <Button type="button" variant="ghost" onClick={onBack} disabled={signing}>
          <IconArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </Button>
        <Button type="button" onClick={onSign} disabled={signing} aria-busy={signing}>
          {signing ? "Signing…" : "Sign and receive funds"}
        </Button>
      </div>
    </div>
  );
}

export function SignedConfirmation({
  decision,
  faceValue,
  onDone,
}: {
  decision: Decision;
  faceValue: number;
  onDone: () => void;
}) {
  const estimate = estimateAdvance(faceValue);

  return (
    <div className="flex flex-col items-center rounded-2xl border border-border bg-surface px-6 py-16 text-center sm:px-8">
      <span
        aria-hidden="true"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground"
      >
        <IconCheck className="h-6 w-6" />
      </span>
      <h2 className="mt-5 text-xl font-semibold text-foreground">Funded</h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        {formatCurrency(estimate.netToSeller)} for receivable #{decision.receivableId} is on its
        way to your wallet.
      </p>
      <Button type="button" onClick={onDone} className="mt-8">
        Back to dashboard
      </Button>
    </div>
  );
}
