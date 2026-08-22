"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, useReconnect } from "wagmi";
import { useEffect, useState } from "react";
import { wagmiConfig } from "@/lib/wagmi";

/** WagmiProvider's built-in reconnect-on-mount runs in an effect right
 * after mount, but a wallet extension's window.ethereum can still be
 * injecting at that exact point (content scripts start asynchronously,
 * sometimes a couple hundred ms after page load). wagmi's reconnect()
 * checks connector.getProvider() up front and just skips a connector
 * with no provider yet rather than waiting for one -- so a previously
 * connected wallet looks disconnected on a refresh that wins the race.
 * Retry once the extension actually shows up (or after a grace period,
 * for wallets that don't fire this event) to recover from that.
 *
 * Needs to render inside both WagmiProvider (for useReconnect's config
 * context) and QueryClientProvider (useReconnect calls useMutation
 * under the hood). */
function ReconnectOnLateInjection() {
  const { reconnect } = useReconnect();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if ((window as { ethereum?: unknown }).ethereum) return;

    const retry = () => reconnect();
    window.addEventListener("ethereum#initialized", retry, { once: true });
    const timer = setTimeout(retry, 300);
    return () => {
      window.removeEventListener("ethereum#initialized", retry);
      clearTimeout(timer);
    };
  }, [reconnect]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ReconnectOnLateInjection />
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
