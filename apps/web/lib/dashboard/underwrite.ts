import type { CheckResult, Decision, ShopifyOrder } from "./types";

/**
 * Mirrors services/agent/app/stages/check.py and decide.py exactly — same
 * two checks, same 80% threshold, same confidence formula (fraction of
 * checks passed). This is the mock stand-in the real agent service will
 * replace; the UI's underwriting logic shouldn't diverge from it.
 */
export function runChecks(orders: ShopifyOrder[]): CheckResult[] {
  const total = orders.length;
  const fulfilled = orders.filter((order) => order.fulfilled).length;
  const rate = total > 0 ? fulfilled / total : 0;

  return [
    {
      name: "Order history",
      passed: total > 0,
      detail: `${total} orders in the last 90 days`,
    },
    {
      name: "Fulfilment rate",
      passed: rate >= 0.8,
      detail: `${fulfilled}/${total} orders fulfilled (${Math.round(rate * 100)}%)`,
    },
  ];
}

function randomHash(bytes = 32): string {
  const arr = new Uint8Array(bytes);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < bytes; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  return "0x" + Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function buildDecision(receivableId: string, orders: ShopifyOrder[]): Decision {
  const checks = runChecks(orders);
  const approved = checks.every((check) => check.passed);
  const confidenceBps = Math.round(
    (checks.filter((check) => check.passed).length / checks.length) * 10_000,
  );

  return {
    receivableId,
    outcome: approved ? "approved" : "declined",
    confidenceBps,
    advanceRateBps: approved ? 8_000 : null,
    checks,
    evidenceHash: randomHash(),
    attestationTx: approved ? randomHash() : null,
    decisionBlobHash: randomHash(),
    declineReason: approved
      ? undefined
      : "Fulfilment rate fell below the 80% threshold required to underwrite.",
  };
}
