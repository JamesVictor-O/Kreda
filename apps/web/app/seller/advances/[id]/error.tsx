"use client";

import { Button, ButtonLink } from "@/components/ui/button";

/// A receivable not in fixtures triggers a live fetch against the agent
/// service (see lib/agent-api-map.ts's getRealAdvancePreview) — a network
/// hiccup there shouldn't crash the whole page.
export default function AdvanceError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-4xl flex-col items-center px-4 py-24 text-center sm:px-6 lg:px-0">
      <h1 className="text-2xl font-semibold text-foreground">Couldn&rsquo;t load this receivable</h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        The request to the agent service failed — could be a network hiccup. Try again.
      </p>
      <div className="mt-6 flex gap-3">
        <Button type="button" size="sm" onClick={() => reset()}>
          Try again
        </Button>
        <ButtonLink href="/seller" variant="ghost" size="sm">
          Back to dashboard
        </ButtonLink>
      </div>
    </div>
  );
}
