import {
  MetricCardsSkeleton,
  PageHeaderSkeleton,
} from "@/components/ui/TableSkeleton";

export default function StaffDashboardLoading() {
  return (
    <section className="mx-auto w-full max-w-5xl space-y-6" aria-busy="true">
      <PageHeaderSkeleton withEyebrow />
      <MetricCardsSkeleton count={6} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 7 }, (_, index) => (
          <div
            key={index}
            className="flex items-center gap-3 rounded-xl border border-line bg-white/70 p-5"
          >
            <div className="size-10 shrink-0 animate-pulse rounded-md bg-line/70 motion-reduce:animate-none" />
            <div className="h-4 w-24 animate-pulse rounded-md bg-line/70 motion-reduce:animate-none" />
          </div>
        ))}
      </div>
    </section>
  );
}
