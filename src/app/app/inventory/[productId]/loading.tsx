import {
  CardSkeleton,
  PageHeaderSkeleton,
  TableSkeleton,
} from "@/components/ui/TableSkeleton";

export default function InventoryDetailLoading() {
  return (
    <section className="mx-auto w-full max-w-5xl space-y-6" aria-busy="true">
      <div className="space-y-3">
        <div className="h-3 w-28 animate-pulse rounded-md bg-line/70 motion-reduce:animate-none" />
        <PageHeaderSkeleton />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="grid gap-4 rounded-xl border border-line bg-surface/90 p-5 sm:grid-cols-2">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="space-y-2">
              <div className="h-3 w-24 animate-pulse rounded-md bg-line/70 motion-reduce:animate-none" />
              <div className="h-4 w-32 max-w-full animate-pulse rounded-md bg-line/70 motion-reduce:animate-none" />
            </div>
          ))}
        </div>
        <CardSkeleton lines={5} />
      </div>
      <div className="space-y-3">
        <div className="space-y-2">
          <div className="h-5 w-48 animate-pulse rounded-md bg-line/70 motion-reduce:animate-none" />
          <div className="h-3 w-72 max-w-full animate-pulse rounded-md bg-line/70 motion-reduce:animate-none" />
        </div>
        <TableSkeleton columns={6} rows={6} />
      </div>
    </section>
  );
}
