"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { fetchStoreOrders, streamUnderwrite, type OrderSummary } from "@/lib/agent-api";
import { mapApiDecision, storeDisplayName } from "@/lib/agent-api-map";
import type { UnderwriteStatus } from "@/components/dashboard/new-advance/underwrite-step";
import type { Decision } from "@/lib/dashboard/types";
import { Stepper } from "@/components/dashboard/stepper";
import { SelectStep } from "@/components/dashboard/new-advance/select-step";
import { ReviewStep } from "@/components/dashboard/new-advance/review-step";
import { UnderwriteStep } from "@/components/dashboard/new-advance/underwrite-step";
import { SignStep, SignedConfirmation } from "@/components/dashboard/new-advance/sign-step";
import { AttestationArtifact } from "@/components/dashboard/attestation-artifact";
import { Button } from "@/components/ui/button";

/// The store this seller session is "connected" to — one of the agent
/// service's real fixture stores (KREDA_DATA_PROVIDER=fixture), not the
/// harlow-and-finch store already used for the bootstrap investor-flow
/// vault (see contracts/deployments/testnet-vaults.json), to keep the two
/// demo receivables independent.
const CONNECTED_STORE_ID = "northfield-outfitters.myshopify.com";

type Stage =
  | { name: "loading-orders" }
  | { name: "orders-error"; message: string }
  | { name: "select" }
  | { name: "review" }
  | { name: "underwriting"; checks: Decision["checks"]; status: UnderwriteStatus; error?: string }
  | { name: "result"; decision: Decision; faceValue: number }
  | { name: "sign"; decision: Decision; faceValue: number }
  | { name: "signed"; decision: Decision; faceValue: number };

const STAGE_INDEX: Record<Stage["name"], number> = {
  "loading-orders": 0,
  "orders-error": 0,
  select: 0,
  review: 1,
  underwriting: 2,
  result: 2,
  sign: 3,
  signed: 3,
};

export default function NewAdvancePage() {
  const router = useRouter();
  const { address } = useAccount();

  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [stage, setStage] = useState<Stage>({ name: "loading-orders" });
  const [signing, setSigning] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchStoreOrders(CONNECTED_STORE_ID)
      .then((response) => {
        if (cancelled) return;
        setOrders(response.orders);
        setStage({ name: "select" });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setStage({
          name: "orders-error",
          message: error instanceof Error ? error.message : "Couldn't load orders.",
        });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedOrders = useMemo(
    () => orders.filter((order) => selectedIds.has(order.id)),
    [orders, selectedIds],
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
    setSelectedIds((prev) => (prev.size === orders.length ? new Set() : new Set(orders.map((o) => o.id))));
  }

  async function handleSubmitForUnderwriting() {
    if (!address) return;
    setStage({ name: "underwriting", checks: [], status: "checking" });

    try {
      for await (const event of streamUnderwrite({
        store_id: CONNECTED_STORE_ID,
        receivable_ids: selectedOrders.map((o) => o.id),
        seller_address: address,
      })) {
        switch (event.event) {
          case "check.completed":
            setStage((prev) =>
              prev.name === "underwriting"
                ? {
                    ...prev,
                    checks: [
                      ...prev.checks,
                      {
                        name: event.data.name,
                        passed: event.data.status === "PASS",
                        detail: event.data.detail,
                      },
                    ],
                  }
                : prev,
            );
            break;
          case "decide.started":
            setStage((prev) => (prev.name === "underwriting" ? { ...prev, status: "deciding" } : prev));
            break;
          case "commit.completed":
            setStage((prev) =>
              prev.name === "underwriting" ? { ...prev, status: "committing" } : prev,
            );
            break;
          case "done":
            setStage({
              name: "result",
              decision: mapApiDecision(event.data.decision, null),
              faceValue: event.data.decision.face_value,
            });
            break;
          case "error":
            setStage((prev) =>
              prev.name === "underwriting"
                ? { ...prev, status: "error", error: event.data.message }
                : prev,
            );
            break;
        }
      }
    } catch (error) {
      setStage((prev) =>
        prev.name === "underwriting"
          ? {
              ...prev,
              status: "error",
              error: error instanceof Error ? error.message : "Underwriting failed.",
            }
          : prev,
      );
    }
  }

  function handleSign() {
    setSigning(true);
    setTimeout(() => {
      setSigning(false);
      if (stage.name === "sign") setStage({ name: "signed", decision: stage.decision, faceValue: stage.faceValue });
    }, 1100);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-0">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">New advance</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Connected to {storeDisplayName(CONNECTED_STORE_ID)}
      </p>

      <div className="mt-8">
        <Stepper currentIndex={STAGE_INDEX[stage.name]} />
      </div>

      <div className="mt-10">
        {stage.name === "loading-orders" && (
          <p className="text-sm text-muted-foreground">Loading orders from the agent service…</p>
        )}

        {stage.name === "orders-error" && (
          <div>
            <p className="text-sm text-danger">{stage.message}</p>
            <Button type="button" variant="ghost" className="mt-4" onClick={() => router.refresh()}>
              Try again
            </Button>
          </div>
        )}

        {stage.name === "select" && (
          <SelectStep
            orders={orders}
            selectedIds={selectedIds}
            onToggle={toggleOrder}
            onToggleAll={toggleAll}
            onContinue={() => setStage({ name: "review" })}
          />
        )}

        {stage.name === "review" && (
          <ReviewStep
            orders={selectedOrders}
            onBack={() => setStage({ name: "select" })}
            onSubmit={handleSubmitForUnderwriting}
          />
        )}

        {stage.name === "underwriting" && (
          <UnderwriteStep checks={stage.checks} status={stage.status} errorMessage={stage.error} />
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
                storeName={storeDisplayName(CONNECTED_STORE_ID)}
                faceValue={stage.faceValue}
              />
            </div>

            <div className="mt-6 flex items-center justify-between gap-4">
              <Button type="button" variant="ghost" onClick={() => router.push("/seller")}>
                Back to dashboard
              </Button>
              {stage.decision.outcome === "approved" && (
                <Button
                  type="button"
                  onClick={() => setStage({ name: "sign", decision: stage.decision, faceValue: stage.faceValue })}
                >
                  Continue to sign
                </Button>
              )}
            </div>
          </div>
        )}

        {stage.name === "sign" && (
          <SignStep
            decision={stage.decision}
            faceValue={stage.faceValue}
            signing={signing}
            onBack={() => setStage({ name: "result", decision: stage.decision, faceValue: stage.faceValue })}
            onSign={handleSign}
          />
        )}

        {stage.name === "signed" && (
          <SignedConfirmation
            decision={stage.decision}
            faceValue={stage.faceValue}
            onDone={() => router.push("/seller")}
          />
        )}
      </div>
    </div>
  );
}
