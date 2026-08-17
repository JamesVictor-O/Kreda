import { cn } from "@/lib/cn";
import { gradeFromConfidence } from "@/lib/dashboard/grade";

export function GradeBadge({ confidenceBps }: { confidenceBps: number }) {
  const grade = gradeFromConfidence(confidenceBps);
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
