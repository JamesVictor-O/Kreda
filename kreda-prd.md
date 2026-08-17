# Kreda — Product Requirements Document

**Version** 1.0 · August 2026
**Status** Build in progress
**Submission target** BOT Chain Builder Challenge #2, AI × RWA track
**Deadline** 20 August 2026, 23:59 UTC+8

---

## 0. How to read this document

This PRD is written to be studied, not skimmed. It is organised so that each section answers one question completely before the next begins:

1. What is broken, and why has nobody fixed it
2. What Kreda does about it
3. What infrastructure makes it possible, and what does not exist
4. How it is built
5. What is in scope, what is deliberately not, and why
6. What could go wrong

Sections 3 and 5 are the ones most likely to save you from wasted work. Section 3 separates BOT Chain features that are documented and buildable from features that have been announced but have no developer surface. Section 5 contains hard cut lines.

**A note on the calendar.** The build window opened 10 August. Today is 14 August. The deadline is 20 August at 23:59 UTC+8, which lands in the afternoon in most of the world. That leaves roughly six days. Section 5's cut lines are not conservative — they are what fits.

---

## 1. Problem

### 1.1 The mechanic

An e-commerce seller's cash cycle runs backwards. Money leaves before it arrives.

| Day | Event | Cash |
|---|---|---|
| 0 | Pay supplier for inventory | -$50,000 |
| 7 | Inventory ships to warehouse | -$2,000 |
| 30 | Product sells | $0 — revenue recognised, not received |
| 37 | Marketplace begins payout hold | $0 |
| 44+ | Payout arrives | +$50,000 |

The seller is cash-negative for 45 to 90 days on every cycle. Working capital requirement runs 20–30% of annual revenue for a growing seller. The faster they grow, the worse the gap gets — growth consumes cash, and the cash is locked in receivables that are already confirmed.

The receivable is not speculative. The order is placed, paid by the customer, and fulfilled. The marketplace has the money. It is simply holding it.

### 1.2 Why existing financing does not reach these sellers

| Source | Why it fails |
|---|---|
| Bank lending | Underwriting cost exceeds $2,000 on a facility that might be $50,000. No local credit history for cross-border sellers. Collateral requirements they cannot meet. |
| Merchant cash advance | 20–40% effective APR. Fixed daily debits that worsen cash flow rather than relieving it. |
| Invoice factoring | 5–10 days manual verification per invoice. Minimum tickets around $100,000. Personal guarantees. |
| Revenue-based finance (Wayflyer, Clearco) | Own balance sheet, so capital-constrained. Single platform. Opaque model — the seller cannot see why they were priced where they were. |
| On-chain lending (Aave, Compound) | Requires 150%+ crypto collateral. No connection to real-world revenue. Irrelevant to this seller. |
| On-chain RWA credit (Centrifuge, Goldfinch, Credix, Huma) | Closest comparables. But underwriting is either institutional and manual, or delegated to a pool manager whose reasoning is not published. Ticket sizes and onboarding target institutions, not individual sellers. |

### 1.3 The binding constraint

Every failure above traces to the same root: **verification is expensive, and the cost does not scale down.**

A human analyst costs roughly the same to verify a $5,000 receivable as a $500,000 one. Below a threshold, the analysis costs more than the margin. So the entire population beneath that threshold goes unserved — not because they are bad credit, but because finding out is uneconomic.

Two consequences follow, and both matter for the design:

- **Small tickets are structurally excluded.** Not priced high; excluded.
- **Where verification does happen, its output is a grade, not a record.** The analyst's reasoning stays inside the lender. Capital must therefore come from someone who trusts the lender's institution, which means capital comes from balance sheets and institutional LPs rather than from anyone willing to assess the asset themselves.

The second consequence is the more interesting one. It is why on-chain receivables protocols have not solved this either: they moved the capital on-chain but left the underwriting opaque, so investors still have to trust a manager rather than assess an asset.

### 1.4 Who we are building for

**Primary — the seller.** Runs a Shopify store doing $50K-$5M annually. Understands their business well. Does not hold crypto, does not want to, and will abandon any flow that requires acquiring a gas token. Their need is immediate and concrete: restock inventory before demand arrives.

**Secondary — the investor.** Holds stablecoin, wants short-duration yield backed by something real, and is unwilling to underwrite an unknown seller on the word of an unknown protocol. Currently has no way to assess an individual receivable, so they buy pool exposure and trust a manager.

---

## 2. Solution

### 2.1 Statement

Kreda advances cash against confirmed e-commerce receivables. An agent performs the verification, and the evidence behind every decision is published on-chain.

Two moves, and both are necessary:

**Move the verification.** An agent reads order, fulfilment and payment history directly from the store's API and runs the checks a human analyst would run — at a cost that makes a $500 ticket viable and in under a minute rather than a week. This addresses the exclusion problem.

**Publish the evidence.** The inputs the agent saw, the checks it ran, the outcome of each, and its confidence are committed on-chain for every decision — including declines. This addresses the trust problem. An investor can audit the reasoning instead of trusting a grade letter, which means capital can come from anyone rather than only from institutions with a relationship to the lender.

The second move is the differentiator. Automated underwriting is not novel. Automated underwriting whose working is public is.

### 2.2 Value loop

```
Seller                Agent                   Chain                  Investor
  |                      |                       |                       |
  |-- connect store ---->|                       |                       |
  |                      |-- ingest 90d history  |                       |
  |                      |-- run checks          |                       |
  |                      |-- evidence ---------->| blob                  |
  |                      |-- decision ---------->| attestation           |
  |                      |                       |-- vault opened ------>|
  |                      |                       |<------- deposit ------|
  |-- sign (gasless) --------------------------->|                       |
  |<----------- stablecoin advance --------------|                       |
  |                      |                       |                       |
  |  ...marketplace pays out...                  |                       |
  |                      |                       |-- settlement -------->|
  |                      |<-- accuracy updated --|   principal + yield   |
```

### 2.3 The decline is a first-class output

When the agent rejects an application, no vault is created, no attestation is minted, and no sponsorship policy is issued. The decision and its reasoning are still committed on-chain.

This is not a courtesy. Three things depend on it:

- **The accuracy score means nothing without it.** An underwriter that approves everything has an accuracy score that measures the market, not the underwriter.
- **It is the evidence that the agent is load-bearing.** A system that only ever approves is indistinguishable from a form. The refusal, with reasoning attached, is what demonstrates judgment.
- **It is the seller's only route to understanding.** Every existing lender declines silently. Kreda tells them which check failed.

Build this path first. It is the hardest thing to retrofit and the easiest thing to skip.

### 2.4 Unit economics

Per $10,000 receivable, 30-day duration:

| Line | Amount |
|---|---|
| Face value | $10,000 |
| Advance rate (grade B+) | 80% — $8,000 |
| Origination fee (2%) | $200 |
| Seller receives | $7,800 |
| Investor yield (13% APR, 30 days) | ~$85 |
| Verification cost | <$1 |
| Chain cost | negligible |

The verification cost line is the whole thesis. At under a dollar, a $500 receivable is profitable to underwrite. At $200 of analyst time, a $50,000 receivable barely is.

---

## 3. Infrastructure

This section is the one to read carefully. BOT Chain's marketing and BOT Chain's documentation describe different chains.

### 3.1 What BOT Chain actually is

An EVM-compatible L1 using Proof of Staked Authority — the BSC consensus lineage. Elected validator set with candidate and backup validators. Finality within approximately two blocks. Standard Ethereum tooling works: Foundry, Hardhat, Remix, ethers, viem.

| | Mainnet | Testnet |
|---|---|---|
| Chain ID | 677 | 968 |
| RPC | `https://rpc.botchain.ai` | `https://rpc.bohr.life` |
| Explorer | `https://scan.botchain.ai` | `https://scan.bohr.life` |
| Native token | BOT (150M supply) | tBOT via faucet |

The "AI-native L1" positioning is not reflected in the developer documentation. There are no AI precompiles, no agent registry contract, no native oracle. Building as though there were will produce code that does not compile and claims that will not survive a judge who works there.

### 3.2 Primitive one — EOA Paymaster

**What it is.** A gas sponsorship mechanism that explicitly is not EIP-4337.

The flow:

1. A plain externally owned account signs a transaction with **gas price zero** and sends it to a paymaster endpoint rather than the public mempool.
2. The paymaster calls `pm_isSponsorable`, which receives the full transaction — `from`, `to`, `value`, `data`, `gas` — and evaluates it against a sponsor policy. Policies can gate on sender address, recipient address, token type, or transaction limits.
3. If eligible, the paymaster constructs its own sponsoring transaction and combines both into a **bundle**: an ordered array of transactions that execute atomically, all together or not at all.
4. Validators no longer verify individual gas prices within a block; builders prioritise on aggregate bundle gas price. Zero-fee and higher-fee transactions therefore coexist inside one bundle.
5. If the policy declines, nothing happens. No revert, no gas burned, no mempool trace.

**Why Kreda needs it.** The seller is a Shopify merchant. They do not hold BOT and will not acquire it. Without sponsorship, the first on-chain action in the product is "go buy a gas token on a DEX you have never heard of," and the funnel ends there.

**The second-order use.** Sponsorship is scoped, not blanket. Kreda issues a policy covering one seller address calling specific functions on specific contracts while their advance is open. When the advance settles, the policy lapses. The credit decision and the seller's ability to transact become the same object — a property that does not exist on a chain where gas is either paid or relayed unconditionally.

**Contrast with alternatives.** EIP-4337 requires smart accounts, bundlers, and account migration. A meta-transaction relayer (EIP-2771) offers no policy layer and no atomicity. Neither gives you conditional, revocable sponsorship of ordinary wallets.

**Open question — blocking.** Whether third parties can register sponsor policies, or whether sponsorship is closed to BOT Chain's own paymaster. The documentation references NodeReal's MegaFuel, which is BSC infrastructure. **Confirm in the Builder Hub.** Fallback is a self-hosted relayer implementing the same two RPC methods, or EIP-2771 — both weaken the claim and must be described honestly if used.

### 3.3 Primitive two — Blob API

**What it is.** `eth_getBlobSidecarByTxHash` and `eth_getBlobSidecars` — blob retrieval per transaction or per block. Cheap commitments over large payloads.

**Why Kreda needs it.** The evidence payload for a single underwriting decision — order snapshot, fulfilment cross-check results, anomaly analysis, the agent's reasoning — is large. Calldata would make publishing it for every decision, including declines, uneconomic. Blobs make the audit trail cheap enough to be the default rather than the exception.

**What it buys.** The differentiator in section 2.1. Without cheap evidence commitment, Kreda publishes a grade, and a published grade is what every competitor already offers.

**Design note.** Blobs prune. The commitment is permanent; the payload is not. Mirror payloads to durable storage and treat the on-chain commitment as the tamper-evidence layer, not the storage layer.

**Open question.** The documentation covers retrieval. Whether user-submitted type-3 transactions are accepted is unstated. **Confirm.** Fallback is a calldata commitment over a hash tree — same audit properties, higher cost, fewer decisions published.

### 3.4 Announced but absent

Do not build against these. Do not cite them in the README or the pitch.

| Feature | Status | Kreda's approach |
|---|---|---|
| **AIDID** (native AI agent identity) | Announced in launch coverage and leadership bios. No SDK, no contract address, no docs page. The AI Agent Launchpad is listed as "coming soon". | Implement `AgentRegistry` directly. ~150 lines. Migrate if an SDK ships, and say so. |
| Three-layer decoupled architecture / standardised DeFi modules | Announced. No developer surface. | Write the contracts. |
| "Native MEV resistance" | **Contradicted by BOT Chain's own paymaster documentation**, which describes bundles submitted to MEV builders with proposers selecting the most profitable block. | Do not claim it. |
| Sub-second block time, 10,000 TPS | Unstated in docs. Explorer suggests otherwise. | Measure against mainnet RPC. Quote the measured number or nothing. |
| DePIN dual mining, privacy computing | Announced. | Out of scope. |

Stating "we implemented our own registry because AIDID has no developer surface yet" is a stronger position than claiming AIDID. It demonstrates that you read past the marketing — which is precisely what the 25% mainnet-integration score is assessing.

### 3.5 Third blocking question

**Is there a mainnet stablecoin with real liquidity on chain 677?**

The faucet issues test USDT on testnet. Mainnet stablecoin availability is unconfirmed. The entire funding leg is denominated in stablecoin — investors deposit it, sellers receive it, settlement distributes it. If none exists with liquidity, the business loop cannot close in its intended form and the design needs revisiting immediately.

Confirm all three open questions (3.2, 3.3, 3.5) in the [Builder Hub](https://t.me/BotChain_official/61) before further integration work.

---

## 4. Architecture

### 4.1 Layout

```
apps/web          Next.js — seller flow, investor flow, evidence viewer
services/agent    Python / FastAPI — ingestion, checks, decisioning, signing
contracts/        Foundry — vault, registry, attestation, settlement
```

### 4.2 Contracts

| Contract | Standard | Responsibility |
|---|---|---|
| `ReceivableVault` | ERC-4626 | Investor deposits, share accounting, settlement distribution |
| `AgentRegistry` | Custom | Agent identity, attestation history, running accuracy score |
| `Attestation` | Custom | Signed underwriting decision, evidence blob reference |
| `Settlement` | Custom | Pro-rata distribution on payout confirmation |

Use OpenZeppelin for ERC-4626 and access control. Do not hand-roll vault share math — it is the single most common source of exploitable rounding bugs in this contract class.

**Attestation record:**

```
receivableId      bytes32
seller            address
faceValue         uint256
grade             uint8
advanceRate       uint16     basis points
expectedSettlement uint64    timestamp
confidence        uint16     basis points
evidenceRef       bytes32    blob commitment
agent             address
decision          uint8      approved | declined
signature         bytes
```

Declines are written with the same structure. `advanceRate` is zero and no vault is created, but the record and its evidence reference persist.

### 4.3 Agent

Four stages: **ingest — check — decide — commit.**

**Ingest.** Shopify Admin GraphQL API. Orders, fulfilments, refunds, payouts, store metadata. Read-only OAuth scope. Ninety days of history.

**Check.** Each produces pass, flag, or fail, and each is recorded individually:

| Check | Signal |
|---|---|
| Fulfilment coverage | Proportion of selected orders with a delivery scan |
| Sales velocity | Volume against tenure-adjusted median |
| Chargeback rate | Disputes as proportion of orders |
| Return rate | Returns as proportion of orders |
| Address clustering | Concentration of orders across shipping addresses |
| Synthetic order patterns | Timing, value and customer-identity clustering |

**Decide.** Rules plus reasoning over the check results, producing grade, advance rate, expected settlement, confidence. Not a trained model — see 5.3.

**Commit.** Evidence payload to a blob. Decision object hashed, signed with the agent key, written to `Attestation`.

**Grading:**

| Grade | Advance | Indicative APY | Profile |
|---|---|---|---|
| A | 85% | 10–12% | Established, low returns, stable velocity |
| B+ | 80% | 12–14% | Growing, some seasonality |
| B | 75% | 14–16% | Newer, higher volatility |
| C | 65% | 16–20% | Limited history |
| Declined | — | — | Failed check with reasoning published |

### 4.4 Settlement

The weakest component in the system, and it must be described as such.

Current design: the agent reads the marketplace payout via the connected store's payout endpoint and submits a signed attestation that triggers distribution. This is a centralised oracle with a single signer.

Production would require either a decentralised feed with multiple attesters, or a legal assignment of the receivable enforceable off-chain, or both. Neither is present.

**State this plainly in the README and to judges.** Do not describe it as "Chainlink-style". A judge who finds this themselves treats it as concealment; a judge who reads you naming it treats it as engineering judgment. Same fact, different outcome.

### 4.5 Stack

Solidity 0.8.24 · Foundry · OpenZeppelin · Next.js App Router · TypeScript strict · wagmi · viem · Tailwind · Python 3.11 · FastAPI · Shopify Admin GraphQL API

---

## 5. Scope

### 5.1 In

- Shopify only, via a Partners development store with a custom app (Admin API access token, no app review required)
- Seller flow: connect — select receivables — underwrite — sign gasless — funded
- Investor flow: browse vaults — audit evidence — deposit — settlement
- One funded receivable end to end **on mainnet**
- One visible decline with published reasoning
- Public demo, demo video, public repo

### 5.2 Out — do not build, do not stub, do not mention

Amazon SP-API (approval takes weeks to months) · TikTok Shop · WooCommerce · insurance pool · secondary market or DEX listing · trained ML models · DePIN verification · mobile app · DAO governance · cross-chain bridging · multi-store support · team accounts · notifications · dark mode

### 5.3 Why no trained model

A credit model requires default data. Kreda has none — no receivable has settled or failed. An XGBoost model trained on synthetic or borrowed data is theatre, and a judge who asks what it was trained on will get an answer that damages the submission.

Explicit, inspectable checks are the honest version at this stage, and arguably the better one: the entire product thesis is auditable underwriting, and a rule you can read is more auditable than a model you cannot. The model becomes correct once real outcomes exist. Say that.

### 5.4 Judging alignment

| Dimension | Weight | Where Kreda earns it |
|---|---|---|
| Product completion | 30% | One closed loop on mainnet — this is why 5.2 is aggressive |
| Mainnet integration | 25% | Paymaster and blobs used substantively, honestly described |
| Innovation | 20% | Published underwriting evidence, including declines |
| User experience | 15% | Under a minute to a decision; zero gas token required |
| Technical quality | 10% | OpenZeppelin base, tested contracts, honest docs |

Completion and integration together are 55%. In Challenge #1, roughly 39 of 210 submissions reached mainnet at all. **A narrow finished loop beats a broad unfinished one by a wide margin.** Cut scope before cutting polish, and cut both before cutting the mainnet deployment.

### 5.5 Six-day plan

| Day | Focus |
|---|---|
| 14 | Confirm the three blocking questions. Deploy contracts to testnet 968. |
| 15 | Agent: ingestion and checks. Build the decline path first. |
| 16 | Attestation, blob commitment, registry. Wire agent to chain. |
| 17 | Seller flow end to end on testnet, including gasless signature. |
| 18 | Investor flow, evidence viewer, settlement. |
| 19 | **Mainnet deployment.** One real loop. Fill deployment addresses. |
| 20 | Demo video, README, submission — before 23:59 UTC+8. |

Mainnet deployment on day 19, not day 20. Everything that slips, slips into polish, never into deployment.

---

## 6. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Paymaster policies closed to third parties | **Blocking** | Confirm today. Fallback to self-hosted relayer, described honestly. |
| No mainnet stablecoin liquidity | **Blocking** | Confirm today. Redesign funding leg if absent. |
| Blob submission unavailable | High | Fallback to calldata hash-tree commitment. |
| Settlement oracle is centralised | High | Disclose plainly. Do not overstate. |
| Fraud — synthetic orders | High | Multiple cross-referenced checks. Conservative advance rates. The decline path is the visible mitigation. |
| Regulatory — factoring and lending | High | Structured as receivables purchase, not lending. No jurisdiction has reviewed it. Say so; do not present it as a legal opinion. |
| Shopify API access changes | Medium | Ingestion written against an interface. Additional connectors are additive. |
| Category is crowded on-chain | Medium | Centrifuge, Goldfinch, Credix and Huma exist. Name them and state the difference — published evidence, individual-seller tickets — rather than omitting them. |
| Chain risk | Low | EVM-compatible throughout. Architecture is portable; BOT Chain is the first deployment, not a dependency. |

---

## 7. Success criteria

**Submission:** mainnet deployment with verified contracts, one funded receivable end to end, one published decline, working demo, public repo, demo video, honest documentation of every limitation in section 4.4 and 5.3.

**Beyond:** the loop still runs on 21 August. The named failure mode for projects like this is reaching prototype and stopping; the measure of success is whether one real seller can use it after the deadline passes.

---

## Reference

**BOT Chain** — [docs](https://dev-docs.botchain.ai/docs/intro) · [quick guide](https://dev-docs.botchain.ai/docs/Developers/quick-guide/) · [EOA Paymaster](https://dev-docs.botchain.ai/docs/Developers/eoa-paymaster/) · [Blob API](https://dev-docs.botchain.ai/docs/Developers/blob-api/) · [JSON-RPC](https://dev-docs.botchain.ai/docs/Developers/json-rpc-endpoint/) · [fast finality](https://dev-docs.botchain.ai/docs/introduction/fast-finality/) · [PoSA](https://dev-docs.botchain.ai/docs/introduction/proof-of-staked-authority/) · [faucet](https://faucet.botchain.ai/basic/) · [mainnet explorer](https://scan.botchain.ai/) · [Builder Hub](https://t.me/BotChain_official/61)

**Standards** — [EIP-4626](https://eips.ethereum.org/EIPS/eip-4626) · [OpenZeppelin ERC-4626](https://docs.openzeppelin.com/contracts/5.x/erc4626) · [EIP-4844](https://eips.ethereum.org/EIPS/eip-4844) · [EIP-2771](https://eips.ethereum.org/EIPS/eip-2771) · [EIP-4337](https://eips.ethereum.org/EIPS/eip-4337) (for contrast)

**Tooling** — [Foundry](https://book.getfoundry.sh/) · [wagmi](https://wagmi.sh/) · [viem](https://viem.sh/) · [Next.js](https://nextjs.org/docs) · [FastAPI](https://fastapi.tiangolo.com/) · [Shopify Admin GraphQL](https://shopify.dev/docs/api/admin-graphql)
