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
import { ReturnFilters } from "@/components/returns/ReturnFilters";
import {
  formatReturnDateTime,
  formatReturnDisplayId,
} from "@/lib/returns/presentation";
import { resolveProductFilterOption } from "@/lib/products/options";
import {
  listReturns,
  listStaffForReturnFilter,
  listVendorsForReturnFilter,
  resolveDeliveryFilterOption,
} from "@/lib/returns/queries";
import { AppError } from "@/lib/utils/errors";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ReturnsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const productId = typeof params.productId === "string" ? params.productId : "";
  const deliveryId =
    typeof params.deliveryId === "string" ? params.deliveryId : "";

  let list;
  let vendorOptions;
  let staffOptions;
  let selectedProduct;
  let selectedDelivery;
  try {
    [list, vendorOptions, staffOptions, selectedProduct, selectedDelivery] =
      await Promise.all([
        listReturns(params),
        listVendorsForReturnFilter(),
        listStaffForReturnFilter(),
        productId
          ? resolveProductFilterOption(productId)
          : Promise.resolve(null),
        deliveryId
          ? resolveDeliveryFilterOption(deliveryId)
          : Promise.resolve(null),
      ]);
  } catch (error) {
    return (
      <div role="alert" className="text-sm text-accent">
        {error instanceof AppError ? error.message : "Unable to load returns."}
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(list.total / list.pageSize));
  const hasActiveFilters = Boolean(
    list.query.q ||
      list.query.fromDate ||
      list.query.toDate ||
      list.query.vendorId ||
      list.query.staffId ||
      list.query.deliveryId ||
      list.query.productId,
  );

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        title="Returns"
        description="Explicit delivery stock returns for FAILED or CANCELLED deliveries. Recording a return restores inventory; it does not refund payments or change delivery status."
        actions={
          <Link
            href="/app/returns/new"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-paper transition hover:bg-ink/90 sm:w-auto"
          >
            Record return
          </Link>
        }
      />

      <Suspense fallback={<p className="text-sm text-muted">Loading filters…</p>}>
        <ReturnFilters
          initialQ={list.query.q}
          initialFromDate={list.query.fromDate}
          initialToDate={list.query.toDate}
          initialVendorId={list.query.vendorId}
          initialStaffId={list.query.staffId}
          vendorOptions={vendorOptions}
          staffOptions={staffOptions}
          selectedDelivery={selectedDelivery}
          selectedProduct={selectedProduct}
        />
      </Suspense>

      {list.returns.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line px-6 py-12 text-center text-sm text-muted">
          {hasActiveFilters
            ? "No returns match these filters."
            : "No stock returns yet. Record a return from a FAILED or CANCELLED delivery."}
        </div>
      ) : (
        <>
          <MobileRecordList>
            {list.returns.map((row) => (
              <RecordCard
                key={row.id}
                title={formatReturnDisplayId(row.return_ref, row.id)}
                subtitle={row.delivery?.supply?.vendor?.business_name ?? "—"}
                fields={[
                  { label: "Delivery", value: row.delivery?.delivery_ref ?? "—" },
                  { label: "Supply", value: row.delivery?.supply?.supply_ref ?? "—" },
                  { label: "Phone", value: row.delivery?.supply?.vendor?.phone },
                  { label: "Lines", value: row.item_count },
                  { label: "Qty", value: row.total_quantity },
                  { label: "Recorded by", value: row.returned_by_name ?? "—" },
                  { label: "Date", value: formatReturnDateTime(row.created_at) },
                ]}
                action={
                  <ListActionLink href={`/app/returns/${row.id}`}>
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
                  <th className="px-4 py-3 font-medium">Return</th>
                  <th className="px-4 py-3 font-medium">Delivery</th>
                  <th className="px-4 py-3 font-medium">Supply</th>
                  <th className="px-4 py-3 font-medium">Vendor</th>
                  <th className="px-4 py-3 font-medium">Lines</th>
                  <th className="px-4 py-3 font-medium">Qty</th>
                  <th className="px-4 py-3 font-medium">Recorded by</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.returns.map((row) => (
                  <tr key={row.id} className="border-b border-line/70 last:border-0">
                    <td className="px-4 py-3 font-medium">
                      {formatReturnDisplayId(row.return_ref, row.id)}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {row.delivery?.delivery_ref ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {row.delivery?.supply?.supply_ref ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        {row.delivery?.supply?.vendor?.business_name ?? "—"}
                      </div>
                      <div className="text-xs text-muted">
                        {row.delivery?.supply?.vendor?.phone ?? ""}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted">{row.item_count}</td>
                    <td className="px-4 py-3 font-medium">{row.total_quantity}</td>
                    <td className="px-4 py-3 text-muted">
                      {row.returned_by_name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {formatReturnDateTime(row.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <ListActionLink
                        href={`/app/returns/${row.id}`}
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
            shown={list.returns.length}
            noun="return"
            prevHref={
              list.page > 1
                ? buildPageHref("/app/returns", list.page - 1, params)
                : null
            }
            nextHref={
              list.page < totalPages
                ? buildPageHref("/app/returns", list.page + 1, params)
                : null
            }
          />
        </>
      )}
    </section>
  );
}
