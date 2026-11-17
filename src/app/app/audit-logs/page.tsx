import { ListPager } from "@/components/ui/ListPager";
import { buildPageHref } from "@/lib/navigation/pagination";
import { Suspense } from "react";
import { AuditLogFilters } from "@/components/audit-logs/AuditLogFilters";
import { AuditLogTable } from "@/components/audit-logs/AuditLogTable";
import { listAuditLogs } from "@/lib/audit-logs/queries";
import { requireAdmin } from "@/lib/auth/session";
import { AppError } from "@/lib/utils/errors";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  let list;
  try {
    await requireAdmin();
    list = await listAuditLogs(params);
  } catch (error) {
    const message =
      error instanceof AppError ? error.message : "Unable to load activity history.";
    return (
      <section className="mx-auto w-full max-w-6xl space-y-4">
        <Header />
        <div
          role="alert"
          className="rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-accent"
        >
          {message}
        </div>
      </section>
    );
  }

  const totalPages = Math.max(1, Math.ceil(list.total / list.pageSize));

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6">
      <Header />

      <Suspense fallback={<p className="text-sm text-muted">Loading filters…</p>}>
        <AuditLogFilters
          initialQ={list.query.q}
          initialAction={list.query.action}
          initialEntityType={list.query.entityType}
          initialActor={list.query.actor}
          initialFromDate={list.query.fromDate}
          initialToDate={list.query.toDate}
        />
      </Suspense>

      {list.rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-white/50 px-6 py-12 text-center text-sm text-muted">
          No activity matches these filters.
        </div>
      ) : (
        <>
          <AuditLogTable rows={list.rows} />
          <Pager
            base="/app/audit-logs"
            page={list.page}
            totalPages={totalPages}
            total={list.total}
            shown={list.rows.length}
            query={{
              q: list.query.q,
              action: list.query.action,
              entityType: list.query.entityType,
              actor: list.query.actor,
              fromDate: list.query.fromDate,
              toDate: list.query.toDate,
            }}
          />
        </>
      )}
    </section>
  );
}

function Header() {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
        Management
      </p>
      <h1 className="mt-2 font-display text-3xl tracking-tight text-ink">
        Activity history
      </h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
        A read-only record of business activity across products, vendors, stock,
        supplies, payments and deliveries.
      </p>
    </div>
  );
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
