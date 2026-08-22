import { createPublicClient, http, parseAbiItem, type Address } from "viem";
import { activeChain } from "@/lib/chains";
import { attestationAbi } from "@/lib/contracts/abis";
import { ACTIVE_ATTESTATION_DEPLOY_BLOCK, ACTIVE_CHAIN_ID, ACTIVE_STABLECOIN, contractAddresses } from "@/lib/contracts/addresses";
import { gradeLabelFromCode } from "@/lib/contracts/grade";

/// On-chain indexing via eth_getLogs rather than a database — the
/// contracts have no "list all attestations" function, but
/// Attestation.AttestationSubmitted is emitted for every one, approved or
/// declined, and log volume is small enough that a full scan from the
/// deployment block is fast. No factory contract deploys
/// ReceivableVaults (they're deployed one at a time via
/// script/DeployVault.s.sol), so vaults aren't indexable this way — see
/// ACTIVE_VAULTS in addresses.ts, maintained by hand.

const ATTESTATION_SUBMITTED_EVENT = parseAbiItem(
  "event AttestationSubmitted(bytes32 indexed attestationId, address indexed agent, address indexed seller, bool approved)",
);

export interface IndexedAttestation {
  /** The on-chain attestationId — keccak256 of the original receivable_id
   * string (see services/agent/app/chain/eip712.py's
   * receivable_id_to_bytes32). One-way: this hash can't be turned back
   * into the pretty string the agent's /decisions/{id} route expects, so
   * indexed entries link to the transaction, not an internal detail
   * route, unless something else already knows the pretty id. */
  attestationId: string;
  seller: Address;
  agent: Address;
  approved: boolean;
  gradeLabel: string;
  faceValue: number;
  advanceRateBps: number;
  confidenceBps: number;
  expectedSettlementAt: string;
  evidenceRef: string;
  txHash: string;
  blockNumber: bigint;
  committedAt: string;
}

function publicClient() {
  return createPublicClient({ chain: activeChain, transport: http() });
}

/** Every attestation ever submitted, approved or declined, newest first.
 * One eth_getLogs call plus one Attestation.get() per result (parallel) —
 * fine at today's volume; would need pagination well before it wouldn't
 * be. */
export async function getAllAttestations(): Promise<IndexedAttestation[]> {
  const client = publicClient();
  const addresses = contractAddresses(ACTIVE_CHAIN_ID);

  const logs = await client.getLogs({
    address: addresses.attestation as Address,
    event: ATTESTATION_SUBMITTED_EVENT,
    fromBlock: ACTIVE_ATTESTATION_DEPLOY_BLOCK,
    toBlock: "latest",
  });

  const records = await Promise.all(
    logs.map(async (log) => {
      const attestationId = log.args.attestationId!;
      const [record, block] = await Promise.all([
        client.readContract({
          address: addresses.attestation as Address,
          abi: attestationAbi,
          functionName: "get",
          args: [attestationId],
        }),
        client.getBlock({ blockNumber: log.blockNumber! }),
      ]);

      const indexed: IndexedAttestation = {
        attestationId: log.args.attestationId!,
        seller: record.seller,
        agent: record.agent,
        approved: record.approved,
        gradeLabel: gradeLabelFromCode(record.grade),
        faceValue: Number(record.faceValue) / 10 ** ACTIVE_STABLECOIN.decimals,
        advanceRateBps: record.advanceRate,
        confidenceBps: record.confidence,
        expectedSettlementAt: new Date(Number(record.expectedSettlement) * 1000)
          .toISOString()
          .slice(0, 10),
        evidenceRef: record.evidenceRef,
        txHash: log.transactionHash!,
        blockNumber: log.blockNumber!,
        committedAt: new Date(Number(block.timestamp) * 1000).toISOString(),
      };
      return indexed;
    }),
  );

  return records.sort((a, b) => Number(b.blockNumber - a.blockNumber));
}
