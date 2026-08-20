import { TESTNET_CHAIN_ID, TESTNET_VAULTS, contractAddresses } from "@/lib/contracts/addresses";
import { getAttestationRecord, getVaultOnChainState } from "@/lib/contracts/reads";
import { gradeLabelFromCode } from "@/lib/contracts/grade";
import type { CheckResult, VaultOffering } from "@/lib/dashboard/types";

/// The one real, on-chain-backed vault currently wired — everything else
/// on the investor dashboard still runs on lib/dashboard/fixtures.ts. See
/// contracts/deployments/testnet-vaults.json for how this vault came to
/// exist: a real underwrite call against the live agent service, a real
/// signed EIP-712 attestation submitted on-chain, then this vault deployed
/// against that attestation.
export const REAL_VAULT_RECEIVABLE_ID = TESTNET_VAULTS[0].receivableId;

/// The six check results are real — copied verbatim from the actual
/// POST /underwrite response for this receivable — but statically embedded
/// rather than fetched live. Wiring GET /evidence/{ref} to source this
/// dynamically is Phase 3's job (services/agent's evidence store), not
/// something Attestation.get() can supply: the contract only stores the
/// evidenceRef hash, not the check detail behind it.
const REAL_CHECKS: CheckResult[] = [
  {
    name: "fulfilment_coverage",
    passed: true,
    detail: "126/128 orders show a delivery scan (98%)",
  },
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
];

const STABLECOIN_DECIMALS = 6;

function toDollars(raw: bigint): number {
  return Number(raw) / 10 ** STABLECOIN_DECIMALS;
}

/** Real reads only — Attestation.get() and the vault's own state, both
 * live against BOT Chain testnet. See deposit-panel.tsx for the one real
 * write (ReceivableVault.deposit()). */
export async function getRealVaultOffering(): Promise<VaultOffering & { gradeLabel: string }> {
  const vaultConfig = TESTNET_VAULTS[0];
  const addresses = contractAddresses(TESTNET_CHAIN_ID);

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
    receivableId: REAL_VAULT_RECEIVABLE_ID,
    storeName: "Harlow & Finch",
    vaultAddress: vaultConfig.vault,
    faceValue: toDollars(record.faceValue),
    targetAmount: toDollars(vaultState.targetAmount),
    raisedAmount: toDollars(vaultState.totalAssets),
    expectedSettlementAt: expectedSettlement.toISOString().slice(0, 10),
    gradeLabel,
    decision: {
      receivableId: REAL_VAULT_RECEIVABLE_ID,
      outcome: record.approved ? "approved" : "declined",
      confidenceBps: record.confidence,
      advanceRateBps: record.approved ? record.advanceRate : null,
      checks: REAL_CHECKS,
      evidenceHash: record.evidenceRef,
      attestationTx:
        "0x16c3fd5719fb5644905b4151d35f3eabe2dff698c2586d72f040cd0388983af9",
      decisionBlobHash: record.evidenceRef,
    },
  };
}
