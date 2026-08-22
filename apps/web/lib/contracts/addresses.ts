/// Contract addresses keyed by chain id. See contracts/deployments/
/// testnet.json and mainnet.json (protocol) and testnet-vaults.json
/// (per-receivable vaults), which this file is kept in sync with by hand
/// since it's a handful of addresses, not generated.
///
/// Mainnet's addresses happen to be textually identical to testnet's —
/// not a copy-paste error. A contract's CREATE address is derived from
/// (deployer address, nonce), and this was the same deployer wallet's
/// very first transaction on both chains, so the addresses landed the
/// same on each. They're still independent deployments on independent
/// chains.

export const TESTNET_CHAIN_ID = 968;
export const MAINNET_CHAIN_ID = 677;

/// The chain the app reads from and writes to by default. Flip back to
/// TESTNET_CHAIN_ID to roll back to testnet-only operation — everything
/// downstream (ACTIVE_VAULTS, ACTIVE_STABLECOIN, activeChain in
/// lib/chains.ts, ConnectButton's target chain) follows from this one
/// constant.
export const ACTIVE_CHAIN_ID = MAINNET_CHAIN_ID;

export const CONTRACT_ADDRESSES = {
  [TESTNET_CHAIN_ID]: {
    agentRegistry: "0xc2B0D2A7e858F13B349843fF87dBF4EBF9227F49",
    attestation: "0xF7602C048F8C7Cc5E8c514522D633eb9A16a3a1B",
    settlement: "0x15B9E263B6E896d4D8F0D9c89878678aa6abAdeC",
    agent: "0x8c9c6EcBE917fa992D6Ac777C3FE78324D0baa6f",
  },
  [MAINNET_CHAIN_ID]: {
    agentRegistry: "0xc2B0D2A7e858F13B349843fF87dBF4EBF9227F49",
    attestation: "0xF7602C048F8C7Cc5E8c514522D633eb9A16a3a1B",
    settlement: "0x15B9E263B6E896d4D8F0D9c89878678aa6abAdeC",
    agent: "0x8c9c6EcBE917fa992D6Ac777C3FE78324D0baa6f",
  },
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
  {
    // receivableId here is the attestationId's own first 16 hex chars, not
    // an agent-service pretty id -- see testnet-vaults.json's
    // receivableIdNote for why (the real one wasn't recoverable).
    receivableId: "dd282d7160949ed1",
    attestationId: "0xdd282d7160949ed14ca1eadb64022032bd4998513524d7623dad36c82b6021b4",
    vault: "0x80E7AEc2c254d21b720811FBc3C5E47FE796E133",
    asset: "0x75edC9335175Fc0552D51D48439F229c10420fe3",
    assetDecimals: 6,
  },
  {
    receivableId: "bbc5244632b13b1b",
    attestationId: "0xbbc5244632b13b1bb0ab42a7f0ab5bf9761328312929cb6c708913e1a1529bd6",
    vault: "0x90405650c7fdc281382F165B98f3951e33EEe600",
    asset: "0x75edC9335175Fc0552D51D48439F229c10420fe3",
    assetDecimals: 6,
  },
] as const;

/// No receivable has been underwritten and deployed against mainnet yet —
/// this is honestly empty, not a placeholder to fill with fake data. Add
/// entries here the same way TESTNET_VAULTS grew: run the real
/// underwrite flow, then contracts/script/DeployVault.s.sol, then record
/// the result both here and in contracts/deployments/mainnet-vaults.json.
export const MAINNET_VAULTS: (typeof TESTNET_VAULTS)[number][] = [];

export const ACTIVE_VAULTS: (typeof TESTNET_VAULTS)[number][] =
  ACTIVE_CHAIN_ID === MAINNET_CHAIN_ID ? MAINNET_VAULTS : [...TESTNET_VAULTS];

/// The stablecoin each network's vaults are denominated in. Independent
/// of ACTIVE_VAULTS being empty — the asset itself is a protocol-level
/// fact, not something that shows up only once a vault exists.
export const STABLECOIN_ADDRESSES = {
  [TESTNET_CHAIN_ID]: {
    address: "0x75edC9335175Fc0552D51D48439F229c10420fe3",
    symbol: "USDT",
    decimals: 6,
  },
  // BOT Chain Bridged USDT — ~$59M circulating supply, actively traded on
  // BDEX (WBOT/USDT). Verified via direct RPC read, the mainnet
  // explorer's verified/non-scam flags, and matching CoinGecko listing
  // data before wiring this in — see the "mainnet stablecoin liquidity"
  // blocking question in CLAUDE.md / kreda-prd.md.
  [MAINNET_CHAIN_ID]: {
    address: "0xaBabc7Ddc03e501d190C676BF3d92ef0e6e87a3C",
    symbol: "USDT",
    decimals: 6,
  },
} as const;

export const ACTIVE_STABLECOIN = STABLECOIN_ADDRESSES[ACTIVE_CHAIN_ID];

/// Block each chain's Attestation.sol was deployed at — the floor for
/// eth_getLogs scans in indexer.ts and friends (see contracts/broadcast/
/// Deploy.s.sol/<chainId>/run-latest.json's receipts for the source).
export const ATTESTATION_DEPLOY_BLOCK = {
  [TESTNET_CHAIN_ID]: BigInt(20_461_178),
  [MAINNET_CHAIN_ID]: BigInt(20_541_323),
} as const;

export const ACTIVE_ATTESTATION_DEPLOY_BLOCK = ATTESTATION_DEPLOY_BLOCK[ACTIVE_CHAIN_ID];

export function contractAddresses(chainId: number) {
  const addresses = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES];
  if (!addresses) {
    throw new Error(`No Kreda contracts deployed on chain ${chainId}`);
  }
  return addresses;
}
