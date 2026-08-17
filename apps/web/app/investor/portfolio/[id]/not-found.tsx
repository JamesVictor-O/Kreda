import { ButtonLink } from "@/components/ui/button";

export default function PositionNotFound() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col items-center px-4 py-24 text-center sm:px-6 lg:px-0">
      <h1 className="text-2xl font-semibold text-foreground">Position not found</h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        This position doesn&rsquo;t exist, or the link is out of date.
      </p>
      <ButtonLink href="/investor/portfolio" size="sm" className="mt-6">
        Back to portfolio
      </ButtonLink>
    </div>
  );
}
