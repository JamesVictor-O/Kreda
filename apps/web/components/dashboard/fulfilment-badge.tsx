import { cn } from "@/lib/cn";

export function FulfilmentBadge({ fulfilled }: { fulfilled: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
        fulfilled ? "bg-positive/10 text-positive" : "bg-danger/10 text-danger",
      )}
    >
      <span aria-hidden="true">{fulfilled ? "✓" : "✗"}</span>
      {fulfilled ? "Fulfilled" : "Unfulfilled"}
    </span>
  );
}
