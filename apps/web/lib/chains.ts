import { defineChain } from "viem";
import { ACTIVE_CHAIN_ID, MAINNET_CHAIN_ID } from "./contracts/addresses";

export const botChainMainnet = defineChain({
  id: 677,
  name: "BOT Chain",
  nativeCurrency: { name: "BOT", symbol: "BOT", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.botchain.ai"] },
  },
  blockExplorers: {
    default: { name: "BOT Chain Explorer", url: "https://scan.botchain.ai" },
  },
});

export const botChainTestnet = defineChain({
  id: 968,
  name: "BOT Chain Testnet",
  nativeCurrency: { name: "BOT", symbol: "BOT", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.bohr.life"] },
  },
  blockExplorers: {
    default: { name: "BOT Chain Testnet Explorer", url: "https://scan.bohr.life" },
  },
  testnet: true,
});

/// The chain real-data reads/writes target by default — see
/// ACTIVE_CHAIN_ID in lib/contracts/addresses.ts for how to flip this.
export const activeChain = ACTIVE_CHAIN_ID === MAINNET_CHAIN_ID ? botChainMainnet : botChainTestnet;
