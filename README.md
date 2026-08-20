# Kreda

Receivables financing where the underwriting is auditable.

An underwriter agent reads a seller's e-commerce store data, cross-checks fulfilment, and commits both its decision and the evidence behind it on-chain. Investors fund the receivable through an ERC-4626 vault. Sellers sign from ordinary wallets holding no gas token.

Built on BOT Chain for the Builder Challenge #2, AI × RWA track.

---

## The problem

A Shopify seller ships $80,000 worth of inventory this month. The orders are delivered, but the marketplace won't release payment for another 45 days. Meanwhile the supplier wants payment this week, advertising bills are due tomorrow, and the next inventory order cannot be placed. The business is profitable, yet it is running out of cash.

The financing that should close this gap doesn't reach most sellers. A bank spends more underwriting a $50,000 facility than the facility earns. Merchant cash advances price at 20–40% effective APR. Traditional factoring takes five to ten days per invoice and sets minimum tickets above $100,000. Revenue-based lenders operate off their own balance sheet, on a single platform, behind a model nobody outside the company can inspect.

The binding constraint is the cost of verification. Everything else follows from it.

## What Kreda does

Kreda moves verification from a human analyst to an agent, and then publishes what the agent saw.

A seller connects their store. The agent ingests order, fulfilment and payment history, runs consistency and fraud checks, and returns a decision: grade, advance rate, expected settlement date, confidence. The inputs and the checks are hashed, published, and referenced by an on-chain attestation — so the evidence behind a decision is as inspectable as the decision itself.

An investor browsing the vault can open that evidence and audit the reasoning rather than trusting a grade letter. That is the part existing lenders structurally cannot offer, and it is the reason a stranger would fund a receivable from a seller they have never heard of.

Funding settles in stablecoin. The seller signs a zero-gas-price transaction; the paymaster sponsors it. Their wallet balance never needs to be anything other than zero.

## How it works

```
  Seller                    Agent                    Chain                   Investor
    │                         │                        │                        │
    ├── connect store ───────▶│                        │                        │
    │                         ├── ingest, check        │                        │
    │                         ├── evidence ───────────▶│  hash + URI            │
    │                         ├── decision ───────────▶│  attestation           │
    │                         │                        ├── vault opened ───────▶│
    │                         │                        │◀────── deposit ────────┤
    ├── sign (gasless) ──────────────────────────────▶│                        │
    │◀───────────── stablecoin advance ───────────────┤                        │
    │                         │                        │                        │
    │  ...marketplace pays out...                      │                        │
    │                         │                        ├── settlement ─────────▶│
    │                         │◀── accuracy updated ───┤   principal + yield    │
```

### The decline path

Not every application is funded, and the declines are the point.

When the agent rejects an application no vault is created, no attestation is minted, and no sponsorship policy is issued. The decision is still committed on-chain with the reasoning attached. An underwriter that only ever approves is a rules engine; the refusal is what makes the accuracy score mean something.

## BOT Chain

Two primitives do real work here. Both are documented; neither is standard EVM.

**EOA Paymaster.** BOT Chain lets a plain externally owned account sign a transaction with gas price zero. A paymaster evaluates it against a sponsor policy through `pm_isSponsorable` and, if eligible, bundles it atomically with its own sponsoring transaction. This is not EIP-4337 — no smart account, no bundler, no session keys, no account migration.

This matters because the seller is a merchant, not a crypto user. Requiring them to acquire a gas token to assign a receivable would end the product at step one. Sponsorship is also scoped: the policy covers one address calling specific functions while their vault is open, and lapses when it closes.

**Blob API.** Underwriting evidence is large — order histories, fulfilment records, check results, the agent's reasoning. Blob storage would make that audit trail cheap enough to attach to every decision, including declines, rather than only to disputes. Whether BOT Chain accepts user-submitted blob transactions or only exposes blob data for reads is unconfirmed at time of writing; if it's read-only, evidence falls back to a calldata-committed hash tree instead. Either way the attestation itself only ever stores a hash and a URI, so the storage backend is swappable without touching the contract.

Chain details, verification status of announced-but-undocumented features, and open integration questions are recorded in [`CLAUDE.md`](./CLAUDE.md).

## Architecture

```
apps/web          Next.js — seller flow, investor flow, evidence viewer
services/agent    Python / FastAPI — ingestion, checks, decisioning, signing
contracts/        Foundry — vault, registry, attestation, settlement
```

### Contracts

| Contract | Standard | Responsibility |
|---|---|---|
| `ReceivableVault` | ERC-4626 | Investor deposits, share accounting, settlement distribution |
| `AgentRegistry` | Custom | Agent identity, attestation history, running accuracy |
| `Attestation` | Custom | Signed underwriting decision and evidence hash/URI reference |
| `Settlement` | Custom | Pro-rata distribution on payout confirmation |

`AgentRegistry` is Kreda's own implementation. BOT Chain has announced a native agent identity protocol (AIDID) but has published no SDK or contract address; if one ships, the registry migrates to it.

### Agent

Four stages — ingest, check, decide, commit. Checks currently verify order history and a minimum 90-day fulfilment rate; each produces a pass or fail and is recorded either way, including for declines. Velocity, return-rate, and fraud-pattern checks are the next additions — see Roadmap.

The decision is a structured object — grade, advance rate, expected settlement, confidence — hashed, signed, and written on-chain alongside its evidence reference.

## Stack

Solidity 0.8.24 · Foundry · OpenZeppelin · Next.js · wagmi · viem · TypeScript · Python 3.11 · FastAPI · Shopify Admin GraphQL API

## Running locally

```bash
git clone https://github.com/JamesVictor-O/Kreda
cd Kreda
```

Contracts:

```bash
cd contracts
cp .env.example .env   # fill in DEPLOYER_PRIVATE_KEY and DEPLOYER_ADDRESS
forge install foundry-rs/forge-std OpenZeppelin/openzeppelin-contracts@v5.7.0 --no-git
forge build
forge test
```

Web:

```bash
cd apps/web
pnpm install
pnpm dev
```

Agent — requires Python 3.11+:

```bash
cd services/agent
cp .env.example .env
uv sync
uv run uvicorn app.main:app --reload
```

Deploy to testnet first, always. Mainnet deployment is for release only.

```bash
cd contracts
source .env
forge script script/Deploy.s.sol --rpc-url testnet --broadcast --private-key $DEPLOYER_PRIVATE_KEY
```

## Deployments

| Network | Chain ID | Contract | Address |
|---|---|---|---|
| BOT Chain mainnet | 677 | `ReceivableVault` | — |
| BOT Chain mainnet | 677 | `AgentRegistry` | — |
| BOT Chain mainnet | 677 | `Attestation` | — |
| BOT Chain mainnet | 677 | `Settlement` | — |

## Scope and limitations

This is a working system built in a short window, and it is more useful to be exact about what that means than to imply otherwise.

**Shopify only.** Amazon SP-API approval takes weeks. The ingestion layer is written against an interface so additional platforms are additive. Two providers exist: a real one against the Shopify Admin GraphQL API, and a fixture provider serving generated snapshots against the same schema. The Shopify provider hasn't been run against a live store — the demo and the test suite run on the fixture provider. See `services/agent/README.md`.

**Settlement reads a signed payout attestation** from the connected store, not a decentralised oracle. This is the largest trust assumption in the system. A production version needs either a decentralised feed or a legal assignment enforceable off-chain; neither is present here.

**Underwriting is rules and reasoning, not a trained model.** A credit model needs default data that does not yet exist. The checks are explicit and inspectable, which is the honest version at this stage and arguably the better one for auditability.

**The commit stage isn't fully wired.** The agent signs a decision; broadcasting that signature to `Attestation.commitDecision` is not yet connected end-to-end.

**No insurance pool, no secondary market.** Both are natural extensions. Neither is built.

**Not regulated.** Kreda is structured as a receivables purchase rather than lending, which is the standard factoring approach, but no jurisdiction has reviewed it and nothing here is a legal opinion.

## Roadmap

Velocity, return-rate, and fraud-pattern checks · additional platform connectors · decentralised payout verification · default insurance pool · secondary market for vault shares · migration to AIDID if a developer SDK ships

## License

MIT