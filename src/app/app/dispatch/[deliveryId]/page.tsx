import Link from "next/link";
import { notFound } from "next/navigation";
import { AssignDriverForm } from "@/components/deliveries/AssignDriverForm";
import { AssignStaffForm } from "@/components/deliveries/AssignStaffForm";
import { AssignmentStateBadge } from "@/components/deliveries/AssignmentStateBadge";
import { DeliveryStatusBadge } from "@/components/deliveries/DeliveryStatusBadge";
import { requireAdmin } from "@/lib/auth/session";
import {
  formatDeliveryDate,
  formatDeliveryDateTime,
} from "@/lib/deliveries/presentation";
import {
  canAssignOrClearDeliveryDriver,
  canReassignResponsibleStaff,
} from "@/lib/deliveries/transitions";
import {
  getDeliveryForAssignment,
  listActiveDriversForAssignment,
  listEligibleStaffForAssignment,
} from "@/lib/deliveries/queries";
import { AppError } from "@/lib/utils/errors";

type Params = Promise<{ deliveryId: string }>;

export default async function DispatchAssignmentPage({
  params,
}: {
  params: Params;
}) {
  await requireAdmin();
  const { deliveryId } = await params;

  let delivery;
  try {
    delivery = await getDeliveryForAssignment(deliveryId);
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 404) notFound();
    return (
      <div role="alert" className="text-sm text-accent">
        {error instanceof AppError ? error.message : "Unable to load that delivery."}
      </div>
    );
  }

  const showDriverAssign = canAssignOrClearDeliveryDriver(delivery.status);
  const showStaffAssign = canReassignResponsibleStaff(delivery.status);

  const [drivers, staffOptions] = await Promise.all([
    showDriverAssign ? listActiveDriversForAssignment() : Promise.resolve([]),
    showStaffAssign ? listEligibleStaffForAssignment() : Promise.resolve([]),
  ]);

  const driverOptions =
    delivery.driver && !drivers.some((driver) => driver.id === delivery.driver?.id)
      ? [delivery.driver, ...drivers]
      : drivers;

  const staffChoices =
    delivery.responsible_staff &&
    !staffOptions.some((staff) => staff.id === delivery.responsible_staff?.id)
      ? [delivery.responsible_staff, ...staffOptions]
      : staffOptions.length > 0
        ? staffOptions
        : delivery.responsible_staff
          ? [delivery.responsible_staff]
          : [];

  return (
    <section className="mx-auto w-full max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/app/dispatch"
            className="text-sm font-medium text-accent underline-offset-2 hover:underline"
          >
            ← Back to dispatch
          </Link>
          <h1 className="mt-3 font-display text-3xl tracking-tight text-ink">
            Assign {delivery.delivery_ref}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Delivery date {formatDeliveryDate(delivery.delivery_date)} · Status stays
            unchanged when you assign staff or drivers.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DeliveryStatusBadge status={delivery.status} />
          <AssignmentStateBadge
            status={delivery.status}
            driverId={delivery.driver_id}
          />
        </div>
      </div>

      <dl className="grid gap-4 rounded-xl border border-line bg-surface/90 p-5 sm:grid-cols-2">
        <Item
          label="Vendor"
          value={delivery.supply?.vendor?.business_name ?? "—"}
        />
        <Item
          label="Location"
          value={
            delivery.supply?.vendor?.location ?? delivery.vendor_location ?? "—"
          }
        />
        <Item
          label="Responsible staff"
          value={delivery.responsible_staff?.full_name ?? "—"}
        />
        <Item
          label="Driver"
          value={
            delivery.driver
              ? `${delivery.driver.driver_code} · ${delivery.driver.full_name}`
              : "Unassigned"
          }
        />
        <Item label="Updated" value={formatDeliveryDateTime(delivery.updated_at)} />
        <Item
          label="Delivery record"
          value={
            <Link
              href={`/app/deliveries/${delivery.id}`}
              className="font-medium text-accent underline-offset-2 hover:underline"
            >
              Open delivery detail
            </Link>
          }
        />
      </dl>

      {showStaffAssign && staffChoices.length > 0 ? (
        <AssignStaffForm
          deliveryId={delivery.id}
          currentStatus={delivery.status}
          currentStaffId={delivery.responsible_staff_id}
          staffOptions={staffChoices}
        />
      ) : (
        <p className="rounded-xl border border-dashed border-line px-4 py-3 text-sm text-muted">
          Responsible staff cannot be changed while this delivery is terminal.
        </p>
      )}

      {showDriverAssign ? (
        <AssignDriverForm
          deliveryId={delivery.id}
          currentStatus={delivery.status}
          currentDriverId={delivery.driver_id}
          drivers={driverOptions}
        />
      ) : (
        <p className="rounded-xl border border-dashed border-line px-4 py-3 text-sm text-muted">
          Driver can only be set or cleared while the delivery is PENDING or DISPATCHED.
        </p>
      )}
    </section>
  );
}

function Item({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-ink">{value}</dd>
    </div>
  );
}
