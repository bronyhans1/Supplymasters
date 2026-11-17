import { cn } from "@/lib/utils/cn";

function Bone({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-line/70 motion-reduce:animate-none",
        className,
      )}
    />
  );
}

export function TableSkeleton({
  columns = 6,
  rows = 6,
}: {
  columns?: number;
  rows?: number;
}) {
  return (
    <div
      className="overflow-hidden rounded-xl border border-line bg-white/70"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading table</span>
      <div className="border-b border-line bg-paper/80 px-4 py-3">
        <div className="flex gap-3">
          {Array.from({ length: columns }, (_, index) => (
            <Bone key={index} className="h-3 flex-1" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-line">
        {Array.from({ length: rows }, (_, row) => (
          <div key={row} className="flex gap-3 px-4 py-3.5">
            {Array.from({ length: columns }, (_, col) => (
              <Bone
                key={col}
                className={cn("h-3.5 flex-1", col === 0 ? "max-w-[7rem]" : "")}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function PageHeaderSkeleton({
  withEyebrow = false,
}: {
  withEyebrow?: boolean;
}) {
  return (
    <div className="space-y-3" aria-busy="true">
      {withEyebrow ? <Bone className="h-3 w-28" /> : null}
      <Bone className="h-8 w-48" />
      <Bone className="h-4 w-80 max-w-full" />
    </div>
  );
}

export function CardSkeleton({ lines = 4 }: { lines?: number }) {
  return (
    <div
      className="space-y-3 rounded-xl border border-line bg-white/70 p-5"
      aria-busy="true"
    >
      <Bone className="h-5 w-40" />
      {Array.from({ length: lines }, (_, index) => (
        <Bone key={index} className="h-3.5 w-full" />
      ))}
    </div>
  );
}

export function FilterPanelSkeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={cn(
        "h-36 animate-pulse rounded-xl border border-line bg-white/50 motion-reduce:animate-none sm:h-28",
        className,
      )}
      aria-busy="true"
    >
      <span className="sr-only">Loading filters</span>
    </div>
  );
}

export function MetricCardsSkeleton({
  count = 6,
  className = "grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 xl:grid-cols-3",
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={className} aria-busy="true">
      <span className="sr-only">Loading metrics</span>
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="space-y-3 rounded-xl border border-line bg-surface/90 px-4 py-4"
        >
          <Bone className="h-3 w-28" />
          <Bone className="h-6 w-24" />
          <Bone className="h-3 w-40 max-w-full" />
        </div>
      ))}
    </div>
  );
}

/** Shared layout for product/vendor/supplier/category-style detail pages. */
export function MasterRecordSkeleton({
  fieldCount = 6,
  showEditForm = true,
}: {
  fieldCount?: number;
  showEditForm?: boolean;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6" aria-busy="true">
      <div className="space-y-3">
        <Bone className="h-3 w-28" />
        <Bone className="h-8 w-56 max-w-full" />
        <Bone className="h-4 w-36" />
      </div>
      <div className="grid gap-4 rounded-xl border border-line bg-white/70 p-5 sm:grid-cols-2">
        {Array.from({ length: fieldCount }, (_, index) => (
          <div key={index} className="space-y-2">
            <Bone className="h-3 w-20" />
            <Bone className="h-4 w-32 max-w-full" />
          </div>
        ))}
      </div>
      {showEditForm ? <CardSkeleton lines={5} /> : null}
      <div className="h-20 animate-pulse rounded-xl border border-line bg-white/50 motion-reduce:animate-none" />
    </div>
  );
}

/** Shared layout for purchase/supply document detail pages. */
export function DocumentRecordSkeleton({
  lineColumns = 4,
}: {
  lineColumns?: number;
}) {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6" aria-busy="true">
      <div className="space-y-3">
        <Bone className="h-3 w-28" />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <Bone className="h-8 w-48" />
            <Bone className="h-4 w-40" />
          </div>
          <Bone className="h-7 w-20" />
        </div>
      </div>
      <div className="grid gap-4 rounded-xl border border-line bg-surface/90 p-5 sm:grid-cols-2">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="space-y-2">
            <Bone className="h-3 w-24" />
            <Bone className="h-4 w-36 max-w-full" />
          </div>
        ))}
      </div>
      <TableSkeleton columns={lineColumns} rows={5} />
      <CardSkeleton lines={3} />
    </div>
  );
}

/** Shared layout for receive/create operational forms. */
export function FormPageSkeleton({
  sections = 3,
}: {
  sections?: number;
}) {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6" aria-busy="true">
      <div className="space-y-3">
        <Bone className="h-3 w-28" />
        <Bone className="h-8 w-52" />
        <Bone className="h-4 w-96 max-w-full" />
      </div>
      <div className="space-y-4 rounded-xl border border-line bg-white/70 p-5 sm:p-6">
        {Array.from({ length: sections }, (_, section) => (
          <div key={section} className="space-y-3 border-b border-line/70 pb-4 last:border-0 last:pb-0">
            <Bone className="h-4 w-36" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Bone className="h-10 w-full" />
              <Bone className="h-10 w-full" />
            </div>
          </div>
        ))}
        <div className="flex flex-wrap gap-2 pt-2">
          <Bone className="h-10 w-36" />
          <Bone className="h-10 w-24" />
        </div>
      </div>
    </div>
  );
}
