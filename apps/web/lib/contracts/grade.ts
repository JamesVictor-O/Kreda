/// Mirrors app/core/models.py's GRADE_CODE / GRADE_ADVANCE_RATE_BPS in the
/// agent service and contracts/src/Attestation.sol's Record.grade — keep
/// these three in sync by hand; they're small and change rarely.
export const GRADE_LABELS = ["A", "B+", "B", "C", "DECLINE"] as const;

export function gradeLabelFromCode(code: number): string {
  return GRADE_LABELS[code] ?? `Grade ${code}`;
}
