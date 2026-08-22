import { ACTIVE_CHAIN_ID, ACTIVE_STABLECOIN, ACTIVE_VAULTS, contractAddresses } from "@/lib/contracts/addresses";
import { getAttestationRecord, getVaultOnChainState } from "@/lib/contracts/reads";
import { gradeLabelFromCode } from "@/lib/contracts/grade";
import type { CheckResult, VaultOffering } from "@/lib/dashboard/types";

/// Real, on-chain-backed vaults — everything else on the investor
/// dashboard still runs on lib/dashboard/fixtures.ts. See
/// contracts/deployments/testnet-vaults.json (and mainnet-vaults.json,
/// once one exists) for how these came to exist: a real underwrite call
/// against the live agent service, a real signed EIP-712 attestation
/// submitted on-chain, then a vault deployed against that attestation.

/// Per-vault metadata not available from on-chain reads alone — the six
/// check results are real, copied verbatim from the actual
/// POST /underwrite response for this receivable, but statically embedded
/// rather than fetched live (wiring GET /evidence/{ref} to source this
/// dynamically would need it to still exist in the agent's evidence
/// store, which Render's ephemeral disk doesn't guarantee — see
/// services/agent/render.yaml). Keyed by receivableId so adding another
/// real vault later is additive, not a rewrite.
const VAULT_METADATA: Record<string, { storeName: string; attestationTx: string; checks: CheckResult[] }> = {
  "3460eb5efce28ce5": {
    storeName: "Harlow & Finch",
    attestationTx: "0x16c3fd5719fb5644905b4151d35f3eabe2dff698c2586d72f040cd0388983af9",
    checks: [
      { name: "fulfilment_coverage", passed: true, detail: "126/128 orders show a delivery scan (98%)" },
      {
        name: "sales_velocity",
        passed: true,
        detail: "45 orders in the last 30 days vs a trailing median of 41.5 over 2 prior 30-day period(s)",
      },
      { name: "chargeback_rate", passed: true, detail: "0/128 orders disputed (0.0%)" },
      { name: "return_rate", passed: true, detail: "2/128 orders refunded (1.6%)" },
      {
        name: "address_clustering",
        passed: true,
        detail: "Top 10 shipping addresses account for 23/128 orders (18%)",
      },
      {
        name: "synthetic_order_patterns",
        passed: true,
        detail: "Composite score 0.11 (timing regularity 0.03, value clustering 0.08, customer reuse 0.23)",
      },
    ],
  },
};

function toDollars(raw: bigint): number {
  return Number(raw) / 10 ** ACTIVE_STABLECOIN.decimals;
}

async function fetchVaultOffering(
  vaultConfig: (typeof ACTIVE_VAULTS)[number],
): Promise<VaultOffering & { gradeLabel: string }> {
  const addresses = contractAddresses(ACTIVE_CHAIN_ID);
  const metadata = VAULT_METADATA[vaultConfig.receivableId];

  const [record, vaultState] = await Promise.all([
    getAttestationRecord(
      addresses.attestation as `0x${string}`,
      vaultConfig.attestationId as `0x${string}`,
    ),
    getVaultOnChainState(vaultConfig.vault as `0x${string}`),
  ]);

  const gradeLabel = gradeLabelFromCode(record.grade);
  const expectedSettlement = new Date(Number(record.expectedSettlement) * 1000);

  return {
    receivableId: vaultConfig.receivableId,
    storeName: metadata?.storeName ?? "Unknown store",
    vaultAddress: vaultConfig.vault,
    faceValue: toDollars(record.faceValue),
    targetAmount: toDollars(vaultState.targetAmount),
    raisedAmount: toDollars(vaultState.totalAssets),
    expectedSettlementAt: expectedSettlement.toISOString().slice(0, 10),
    gradeLabel,
    decision: {
      receivableId: vaultConfig.receivableId,
      outcome: record.approved ? "approved" : "declined",
      confidenceBps: record.confidence,
      advanceRateBps: record.approved ? record.advanceRate : null,
      checks: metadata?.checks ?? [],
      evidenceHash: record.evidenceRef,
      attestationTx: metadata?.attestationTx ?? null,
      decisionBlobHash: record.evidenceRef,
    },
  };
}

/** Real reads only — Attestation.get() and the vault's own state, both
 * live against whichever chain is active (see ACTIVE_CHAIN_ID). See
 * deposit-panel.tsx for the real write (ReceivableVault.deposit()).
 * Returns null for a receivableId with no deployed vault (see
 * ACTIVE_VAULTS — most approved attestations don't have one yet; that's
 * a separate manual deploy step). */
export async function getRealVaultOfferingById(
  receivableId: string,
): Promise<(VaultOffering & { gradeLabel: string }) | null> {
  const vaultConfig = ACTIVE_VAULTS.find((v) => v.receivableId === receivableId);
  if (!vaultConfig) return null;
  return fetchVaultOffering(vaultConfig);
}

/** Every real vault currently deployed — see ACTIVE_VAULTS. There's no
 * on-chain way to discover these (no factory contract emits a
 * discoverable event; each is deployed one at a time via
 * script/DeployVault.s.sol), so this list only grows when that registry
 * is updated by hand. */
export async function getAllRealVaultOfferings(): Promise<(VaultOffering & { gradeLabel: string })[]> {
  return Promise.all(ACTIVE_VAULTS.map(fetchVaultOffering));
}
