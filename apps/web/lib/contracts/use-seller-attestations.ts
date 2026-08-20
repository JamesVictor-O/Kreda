"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { getAllAttestations, type IndexedAttestation } from "@/lib/contracts/indexer";

export type SellerAttestationsState =
  | { status: "no-wallet" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; attestations: IndexedAttestation[] };

type FetchState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; attestations: IndexedAttestation[] };

/** Every real attestation on chain, filtered to the connected wallet as
 * seller. A freshly connected wallet legitimately sees nothing here until
 * it submits a receivable through /seller/new-advance — that's correct,
 * not broken: this is real per-seller data, not a shared demo feed. */
export function useSellerAttestations(): SellerAttestationsState {
  const { address } = useAccount();
  const [fetchState, setFetchState] = useState<FetchState>({ status: "loading" });

  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    getAllAttestations()
      .then((all) => {
        if (cancelled) return;
        const mine = all.filter((a) => a.seller.toLowerCase() === address.toLowerCase());
        setFetchState({ status: "ready", attestations: mine });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setFetchState({
          status: "error",
          message: error instanceof Error ? error.message : "Couldn't load attestations.",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [address]);

  if (!address) return { status: "no-wallet" };
  return fetchState;
}
