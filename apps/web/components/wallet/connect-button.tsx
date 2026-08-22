"use client";

import { useAccount, useConnect, useDisconnect, useSwitchChain, type Connector } from "wagmi";
import { botChainTestnet } from "@/lib/chains";
import { truncateAddress } from "@/lib/dashboard/format";
import { friendlyWalletErrorMessage } from "@/lib/wallet-error";
import { Button } from "@/components/ui/button";

/** Deploys go to testnet first, always — see CLAUDE.md. Mainnet is for release. */
const TARGET_CHAIN = botChainTestnet;

/** Plain mobile browsers never get window.ethereum injected — only a
 * desktop extension or a wallet app's own in-app browser does. Checked at
 * click time, not render time: an extension can still be mid-injection a
 * few hundred ms after page load (see providers.tsx), but by the time a
 * human actually clicks this button that's long settled. */
function pickConnector(connectors: readonly Connector[]) {
  const hasInjectedProvider =
    typeof window !== "undefined" && !!(window as { ethereum?: unknown }).ethereum;
  if (hasInjectedProvider) {
    return connectors.find((c) => c.type === "injected") ?? connectors[0];
  }
  return (
    connectors.find((c) => c.type === "walletConnect") ??
    connectors.find((c) => c.type === "injected") ??
    connectors[0]
  );
}

export function ConnectButton() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending: connecting, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();

  if (!isConnected) {
    return (
      <div>
        <Button
          type="button"
          onClick={() => {
            const connector = pickConnector(connectors);
            if (connector) connect({ connector, chainId: TARGET_CHAIN.id });
          }}
          disabled={connecting}
          aria-busy={connecting}
        >
          {connecting ? "Connecting…" : "Connect wallet"}
        </Button>
        {connectError && (
          <p role="alert" className="mt-2 text-xs text-danger">
            {/^provider not found/i.test(connectError.message)
              ? "No wallet extension found. Install one to continue."
              : friendlyWalletErrorMessage(connectError, "Couldn't connect. Please try again.")}
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
