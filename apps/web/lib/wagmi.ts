import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { botChainMainnet, botChainTestnet } from "./chains";

export const wagmiConfig = createConfig({
  chains: [botChainTestnet, botChainMainnet],
  // unstable_shimAsyncInject: extensions inject window.ethereum
  // asynchronously, sometime after their content script starts. Doesn't
  // cover wagmi's own reconnect-on-mount race (that one's worked around
  // in providers.tsx) but does help isAuthorized() elsewhere, e.g. the
  // periodic revalidate() check that prunes stale connections.
  connectors: [injected({ unstable_shimAsyncInject: 2_000 })],
  ssr: true,
  transports: {
    [botChainTestnet.id]: http(),
    [botChainMainnet.id]: http(),
  },
});
