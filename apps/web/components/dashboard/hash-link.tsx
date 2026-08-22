"use client";

import { truncateHash } from "@/lib/dashboard/format";
import { activeChain } from "@/lib/chains";

export type HashKind = "tx" | "address" | "opaque";

const EXPECTED_LENGTH: Record<Exclude<HashKind, "opaque">, number> = {
  tx: 66, // 0x + 32-byte tx hash
  address: 42, // 0x + 20-byte address
};

/** Renders an on-chain hash. `kind` must be passed explicitly by the
 * caller — a hash shaped like a tx hash isn't necessarily one (an
 * Attestation.Record's evidenceRef and attestationId are both bytes32
 * but neither is a transaction the explorer knows about; the
 * attestation's actual submission tx is a separate field). Defaults to
 * "opaque" (never links) so an unwired page passing fixture-placeholder
 * hashes can't accidentally grow a real-looking link that 404s on the
 * real explorer. */
export function HashLink({
  label,
  hash,
  kind = "opaque",
}: {
  label: string;
  hash: string;
  kind?: HashKind;
}) {
  const shapeOk =
    kind !== "opaque" && /^0x[0-9a-fA-F]+$/.test(hash) && hash.length === EXPECTED_LENGTH[kind];

  if (!shapeOk) {
    return (
      <span title={hash} aria-label={`${label}: ${hash}`} className="font-mono text-sm text-foreground">
        {truncateHash(hash)}
      </span>
    );
  }

  const path = kind === "tx" ? `/tx/${hash}` : `/address/${hash}`;

  return (
    <a
      href={`${activeChain.blockExplorers.default.url}${path}`}
      target="_blank"
      rel="noreferrer"
      title={hash}
      aria-label={`${label}: ${hash} — view on ${activeChain.blockExplorers.default.name}`}
      className="font-mono text-sm text-foreground underline decoration-border underline-offset-4 transition-colors duration-150 hover:text-primary hover:decoration-primary"
    >
      {truncateHash(hash)}
    </a>
  );
}
