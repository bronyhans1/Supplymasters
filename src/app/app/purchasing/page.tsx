import Link from "next/link";
import { ListPager } from "@/components/ui/ListPager";
import {
  DesktopTableShell,
  ListActionLink,
  MobileRecordList,
  RecordCard,
} from "@/components/ui/ResponsiveRecords";
import { buildPageHref } from "@/lib/navigation/pagination";
import { Suspense } from "react";
import { PageHeader } from "@/components/app/PageHeader";
import { PurchaseFilters } from "@/components/purchasing/PurchaseFilters";
import { requireAdmin } from "@/lib/auth/session";
import { resolveSupplierFilterOption } from "@/lib/partners/options";
import { formatGhs } from "@/lib/purchasing/money";
import { listPurchases } from "@/lib/purchasing/queries";
import { AppError } from "@/lib/utils/errors";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function formatDate(value: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(
      new Date(`${value}T00:00:00Z`),
    );
  } catch {
    return value;
  }
}

export default async function PurchasingPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdmin();
  const params = await searchParams;

  let list;
  let selectedSupplier;
  try {
    list = await listPurchases(params);
    selectedSupplier = list.query.supplierId
      ? await resolveSupplierFilterOption(list.query.supplierId)
      : null;
  } catch (error) {
    return (
      <div role="alert" className="text-sm text-accent">
        {error instanceof AppError ? error.message : "Unable to load purchases."}
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(list.total / list.pageSize));

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        title="Purchasing"
        description="Receive stock from manufacturers and stock suppliers. Confirming a purchase updates inventory immediately."
        actions={
          <Link
            href="/app/purchasing/new"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-paper hover:bg-accent/90 sm:w-auto"
          >
            Receive purchase
          </Link>
        }
      />

      <Suspense fallback={<p className="text-sm text-muted">Loading filters…</p>}>
        <PurchaseFilters
          initialQ={list.query.q}
          initialFromDate={list.query.fromDate}
          initialToDate={list.query.toDate}
          selectedSupplier={selectedSupplier}
        />
      </Suspense>

      {list.purchases.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line px-6 py-12 text-center text-sm text-muted">
          No purchases match these filters.
        </div>
      ) : (
        <>
          <MobileRecordList>
            {list.purchases.map((purchase) => (
              <RecordCard
                key={purchase.id}
                title={purchase.purchase_ref}
                subtitle={
                  purchase.supplier
                    ? `${purchase.supplier.name} (${purchase.supplier.supplier_code})`
                    : "—"
                }
                badge={
                  <span className="inline-flex rounded-md bg-good/10 px-2 py-0.5 text-xs font-medium text-good">
                    Received
                  </span>
                }
                fields={[
                  { label: "Date", value: formatDate(purchase.purchase_date) },
                  { label: "Lines", value: purchase.item_count },
                  { label: "Total", value: formatGhs(Number(purchase.total_cost)) },
                ]}
                action={
                  <ListActionLink href={`/app/purchasing/${purchase.id}`}>
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
                  <th className="px-4 py-3 font-medium">Purchase reference</th>
                  <th className="px-4 py-3 font-medium">Supplier</th>
                  <th className="px-4 py-3 font-medium">Purchase date</th>
                  <th className="px-4 py-3 font-medium">Lines</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.purchases.map((purchase) => (
                  <tr key={purchase.id} className="border-b border-line/70 last:border-0">
                    <td className="px-4 py-3 font-medium">{purchase.purchase_ref}</td>
                    <td className="px-4 py-3">
                      <div>{purchase.supplier?.name ?? "—"}</div>
                      <div className="text-xs text-muted">
                        {purchase.supplier?.supplier_code}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {formatDate(purchase.purchase_date)}
                    </td>
                    <td className="px-4 py-3 text-muted">{purchase.item_count}</td>
                    <td className="px-4 py-3 font-medium">
                      {formatGhs(Number(purchase.total_cost))}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-md bg-good/10 px-2 py-0.5 text-xs font-medium text-good">
                        Received
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ListActionLink
                        href={`/app/purchasing/${purchase.id}`}
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
            shown={list.purchases.length}
            prevHref={
              list.page > 1
                ? buildPageHref("/app/purchasing", list.page - 1, params)
                : null
            }
            nextHref={
              list.page < totalPages
                ? buildPageHref("/app/purchasing", list.page + 1, params)
                : null
            }
          />
        </>
      )}
    </section>
  );
}
