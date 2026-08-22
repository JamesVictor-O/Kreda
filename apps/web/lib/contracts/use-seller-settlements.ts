"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { createPublicClient, http, type Address } from "viem";
import { activeChain } from "@/lib/chains";
import { receivableVaultAbi, settlementAbi } from "@/lib/contracts/abis";
import {
  ACTIVE_ATTESTATION_DEPLOY_BLOCK,
  ACTIVE_CHAIN_ID,
  ACTIVE_STABLECOIN,
  ACTIVE_VAULTS,
  contractAddresses,
} from "@/lib/contracts/addresses";
import { useSellerAttestations } from "@/lib/contracts/use-seller-attestations";

// Same floor as lib/contracts/indexer.ts's ACTIVE_ATTESTATION_DEPLOY_BLOCK
// — Settlement.sol deploys in the same protocol script as Attestation.sol,
// so this is always a safe (if slightly generous) lower bound for its
// logs too.
const SETTLEMENT_DEPLOY_BLOCK = ACTIVE_ATTESTATION_DEPLOY_BLOCK;

export interface SellerSettlement {
  receivableId: string;
  vaultAddress: string;
  faceValue: number;
  committedAt: string;
  expectedSettlementAt: string;
  funded: boolean;
  settled: boolean;
  settledAt: string | null;
  settlementTxHash: string | null;
  payoutAmount: number | null;
}

export type SellerSettlementsState =
  | { status: "no-wallet" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; settlements: SellerSettlement[] };

type FetchState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; settlements: SellerSettlement[] };

/** The connected wallet's real settlement status, one entry per approved
 * attestation that already has a deployed vault (see ACTIVE_VAULTS — a
 * receivable approved through /seller/new-advance has no vault until
 * DeployVault.s.sol is run against it, so it won't show up here yet).
 * "Settled" comes from ReceivableVault.settled(); the payout amount and
 * tx come from the matching Settlement.PayoutConfirmed log. */
export function useSellerSettlements(): SellerSettlementsState {
  const { address } = useAccount();
  const attestationsState = useSellerAttestations();
  const [fetchState, setFetchState] = useState<FetchState>({ status: "loading" });

  useEffect(() => {
    if (!address) return;
    if (attestationsState.status !== "ready") return;

    let cancelled = false;

    async function run() {
      if (attestationsState.status !== "ready") return;
      try {
        const client = createPublicClient({ chain: activeChain, transport: http() });
        const addresses = contractAddresses(ACTIVE_CHAIN_ID);

        const matched = attestationsState.attestations
          .filter((a) => a.approved)
          .flatMap((attestation) => {
            const vaultConfig = ACTIVE_VAULTS.find(
              (v) => v.attestationId.toLowerCase() === attestation.attestationId.toLowerCase(),
            );
            return vaultConfig ? [{ attestation, vaultConfig }] : [];
          });

        const settlements = await Promise.all(
          matched.map(async ({ attestation, vaultConfig }) => {
            const vaultAddress = vaultConfig.vault as Address;
            const [fundedFlag, settledFlag] = await Promise.all([
              client.readContract({
                address: vaultAddress,
                abi: receivableVaultAbi,
                functionName: "funded",
              }),
              client.readContract({
                address: vaultAddress,
                abi: receivableVaultAbi,
                functionName: "settled",
              }),
            ]);

            let settledAt: string | null = null;
            let settlementTxHash: string | null = null;
            let payoutAmount: number | null = null;

            if (settledFlag) {
              const logs = await client.getContractEvents({
                address: addresses.settlement as Address,
                abi: settlementAbi,
                eventName: "PayoutConfirmed",
                args: { vault: vaultAddress },
                fromBlock: SETTLEMENT_DEPLOY_BLOCK,
                toBlock: "latest",
              });
              const log = logs[0];
              if (log) {
                const block = await client.getBlock({ blockNumber: log.blockNumber! });
                settledAt = new Date(Number(block.timestamp) * 1000).toISOString().slice(0, 10);
                settlementTxHash = log.transactionHash!;
                payoutAmount = Number(log.args.amount ?? BigInt(0)) / 10 ** ACTIVE_STABLECOIN.decimals;
              }
            }

            const settlement: SellerSettlement = {
              receivableId: vaultConfig.receivableId,
              vaultAddress: vaultConfig.vault,
              faceValue: attestation.faceValue,
              committedAt: attestation.committedAt.slice(0, 10),
              expectedSettlementAt: attestation.expectedSettlementAt,
              funded: fundedFlag,
              settled: settledFlag,
              settledAt,
              settlementTxHash,
              payoutAmount,
            };
            return settlement;
          }),
        );

        if (!cancelled) setFetchState({ status: "ready", settlements });
      } catch (error) {
        if (!cancelled) {
          setFetchState({
            status: "error",
            message: error instanceof Error ? error.message : "Couldn't load settlements.",
          });
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [address, attestationsState]);

  if (!address) return { status: "no-wallet" };
  if (attestationsState.status === "loading") return { status: "loading" };
  if (attestationsState.status === "error") return { status: "error", message: attestationsState.message };
  return fetchState;
}
