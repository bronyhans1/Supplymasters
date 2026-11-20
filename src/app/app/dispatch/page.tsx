import { Suspense } from "react";
import { PageHeader } from "@/components/app/PageHeader";
import { DeliveryStatusBadge } from "@/components/deliveries/DeliveryStatusBadge";
import { DispatchQueueFilters } from "@/components/deliveries/DispatchQueueFilters";
import { ListPager } from "@/components/ui/ListPager";
import {
  DesktopTableShell,
  ListActionLink,
  MobileRecordList,
  RecordCard,
} from "@/components/ui/ResponsiveRecords";
import { requireAdmin } from "@/lib/auth/session";
import {
  formatDeliveryDate,
  formatDeliveryDateTime,
} from "@/lib/deliveries/presentation";
import { listDispatchDeliveries } from "@/lib/deliveries/queries";
import { buildPageHref } from "@/lib/navigation/pagination";
import { AppError } from "@/lib/utils/errors";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function DispatchPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdmin();
  const params = await searchParams;

  let list;
  try {
    list = await listDispatchDeliveries(params);
  } catch (error) {
    return (
      <div role="alert" className="text-sm text-accent">
        {error instanceof AppError ? error.message : "Unable to load dispatch queue."}
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(list.total / list.pageSize));
  const hasActiveFilters = Boolean(
    list.query.q ||
      (list.query.status && list.query.status !== "PENDING") ||
      list.query.fromDate ||
      list.query.toDate,
  );
  const awaitingDispatch = list.summary.pending;
  const dispatched = list.summary.dispatched;

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        title="Dispatch"
        description="Confirm when goods leave for the vendor. Dispatch does not mark deliveries as delivered or record payment."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Matching total" value={list.total} />
        <SummaryCard label="Awaiting dispatch" value={awaitingDispatch} />
        <SummaryCard label="Dispatched" value={dispatched} />
        <SummaryCard label="Delivered" value={list.summary.delivered} />
      </div>
      <p className="text-xs text-muted">
        Default view shows deliveries awaiting dispatch (Pending). Use filters to
        review dispatch history. Assignments and delivery confirmation remain
        separate.
      </p>

      <Suspense fallback={<p className="text-sm text-muted">Loading filters…</p>}>
        <DispatchQueueFilters
          initialQ={list.query.q}
          initialStatus={list.query.status}
          initialFromDate={list.query.fromDate}
          initialToDate={list.query.toDate}
        />
      </Suspense>

      {list.deliveries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line px-6 py-12 text-center text-sm text-muted">
          {hasActiveFilters
            ? "No deliveries match these dispatch filters."
            : "No deliveries awaiting dispatch."}
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
                  {
                    label: "Location",
                    value:
                      delivery.supply?.vendor?.location ??
                      delivery.vendor_location ??
                      "—",
                  },
                  {
                    label: "Staff",
                    value: delivery.responsible_staff?.full_name ?? "—",
                  },
                  {
                    label: "Dispatched",
                    value: formatDeliveryDateTime(delivery.dispatched_at),
                  },
                  {
                    label: "Date",
                    value: formatDeliveryDate(delivery.delivery_date),
                  },
                ]}
                action={
                  <ListActionLink href={`/app/dispatch/${delivery.id}`}>
                    {delivery.status === "PENDING" ? "Dispatch" : "View"}
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
                  <th className="px-4 py-3 font-medium">Vendor</th>
                  <th className="px-4 py-3 font-medium">Location</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Staff</th>
                  <th className="px-4 py-3 font-medium">Dispatched</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.deliveries.map((delivery) => (
                  <tr key={delivery.id} className="border-b border-line/70 last:border-0">
                    <td className="px-4 py-3 font-medium">{delivery.delivery_ref}</td>
                    <td className="px-4 py-3">
                      {delivery.supply?.vendor?.business_name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {delivery.supply?.vendor?.location ??
                        delivery.vendor_location ??
                        "—"}
                    </td>
                    <td className="px-4 py-3">
                      <DeliveryStatusBadge status={delivery.status} />
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {delivery.responsible_staff?.full_name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {formatDeliveryDateTime(delivery.dispatched_at)}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {formatDeliveryDate(delivery.delivery_date)}
                    </td>
                    <td className="px-4 py-3">
                      <ListActionLink
                        href={`/app/dispatch/${delivery.id}`}
                        variant="table"
                      >
                        {delivery.status === "PENDING" ? "Dispatch" : "View"}
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
                ? buildPageHref("/app/dispatch", list.page - 1, params)
                : null
            }
            nextHref={
              list.page < totalPages
                ? buildPageHref("/app/dispatch", list.page + 1, params)
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
