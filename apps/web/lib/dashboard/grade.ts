/**
 * Grade is a display-only bucketing of the real confidence score, computed
 * here rather than stored — the agent doesn't output a separate grade.
 */
export function gradeFromConfidence(confidenceBps: number): string {
  if (confidenceBps >= 9_000) return "A";
  if (confidenceBps >= 7_500) return "B+";
  if (confidenceBps >= 6_000) return "B";
  if (confidenceBps >= 4_000) return "C";
  return "D";
}
