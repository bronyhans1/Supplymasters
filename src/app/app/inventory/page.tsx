import { ListPager } from "@/components/ui/ListPager";
import {
  DesktopTableShell,
  ListActionLink,
  MobileRecordList,
  RecordCard,
} from "@/components/ui/ResponsiveRecords";
import { buildPageHref } from "@/lib/navigation/pagination";
import { Suspense } from "react";
import { ActiveBadge } from "@/components/admin/UserStatusBadge";
import { PageHeader } from "@/components/app/PageHeader";
import { InventoryFilters } from "@/components/inventory/InventoryFilters";
import {
  getInventorySummary,
  listInventory,
} from "@/lib/inventory/queries";
import { AppError } from "@/lib/utils/errors";
import { cn } from "@/lib/utils/cn";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  let list;
  let summary;
  try {
    [list, summary] = await Promise.all([
      listInventory(params),
      getInventorySummary(),
    ]);
  } catch (error) {
    return (
      <div role="alert" className="text-sm text-accent">
        {error instanceof AppError ? error.message : "Unable to load inventory."}
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(list.total / list.pageSize));

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        title="Inventory"
        description="Live quantity on hand from the stock ledger. Purchases increase stock; supplies and authorized returns update balances through their own workflows."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Products" value={String(summary.productCount)} />
        <SummaryCard
          label="Inventory records"
          value={String(summary.inventoryRecordCount)}
        />
        <SummaryCard
          label="In stock"
          value={String(summary.productsWithStock)}
          tone="good"
        />
        <SummaryCard
          label="Zero stock"
          value={String(summary.productsWithZeroStock)}
          tone={summary.productsWithZeroStock > 0 ? "accent" : "default"}
        />
      </div>

      {summary.productsMissingInventory > 0 ? (
        <p className="rounded-lg border border-dashed border-line bg-surface/70 px-4 py-3 text-sm text-muted">
          {summary.productsMissingInventory} product
          {summary.productsMissingInventory === 1 ? "" : "s"} have no inventory
          row yet. The next authorized stock movement will create one.
        </p>
      ) : null}

      {summary.totalsByUnit.length > 0 ? (
        <div className="rounded-xl border border-line bg-surface/90 p-5">
          <h2 className="text-sm font-semibold text-ink">Quantity by unit of measure</h2>
          <p className="mt-1 text-xs leading-5 text-muted">
            Totals are grouped by unit so different packaging units are never mixed.
          </p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {summary.totalsByUnit.map((row) => (
              <li
                key={row.unit_of_measure}
                className="rounded-lg border border-line bg-paper/70 px-3 py-2.5"
              >
                <div className="text-xs uppercase tracking-wide text-muted">
                  {row.unit_of_measure}
                </div>
                <div className="mt-1 text-sm font-semibold text-ink">
                  {row.quantity_on_hand.toLocaleString()} on hand
                </div>
                <div className="text-xs text-muted">
                  {row.product_count} product{row.product_count === 1 ? "" : "s"}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Suspense fallback={<p className="text-sm text-muted">Loading filters…</p>}>
        <InventoryFilters
          initialQ={list.query.q}
          initialCategory={list.query.category}
          initialStock={list.query.stock}
        />
      </Suspense>

      {list.rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line px-6 py-12 text-center text-sm text-muted">
          No inventory rows match these filters.
        </div>
      ) : (
        <>
          <MobileRecordList>
            {list.rows.map((row) => (
              <RecordCard
                key={row.id}
                title={row.name}
                subtitle={`${row.product_code}${row.brand ? ` · ${row.brand}` : ""}`}
                badge={<ActiveBadge active={row.is_active} />}
                fields={[
                  { label: "Category", value: row.category },
                  { label: "Packaging", value: row.packaging_size },
                  { label: "UoM", value: row.unit_of_measure },
                  {
                    label: "On hand",
                    value: row.has_inventory_record ? (
                      <span
                        className={cn(
                          "font-medium",
                          row.quantity_on_hand === 0 ? "text-accent" : "text-ink",
                        )}
                      >
                        {row.quantity_on_hand}
                      </span>
                    ) : (
                      <span className="text-muted">No record</span>
                    ),
                  },
                ]}
                action={
                  <ListActionLink href={`/app/inventory/${row.id}`}>
                    View
                  </ListActionLink>
                }
              />
            ))}
          </MobileRecordList>

          <DesktopTableShell className="bg-surface/90">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-line bg-paper/80 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Packaging</th>
                  <th className="px-4 py-3 font-medium">UoM</th>
                  <th className="px-4 py-3 font-medium">On hand</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.rows.map((row) => (
                  <tr key={row.id} className="border-b border-line/70 last:border-0">
                    <td className="px-4 py-3 font-medium">{row.product_code}</td>
                    <td className="px-4 py-3">
                      <div>{row.name}</div>
                      <div className="text-xs text-muted">{row.brand}</div>
                    </td>
                    <td className="px-4 py-3 text-muted">{row.category}</td>
                    <td className="px-4 py-3 text-muted">{row.packaging_size}</td>
                    <td className="px-4 py-3 text-muted">{row.unit_of_measure}</td>
                    <td className="px-4 py-3">
                      {row.has_inventory_record ? (
                        <span
                          className={cn(
                            "font-medium",
                            row.quantity_on_hand === 0 ? "text-accent" : "text-ink",
                          )}
                        >
                          {row.quantity_on_hand}
                        </span>
                      ) : (
                        <span className="text-muted">No record</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <ActiveBadge active={row.is_active} />
                    </td>
                    <td className="px-4 py-3">
                      <ListActionLink
                        href={`/app/inventory/${row.id}`}
                        variant="table"
                      >
                        View
                      </ListActionLink>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DesktopTableShell>

          <ListPager
            page={list.page}
            totalPages={totalPages}
            total={list.total}
            shown={list.rows.length}
            noun="product"
            prevHref={
              list.page > 1
                ? buildPageHref("/app/inventory", list.page - 1, params)
                : null
            }
            nextHref={
              list.page < totalPages
                ? buildPageHref("/app/inventory", list.page + 1, params)
                : null
            }
          />
        </>
      )}
    </section>
  );
}

function SummaryCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "good" | "accent";
}) {
  return (
    <div className="rounded-xl border border-line bg-surface/90 px-4 py-4">
      <div className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </div>
      <div
        className={cn(
          "mt-2 font-display text-3xl tracking-tight",
          tone === "good" && "text-good",
          tone === "accent" && "text-accent",
          tone === "default" && "text-ink",
        )}
      >
        {value}
      </div>
    </div>
  );
}

