import { PaginationLink } from "@/components/ui/PaginationLink";

/**
 * Shared list pagination chrome. Uses client PaginationLink for pending feedback
 * while remaining safe to render from Server Components.
 */
export function ListPager({
  page,
  totalPages,
  total,
  shown,
  prevHref,
  nextHref,
  noun,
}: {
  page: number;
  totalPages: number;
  total: number;
  shown: number;
  prevHref?: string | null;
  nextHref?: string | null;
  /** Optional noun for "Showing N of M {noun}" — omit for generic count. */
  noun?: string;
}) {
  return (
    <div className="flex flex-col gap-3 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
      <p className="min-w-0 leading-5">
        Showing {shown} of {total}
        {noun
          ? ` ${noun}${total === 1 ? "" : "s"}`
          : ""}
        {totalPages > 1 ? ` · Page ${page} of ${totalPages}` : ""}
      </p>
      {totalPages > 1 ? (
        <div className="flex w-full gap-2 sm:w-auto">
          {prevHref ? (
            <PaginationLink href={prevHref} className="min-h-11 flex-1 sm:flex-none">
              Previous
            </PaginationLink>
          ) : null}
          {nextHref ? (
            <PaginationLink href={nextHref} className="min-h-11 flex-1 sm:flex-none">
              Next
            </PaginationLink>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
