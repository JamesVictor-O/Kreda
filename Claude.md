# CLAUDE.md

Instructions for Claude Code working in this repository.

## Project

**Kreda** — receivables financing where the underwriting is auditable.

An underwriter agent reads a seller's e-commerce store data, cross-checks fulfilment, and commits both its decision and the evidence behind it on-chain. Investors fund the receivable through an ERC-4626 vault. Sellers sign from ordinary wallets holding no gas token.

Submission for the BOT Chain Builder Challenge #2, AI × RWA track.

## Hard constraints

These are not negotiable and they override every other consideration in this file.

| Constraint | Detail |
|---|---|
| Submission deadline | **20 Aug 2026, 23:59 UTC+8** — convert to local time before planning. This is an afternoon deadline in most of the world, not midnight. |
| Deployment | **BOT Chain mainnet (chain 677)**. Testnet-only submissions are disqualified, not downgraded. |
| Required artifacts | Public website or demo, wallet connection completing the core flow, public GitHub repo |
| Judging weights | Product completion 30%, mainnet integration 25%, innovation 20%, UX 15%, technical quality 10% |

Completion and deployment are 55% of the score. In Challenge #1, only ~39 of 210 submissions reached mainnet at all. **When trading scope against polish, always cut scope and keep the loop closed.**

## Verified vs unverified — read before writing integration code

This project was scoped from BOT Chain's public docs. Some widely-cited BOT Chain features appear only in press releases and have **no developer surface** in the documentation.

### Verified — documented, safe to build against

- EVM-compatible, PoSA consensus, finality within roughly two blocks
- Mainnet: chain ID `677`, RPC `https://rpc.botchain.ai`, explorer `https://scan.botchain.ai`
- Testnet: chain ID `968`, RPC `https://rpc.bohr.life`, explorer `https://scan.bohr.life`
- Native token BOT, 150M supply, used for gas and staking
- Standard Ethereum tooling works — ethers.js, web3.js, Remix, Hardhat, Foundry
- **EOA Paymaster** — zero-gas-price transactions from plain EOAs, evaluated by a sponsor policy via `pm_isSponsorable`, bundled atomically with a sponsor transaction. Not EIP-4337.
- **Blob API** — `eth_getBlobSidecarByTxHash`, `eth_getBlobSidecars`

### Unverified — announced but absent from the docs

**Do not write code against these, do not cite them in the README, and do not claim them in the pitch until confirmed in the Builder Hub.**

- `AIDID` — announced as a native AI agent identity protocol. No SDK, no contract address, no docs page. **Kreda implements its own agent registry contract.** If an AIDID SDK ships, migrate then and say so.
- Three-layer decoupled architecture / standardised DeFi modules — announced, no developer surface. Write the contracts.
- "Native MEV resistance" — contradicted by BOT Chain's own paymaster doc, which describes bundles submitted to MEV builders with proposers selecting the most profitable block. **Do not claim this.**
- Sub-second block time / 10,000 TPS — unstated in docs. Measure against mainnet RPC and quote the measured number.
- DePIN dual-mining, privacy computing — out of scope.

### Open questions blocking design decisions

Ask in the [Builder Hub](https://t.me/BotChain_official/61) before building the affected component:

1. Can third parties register paymaster sponsor policies, or is sponsorship closed to BOT Chain's own paymaster?
2. Are user-submitted blob transactions accepted, or is the Blob API read-only?
3. Is there a mainnet stablecoin with real liquidity? The faucet issues test USDT on testnet; mainnet is unconfirmed. **The entire funding leg is denominated in stablecoin — this is a blocking question.**

If (1) is closed, fall back to a meta-transaction relayer and describe it honestly as a relayer. If (2) is closed, fall back to a calldata commitment over a hash tree. If (3) is closed, the funding leg needs rethinking — escalate immediately.

## Architecture

```
apps/web          Next.js — seller flow, investor flow, evidence viewer
services/agent    Python/FastAPI — underwriting, evidence assembly, signing
contracts/        Foundry — vault, registry, distribution
```

### Contracts

| Contract | Standard | Purpose |
|---|---|---|
| `ReceivableVault` | ERC-4626 | Investor deposits, share accounting, settlement distribution |
| `AgentRegistry` | Custom | Agent identity, attestation records, running accuracy score |
| `Attestation` | Custom | Signed underwriting decision + evidence blob reference |
| `Settlement` | Custom | Pro-rata distribution on payout confirmation |

Use OpenZeppelin for ERC-4626 and access control. Do not hand-roll vault share math.

### Underwriter agent

Four stages: ingest → check → decide → commit.

The **decline path is a first-class output, not an error case.** Build it first. An underwriter that only approves is a rules engine with a mascot, and the decline is the strongest evidence to a judge that the AI is load-bearing. Declines write a decision blob even though no vault, no attestation, and no sponsorship policy are created.

Every decision — approve or decline — records the inputs the agent saw, the checks it ran, the outcome, and a confidence value. This is the product's differentiator: an investor audits the reasoning rather than trusting a grade letter.

## Scope

### In

Shopify only, via a Partners development store with a custom app (Admin API access token, no app review). One seller flow, one investor flow, one funded receivable end to end on mainnet, one visible decline.

### Out — do not build, do not stub, do not mention

Amazon SP-API (approval takes weeks), TikTok Shop, WooCommerce, insurance pool, secondary market / DEX listing, trained ML models, DePIN verification, mobile app, DAO governance, cross-chain bridging.

If a request would add anything on this list, say so and propose the in-scope alternative instead.

### Known weak point

Settlement currently reads a signed payout attestation from the connected store, not a decentralised oracle. **State this plainly in the README and in the pitch.** Do not describe it as "Chainlink-style". Naming the trust assumption scores better than having a judge find it.

## Conventions

- Solidity ^0.8.24, Foundry, OpenZeppelin. Tests for every contract; fork tests against mainnet RPC before deploying.
- TypeScript strict. Next.js App Router, wagmi + viem. No ethers.
- Python 3.11+, FastAPI, ruff, type hints throughout.
- Never commit private keys, API tokens, or Shopify credentials. `.env.example` only.
- Commit messages: imperative, lowercase, no scope prefixes.
- Prose in README, docs, and UI copy: sentence case, no marketing language, no "seamless" / "unlock" / "leverage" / "revolutionary". Say what it does.

## Commands

```bash
forge build && forge test              # contracts
forge script script/Deploy.s.sol --rpc-url $BOT_RPC --broadcast
pnpm dev                               # web
uvicorn app.main:app --reload          # agent
```

Deploy to testnet (968) first, always. Mainnet deploys are for release only.

---

## Reference

### BOT Chain — primary

- [Developer docs — index](https://dev-docs.botchain.ai/docs/intro)
- [Quick guide](https://dev-docs.botchain.ai/docs/Developers/quick-guide/) — chain IDs, RPC endpoints, tooling
- [JSON-RPC endpoint](https://dev-docs.botchain.ai/docs/Developers/json-rpc-endpoint/)
- [EOA Paymaster](https://dev-docs.botchain.ai/docs/Developers/eoa-paymaster/) — `pm_isSponsorable`, bundles, sponsor policies
- [Blob API](https://dev-docs.botchain.ai/docs/Developers/blob-api/)
- [Introduction](https://dev-docs.botchain.ai/docs/introduction/) — PoSA, EVM compatibility
- [Fast finality](https://dev-docs.botchain.ai/docs/introduction/fast-finality/)
- [Proof of Staked Authority](https://dev-docs.botchain.ai/docs/introduction/proof-of-staked-authority/)
- [Security](https://dev-docs.botchain.ai/docs/introduction/security/)
- [Node types](https://dev-docs.botchain.ai/docs/Developers/node-types/)
- [Test token faucet](https://dev-docs.botchain.ai/docs/Developers/claim-test-tbot-tokens/)

### BOT Chain — ecosystem

- [Mainnet explorer](https://scan.botchain.ai/) · [Testnet explorer](https://scan.bohr.life/)
- [Faucet](https://faucet.botchain.ai/basic/)
- [Bridge](https://bridge.botchain.ai/) · [DEX](https://dex.botchain.ai/) · [Wallet](https://wallet.botchain.ai/)
- [GitHub org](https://github.com/BOTChain-bot)
- [Builder Hub — Telegram](https://t.me/BotChain_official/61)
- [Ecosystem support](https://www.botchain.ai/ecosystem-support)
- [Integration guide](https://docs.google.com/document/d/1xYzdfJlD08UOV9CKE3nV7NTSQg6lPz9B17aIW2NF5Wg/edit)

### Paymaster

- [MegaFuel overview (NodeReal)](https://docs.nodereal.io/docs/megafuel-overview) — the referenced paymaster implementation
- [EIP-4337](https://eips.ethereum.org/EIPS/eip-4337) — for contrast; BOT Chain's paymaster is **not** 4337
- [eth_sendRawTransaction spec](https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_sendrawtransaction)

### Standards

- [EIP-4626 — tokenized vaults](https://eips.ethereum.org/EIPS/eip-4626)
- [OpenZeppelin ERC-4626](https://docs.openzeppelin.com/contracts/5.x/erc4626)
- [EIP-4844 — blob transactions](https://eips.ethereum.org/EIPS/eip-4844)
- [EIP-2771 — meta transactions](https://eips.ethereum.org/EIPS/eip-2771) — relayer fallback

### Tooling

- [Foundry book](https://book.getfoundry.sh/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/5.x/)
- [wagmi](https://wagmi.sh/) · [viem](https://viem.sh/)
- [Next.js](https://nextjs.org/docs)
- [FastAPI](https://fastapi.tiangolo.com/)
- [Shopify Admin GraphQL API](https://shopify.dev/docs/api/admin-graphql)
- [Shopify custom apps](https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/generate-app-access-tokens-admin)