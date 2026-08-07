import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { botChainMainnet, botChainTestnet } from "./chains";

export const wagmiConfig = createConfig({
  chains: [botChainTestnet, botChainMainnet],
  connectors: [injected()],
  transports: {
    [botChainTestnet.id]: http(),
    [botChainMainnet.id]: http(),
  },
});
