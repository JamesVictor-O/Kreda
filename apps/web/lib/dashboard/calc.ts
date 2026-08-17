/** Matches decide.py's hardcoded 80% advance rate and a 2% origination fee. */
const ADVANCE_RATE_BPS = 8_000;
const FEE_BPS = 200;

export function estimateAdvance(faceValue: number) {
  const advance = Math.round(faceValue * (ADVANCE_RATE_BPS / 10_000));
  const fee = Math.round(advance * (FEE_BPS / 10_000));
  const netToSeller = advance - fee;
  return { advanceRateBps: ADVANCE_RATE_BPS, feeBps: FEE_BPS, advance, fee, netToSeller };
}

/** The investor side of the same math: principal deposited into the vault
 *  (the advance amount) against the full face value paid back at settlement. */
export function estimateInvestorPosition(faceValue: number) {
  const principal = estimateAdvance(faceValue).advance;
  const payout = faceValue;
  const returnAmount = payout - principal;
  const returnBps = principal > 0 ? Math.round((returnAmount / principal) * 10_000) : 0;
  return { principal, payout, returnAmount, returnBps };
}
