import { createConfig, http } from "wagmi";
import { injected, walletConnect } from "wagmi/connectors";
import { botChainMainnet, botChainTestnet } from "./chains";

// Plain mobile browsers (Safari/Chrome) have no window.ethereum to inject
// — the injected() connector alone leaves them with no way to connect at
// all. WalletConnect covers that: a QR code on desktop, a deep link into
// whichever wallet app the user has on mobile. Needs a free project ID
// from https://cloud.reown.com — omitted (rather than passed empty) when
// unset so an unconfigured deploy doesn't break the connectors that do
// work.
const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

const connectors = [
  // unstable_shimAsyncInject: extensions inject window.ethereum
  // asynchronously, sometime after their content script starts. Doesn't
  // cover wagmi's own reconnect-on-mount race (that one's worked around
  // in providers.tsx) but does help isAuthorized() elsewhere, e.g. the
  // periodic revalidate() check that prunes stale connections.
  injected({ unstable_shimAsyncInject: 2_000 }),
  ...(walletConnectProjectId
    ? [
        walletConnect({
          projectId: walletConnectProjectId,
          metadata: {
            name: "Kreda",
            description: "Receivables financing where the underwriting is auditable.",
            url: typeof window !== "undefined" ? window.location.origin : "https://kreda.ai",
            icons: [],
          },
        }),
      ]
    : []),
];

export const wagmiConfig = createConfig({
  // Mainnet first — it's config.chains[0], wagmi's fallback default when
  // no target chainId is otherwise specified. Testnet stays listed so a
  // connected wallet can still switch to it for dev/demo purposes.
  chains: [botChainMainnet, botChainTestnet],
  connectors,
  ssr: true,
  transports: {
    [botChainMainnet.id]: http(),
    [botChainTestnet.id]: http(),
  },
});
