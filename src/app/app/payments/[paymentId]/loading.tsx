import { PageHeaderSkeleton } from "@/components/ui/TableSkeleton";

export default function PaymentDetailLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeaderSkeleton />
      <div className="h-48 animate-pulse rounded-xl border border-line bg-white/50 motion-reduce:animate-none" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-40 animate-pulse rounded-xl border border-line bg-white/50 motion-reduce:animate-none" />
        <div className="h-40 animate-pulse rounded-xl border border-line bg-white/50 motion-reduce:animate-none" />
      </div>
      <div className="h-56 animate-pulse rounded-xl border border-line bg-white/50 motion-reduce:animate-none" />
    </div>
  );
}
