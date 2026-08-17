import { cn } from "@/lib/cn";

export function ProgressBar({
  fraction,
  label,
  className,
}: {
  fraction: number;
  label: string;
  className?: string;
}) {
  const pct = Math.min(100, Math.max(0, fraction * 100));

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn("h-1 w-full overflow-hidden rounded-full bg-border", className)}
    >
      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
    </div>
  );
}
