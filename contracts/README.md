# Kreda contracts

Foundry · Solidity 0.8.24 · OpenZeppelin 5.

Four contracts. Read `../CLAUDE.md` and `../kreda-prd.md` before touching
any of them — they document the architecture, the trust assumptions, and
the BOT Chain features that do not exist yet.

## Contracts

| Contract | Standard | Responsibility |
|---|---|---|
| [`AgentRegistry`](src/AgentRegistry.sol) | Custom | Agent identity, decision/decline counts, settled-outcome accuracy |
| [`Attestation`](src/Attestation.sol) | Custom, EIP-712 | The underwriting record — approvals and declines alike |
| [`ReceivableVault`](src/ReceivableVault.sol) | ERC-4626 | One vault per receivable — investor deposits, seller funding, redemption |
| [`Settlement`](src/Settlement.sol) | Custom, EIP-712 | Confirms the marketplace payout and unlocks redemption |

Share math is entirely OpenZeppelin's `ERC4626` base — deposit, mint,
withdraw, and redeem are inherited, not reimplemented. `ReceivableVault`
only overrides the `max*` limits, to gate deposits and redemptions by
lifecycle state (`Open → Funded → Settled`, or `Defaulted` if maturity
passes without a settled payout).

## Known weak point

`Settlement` trusts a single `oracleSigner` to attest that a marketplace
payout happened and its amount. There is no decentralised feed and no
multi-attester quorum — this is named plainly in the contract's NatSpec,
not concealed. Production would need a decentralised oracle with multiple
independent attesters, a legal assignment of the receivable enforceable
off-chain, or both. See `../CLAUDE.md` and `../kreda-prd.md` §4.4.

## Setup

```bash
cp .env.example .env   # fill in real values, never commit them
forge install
forge build
```

## Test

```bash
forge test              # full suite
forge test -vvv         # with traces on failure
forge test --fuzz-runs 10000   # more fuzz iterations for the share-math round trip
```

Coverage includes the full happy path (attestation → vault → deposits →
funded → payout → redemption, balances asserted at each step), the decline
path (record written, vault construction reverts against it), replay
protection on both attestation submission and payout confirmation,
unregistered-agent rejection, post-maturity default, and a fuzzed
deposit/redeem round trip checked against OpenZeppelin's own rounding
formula.

## Deploy

Testnet first, always. Mainnet is for release, once the happy path passes
on testnet end to end.

```bash
# Protocol-level contracts: AgentRegistry, Attestation, Settlement.
forge script script/Deploy.s.sol --rpc-url testnet --broadcast --verify

# One ReceivableVault per receivable, after the agent has submitted an
# approved Attestation for ATTESTATION_ID.
forge script script/DeployVault.s.sol --rpc-url testnet --broadcast --verify
```

`Deploy.s.sol` wires the three protocol contracts together, registers the
underwriter agent, runs a post-deploy assertion that every cross-contract
reference resolves correctly, and writes addresses to
`deployments/<network>.json`. Copy that file's values into the table below
as part of the deploy step — not typed in from memory afterward.

Swap `--rpc-url testnet` for `--rpc-url mainnet` once ready for chain 677.
Both are defined in `foundry.toml`.

## Deployed addresses

Not yet deployed. Populated from `deployments/testnet.json` and
`deployments/mainnet.json` after each deploy run.

| Contract | Testnet (968) | Mainnet (677) |
|---|---|---|
| AgentRegistry | — | — |
| Attestation | — | — |
| Settlement | — | — |
| ReceivableVault (demo receivable) | — | — |

## Conventions

- Custom errors, not revert strings.
- Events on every state transition.
- Checks-effects-interactions; `ReentrancyGuard` on `fundSeller`,
  `receivePayout`, `confirmPayout`, and both redemption paths.
- `SafeERC20` for all token movement — the stablecoin is assumed
  non-standard.
- No upgradeability proxies. Immutable is honest at this stage.
