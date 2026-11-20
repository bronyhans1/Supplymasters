import Link from "next/link";
import { notFound } from "next/navigation";
import { DeliveryStatusBadge } from "@/components/deliveries/DeliveryStatusBadge";
import { PrintSupplyButton } from "@/components/supplies/PrintSupplyButton";
import { getDeliveryForSupply } from "@/lib/deliveries/queries";
import { formatGhs } from "@/lib/supplies/money";
import {
  paymentMethodLabel,
  paymentStatusLabel,
} from "@/lib/supplies/presentation";
import { getSupply } from "@/lib/supplies/queries";
import { AppError } from "@/lib/utils/errors";
import { cn } from "@/lib/utils/cn";

type Params = Promise<{ supplyId: string }>;

function formatDate(value: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(
      new Date(`${value}T00:00:00Z`),
    );
  } catch {
    return value;
  }
}

function formatDateTime(value: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default async function SupplyDetailPage({ params }: { params: Params }) {
  const { supplyId } = await params;
  let supply;
  try {
    supply = await getSupply(supplyId);
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 404) notFound();
    return (
      <div role="alert" className="text-sm text-accent">
        {error instanceof AppError ? error.message : "Unable to load that supply."}
      </div>
    );
  }

  let linkedDelivery = null;
  try {
    linkedDelivery = await getDeliveryForSupply(supplyId);
  } catch {
    linkedDelivery = null;
  }

  return (
    <section className="mx-auto w-full max-w-5xl space-y-6 print:max-w-none">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/app/supplies"
            className="text-sm font-medium text-accent underline-offset-2 hover:underline print:hidden"
          >
            ← Back to supplies
          </Link>
          <h1 className="mt-3 font-display text-3xl tracking-tight text-ink">
            {supply.supply_ref}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Supply date {formatDate(supply.supply_date)} · Recorded{" "}
            {formatDateTime(supply.created_at)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex rounded-md px-2.5 py-1 text-xs font-medium",
              supply.payment_status === "PAID"
                ? "bg-good/10 text-good"
                : "bg-accent/10 text-accent",
            )}
          >
            {paymentStatusLabel(supply.payment_status)}
          </span>
          <PrintSupplyButton />
        </div>
      </div>

      <dl className="grid gap-4 rounded-xl border border-line bg-surface/90 p-5 sm:grid-cols-2">
        <Item label="Vendor" value={supply.vendor?.business_name ?? "—"} />
        <Item label="Vendor code" value={supply.vendor?.vendor_code ?? "—"} />
        <Item
          label="Contact person"
          value={supply.vendor?.contact_person ?? "—"}
        />
        <Item label="Phone" value={supply.vendor?.phone ?? "—"} />
        <Item label="Location" value={supply.vendor?.location ?? "—"} />
        <Item label="Recorded by" value={supply.recorded_by_name ?? "—"} />
        <Item
          label="Grand total"
          value={formatGhs(Number(supply.grand_total))}
        />
        <Item label="Notes" value={supply.notes ?? "—"} />
      </dl>

      <div className="overflow-x-auto rounded-xl border border-line bg-surface/90">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-line bg-paper/80 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">Quantity</th>
              <th className="px-4 py-3 font-medium">Unit price</th>
              <th className="px-4 py-3 font-medium">Line total</th>
            </tr>
          </thead>
          <tbody>
            {supply.items.map((item) => (
              <tr key={item.id} className="border-b border-line/70 last:border-0">
                <td className="px-4 py-3">
                  <div className="font-medium text-ink">
                    {item.product?.name ?? "Product"}
                  </div>
                  <div className="text-xs text-muted">
                    {item.product?.product_code} · UoM{" "}
                    {item.product?.unit_of_measure} · Pack{" "}
                    {item.product?.packaging_size}
                  </div>
                </td>
                <td className="px-4 py-3 text-muted">{item.quantity}</td>
                <td className="px-4 py-3 text-muted">
                  {formatGhs(Number(item.unit_price))}
                </td>
                <td className="px-4 py-3 font-medium">
                  {formatGhs(Number(item.line_total))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-line bg-surface/90 p-5">
        <h2 className="font-display text-xl tracking-tight text-ink">Delivery</h2>
        {linkedDelivery ? (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link
              href={`/app/deliveries/${linkedDelivery.id}`}
              className="font-medium text-accent underline-offset-2 hover:underline"
            >
              {linkedDelivery.delivery_ref}
            </Link>
            <DeliveryStatusBadge status={linkedDelivery.status} />
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">
            No linked delivery was found for this supply.
          </p>
        )}
      </div>

      <div className="rounded-xl border border-line bg-surface/90 p-5">
        <h2 className="font-display text-xl tracking-tight text-ink">Payment</h2>
        {supply.payment ? (
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <Item
              label="Payment reference"
              value={
                <Link
                  href={`/app/payments/${supply.payment.id}`}
                  className="font-medium text-accent underline-offset-2 hover:underline"
                >
                  {supply.payment.payment_ref}
                </Link>
              }
            />
            <Item
              label="Method"
              value={paymentMethodLabel(supply.payment.payment_method)}
            />
            <Item
              label="Amount"
              value={formatGhs(Number(supply.payment.amount))}
            />
            <Item
              label="Payment date"
              value={formatDate(supply.payment.payment_date)}
            />
            <Item
              label="Transaction reference"
              value={supply.payment.transaction_reference ?? "—"}
            />
          </dl>
        ) : supply.payment_status === "UNPAID" ? (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-muted">
              Payment is pending ({formatGhs(Number(supply.grand_total))} due).
              Record it separately in Payments — independent of dispatch and
              delivery.
            </p>
            <Link
              href={`/app/payments/record/${supply.id}`}
              className="inline-flex text-sm font-medium text-accent underline-offset-2 hover:underline print:hidden"
            >
              Record payment
            </Link>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">No payment record found.</p>
        )}
      </div>
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
