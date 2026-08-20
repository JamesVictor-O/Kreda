"use client";

import { Button, ButtonLink } from "@/components/ui/button";

/** The real vault's data comes from a live RPC read (see
 * lib/contracts/real-vault.ts) — an RPC hiccup shouldn't crash the whole
 * page. Fixture vaults don't hit the network at all, so this only ever
 * fires on the one real path. */
export default function VaultError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-4xl flex-col items-center px-4 py-24 text-center sm:px-6 lg:px-0">
      <h1 className="text-2xl font-semibold text-foreground">Couldn&rsquo;t load this vault</h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        The read against BOT Chain testnet failed — could be a network hiccup. Try again.
      </p>
      <div className="mt-6 flex gap-3">
        <Button type="button" size="sm" onClick={() => reset()}>
          Try again
        </Button>
        <ButtonLink href="/investor" variant="ghost" size="sm">
          Back to open vaults
        </ButtonLink>
      </div>
    </div>
  );
}
