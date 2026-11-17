import { CardSkeleton, PageHeaderSkeleton } from "@/components/ui/TableSkeleton";

export default function DriverDashboardLoading() {
  return (
    <section className="mx-auto w-full max-w-3xl space-y-6" aria-busy="true">
      <PageHeaderSkeleton withEyebrow />
      <CardSkeleton lines={4} />
    </section>
  );
}
