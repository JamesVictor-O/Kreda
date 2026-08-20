import { cn } from "@/lib/cn";
import { gradeFromConfidence } from "@/lib/dashboard/grade";

/** `grade` overrides the confidence-derived letter when the real,
 * authoritative on-chain grade (Attestation.Record.grade) is known — a
 * fallback-graded decision can have a genuinely low confidence (honest)
 * alongside a fixed, approved grade (also honest); confidence alone would
 * mislabel it. Fixtures don't pass this and keep deriving from confidence,
 * same as before. */
export function GradeBadge({
  confidenceBps,
  grade: gradeOverride,
}: {
  confidenceBps: number;
  grade?: string;
}) {
  const grade = gradeOverride ?? gradeFromConfidence(confidenceBps);
  const strong = confidenceBps >= 7_500;

  return (
    <span
      className={cn(
        "inline-flex h-6 min-w-6 items-center justify-center rounded-md px-1.5 font-mono text-xs font-semibold",
        strong ? "bg-primary/10 text-primary" : "bg-border text-foreground",
      )}
    >
      {grade}
    </span>
  );
}
