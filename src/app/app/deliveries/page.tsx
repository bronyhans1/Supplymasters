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
import { DeliveryFilters } from "@/components/deliveries/DeliveryFilters";
import { DeliveryStatusBadge } from "@/components/deliveries/DeliveryStatusBadge";
import {
  formatDeliveryDate,
  formatDeliveryDateTime,
} from "@/lib/deliveries/presentation";
import {
  listDeliveries,
  listDriversForFilter,
  listStaffForFilter,
} from "@/lib/deliveries/queries";
import { AppError } from "@/lib/utils/errors";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function DeliveriesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  let list;
  let staffOptions;
  let driverOptions;
  try {
    [list, staffOptions, driverOptions] = await Promise.all([
      listDeliveries(params),
      listStaffForFilter(),
      listDriversForFilter(),
    ]);
  } catch (error) {
    return (
      <div role="alert" className="text-sm text-accent">
        {error instanceof AppError ? error.message : "Unable to load deliveries."}
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(list.total / list.pageSize));
  const hasActiveFilters = Boolean(
    list.query.q ||
      list.query.status ||
      list.query.fromDate ||
      list.query.toDate ||
      list.query.staffId ||
      list.query.driverId,
  );

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        title="Deliveries"
        description="Staff-managed delivery operations for wholesale supplies. Drivers are optional operational contacts and do not sign in."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="Matching total" value={list.summary.total} />
        <SummaryCard label="Pending" value={list.summary.pending} />
        <SummaryCard label="Dispatched" value={list.summary.dispatched} />
        <SummaryCard label="Delivered" value={list.summary.delivered} />
        <SummaryCard
          label="Failed / cancelled"
          value={list.summary.failedOrCancelled}
        />
      </div>
      <p className="text-xs text-muted">
        Summary counts use the current search, date, staff, and driver filters. The
        status filter applies only to the table below.
      </p>

      <Suspense fallback={<p className="text-sm text-muted">Loading filters…</p>}>
        <DeliveryFilters
          initialQ={list.query.q}
          initialStatus={list.query.status}
          initialFromDate={list.query.fromDate}
          initialToDate={list.query.toDate}
          initialStaffId={list.query.staffId}
          initialDriverId={list.query.driverId}
          staffOptions={staffOptions}
          driverOptions={driverOptions}
        />
      </Suspense>

      {list.deliveries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line px-6 py-12 text-center text-sm text-muted">
          {hasActiveFilters
            ? "No deliveries match these filters."
            : "No deliveries yet. Deliveries are created automatically when a supply is recorded."}
        </div>
      ) : (
        <>
          <MobileRecordList>
            {list.deliveries.map((delivery) => (
              <RecordCard
                key={delivery.id}
                title={delivery.delivery_ref}
                subtitle={delivery.supply?.vendor?.business_name ?? "—"}
                badge={<DeliveryStatusBadge status={delivery.status} />}
                fields={[
                  { label: "Supply", value: delivery.supply?.supply_ref ?? "—" },
                  {
                    label: "Contact",
                    value:
                      delivery.supply?.vendor?.phone ?? delivery.vendor_location,
                  },
                  {
                    label: "Staff",
                    value: delivery.responsible_staff?.full_name ?? "—",
                  },
                  {
                    label: "Driver",
                    value: delivery.driver
                      ? `${delivery.driver.driver_code} · ${delivery.driver.full_name}`
                      : "Unassigned",
                  },
                  {
                    label: "Date",
                    value: formatDeliveryDate(delivery.delivery_date),
                  },
                ]}
                action={
                  <ListActionLink href={`/app/deliveries/${delivery.id}`}>
                    Manage
                  </ListActionLink>
                }
              />
            ))}
          </MobileRecordList>

          <DesktopTableShell className="bg-surface/90">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-line bg-paper/80 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Delivery</th>
                  <th className="px-4 py-3 font-medium">Supply</th>
                  <th className="px-4 py-3 font-medium">Vendor</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Staff</th>
                  <th className="px-4 py-3 font-medium">Driver</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.deliveries.map((delivery) => (
                  <tr key={delivery.id} className="border-b border-line/70 last:border-0">
                    <td className="px-4 py-3 font-medium">{delivery.delivery_ref}</td>
                    <td className="px-4 py-3 text-muted">
                      {delivery.supply?.supply_ref ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div>{delivery.supply?.vendor?.business_name ?? "—"}</div>
                      <div className="text-xs text-muted">
                        {delivery.supply?.vendor?.phone ?? delivery.vendor_location}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <DeliveryStatusBadge status={delivery.status} />
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {delivery.responsible_staff?.full_name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {delivery.driver
                        ? `${delivery.driver.driver_code} · ${delivery.driver.full_name}`
                        : "Unassigned"}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      <div>{formatDeliveryDate(delivery.delivery_date)}</div>
                      <div className="text-xs">
                        {formatDeliveryDateTime(delivery.updated_at)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <ListActionLink
                        href={`/app/deliveries/${delivery.id}`}
                        variant="table"
                      >
                        Manage
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
            shown={list.deliveries.length}
            prevHref={
              list.page > 1
                ? buildPageHref("/app/deliveries", list.page - 1, params)
                : null
            }
            nextHref={
              list.page < totalPages
                ? buildPageHref("/app/deliveries", list.page + 1, params)
                : null
            }
          />
        </>
      )}
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0 rounded-xl border border-line bg-surface/90 px-4 py-3">
      <p className="break-words text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className="mt-1 break-words font-display text-2xl text-ink">{value}</p>
    </div>
  );
}
