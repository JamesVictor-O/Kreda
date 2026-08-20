"use client";

import { truncateHash } from "@/lib/dashboard/format";
import { botChainTestnet } from "@/lib/chains";

/// A 66-char hex string (0x + 64) is a bytes32 — tx hash or attestationId
/// alike resolve at /tx/ on Blockscout-based explorers. A 42-char one is an
/// address, which resolves at /address/. Anything else (e.g. an evidence
/// commitment hash not on chain, or a fixture placeholder) doesn't link.
function explorerPath(hash: string): string | null {
  if (!/^0x[0-9a-fA-F]+$/.test(hash)) return null;
  if (hash.length === 66) return `/tx/${hash}`;
  if (hash.length === 42) return `/address/${hash}`;
  return null;
}

/** Renders an on-chain hash linked to the real BOT Chain testnet explorer
 * when it's shaped like a tx hash or address; otherwise inert (e.g. a
 * fixture placeholder hash, which was never a real transaction). */
export function HashLink({ label, hash }: { label: string; hash: string }) {
  const path = explorerPath(hash);

  if (!path) {
    return (
      <span title={hash} aria-label={`${label}: ${hash}`} className="font-mono text-sm text-foreground">
        {truncateHash(hash)}
      </span>
    );
  }

  return (
    <a
      href={`${botChainTestnet.blockExplorers.default.url}${path}`}
      target="_blank"
      rel="noreferrer"
      title={hash}
      aria-label={`${label}: ${hash} — view on BOT Chain testnet explorer`}
      className="font-mono text-sm text-foreground underline decoration-border underline-offset-4 transition-colors duration-150 hover:text-primary hover:decoration-primary"
    >
      {truncateHash(hash)}
    </a>
  );
}
