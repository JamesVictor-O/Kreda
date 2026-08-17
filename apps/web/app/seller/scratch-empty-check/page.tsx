import { EmptyState } from "@/components/dashboard/empty-state";
import { ButtonLink } from "@/components/ui/button";

export default function ScratchEmptyCheck() {
  return (
    <div className="mx-auto max-w-md px-6">
      <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-foreground">Active advances</h2>
        <div className="mt-6">
          <EmptyState
            title="No active advances"
            description="Fund a receivable and it will show up here with its settlement countdown."
            action={
              <ButtonLink href="/seller/new-advance" size="sm">
                New advance
              </ButtonLink>
            }
          />
        </div>
      </div>
    </div>
  );
}
