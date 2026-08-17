import { ALL_ADVANCES, DECLINED_APPLICATIONS, OPEN_VAULTS, SETTLED_ADVANCES } from "./fixtures";
import type { Decision, UnderwriterAgent } from "./types";

export const UNDERWRITER_AGENT: UnderwriterAgent = {
  id: "agent-kreda-underwriter-v1",
  name: "Kreda Underwriter v1",
  registryAddress: "0x6a9c2e5b8d1f4a7c0e3b6d9f2a5c8e1b4d7a0c3e",
};

/** Every decision the agent has made, across both dashboards — the same
 *  source ALL_POSITIONS and the seller advance pages read from, so this
 *  count can't drift from what's actually shown elsewhere. */
export const ALL_DECISIONS: Decision[] = [
  ...ALL_ADVANCES.map((advance) => advance.decision),
  ...OPEN_VAULTS.map((vault) => vault.decision),
  ...DECLINED_APPLICATIONS.map((application) => application.decision),
];

/**
 * Deliberately no fabricated accuracy percentage — there's no ground truth
 * to score predictions against yet. What's shown instead is a plain count:
 * how many settled receivables actually repaid in full. Small sample,
 * stated as one.
 */
export const AGENT_STATS = {
  decisionsCount: ALL_DECISIONS.length,
  declinedCount: ALL_DECISIONS.filter((decision) => decision.outcome === "declined").length,
  settledCount: SETTLED_ADVANCES.length,
  settledRepaidInFullCount: SETTLED_ADVANCES.length,
};
