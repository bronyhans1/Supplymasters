import { CardSkeleton } from "@/components/ui/TableSkeleton";

export default function AdminUserDetailLoading() {
  return (
    <section className="space-y-6" aria-busy="true">
      <div className="space-y-3">
        <div className="h-3 w-28 animate-pulse rounded-md bg-line/70 motion-reduce:animate-none" />
        <div className="h-7 w-56 max-w-full animate-pulse rounded-md bg-line/70 motion-reduce:animate-none" />
        <div className="h-4 w-48 animate-pulse rounded-md bg-line/70 motion-reduce:animate-none" />
      </div>
      <div className="grid gap-4 rounded-xl border border-line bg-surface/90 p-5 sm:grid-cols-2">
        {Array.from({ length: 7 }, (_, index) => (
          <div key={index} className="space-y-2">
            <div className="h-3 w-28 animate-pulse rounded-md bg-line/70 motion-reduce:animate-none" />
            <div className="h-4 w-36 max-w-full animate-pulse rounded-md bg-line/70 motion-reduce:animate-none" />
          </div>
        ))}
      </div>
      <CardSkeleton lines={6} />
    </section>
  );
}
