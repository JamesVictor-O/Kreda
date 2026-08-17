"use client";

import { truncateHash } from "@/lib/dashboard/format";

/** Renders an on-chain hash as inert, explorer-styled text. Not a real link
 *  yet — BOT Chain explorer wiring lands once contracts are deployed. */
export function HashLink({ label, hash }: { label: string; hash: string }) {
  return (
    <a
      href="#"
      onClick={(event) => event.preventDefault()}
      title={hash}
      aria-label={`${label}: ${hash} — link to BOT Chain explorer, not yet live`}
      className="font-mono text-sm text-foreground underline decoration-border underline-offset-4 transition-colors duration-150 hover:text-primary hover:decoration-primary"
    >
      {truncateHash(hash)}
    </a>
  );
}
