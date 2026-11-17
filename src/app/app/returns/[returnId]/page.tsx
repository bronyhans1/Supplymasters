import Link from "next/link";
import { notFound } from "next/navigation";
import { DeliveryStatusBadge } from "@/components/deliveries/DeliveryStatusBadge";
import {
  formatSignedQuantity,
  stockMovementLabel,
} from "@/lib/inventory/presentation";
import {
  formatReturnDateTime,
  formatReturnDisplayId,
} from "@/lib/returns/presentation";
import { getReturn } from "@/lib/returns/queries";
import { AppError } from "@/lib/utils/errors";

type Params = Promise<{ returnId: string }>;

export default async function ReturnDetailPage({ params }: { params: Params }) {
  const { returnId } = await params;

  let stockReturn;
  try {
    stockReturn = await getReturn(returnId);
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 404) notFound();
    return (
      <div role="alert" className="text-sm text-accent">
        {error instanceof AppError ? error.message : "Unable to load that return."}
      </div>
    );
  }

  return (
    <section className="mx-auto w-full max-w-5xl space-y-6">
      <div>
        <Link
          href="/app/returns"
          className="text-sm font-medium text-accent underline-offset-2 hover:underline"
        >
          ← Back to returns
        </Link>
          <h1 className="mt-3 font-display text-3xl tracking-tight text-ink">
            {formatReturnDisplayId(stockReturn.return_ref, stockReturn.id)}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Recorded {formatReturnDateTime(stockReturn.created_at)}
          </p>
        </div>

      <dl className="grid gap-4 rounded-xl border border-line bg-surface/90 p-5 sm:grid-cols-2">
        <Item
          label="Return reference"
          value={formatReturnDisplayId(stockReturn.return_ref, stockReturn.id)}
        />
        <Item label="Record ID" value={stockReturn.id} />
        <Item
          label="Recorded by"
          value={stockReturn.returned_by_name ?? "—"}
        />
        <Item
          label="Created"
          value={formatReturnDateTime(stockReturn.created_at)}
        />
        <Item label="Notes" value={stockReturn.notes ?? "—"} />
      </dl>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-line bg-surface/90 p-5">
          <h2 className="font-display text-xl text-ink">Related delivery</h2>
          {stockReturn.delivery ? (
            <dl className="mt-4 grid gap-3">
              <Item
                label="Delivery"
                value={
                  <Link
                    href={`/app/deliveries/${stockReturn.delivery.id}`}
                    className="font-medium text-accent underline-offset-2 hover:underline"
                  >
                    {stockReturn.delivery.delivery_ref}
                  </Link>
                }
              />
              <Item
                label="Status"
                value={<DeliveryStatusBadge status={stockReturn.delivery.status} />}
              />
              <Item
                label="Responsible staff"
                value={
                  stockReturn.delivery.responsible_staff?.full_name ?? "—"
                }
              />
              <Item
                label="Driver"
                value={
                  stockReturn.delivery.driver
                    ? `${stockReturn.delivery.driver.driver_code} · ${stockReturn.delivery.driver.full_name}`
                    : "Unassigned"
                }
              />
            </dl>
          ) : (
            <p className="mt-3 text-sm text-muted">Delivery record unavailable.</p>
          )}
        </section>

        <section className="rounded-xl border border-line bg-surface/90 p-5">
          <h2 className="font-display text-xl text-ink">Vendor</h2>
          {stockReturn.delivery?.supply?.vendor ? (
            <dl className="mt-4 grid gap-3">
              <Item
                label="Business"
                value={
                  <Link
                    href={`/app/vendors/${stockReturn.delivery.supply.vendor.id}`}
                    className="font-medium text-accent underline-offset-2 hover:underline"
                  >
                    {stockReturn.delivery.supply.vendor.business_name}
                  </Link>
                }
              />
              <Item
                label="Vendor code"
                value={stockReturn.delivery.supply.vendor.vendor_code}
              />
              <Item
                label="Contact person"
                value={stockReturn.delivery.supply.vendor.contact_person}
              />
              <Item
                label="Phone"
                value={stockReturn.delivery.supply.vendor.phone}
              />
            </dl>
          ) : (
            <p className="mt-3 text-sm text-muted">Vendor details unavailable.</p>
          )}
        </section>
      </div>

      <section className="rounded-xl border border-line bg-surface/90 p-5">
        <h2 className="font-display text-xl text-ink">Related supply</h2>
        {stockReturn.delivery?.supply ? (
          <>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <Item
                label="Supply"
                value={
                  <Link
                    href={`/app/supplies/${stockReturn.delivery.supply.id}`}
                    className="font-medium text-accent underline-offset-2 hover:underline"
                  >
                    {stockReturn.delivery.supply.supply_ref}
                  </Link>
                }
              />
              <Item
                label="Supply date"
                value={stockReturn.delivery.supply.supply_date}
              />
            </dl>
            {stockReturn.supply_items.length > 0 ? (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-line bg-paper/80 text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-3 py-2 font-medium">Product</th>
                      <th className="px-3 py-2 font-medium">Original qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockReturn.supply_items.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-line/70 last:border-0"
                      >
                        <td className="px-3 py-2">
                          <div className="font-medium text-ink">
                            {item.product?.name ?? "Product"}
                          </div>
                          <div className="text-xs text-muted">
                            {item.product?.product_code}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-muted">{item.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </>
        ) : (
          <p className="mt-3 text-sm text-muted">Supply record unavailable.</p>
        )}
      </section>

      <section className="rounded-xl border border-line bg-surface/90 p-5">
        <h2 className="font-display text-xl text-ink">Returned items</h2>
        {stockReturn.items.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-line bg-paper/80 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Product</th>
                  <th className="px-3 py-2 font-medium">Code</th>
                  <th className="px-3 py-2 font-medium">Quantity returned</th>
                </tr>
              </thead>
              <tbody>
                {stockReturn.items.map((item) => (
                  <tr key={item.id} className="border-b border-line/70 last:border-0">
                    <td className="px-3 py-2 font-medium">
                      {item.product?.name ?? "Product"}
                    </td>
                    <td className="px-3 py-2 text-muted">
                      {item.product?.product_code ?? "—"}
                    </td>
                    <td className="px-3 py-2 font-medium">{item.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">No returned items found.</p>
        )}
      </section>

      <section className="rounded-xl border border-line bg-surface/90 p-5">
        <h2 className="font-display text-xl text-ink">Inventory restoration</h2>
        <p className="mt-1 text-sm text-muted">
          Stock movements linked to this return via{" "}
          <span className="font-medium text-ink">delivery_stock_returns</span>.
        </p>
        {stockReturn.stock_movements.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-line bg-paper/80 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Delta</th>
                  <th className="px-3 py-2 font-medium">Before</th>
                  <th className="px-3 py-2 font-medium">After</th>
                  <th className="px-3 py-2 font-medium">Product</th>
                  <th className="px-3 py-2 font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {stockReturn.stock_movements.map((movement) => {
                  const matchedItem = stockReturn.items.find(
                    (item) => item.product_id === movement.product_id,
                  );
                  return (
                    <tr
                      key={movement.id}
                      className="border-b border-line/70 last:border-0"
                    >
                      <td className="px-3 py-2">
                        {stockMovementLabel(movement.movement_type)}
                      </td>
                      <td className="px-3 py-2 font-medium text-good">
                        {formatSignedQuantity(movement.quantity_delta)}
                      </td>
                      <td className="px-3 py-2 text-muted">
                        {movement.quantity_before}
                      </td>
                      <td className="px-3 py-2 text-muted">
                        {movement.quantity_after}
                      </td>
                      <td className="px-3 py-2">
                        {matchedItem?.product ? (
                          <Link
                            href={`/app/inventory/${movement.product_id}`}
                            className="font-medium text-accent underline-offset-2 hover:underline"
                          >
                            {matchedItem.product.product_code}
                          </Link>
                        ) : (
                          <Link
                            href={`/app/inventory/${movement.product_id}`}
                            className="font-medium text-accent underline-offset-2 hover:underline"
                          >
                            View product
                          </Link>
                        )}
                      </td>
                      <td className="px-3 py-2 text-muted">
                        {formatReturnDateTime(movement.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">
            No linked stock movements were found for this return.
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
