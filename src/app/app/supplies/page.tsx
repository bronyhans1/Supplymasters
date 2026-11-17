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
import { SupplyFilters } from "@/components/supplies/SupplyFilters";
import { resolveVendorFilterOption } from "@/lib/partners/options";
import { formatGhs } from "@/lib/supplies/money";
import { paymentStatusLabel } from "@/lib/supplies/presentation";
import { listSupplies } from "@/lib/supplies/queries";
import { AppError } from "@/lib/utils/errors";
import { cn } from "@/lib/utils/cn";

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

export default async function SuppliesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  let list;
  let selectedVendor;
  try {
    list = await listSupplies(params);
    selectedVendor = list.query.vendorId
      ? await resolveVendorFilterOption(list.query.vendorId)
      : null;
  } catch (error) {
    return (
      <div role="alert" className="text-sm text-accent">
        {error instanceof AppError ? error.message : "Unable to load supplies."}
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(list.total / list.pageSize));

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        title="Supplies"
        description="Record wholesale supplies to vendors with full payment. Confirming a supply deducts stock and marks the transaction paid."
        actions={
          <Link
            href="/app/supplies/new"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-paper hover:bg-accent/90 sm:w-auto"
          >
            New supply
          </Link>
        }
      />

      <Suspense fallback={<p className="text-sm text-muted">Loading filters…</p>}>
        <SupplyFilters
          initialQ={list.query.q}
          initialFromDate={list.query.fromDate}
          initialToDate={list.query.toDate}
          selectedVendor={selectedVendor}
        />
      </Suspense>

      {list.supplies.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line px-6 py-12 text-center text-sm text-muted">
          No supplies match these filters.
        </div>
      ) : (
        <>
          <MobileRecordList>
            {list.supplies.map((supply) => (
              <RecordCard
                key={supply.id}
                title={supply.supply_ref}
                subtitle={
                  supply.vendor
                    ? `${supply.vendor.business_name} (${supply.vendor.vendor_code})`
                    : "—"
                }
                badge={
                  <span
                    className={cn(
                      "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
                      supply.payment_status === "PAID"
                        ? "bg-good/10 text-good"
                        : "bg-accent/10 text-accent",
                    )}
                  >
                    {paymentStatusLabel(supply.payment_status)}
                  </span>
                }
                fields={[
                  { label: "Date", value: formatDate(supply.supply_date) },
                  { label: "Items", value: supply.item_count },
                  { label: "Qty", value: supply.total_quantity },
                  { label: "Total", value: formatGhs(Number(supply.grand_total)) },
                  { label: "Recorded by", value: supply.recorded_by_name ?? "—" },
                ]}
                action={
                  <ListActionLink href={`/app/supplies/${supply.id}`}>
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
                  <th className="px-4 py-3 font-medium">Supply</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Vendor</th>
                  <th className="px-4 py-3 font-medium">Items</th>
                  <th className="px-4 py-3 font-medium">Qty</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Payment</th>
                  <th className="px-4 py-3 font-medium">Recorded by</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.supplies.map((supply) => (
                  <tr key={supply.id} className="border-b border-line/70 last:border-0">
                    <td className="px-4 py-3 font-medium">{supply.supply_ref}</td>
                    <td className="px-4 py-3 text-muted">
                      <div>{formatDate(supply.supply_date)}</div>
                      <div className="text-xs">{formatDateTime(supply.created_at)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{supply.vendor?.business_name ?? "—"}</div>
                      <div className="text-xs text-muted">
                        {supply.vendor?.vendor_code}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted">{supply.item_count}</td>
                    <td className="px-4 py-3 text-muted">{supply.total_quantity}</td>
                    <td className="px-4 py-3 font-medium">
                      {formatGhs(Number(supply.grand_total))}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
                          supply.payment_status === "PAID"
                            ? "bg-good/10 text-good"
                            : "bg-accent/10 text-accent",
                        )}
                      >
                        {paymentStatusLabel(supply.payment_status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {supply.recorded_by_name ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <ListActionLink
                        href={`/app/supplies/${supply.id}`}
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
            shown={list.supplies.length}
            prevHref={
              list.page > 1
                ? buildPageHref("/app/supplies", list.page - 1, params)
                : null
            }
            nextHref={
              list.page < totalPages
                ? buildPageHref("/app/supplies", list.page + 1, params)
                : null
            }
          />
        </>
      )}
    </section>
  );
}
