import { ACTIVE_ADVANCES, ALL_ADVANCES, OVERVIEW_STATS, SETTLED_ADVANCES } from "./fixtures";
import { estimateInvestorPosition } from "./calc";
import { daysBetween, daysUntil } from "./format";
import type { Advance, ActivityEvent } from "./types";

/**
 * An investor's view of a funded receivable — the same Advance the seller
 * sees, reframed as principal deposited into the vault vs. the payout it
 * redeems for at settlement. There's a single investor in this fixture set,
 * so principal here is the whole vault's raise, not a pro-rata share.
 */
export interface InvestorPosition {
  advance: Advance;
  principal: number;
  payout: number;
  returnAmount: number;
  returnBps: number;
}

function toPosition(advance: Advance): InvestorPosition {
  return { advance, ...estimateInvestorPosition(advance.faceValue) };
}

export const ALL_POSITIONS: InvestorPosition[] = ALL_ADVANCES.map(toPosition);
export const ACTIVE_POSITIONS: InvestorPosition[] = ACTIVE_ADVANCES.map(toPosition);
export const SETTLED_POSITIONS: InvestorPosition[] = SETTLED_ADVANCES.map(toPosition);

export function getPositionById(id: string): InvestorPosition | undefined {
  return ALL_POSITIONS.find((position) => position.advance.id === id);
}

/** Fraction of the way from deposit to expected settlement, clamped to
 *  [0, 1] — the same shape used for the settlement progress bars. */
export function elapsedFraction(advance: Advance): number {
  const total = daysBetween(advance.createdAt, advance.expectedSettlementAt);
  const remaining = daysUntil(advance.expectedSettlementAt);
  if (total <= 0) return 1;
  return Math.min(1, Math.max(0, 1 - remaining / total));
}

export const PORTFOLIO_STATS = {
  deposited: ACTIVE_POSITIONS.reduce((sum, position) => sum + position.principal, 0),
  activePositions: ACTIVE_POSITIONS.length,
  /** Unrealized, mark-to-target — time elapsed toward settlement times the
   *  expected return. Not a claim about a real accrual event; ERC-4626
   *  share value moves silently, it isn't emitted on-chain. */
  accruedYield: ACTIVE_POSITIONS.reduce(
    (sum, position) => sum + position.returnAmount * elapsedFraction(position.advance),
    0,
  ),
  nextSettlementInDays: OVERVIEW_STATS.nextSettlementInDays,
};

// Placeholder hashes — TODO: replace once ReceivableVault deposits and
// redemptions are live on BOT Chain mainnet. Deposit/redemption are the
// investor's own signed transactions, distinct from the vault-level
// settlementTxHash already recorded on each Advance.
const DEPOSIT_TX_HASHES: Record<string, string> = {
  adv_2847: "0x1f4a7c0e3b6d9f2a5c8e1b4d7a0c3e69b2d5f8a1c4e7b0d3f6a9c2e5b8d1f4a7",
  adv_2791: "0x0c3e69b2d5f8a1c4e7b0d3f6a9c2e5b8d1f4a7a0c3e69b2d5f8a1c4e7b0d3f6a",
  adv_2810: "0x2a5c8e1b4d7a0c3e69b2d5f8a1c4e7b0d3f6a9c1f4a7c0e3b6d9f2a5c8e1b4d7",
  adv_2755: "0x6a9c2e5b8d1f4a7c0e3b6d9f2a5c8e1b4d7a0c3e69b2d5f8a1c4e7b0d3f6a9c2",
};

const REDEMPTION_TX_HASHES: Record<string, string> = {
  adv_2791: "0xd7a0c3e69b2d5f8a1c4e7b0d3f6a9c2e5b8d1f4a70c3e69b2d5f8a1c4e7b0d3f",
  adv_2810: "0xf6a9c2e5b8d1f4a7c0e3b6d9f2a5c8e1b4d7a0c3e69b2d5f8a1c4e7b0d3f6a9c",
  adv_2755: "0xb8d1f4a7c0e3b6d9f2a5c8e1b4d7a0c3e69b2d5f8a1c4e7b0d3f6a9c2e5b8d1f",
};

function buildActivityEvents(): ActivityEvent[] {
  const events: ActivityEvent[] = [];

  for (const position of ALL_POSITIONS) {
    const { advance, principal, payout } = position;
    const depositTx = DEPOSIT_TX_HASHES[advance.id];
    if (depositTx) {
      events.push({
        id: `${advance.id}-deposit`,
        type: "deposit",
        receivableId: advance.receivableId,
        amount: principal,
        timestamp: `${advance.createdAt}T14:30:00`,
        txHash: depositTx,
      });
    }

    if (advance.status === "settled" && advance.settlementTxHash) {
      events.push({
        id: `${advance.id}-settlement`,
        type: "settlement",
        receivableId: advance.receivableId,
        amount: payout,
        timestamp: `${advance.settledAt}T09:00:00`,
        txHash: advance.settlementTxHash,
      });

      const redemptionTx = REDEMPTION_TX_HASHES[advance.id];
      if (redemptionTx) {
        events.push({
          id: `${advance.id}-redemption`,
          type: "redemption",
          receivableId: advance.receivableId,
          amount: payout,
          timestamp: `${advance.settledAt}T09:05:00`,
          txHash: redemptionTx,
        });
      }
    }
  }

  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export const ACTIVITY_EVENTS: ActivityEvent[] = buildActivityEvents();

export function getRedemptionEvent(receivableId: string): ActivityEvent | undefined {
  return ACTIVITY_EVENTS.find(
    (event) => event.type === "redemption" && event.receivableId === receivableId,
  );
}
