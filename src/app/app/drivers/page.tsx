import { Suspense } from "react";
import { ActiveBadge } from "@/components/admin/UserStatusBadge";
import { PageHeader } from "@/components/app/PageHeader";
import { CreateDriverButton } from "@/components/master-data/DriverForms";
import { SimpleFilters } from "@/components/master-data/SimpleFilters";
import { ListPager } from "@/components/ui/ListPager";
import {
  DesktopTableShell,
  ListActionLink,
  MobileRecordList,
  RecordCard,
} from "@/components/ui/ResponsiveRecords";
import { buildPageHref } from "@/lib/navigation/pagination";
import { requireAdmin } from "@/lib/auth/session";
import { listDrivers } from "@/lib/master-data/drivers/queries";
import { AppError } from "@/lib/utils/errors";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function DriversPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdmin();
  const params = await searchParams;
  let list;
  try {
    list = await listDrivers(params);
  } catch (error) {
    return (
      <div role="alert" className="text-sm text-accent">
        {error instanceof AppError ? error.message : "Unable to load drivers."}
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(list.total / list.pageSize));

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        title="Drivers"
        description="Operational delivery contacts managed by staff. Drivers do not sign in to this application."
        actions={<CreateDriverButton />}
      />

      <Suspense fallback={<p className="text-sm text-muted">Loading filters…</p>}>
        <SimpleFilters
          initialQ={list.query.q}
          initialStatus={list.query.status}
          searchPlaceholder="Code, name, or phone number"
        />
      </Suspense>

      {list.drivers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line px-6 py-12 text-center text-sm text-muted">
          No drivers match these filters.
        </div>
      ) : (
        <>
          <MobileRecordList>
            {list.drivers.map((driver) => (
              <RecordCard
                key={driver.id}
                title={driver.full_name}
                subtitle={driver.driver_code}
                badge={<ActiveBadge active={driver.is_active} />}
                fields={[
                  { label: "Phone", value: driver.phone ?? "—" },
                  { label: "Updated", value: formatTimestamp(driver.updated_at) },
                ]}
                action={
                  <ListActionLink href={`/app/drivers/${driver.id}`}>
                    Manage
                  </ListActionLink>
                }
              />
            ))}
          </MobileRecordList>

          <DesktopTableShell>
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-line bg-paper/80 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Full name</th>
                  <th className="px-4 py-3 font-medium">Phone number</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.drivers.map((driver) => (
                  <tr key={driver.id} className="border-b border-line/70 last:border-0">
                    <td className="px-4 py-3 font-medium">{driver.driver_code}</td>
                    <td className="px-4 py-3">{driver.full_name}</td>
                    <td className="px-4 py-3 text-muted">{driver.phone ?? "—"}</td>
                    <td className="px-4 py-3">
                      <ActiveBadge active={driver.is_active} />
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {formatTimestamp(driver.updated_at)}
                    </td>
                    <td className="px-4 py-3">
                      <ListActionLink
                        href={`/app/drivers/${driver.id}`}
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
          <Pager
            base="/app/drivers"
            page={list.page}
            totalPages={totalPages}
            total={list.total}
            shown={list.drivers.length}
            query={{
              q: list.query.q,
              status: list.query.status,
            }}
          />
        </>
      )}
    </section>
  );
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function Pager({
  base,
  page,
  totalPages,
  total,
  shown,
  query,
}: {
  base: string;
  page: number;
  totalPages: number;
  total: number;
  shown: number;
  query: Record<string, string>;
}) {
  return (
    <ListPager
      page={page}
      totalPages={totalPages}
      total={total}
      shown={shown}
      prevHref={page > 1 ? buildPageHref(base, page - 1, query) : null}
      nextHref={page < totalPages ? buildPageHref(base, page + 1, query) : null}
    />
  );
}
