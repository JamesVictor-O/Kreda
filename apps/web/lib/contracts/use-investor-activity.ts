"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { createPublicClient, http, type Address } from "viem";
import { botChainTestnet } from "@/lib/chains";
import { receivableVaultAbi } from "@/lib/contracts/abis";
import { TESTNET_VAULTS } from "@/lib/contracts/addresses";
import type { ActivityEvent } from "@/lib/dashboard/types";

// Same floor as lib/contracts/indexer.ts's ATTESTATION_DEPLOY_BLOCK — any
// vault necessarily deploys after Attestation.sol, so this is always a
// safe (if slightly generous) lower bound without needing a second
// per-vault deployment block on hand.
const SCAN_FROM_BLOCK = BigInt(20_461_178);
const STABLECOIN_DECIMALS = 6;

export type InvestorActivityState =
  | { status: "no-wallet" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; events: ActivityEvent[] };

type FetchState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; events: ActivityEvent[] };

/** The connected wallet's real Deposit/Withdraw events across every known
 * vault (TESTNET_VAULTS), via eth_getLogs — same approach as
 * lib/contracts/indexer.ts. No "settlement" events yet: those come from
 * Settlement.PayoutConfirmed, which nothing has triggered on any real
 * vault so far. */
export function useInvestorActivity(): InvestorActivityState {
  const { address } = useAccount();
  const [fetchState, setFetchState] = useState<FetchState>({ status: "loading" });

  useEffect(() => {
    if (!address) return;
    let cancelled = false;

    async function run() {
      try {
        const client = createPublicClient({ chain: botChainTestnet, transport: http() });
        const perVault = await Promise.all(
          TESTNET_VAULTS.map(async (v) => {
            const [deposits, withdrawals] = await Promise.all([
              client.getContractEvents({
                address: v.vault as Address,
                abi: receivableVaultAbi,
                eventName: "Deposit",
                args: { owner: address as Address },
                fromBlock: SCAN_FROM_BLOCK,
                toBlock: "latest",
              }),
              client.getContractEvents({
                address: v.vault as Address,
                abi: receivableVaultAbi,
                eventName: "Withdraw",
                args: { owner: address as Address },
                fromBlock: SCAN_FROM_BLOCK,
                toBlock: "latest",
              }),
            ]);

            const blocks = await Promise.all(
              [...deposits, ...withdrawals].map((log) => client.getBlock({ blockNumber: log.blockNumber! })),
            );

            const events: ActivityEvent[] = [];
            deposits.forEach((log, i) => {
              events.push({
                id: `${log.transactionHash}-${log.logIndex}`,
                type: "deposit",
                receivableId: v.receivableId,
                amount: Number(log.args.assets ?? BigInt(0)) / 10 ** STABLECOIN_DECIMALS,
                timestamp: new Date(Number(blocks[i].timestamp) * 1000).toISOString(),
                txHash: log.transactionHash!,
              });
            });
            withdrawals.forEach((log, i) => {
              events.push({
                id: `${log.transactionHash}-${log.logIndex}`,
                type: "redemption",
                receivableId: v.receivableId,
                amount: Number(log.args.assets ?? BigInt(0)) / 10 ** STABLECOIN_DECIMALS,
                timestamp: new Date(Number(blocks[deposits.length + i].timestamp) * 1000).toISOString(),
                txHash: log.transactionHash!,
              });
            });
            return events;
          }),
        );

        const events = perVault
          .flat()
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        if (!cancelled) setFetchState({ status: "ready", events });
      } catch (error) {
        if (!cancelled) {
          setFetchState({
            status: "error",
            message: error instanceof Error ? error.message : "Couldn't load activity.",
          });
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [address]);

  if (!address) return { status: "no-wallet" };
  return fetchState;
}
