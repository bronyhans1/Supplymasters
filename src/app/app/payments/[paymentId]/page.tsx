import Link from "next/link";
import { notFound } from "next/navigation";
import { DeliveryStatusBadge } from "@/components/deliveries/DeliveryStatusBadge";
import { PaymentMethodBadge } from "@/components/payments/PaymentMethodBadge";
import {
  formatPaymentDate,
  formatPaymentDateTime,
} from "@/lib/payments/presentation";
import { getPayment } from "@/lib/payments/queries";
import { formatGhs } from "@/lib/supplies/money";
import { paymentStatusLabel } from "@/lib/supplies/presentation";
import { AppError } from "@/lib/utils/errors";

type Params = Promise<{ paymentId: string }>;

export default async function PaymentDetailPage({ params }: { params: Params }) {
  const { paymentId } = await params;

  let payment;
  try {
    payment = await getPayment(paymentId);
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 404) notFound();
    return (
      <div role="alert" className="text-sm text-accent">
        {error instanceof AppError ? error.message : "Unable to load that payment."}
      </div>
    );
  }

  return (
    <section className="mx-auto w-full max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/app/payments"
            className="text-sm font-medium text-accent underline-offset-2 hover:underline"
          >
            ← Back to payments
          </Link>
          <h1 className="mt-3 font-display text-3xl tracking-tight text-ink">
            {payment.payment_ref}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Payment date {formatPaymentDate(payment.payment_date)} · Recorded{" "}
            {formatPaymentDateTime(payment.created_at)}
          </p>
        </div>
        <PaymentMethodBadge method={payment.payment_method} />
      </div>

      <dl className="grid gap-4 rounded-xl border border-line bg-surface/90 p-5 sm:grid-cols-2">
        <Item label="Amount" value={formatGhs(Number(payment.amount))} />
        <Item label="Method" value={<PaymentMethodBadge method={payment.payment_method} />} />
        <Item
          label="Transaction reference"
          value={payment.transaction_reference ?? "—"}
        />
        <Item label="Payment date" value={formatPaymentDate(payment.payment_date)} />
        <Item label="Recorded at" value={formatPaymentDateTime(payment.created_at)} />
        <Item label="Recorded by" value={payment.recorded_by_name ?? "—"} />
        <Item label="Notes" value={payment.notes ?? "—"} />
      </dl>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-line bg-surface/90 p-5">
          <h2 className="font-display text-xl text-ink">Related supply</h2>
          {payment.supply ? (
            <dl className="mt-4 grid gap-3">
              <Item
                label="Supply"
                value={
                  <Link
                    href={`/app/supplies/${payment.supply.id}`}
                    className="font-medium text-accent underline-offset-2 hover:underline"
                  >
                    {payment.supply.supply_ref}
                  </Link>
                }
              />
              <Item
                label="Supply date"
                value={formatPaymentDate(payment.supply.supply_date)}
              />
              <Item
                label="Supply total"
                value={formatGhs(Number(payment.supply.grand_total))}
              />
              <Item
                label="Supply payment status"
                value={paymentStatusLabel(payment.supply.payment_status)}
              />
            </dl>
          ) : (
            <p className="mt-3 text-sm text-muted">Supply record unavailable.</p>
          )}
        </section>

        <section className="rounded-xl border border-line bg-surface/90 p-5">
          <h2 className="font-display text-xl text-ink">Vendor</h2>
          {payment.vendor ? (
            <dl className="mt-4 grid gap-3">
              <Item
                label="Business"
                value={
                  <Link
                    href={`/app/vendors/${payment.vendor.id}`}
                    className="font-medium text-accent underline-offset-2 hover:underline"
                  >
                    {payment.vendor.business_name}
                  </Link>
                }
              />
              <Item label="Vendor code" value={payment.vendor.vendor_code} />
              <Item label="Contact person" value={payment.vendor.contact_person} />
              <Item label="Phone" value={payment.vendor.phone} />
              <Item label="Location" value={payment.vendor.location} />
            </dl>
          ) : (
            <p className="mt-3 text-sm text-muted">Vendor details unavailable.</p>
          )}
        </section>
      </div>

      <section className="rounded-xl border border-line bg-surface/90 p-5">
        <h2 className="font-display text-xl text-ink">Supply items</h2>
        {payment.supply?.items && payment.supply.items.length > 0 ? (
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
                {payment.supply.items.map((item) => (
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

      <section className="rounded-xl border border-line bg-surface/90 p-5">
        <h2 className="font-display text-xl text-ink">Delivery</h2>
        {payment.delivery ? (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link
              href={`/app/deliveries/${payment.delivery.id}`}
              className="font-medium text-accent underline-offset-2 hover:underline"
            >
              {payment.delivery.delivery_ref}
            </Link>
            <DeliveryStatusBadge status={payment.delivery.status} />
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">
            No linked delivery was found for this payment’s supply.
          </p>
        )}
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
