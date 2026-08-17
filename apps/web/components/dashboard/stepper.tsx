import { cn } from "@/lib/cn";
import { IconCheck } from "@/components/ui/icons";

const DEFAULT_STEPS = ["Select", "Review", "Underwrite", "Sign"];

export function Stepper({
  currentIndex,
  steps = DEFAULT_STEPS,
}: {
  currentIndex: number;
  steps?: string[];
}) {
  return (
    <nav aria-label="Progress">
      <ol className="flex items-center">
        {steps.map((label, index) => {
          const state = index < currentIndex ? "done" : index === currentIndex ? "current" : "upcoming";

          return (
            <li key={label} className={cn("flex items-center", index < steps.length - 1 && "flex-1")}>
              <span className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-xs font-semibold",
                    state === "done" && "bg-primary text-primary-foreground",
                    state === "current" && "border-2 border-primary text-primary",
                    state === "upcoming" && "border border-border text-muted-foreground",
                  )}
                >
                  {state === "done" ? <IconCheck className="h-3.5 w-3.5" /> : index + 1}
                </span>
                <span
                  aria-current={state === "current" ? "step" : undefined}
                  className={cn(
                    "hidden text-sm sm:block",
                    state === "upcoming" ? "text-muted-foreground" : "font-medium text-foreground",
                  )}
                >
                  {label}
                </span>
              </span>
              {index < steps.length - 1 && (
                <span aria-hidden="true" className="mx-3 h-px flex-1 bg-border sm:mx-4" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
