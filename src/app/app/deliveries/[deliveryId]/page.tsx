import Link from "next/link";
import { notFound } from "next/navigation";
import { AssignmentHistory } from "@/components/deliveries/AssignmentHistory";
import { DeliveryStatusBadge } from "@/components/deliveries/DeliveryStatusBadge";
import { DeliveryTimeline } from "@/components/deliveries/DeliveryTimeline";
import { UpdateStatusForm } from "@/components/deliveries/UpdateStatusForm";
import { requireStaffOrAdmin } from "@/lib/auth/session";
import { formatGhs } from "@/lib/supplies/money";
import {
  formatDeliveryDate,
  formatDeliveryDateTime,
} from "@/lib/deliveries/presentation";
import {
  getDelivery,
  listDeliveryAssignmentHistory,
  type DeliveryAssignmentHistoryEntry,
} from "@/lib/deliveries/queries";
import { canRecordReturnForDeliveryStatus } from "@/lib/returns/authorization";
import {
  formatReturnDateTime,
  formatReturnDisplayId,
} from "@/lib/returns/presentation";
import { listReturnsForDelivery } from "@/lib/returns/queries";
import { AppError } from "@/lib/utils/errors";

type Params = Promise<{ deliveryId: string }>;

export default async function DeliveryDetailPage({ params }: { params: Params }) {
  const { profile } = await requireStaffOrAdmin();
  const isAdmin = profile.role === "ADMIN";
  const { deliveryId } = await params;

  let delivery;
  try {
    delivery = await getDelivery(deliveryId);
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 404) notFound();
    return (
      <div role="alert" className="text-sm text-accent">
        {error instanceof AppError ? error.message : "Unable to load that delivery."}
      </div>
    );
  }

  const deliveryReturns = await listReturnsForDelivery(deliveryId).catch(() => []);

  let assignmentHistory: DeliveryAssignmentHistoryEntry[] = [];
  if (isAdmin) {
    assignmentHistory = await listDeliveryAssignmentHistory(deliveryId).catch(
      () => [],
    );
  }

  return (
    <section className="mx-auto w-full max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/app/deliveries"
            className="text-sm font-medium text-accent underline-offset-2 hover:underline"
          >
            ← Back to deliveries
          </Link>
          <h1 className="mt-3 font-display text-3xl tracking-tight text-ink">
            {delivery.delivery_ref}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Delivery date {formatDeliveryDate(delivery.delivery_date)} · Updated{" "}
            {formatDeliveryDateTime(delivery.updated_at)}
          </p>
        </div>
        <DeliveryStatusBadge status={delivery.status} />
      </div>

      <dl className="grid gap-4 rounded-xl border border-line bg-surface/90 p-5 sm:grid-cols-2">
        <Item label="Status" value={<DeliveryStatusBadge status={delivery.status} />} />
        <Item label="Created" value={formatDeliveryDateTime(delivery.created_at)} />
        <Item
          label="Dispatched"
          value={formatDeliveryDateTime(delivery.dispatched_at)}
        />
        <Item
          label="Completed"
          value={formatDeliveryDateTime(delivery.completed_at)}
        />
        <Item label="Vendor location" value={delivery.vendor_location} />
        <Item label="Notes" value={delivery.notes ?? "—"} />
      </dl>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-line bg-surface/90 p-5">
          <h2 className="font-display text-xl text-ink">Related supply</h2>
          {delivery.supply ? (
            <dl className="mt-4 grid gap-3">
              <Item
                label="Supply"
                value={
                  <Link
                    href={`/app/supplies/${delivery.supply.id}`}
                    className="font-medium text-accent underline-offset-2 hover:underline"
                  >
                    {delivery.supply.supply_ref}
                  </Link>
                }
              />
              <Item
                label="Supply date"
                value={formatDeliveryDate(delivery.supply.supply_date)}
              />
            </dl>
          ) : (
            <p className="mt-3 text-sm text-muted">Supply record unavailable.</p>
          )}
        </section>

        <section className="rounded-xl border border-line bg-surface/90 p-5">
          <h2 className="font-display text-xl text-ink">Vendor</h2>
          {delivery.supply?.vendor ? (
            <dl className="mt-4 grid gap-3">
              <Item
                label="Business"
                value={
                  <Link
                    href={`/app/vendors/${delivery.supply.vendor.id}`}
                    className="font-medium text-accent underline-offset-2 hover:underline"
                  >
                    {delivery.supply.vendor.business_name}
                  </Link>
                }
              />
              <Item label="Vendor code" value={delivery.supply.vendor.vendor_code} />
              <Item
                label="Contact person"
                value={delivery.supply.vendor.contact_person}
              />
              <Item label="Phone" value={delivery.supply.vendor.phone} />
              <Item label="Location" value={delivery.supply.vendor.location} />
            </dl>
          ) : (
            <p className="mt-3 text-sm text-muted">Vendor details unavailable.</p>
          )}
        </section>
      </div>

      <section className="rounded-xl border border-line bg-surface/90 p-5">
        <h2 className="font-display text-xl text-ink">Supply items</h2>
        {delivery.supply?.items && delivery.supply.items.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-line bg-paper/80 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Product</th>
                  <th className="px-3 py-2 font-medium">Qty</th>
                  <th className="px-3 py-2 font-medium">Unit price</th>
                  <th className="px-3 py-2 font-medium">Line total</th>
                </tr>
              </thead>
              <tbody>
                {delivery.supply.items.map((item) => (
                  <tr key={item.id} className="border-b border-line/70 last:border-0">
                    <td className="px-3 py-2">
                      <div className="font-medium text-ink">
                        {item.product?.name ?? "Product"}
                      </div>
                      <div className="text-xs text-muted">
                        {item.product?.product_code}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-muted">{item.quantity}</td>
                    <td className="px-3 py-2 text-muted">
                      {formatGhs(Number(item.unit_price))}
                    </td>
                    <td className="px-3 py-2 font-medium">
                      {formatGhs(Number(item.line_total))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">No supply items available.</p>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-line bg-surface/90 p-5">
          <h2 className="font-display text-xl text-ink">Responsible staff</h2>
          <dl className="mt-4 grid gap-3">
            <Item
              label="Name"
              value={delivery.responsible_staff?.full_name ?? "—"}
            />
            <Item label="Role" value={delivery.responsible_staff?.role ?? "—"} />
            <Item label="Email" value={delivery.responsible_staff?.email ?? "—"} />
          </dl>
        </section>

        <section className="rounded-xl border border-line bg-surface/90 p-5">
          <h2 className="font-display text-xl text-ink">Assigned driver</h2>
          {delivery.driver ? (
            <dl className="mt-4 grid gap-3">
              <Item
                label="Driver"
                value={
                  <Link
                    href={`/app/drivers/${delivery.driver.id}`}
                    className="font-medium text-accent underline-offset-2 hover:underline"
                  >
                    {delivery.driver.driver_code}
                  </Link>
                }
              />
              <Item label="Name" value={delivery.driver.full_name} />
              <Item label="Phone" value={delivery.driver.phone ?? "—"} />
            </dl>
          ) : (
            <p className="mt-3 text-sm text-muted">
              No driver assigned. Deliveries can proceed without a driver.
            </p>
          )}
        </section>
      </div>

      <section className="rounded-xl border border-line bg-surface/90 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl text-ink">Stock returns</h2>
            <p className="mt-1 text-sm text-muted">
              Failed or cancelled deliveries do not restore stock automatically. Record
              an explicit return when products are physically returned.
            </p>
          </div>
          {canRecordReturnForDeliveryStatus(delivery.status) ? (
            <Link
              href={`/app/returns/new?deliveryId=${delivery.id}`}
              className="inline-flex items-center justify-center rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-paper transition hover:bg-ink/90"
            >
              Record return
            </Link>
          ) : null}
        </div>

        {deliveryReturns.length === 0 ? (
          <p className="mt-4 text-sm text-muted">
            No stock returns have been recorded for this delivery.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {deliveryReturns.map((stockReturn) => (
              <div
                key={stockReturn.id}
                className="rounded-lg border border-line bg-paper/60 px-4 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link
                    href={`/app/returns/${stockReturn.id}`}
                    className="font-medium text-accent underline-offset-2 hover:underline"
                  >
                    {formatReturnDisplayId(stockReturn.return_ref, stockReturn.id)}
                  </Link>
                  <span className="text-xs text-muted">
                    {formatReturnDateTime(stockReturn.created_at)}
                  </span>
                </div>
                <ul className="mt-2 space-y-1 text-sm text-muted">
                  {stockReturn.items.map((item) => (
                    <li key={`${stockReturn.id}-${item.product_id}`}>
                      {item.product_code ?? "Product"} · {item.product_name ?? "—"} · qty{" "}
                      {item.quantity}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <UpdateStatusForm deliveryId={delivery.id} currentStatus={delivery.status} />

      {isAdmin ? (
        <section className="space-y-3">
          <div>
            <h2 className="font-display text-xl text-ink">Assignment history</h2>
            <p className="mt-1 text-sm text-muted">
              Read-only record of driver and responsible staff changes. Edit
              assignments from Dispatch.
            </p>
          </div>
          <AssignmentHistory events={assignmentHistory} />
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="font-display text-xl text-ink">Status history</h2>
        <DeliveryTimeline history={delivery.history} />
      </section>
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
