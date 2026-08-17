"use client";

import { useAccount } from "wagmi";
import { ConnectButton } from "@/components/wallet/connect-button";

/** Blocks a dashboard flow behind a connected wallet — both sellers and
 * investors sign from their own wallet, so nothing downstream works
 * without one. */
export function WalletGate({
  children,
  description = "Kreda needs a connected wallet to assign receivables and sign transactions on BOT Chain. Your wallet never needs a gas token balance.",
}: {
  children: React.ReactNode;
  description?: string;
}) {
  const { isConnected } = useAccount();

  if (!isConnected) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 text-center">
          <h1 className="text-xl font-semibold text-foreground">Connect your wallet</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
          <div className="mt-6 flex justify-center">
            <ConnectButton />
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
