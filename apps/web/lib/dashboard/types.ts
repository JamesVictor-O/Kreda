/**
 * Typed contract for the seller dashboard. The agent service is expected to
 * implement this shape later — see fixtures.ts for the mock implementation
 * used until then.
 *
 * `checks` fixtures are constrained to the two checks the agent actually
 * runs today (services/agent/app/stages/check.py: order-history presence,
 * an 80% fulfilment-rate threshold). `advanceRateBps` mirrors the value
 * hardcoded in decide.py (8_000). `expectedSettlementAt` and `grade` are
 * product-level concepts this UI needs but the agent doesn't compute yet —
 * grade is derived client-side from confidence (see lib/dashboard/grade.ts),
 * not a stored field, and settlement timing is an estimate pending payout
 * data the agent doesn't ingest yet.
 */

export interface StoreConnection {
  platform: "shopify";
  storeName: string;
  domain: string;
  connected: boolean;
  connectedAt: string;
  lastSyncedAt: string;
  scopes: string[];
}

export interface PersonAccount {
  name: string;
  email: string;
  walletAddress: string;
}

export interface ShopifyOrder {
  id: string;
  orderNumber: string;
  placedAt: string;
  customerName: string;
  amount: number;
  fulfilled: boolean;
  deliveryScan: boolean;
}

export interface CheckResult {
  name: string;
  passed: boolean;
  detail: string;
}

export type DecisionOutcome = "approved" | "declined";

export interface Decision {
  receivableId: string;
  outcome: DecisionOutcome;
  confidenceBps: number;
  advanceRateBps: number | null;
  checks: CheckResult[];
  evidenceHash: string;
  /** Null for declines — no attestation is minted, only a decision blob. */
  attestationTx: string | null;
  decisionBlobHash: string;
  declineReason?: string;
}

export type AdvanceStatus = "active" | "settled";

export interface Advance {
  id: string;
  receivableId: string;
  storeName: string;
  faceValue: number;
  advanceRateBps: number;
  feeBps: number;
  amountReceived: number;
  status: AdvanceStatus;
  createdAt: string;
  expectedSettlementAt: string;
  settledAt?: string;
  /** Set once Settlement.confirmPayout() has run for this receivable's vault. */
  vaultAddress?: string;
  settlementTxHash?: string;
  decision: Decision;
}

export interface CashPositionMonth {
  month: string;
  amountReceived: number;
  isCurrent: boolean;
}

export interface OverviewStats {
  availableToAdvance: number;
  activeAdvancesTotal: number;
  nextSettlementInDays: number;
  advancesCompleted: number;
}

/** A receivable the underwriter has approved but that hasn't reached its
 * funding target yet — the investor-side counterpart to a seller's signed
 * advance, before ReceivableVault.deposit() closes the raise. */
export interface VaultOffering {
  receivableId: string;
  storeName: string;
  vaultAddress: string;
  faceValue: number;
  targetAmount: number;
  raisedAmount: number;
  expectedSettlementAt: string;
  decision: Decision;
}

/** A declined application never becomes a vault — it's published as a
 * record, not discarded. Decision itself carries no store name or date, so
 * both are attached here. */
export interface DeclinedApplication {
  storeName: string;
  declinedAt: string;
  decision: Decision;
}

/**
 * Investor ledger events map 1:1 to real contract events — no "accrual"
 * type, because ERC-4626 share value appreciates silently, it isn't emitted
 * as an event. Unrealized accrual is a computed figure (see
 * lib/dashboard/investor.ts), not a ledger line.
 *
 * deposit     — ERC4626 Deposit into the vault
 * settlement  — Settlement.confirmPayout() / ReceivableVault.PayoutReceived
 * redemption  — the investor's own ERC4626 Withdraw once payout has landed
 */
export type ActivityEventType = "deposit" | "settlement" | "redemption";

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  receivableId: string;
  amount: number;
  timestamp: string;
  txHash: string;
}

/** AgentRegistry identity — see CLAUDE.md: Kreda implements its own agent
 * registry contract, no AIDID SDK exists yet. */
export interface UnderwriterAgent {
  id: string;
  name: string;
  registryAddress: string;
}
