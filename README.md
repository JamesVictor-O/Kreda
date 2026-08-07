# Kreda

Receivables financing where the underwriting is auditable.

An underwriter agent reads a seller's e-commerce store data, cross-checks fulfilment, and commits
both its decision and the evidence behind it on-chain. Investors fund the receivable through an
ERC-4626 vault. Sellers sign from ordinary wallets holding no gas token.

Submission for the BOT Chain Builder Challenge #2, AI x RWA track.

## Layout

```
apps/web          Next.js — seller flow, investor flow, evidence viewer
services/agent    Python/FastAPI — underwriting, evidence assembly, signing
contracts/        Foundry — vault, registry, distribution
```

See [CLAUDE.md](./CLAUDE.md) for full scope, hard constraints, and what's deliberately out.

## Prerequisites

- Node 20+, [pnpm](https://pnpm.io) 10+
- [Foundry](https://book.getfoundry.sh/getting-started/installation)
- Python 3.11+ (`brew install python@3.11` on macOS — the system default is older)

## Setup

```bash
pnpm install
cd contracts
forge install foundry-rs/forge-std OpenZeppelin/openzeppelin-contracts@v5.7.0 --no-git
cd ../services/agent && python3.11 -m venv .venv && .venv/bin/pip install -e ".[dev]"
```

Copy `.env.example` to `.env` at the root and in `services/agent/`, and fill in RPC URLs, the
deployer/agent private keys, and Shopify credentials. Never commit real values.

## Commands

```bash
# contracts
cd contracts
forge build && forge test
forge script script/Deploy.s.sol --rpc-url testnet --broadcast   # testnet first, always

# web
pnpm dev            # apps/web on localhost:3000
pnpm --filter web typecheck
pnpm --filter web lint

# agent
cd services/agent
.venv/bin/uvicorn app.main:app --reload
.venv/bin/ruff check .
.venv/bin/pytest
```

Deploy to BOT Chain testnet (chain 968) first, always. Mainnet (chain 677) deploys are for release
only.

## Known weak point

Settlement currently reads a signed payout attestation from the connected store, not a
decentralised oracle. This is a named trust assumption, not a Chainlink-style oracle.
