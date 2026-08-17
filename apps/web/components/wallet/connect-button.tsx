"use client";

import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { botChainTestnet } from "@/lib/chains";
import { truncateAddress } from "@/lib/dashboard/format";
import { Button } from "@/components/ui/button";

/** Deploys go to testnet first, always — see CLAUDE.md. Mainnet is for release. */
const TARGET_CHAIN = botChainTestnet;

export function ConnectButton() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending: connecting, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();

  if (!isConnected) {
    const connector = connectors[0];
    return (
      <div>
        <Button
          type="button"
          onClick={() => connector && connect({ connector, chainId: TARGET_CHAIN.id })}
          disabled={!connector || connecting}
          aria-busy={connecting}
        >
          {connecting ? "Connecting…" : "Connect wallet"}
        </Button>
        {connectError && (
          <p role="alert" className="mt-2 text-xs text-danger">
            {connectError.message.toLowerCase().includes("provider")
              ? "No wallet extension found. Install one to continue."
              : connectError.message}
          </p>
        )}
      </div>
    );
  }

  if (chainId !== TARGET_CHAIN.id) {
    return (
      <Button
        type="button"
        onClick={() => switchChain({ chainId: TARGET_CHAIN.id })}
        disabled={switching}
        aria-busy={switching}
      >
        {switching ? "Switching…" : `Switch to ${TARGET_CHAIN.name}`}
      </Button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => disconnect()}
      title="Disconnect wallet"
      className="inline-flex h-12 shrink-0 items-center gap-2 rounded-full border border-border px-5 font-mono text-sm text-foreground transition-colors duration-150 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <span aria-hidden="true" className="h-2 w-2 rounded-full bg-primary" />
      {truncateAddress(address!)}
    </button>
  );
}
