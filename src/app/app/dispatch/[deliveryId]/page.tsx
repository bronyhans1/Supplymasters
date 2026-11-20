import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmDispatchForm } from "@/components/deliveries/ConfirmDispatchForm";
import { DeliveryStatusBadge } from "@/components/deliveries/DeliveryStatusBadge";
import { requireAdmin } from "@/lib/auth/session";
import {
  formatDeliveryDate,
  formatDeliveryDateTime,
} from "@/lib/deliveries/presentation";
import { getDeliveryForAssignment } from "@/lib/deliveries/queries";
import { AppError } from "@/lib/utils/errors";

type Params = Promise<{ deliveryId: string }>;

export default async function DispatchDetailPage({
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
            Dispatch {delivery.delivery_ref}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Delivery date {formatDeliveryDate(delivery.delivery_date)}. Confirming
            dispatch does not mark goods as delivered.
          </p>
        </div>
        <DeliveryStatusBadge status={delivery.status} />
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
          label="Related records"
          value={
            <span className="flex flex-wrap gap-3">
              <Link
                href={`/app/deliveries/${delivery.id}`}
                className="font-medium text-accent underline-offset-2 hover:underline"
              >
                Delivery detail
              </Link>
              <Link
                href={`/app/assignments/${delivery.id}`}
                className="font-medium text-accent underline-offset-2 hover:underline"
              >
                Assignments
              </Link>
            </span>
          }
        />
      </dl>

      <ConfirmDispatchForm
        deliveryId={delivery.id}
        currentStatus={delivery.status}
      />
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
