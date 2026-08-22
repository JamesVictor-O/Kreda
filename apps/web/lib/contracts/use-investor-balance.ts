"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { createPublicClient, http, type Address } from "viem";
import { activeChain } from "@/lib/chains";
import { erc20Abi } from "@/lib/contracts/abis";
import { ACTIVE_STABLECOIN } from "@/lib/contracts/addresses";

export type InvestorBalanceState =
  | { status: "no-wallet" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; balance: number };

type FetchState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; balance: number };

/** The connected wallet's real balance of the stablecoin Kreda vaults are
 * denominated in (see ACTIVE_STABLECOIN) -- an ERC20 balanceOf read, not
 * a fixture. */
export function useInvestorBalance(): InvestorBalanceState {
  const { address } = useAccount();
  const [fetchState, setFetchState] = useState<FetchState>({ status: "loading" });

  useEffect(() => {
    if (!address) return;
    let cancelled = false;

    async function run() {
      try {
        const client = createPublicClient({ chain: activeChain, transport: http() });
        const raw = await client.readContract({
          address: ACTIVE_STABLECOIN.address as Address,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [address as Address],
        });
        if (!cancelled) {
          setFetchState({ status: "ready", balance: Number(raw) / 10 ** ACTIVE_STABLECOIN.decimals });
        }
      } catch (error) {
        if (!cancelled) {
          setFetchState({
            status: "error",
            message: error instanceof Error ? error.message : "Couldn't load balance.",
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
