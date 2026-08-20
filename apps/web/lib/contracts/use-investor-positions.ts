"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { createPublicClient, http, type Address } from "viem";
import { botChainTestnet } from "@/lib/chains";
import { receivableVaultAbi } from "@/lib/contracts/abis";
import { TESTNET_VAULTS } from "@/lib/contracts/addresses";
import { getAllRealVaultOfferings } from "@/lib/contracts/real-vault";
import type { VaultOffering } from "@/lib/dashboard/types";

export interface InvestorPosition {
  vault: VaultOffering & { gradeLabel: string };
  principal: number;
  settled: boolean;
}

export type InvestorPositionsState =
  | { status: "no-wallet" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; positions: InvestorPosition[] };

const STABLECOIN_DECIMALS = 6;

type FetchState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; positions: InvestorPosition[] };

/** The connected wallet's real share balance in every known real vault
 * (see TESTNET_VAULTS). balanceOf doubles as principal still deposited:
 * shares mint 1:1 against assets on an empty vault, and no redemption is
 * possible before Settled (ReceivableVault.maxRedeem returns 0), so
 * nothing can move a holder's balance out of that 1:1 relationship before
 * settlement. */
export function useInvestorPositions(): InvestorPositionsState {
  const { address } = useAccount();
  const [fetchState, setFetchState] = useState<FetchState>({ status: "loading" });

  useEffect(() => {
    if (!address) return;
    let cancelled = false;

    async function run() {
      try {
        const client = createPublicClient({ chain: botChainTestnet, transport: http() });
        const [offerings, balances, settledFlags] = await Promise.all([
          getAllRealVaultOfferings(),
          Promise.all(
            TESTNET_VAULTS.map((v) =>
              client.readContract({
                address: v.vault as Address,
                abi: receivableVaultAbi,
                functionName: "balanceOf",
                args: [address as Address],
              }),
            ),
          ),
          Promise.all(
            TESTNET_VAULTS.map((v) =>
              client.readContract({
                address: v.vault as Address,
                abi: receivableVaultAbi,
                functionName: "settled",
              }),
            ),
          ),
        ]);

        const positions: InvestorPosition[] = [];
        offerings.forEach((vault, i) => {
          const shares = balances[i];
          if (shares > BigInt(0)) {
            positions.push({
              vault,
              principal: Number(shares) / 10 ** STABLECOIN_DECIMALS,
              settled: settledFlags[i],
            });
          }
        });

        if (!cancelled) setFetchState({ status: "ready", positions });
      } catch (error) {
        if (!cancelled) {
          setFetchState({
            status: "error",
            message: error instanceof Error ? error.message : "Couldn't load positions.",
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
