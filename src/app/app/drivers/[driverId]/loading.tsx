import { PageHeaderSkeleton } from "@/components/ui/TableSkeleton";

export default function DriverDetailLoading() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <PageHeaderSkeleton />
      <div className="h-48 animate-pulse rounded-xl border border-line bg-white/50 motion-reduce:animate-none" />
      <div className="h-64 animate-pulse rounded-xl border border-line bg-white/50 motion-reduce:animate-none" />
    </div>
  );
}
