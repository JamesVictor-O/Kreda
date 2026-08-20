/// Contract addresses keyed by chain id. Mainnet isn't deployed yet — see
/// contracts/deployments/testnet.json (protocol) and testnet-vaults.json
/// (per-receivable vaults), which this file is kept in sync with by hand
/// since it's a handful of addresses, not generated.

export const TESTNET_CHAIN_ID = 968;
export const MAINNET_CHAIN_ID = 677;

export const CONTRACT_ADDRESSES = {
  [TESTNET_CHAIN_ID]: {
    agentRegistry: "0xc2B0D2A7e858F13B349843fF87dBF4EBF9227F49",
    attestation: "0xF7602C048F8C7Cc5E8c514522D633eb9A16a3a1B",
    settlement: "0x15B9E263B6E896d4D8F0D9c89878678aa6abAdeC",
    agent: "0x8c9c6EcBE917fa992D6Ac777C3FE78324D0baa6f",
  },
  [MAINNET_CHAIN_ID]: null,
} as const;

/// One ReceivableVault per receivable, deployed as attestations are
/// approved — not a fixed protocol address. See
/// contracts/deployments/testnet-vaults.json for how these got here.
export const TESTNET_VAULTS = [
  {
    receivableId: "3460eb5efce28ce5",
    attestationId: "0xf1ddb47602dead14122a958a812f28f5e64fea24a6e1d521a7accfb18087c66a",
    vault: "0xCdC7Bc596C72E4Ff4c8c23B11eeEcb23cA9C97C0",
    asset: "0x75edC9335175Fc0552D51D48439F229c10420fe3", // testnet faucet USDT
    assetDecimals: 6,
  },
] as const;

export function contractAddresses(chainId: number) {
  const addresses = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES];
  if (!addresses) {
    throw new Error(`No Kreda contracts deployed on chain ${chainId}`);
  }
  return addresses;
}
