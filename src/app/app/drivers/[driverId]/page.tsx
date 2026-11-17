import Link from "next/link";
import { notFound } from "next/navigation";
import { ActiveBadge } from "@/components/admin/UserStatusBadge";
import { DriverStatusControl } from "@/components/master-data/EntityStatusControls";
import { EditDriverForm } from "@/components/master-data/DriverForms";
import { requireAdmin } from "@/lib/auth/session";
import { getDriver } from "@/lib/master-data/drivers/queries";
import { AppError } from "@/lib/utils/errors";

type Params = Promise<{ driverId: string }>;

export default async function DriverDetailPage({ params }: { params: Params }) {
  await requireAdmin();
  const { driverId } = await params;
  let driver;
  try {
    driver = await getDriver(driverId);
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 404) notFound();
    return (
      <div role="alert" className="text-sm text-accent">
        {error instanceof AppError ? error.message : "Unable to load driver."}
      </div>
    );
  }

  return (
    <section className="mx-auto w-full max-w-3xl space-y-6">
      <div>
        <Link href="/app/drivers" className="text-sm font-medium text-accent hover:underline">
          ← Back to drivers
        </Link>
        <h1 className="mt-3 font-display text-3xl tracking-tight text-ink">
          {driver.full_name}
        </h1>
        <p className="mt-1 text-sm text-muted">{driver.driver_code}</p>
      </div>

      <dl className="grid gap-4 rounded-xl border border-line bg-white/70 p-5 sm:grid-cols-2">
        <Item label="Driver code" value={driver.driver_code} />
        <Item label="Phone number" value={driver.phone ?? "—"} />
        <Item label="Status" value={<ActiveBadge active={driver.is_active} />} />
        <Item label="Created" value={formatTimestamp(driver.created_at)} />
        <Item label="Updated" value={formatTimestamp(driver.updated_at)} />
        <Item label="Notes" value={driver.notes ?? "—"} />
      </dl>

      <EditDriverForm driver={driver} />
      <div className="rounded-xl border border-line bg-white/70 p-5">
        <DriverStatusControl id={driver.id} isActive={driver.is_active} />
      </div>
    </section>
  );
}

function Item({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 text-sm text-ink">{value}</dd>
    </div>
  );
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
