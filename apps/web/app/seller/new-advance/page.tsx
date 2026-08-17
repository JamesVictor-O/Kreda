"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CONFIRMED_ORDERS, STORE } from "@/lib/dashboard/fixtures";
import { buildDecision } from "@/lib/dashboard/underwrite";
import type { Decision } from "@/lib/dashboard/types";
import { Stepper } from "@/components/dashboard/stepper";
import { SelectStep } from "@/components/dashboard/new-advance/select-step";
import { ReviewStep } from "@/components/dashboard/new-advance/review-step";
import { UnderwriteStep } from "@/components/dashboard/new-advance/underwrite-step";
import { SignStep, SignedConfirmation } from "@/components/dashboard/new-advance/sign-step";
import { AttestationArtifact } from "@/components/dashboard/attestation-artifact";
import { Button } from "@/components/ui/button";

type Stage =
  | { name: "select" }
  | { name: "review" }
  | { name: "underwriting" }
  | { name: "result"; decision: Decision }
  | { name: "sign"; decision: Decision }
  | { name: "signed"; decision: Decision };

const STAGE_INDEX: Record<Stage["name"], number> = {
  select: 0,
  review: 1,
  underwriting: 2,
  result: 2,
  sign: 3,
  signed: 3,
};

let receivableCounter = 3100;

export default function NewAdvancePage() {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [stage, setStage] = useState<Stage>({ name: "select" });
  const [signing, setSigning] = useState(false);

  const selectedOrders = useMemo(
    () => CONFIRMED_ORDERS.filter((order) => selectedIds.has(order.id)),
    [selectedIds],
  );
  const faceValue = useMemo(
    () => selectedOrders.reduce((sum, order) => sum + order.amount, 0),
    [selectedOrders],
  );

  function toggleOrder(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelectedIds((prev) =>
      prev.size === CONFIRMED_ORDERS.length
        ? new Set()
        : new Set(CONFIRMED_ORDERS.map((order) => order.id)),
    );
  }

  function handleSubmitForUnderwriting() {
    setStage({ name: "underwriting" });
  }

  function handleUnderwritingComplete() {
    receivableCounter += 1;
    const decision = buildDecision(String(receivableCounter), selectedOrders);
    setStage({ name: "result", decision });
  }

  function handleSign() {
    setSigning(true);
    setTimeout(() => {
      setSigning(false);
      if (stage.name === "sign") setStage({ name: "signed", decision: stage.decision });
    }, 1100);
  }

  const checksForUnderwriting = useMemo(() => {
    // Recomputed once, right before entering the underwriting stage, so the
    // check list shown there matches exactly what the result will contain.
    return selectedOrders.length > 0 ? buildDecision("preview", selectedOrders).checks : [];
  }, [selectedOrders]);

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-0">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">New advance</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">Connected to {STORE.storeName}</p>

      <div className="mt-8">
        <Stepper currentIndex={STAGE_INDEX[stage.name]} />
      </div>

      <div className="mt-10">
        {stage.name === "select" && (
          <SelectStep
            selectedIds={selectedIds}
            onToggle={toggleOrder}
            onToggleAll={toggleAll}
            onContinue={() => setStage({ name: "review" })}
          />
        )}

        {stage.name === "review" && (
          <ReviewStep
            selectedIds={selectedIds}
            onBack={() => setStage({ name: "select" })}
            onSubmit={handleSubmitForUnderwriting}
          />
        )}

        {stage.name === "underwriting" && (
          <UnderwriteStep checks={checksForUnderwriting} onComplete={handleUnderwritingComplete} />
        )}

        {stage.name === "result" && (
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              {stage.decision.outcome === "approved" ? "Approved" : "Not funded this time"}
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {stage.decision.outcome === "approved"
                ? "The evidence behind this decision is committed on-chain, including the checks that passed."
                : "This decision is committed on-chain too — declines are published, not discarded."}
            </p>

            <div className="mt-6">
              <AttestationArtifact
                decision={stage.decision}
                storeName={STORE.storeName}
                faceValue={faceValue}
              />
            </div>

            <div className="mt-6 flex items-center justify-between gap-4">
              <Button type="button" variant="ghost" onClick={() => router.push("/seller")}>
                Back to dashboard
              </Button>
              {stage.decision.outcome === "approved" && (
                <Button type="button" onClick={() => setStage({ name: "sign", decision: stage.decision })}>
                  Continue to sign
                </Button>
              )}
            </div>
          </div>
        )}

        {stage.name === "sign" && (
          <SignStep
            decision={stage.decision}
            faceValue={faceValue}
            signing={signing}
            onBack={() => setStage({ name: "result", decision: stage.decision })}
            onSign={handleSign}
          />
        )}

        {stage.name === "signed" && (
          <SignedConfirmation
            decision={stage.decision}
            faceValue={faceValue}
            onDone={() => router.push("/seller")}
          />
        )}
      </div>
    </div>
  );
}
