import { cn } from "@/lib/cn";
import { IconArrowUp } from "@/components/ui/icons";

export function DeltaPill({ value }: { value: number }) {
  const positive = value >= 0;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium",
        positive ? "bg-positive/10 text-positive" : "bg-danger/10 text-danger",
      )}
    >
      <IconArrowUp className={cn("h-3 w-3", !positive && "rotate-180")} aria-hidden="true" />
      <span className="sr-only">{positive ? "Up " : "Down "}</span>
      {Math.abs(value).toFixed(0)}%
    </span>
  );
}
