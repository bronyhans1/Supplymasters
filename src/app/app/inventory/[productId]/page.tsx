import Link from "next/link";
import { notFound } from "next/navigation";
import { ActiveBadge } from "@/components/admin/UserStatusBadge";
import { AdjustInventoryForm } from "@/components/inventory/AdjustInventoryForm";
import { PaginationLink } from "@/components/ui/PaginationLink";
import {
  formatSignedQuantity,
  stockMovementLabel,
  stockMovementReferenceLabel,
} from "@/lib/inventory/presentation";
import {
  getInventoryDetail,
  listStockMovementsForProduct,
} from "@/lib/inventory/queries";
import { AppError } from "@/lib/utils/errors";
import { cn } from "@/lib/utils/cn";

type Params = Promise<{ productId: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

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

export default async function InventoryDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { productId } = await params;
  const query = await searchParams;
  const page =
    typeof query.page === "string" && Number(query.page) > 0
      ? Number(query.page)
      : 1;

  let detail;
  let movements;
  try {
    [detail, movements] = await Promise.all([
      getInventoryDetail(productId),
      listStockMovementsForProduct(productId, page),
    ]);
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 404) notFound();
    return (
      <div role="alert" className="text-sm text-accent">
        {error instanceof AppError
          ? error.message
          : "Unable to load inventory details."}
      </div>
    );
  }

  const { product, quantity_on_hand: quantityOnHand } = detail;
  const totalPages = Math.max(1, Math.ceil(movements.total / movements.pageSize));

  return (
    <section className="mx-auto w-full max-w-5xl space-y-6">
      <div>
        <Link
          href="/app/inventory"
          className="text-sm font-medium text-accent hover:underline"
        >
          ← Back to inventory
        </Link>
        <h1 className="mt-3 font-display text-3xl tracking-tight text-ink">
          {product.name}
        </h1>
        <p className="mt-1 text-sm text-muted">{product.product_code}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <dl className="grid gap-4 rounded-xl border border-line bg-surface/90 p-5 sm:grid-cols-2">
          <Item label="Brand" value={product.brand} />
          <Item label="Category" value={product.category} />
          <Item label="Packaging" value={product.packaging_size} />
          <Item label="Unit of measure" value={product.unit_of_measure} />
          <Item
            label="Quantity on hand"
            value={
              quantityOnHand === null ? (
                <span className="text-muted">No inventory record</span>
              ) : (
                <span
                  className={cn(
                    "font-display text-2xl tracking-tight",
                    quantityOnHand === 0 ? "text-accent" : "text-ink",
                  )}
                >
                  {quantityOnHand}{" "}
                  <span className="text-sm font-sans font-normal text-muted">
                    {product.unit_of_measure}
                  </span>
                </span>
              )
            }
          />
          <Item
            label="Product status"
            value={<ActiveBadge active={product.is_active} />}
          />
        </dl>

        <AdjustInventoryForm
          productId={product.id}
          productName={product.name}
          unitOfMeasure={product.unit_of_measure}
          currentQuantity={quantityOnHand}
        />
      </div>

      <div className="space-y-3">
        <div>
          <h2 className="font-display text-xl tracking-tight text-ink">
            Stock movement history
          </h2>
          <p className="mt-1 text-sm text-muted">
            Ledger entries recorded by authorized database functions.
          </p>
        </div>

        {movements.movements.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line px-6 py-10 text-center text-sm text-muted">
            No stock movements have been recorded for this product yet.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-line bg-surface/90">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-line bg-paper/80 text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">When</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Change</th>
                    <th className="px-4 py-3 font-medium">Balance</th>
                    <th className="px-4 py-3 font-medium">Reference</th>
                    <th className="px-4 py-3 font-medium">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.movements.map((movement) => {
                    const increase = movement.quantity_delta > 0;
                    return (
                      <tr
                        key={movement.id}
                        className="border-b border-line/70 last:border-0"
                      >
                        <td className="px-4 py-3 text-muted">
                          {formatDateTime(movement.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          {stockMovementLabel(movement.movement_type)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "font-medium",
                              increase ? "text-good" : "text-accent",
                            )}
                          >
                            {formatSignedQuantity(movement.quantity_delta)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted">
                          {movement.quantity_before} → {movement.quantity_after}
                        </td>
                        <td className="px-4 py-3 text-muted">
                          {movement.reference_type === "delivery_stock_returns" &&
                          movement.reference_id ? (
                            <Link
                              href={`/app/returns/${movement.reference_id}`}
                              className="font-medium text-accent underline-offset-2 hover:underline"
                            >
                              {stockMovementReferenceLabel(
                                movement.reference_type,
                                movement.reference_id,
                              )}
                            </Link>
                          ) : (
                            stockMovementReferenceLabel(
                              movement.reference_type,
                              movement.reference_id,
                            )
                          )}
                          {movement.reference_id ? (
                            <div className="mt-0.5 font-mono text-[11px] text-muted/80">
                              {movement.reference_id.slice(0, 8)}…
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-muted">
                          {movement.reason?.trim() || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 ? (
              <div className="flex items-center justify-between text-sm text-muted">
                <span>
                  Page {movements.page} of {totalPages}
                </span>
                <div className="flex gap-2">
                  {movements.page > 1 ? (
                    <PaginationLink
                      href={`/app/inventory/${productId}?page=${movements.page - 1}`}
                    >
                      Previous
                    </PaginationLink>
                  ) : null}
                  {movements.page < totalPages ? (
                    <PaginationLink
                      href={`/app/inventory/${productId}?page=${movements.page + 1}`}
                    >
                      Next
                    </PaginationLink>
                  ) : null}
                </div>
              </div>
            ) : null}
          </>
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
