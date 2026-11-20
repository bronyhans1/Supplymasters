import { Suspense } from "react";
import { PageHeader } from "@/components/app/PageHeader";
import { AssignmentStateBadge } from "@/components/deliveries/AssignmentStateBadge";
import { DeliveryStatusBadge } from "@/components/deliveries/DeliveryStatusBadge";
import { DispatchFilters } from "@/components/deliveries/DispatchFilters";
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
import {
  listAssignmentDeliveries,
  listDriversForFilter,
  listEligibleStaffForAssignment,
} from "@/lib/deliveries/queries";
import { buildPageHref } from "@/lib/navigation/pagination";
import { AppError } from "@/lib/utils/errors";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AssignmentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdmin();
  const params = await searchParams;

  let list;
  let staffOptions;
  let driverOptions;
  try {
    [list, staffOptions, driverOptions] = await Promise.all([
      listAssignmentDeliveries(params),
      listEligibleStaffForAssignment(),
      listDriversForFilter(),
    ]);
  } catch (error) {
    return (
      <div role="alert" className="text-sm text-accent">
        {error instanceof AppError
          ? error.message
          : "Unable to load assignments."}
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
      list.query.driverId ||
      list.query.assignmentState,
  );
  const needsDriver = list.deliveries.filter(
    (delivery) =>
      !delivery.driver_id &&
      (delivery.status === "PENDING" || delivery.status === "DISPATCHED"),
  ).length;

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        title="Assignments"
        description="Assign responsible staff and optional operational drivers. Assignment changes never change dispatch or delivery status."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Matching total" value={list.total} />
        <SummaryCard label="Pending" value={list.summary.pending} />
        <SummaryCard label="Dispatched" value={list.summary.dispatched} />
        <SummaryCard label="Needs driver (this page)" value={needsDriver} />
      </div>
      <p className="text-xs text-muted">
        Summary pending/dispatched counts use the current search, date, staff, driver,
        and assignment filters. Status filter applies to the table. Responsible staff is
        always required; drivers remain optional. Multiple deliveries may share the same
        staff member or driver. Dispatch and delivery confirmation happen in their own
        sections.
      </p>

      <Suspense fallback={<p className="text-sm text-muted">Loading filters…</p>}>
        <DispatchFilters
          initialQ={list.query.q}
          initialStatus={list.query.status}
          initialFromDate={list.query.fromDate}
          initialToDate={list.query.toDate}
          initialStaffId={list.query.staffId}
          initialDriverId={list.query.driverId}
          initialAssignmentState={list.query.assignmentState}
          staffOptions={staffOptions}
          driverOptions={driverOptions}
        />
      </Suspense>

      {list.deliveries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line px-6 py-12 text-center text-sm text-muted">
          {hasActiveFilters
            ? "No deliveries match these assignment filters."
            : "No deliveries to assign yet."}
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
                    label: "Driver",
                    value: delivery.driver
                      ? `${delivery.driver.driver_code} · ${delivery.driver.full_name}`
                      : "Unassigned",
                  },
                  {
                    label: "Assignment",
                    value: (
                      <AssignmentStateBadge
                        status={delivery.status}
                        driverId={delivery.driver_id}
                      />
                    ),
                  },
                  {
                    label: "Date",
                    value: formatDeliveryDate(delivery.delivery_date),
                  },
                ]}
                action={
                  <ListActionLink href={`/app/assignments/${delivery.id}`}>
                    Assign
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
                  <th className="px-4 py-3 font-medium">Driver</th>
                  <th className="px-4 py-3 font-medium">Assignment</th>
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
                      {delivery.driver
                        ? `${delivery.driver.driver_code} · ${delivery.driver.full_name}`
                        : "Unassigned"}
                    </td>
                    <td className="px-4 py-3">
                      <AssignmentStateBadge
                        status={delivery.status}
                        driverId={delivery.driver_id}
                      />
                    </td>
                    <td className="px-4 py-3 text-muted">
                      <div>{formatDeliveryDate(delivery.delivery_date)}</div>
                      <div className="text-xs">
                        {formatDeliveryDateTime(delivery.updated_at)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <ListActionLink
                        href={`/app/assignments/${delivery.id}`}
                        variant="table"
                      >
                        Assign
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
                ? buildPageHref("/app/assignments", list.page - 1, params)
                : null
            }
            nextHref={
              list.page < totalPages
                ? buildPageHref("/app/assignments", list.page + 1, params)
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
