"use client";

import { useEffect, useState } from "react";
import { getAllAttestations, type IndexedAttestation } from "@/lib/contracts/indexer";
import { fetchEvidence } from "@/lib/agent-api";
import { storeDisplayName } from "@/lib/agent-api-map";

export interface DeclinedAttestation extends IndexedAttestation {
  storeName: string | null;
  reason: string | null;
}

export type DeclinesState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; declines: DeclinedAttestation[] };

/** Every declined attestation on chain, system-wide (not filtered to a
 * connected wallet) — declines are published for anyone to audit, not
 * scoped to whoever happened to submit them. See CLAUDE.md: the decline
 * path is a first-class output, not an error case.
 *
 * evidenceRef is on the chain record itself, unlike the pretty
 * receivable_id string (see indexer.ts) — so GET /evidence/{ref} (keyed
 * by that same hash) can enrich each decline with its real reasoning and
 * store name, as long as the agent's evidence store still has it
 * (Render's disk is ephemeral — see services/agent/render.yaml). A
 * decline whose evidence is gone still shows, just without that detail. */
export function useAllDeclines(): DeclinesState {
  const [state, setState] = useState<DeclinesState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const all = await getAllAttestations();
        const declined = all.filter((a) => !a.approved);

        const enriched = await Promise.all(
          declined.map(async (attestation): Promise<DeclinedAttestation> => {
            const evidence = await fetchEvidence(attestation.evidenceRef).catch(() => null);
            return {
              ...attestation,
              storeName: evidence ? storeDisplayName(evidence.store_domain) : null,
              reason: evidence?.reasoning ?? null,
            };
          }),
        );

        if (!cancelled) setState({ status: "ready", declines: enriched });
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            message: error instanceof Error ? error.message : "Couldn't load declines.",
          });
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
