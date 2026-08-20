import { fetchDecision, type ApiCheckResult, type ApiDecision, type ApiEvidencePayload } from "@/lib/agent-api";
import type { CheckResult, Decision } from "@/lib/dashboard/types";

/// Mirrors services/agent/tests/fixtures/generator.py's FIXTURE_STORES
/// display names — the agent API only ever returns the raw domain.
export const FIXTURE_STORE_NAMES: Record<string, string> = {
  "northfield-outfitters.myshopify.com": "Northfield Outfitters",
  "birchmount-supply.myshopify.com": "Birchmount Supply Co.",
  "crestpeak-imports.myshopify.com": "CrestPeak Imports",
  "lumen-home-goods.myshopify.com": "Lumen Home Goods",
  "harlow-and-finch.myshopify.com": "Harlow & Finch",
  "westmere-outdoor.myshopify.com": "Westmere Outdoor Co.",
};

export function storeDisplayName(domain: string): string {
  return FIXTURE_STORE_NAMES[domain] ?? domain;
}

function mapCheck(check: ApiCheckResult): CheckResult {
  return { name: check.name, passed: check.status === "PASS", detail: check.detail };
}

/// The agent's Decision -> the UI's Decision. `evidence` is required for
/// `decisionBlobHash` — the agent's Decision only exposes evidence_ref
/// (the commitment hash), not a separate blob concept; both stores use
/// the same value for it, same as the on-chain-read mapping in
/// lib/contracts/real-vault.ts.
export function mapApiDecision(decision: ApiDecision, evidence: ApiEvidencePayload | null): Decision {
  return {
    receivableId: decision.receivable_id,
    outcome: decision.outcome,
    confidenceBps: decision.confidence_bps,
    advanceRateBps: decision.outcome === "approved" ? decision.advance_rate_bps : null,
    checks: decision.checks.map(mapCheck),
    evidenceHash: decision.evidence_ref ?? "",
    attestationTx: decision.outcome === "approved" ? decision.tx_hash : null,
    decisionBlobHash: decision.evidence_ref ?? "",
    declineReason:
      decision.outcome === "declined"
        ? (evidence?.reasoning ?? decision.reasoning)
        : undefined,
  };
}

/// GRADE_CODE-equivalent for the API's letter grades — no numeric code to
/// decode here, unlike the on-chain Attestation.Record.grade uint8 (see
/// lib/contracts/grade.ts), since the agent API already returns the letter.
export function apiGradeLabel(decision: ApiDecision): string {
  return decision.grade;
}

export interface RealAdvancePreview {
  storeName: string;
  faceValue: number;
  decision: Decision;
}

/** For a receivable id not found in lib/dashboard/fixtures.ts — checks the
 * live agent service before falling back to notFound(). No vault/fee data
 * is available here (that's a separate, manual DeployVault.s.sol step —
 * see contracts/deployments/testnet-vaults.json), only the decision and
 * its evidence, so callers should show evidence, not a funding
 * breakdown, for whatever this returns. */
export async function getRealAdvancePreview(receivableId: string): Promise<RealAdvancePreview | null> {
  const result = await fetchDecision(receivableId);
  if (!result) return null;
  return {
    storeName: storeDisplayName(result.evidence?.store_domain ?? ""),
    faceValue: result.decision.face_value,
    decision: mapApiDecision(result.decision, result.evidence),
  };
}
