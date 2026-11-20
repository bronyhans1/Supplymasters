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
import { PaymentFilters } from "@/components/payments/PaymentFilters";
import { PaymentMethodBadge } from "@/components/payments/PaymentMethodBadge";
import {
  formatPaymentDate,
  paymentMethodLabel,
} from "@/lib/payments/presentation";
import {
  listPayments,
  listPendingPaymentObligations,
  listVendorsForPaymentFilter,
} from "@/lib/payments/queries";
import { formatGhs } from "@/lib/supplies/money";
import { AppError } from "@/lib/utils/errors";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  let list;
  let pending;
  let vendorOptions;
  try {
    [list, pending, vendorOptions] = await Promise.all([
      listPayments(params),
      listPendingPaymentObligations(params),
      listVendorsForPaymentFilter(),
    ]);
  } catch (error) {
    return (
      <div role="alert" className="text-sm text-accent">
        {error instanceof AppError ? error.message : "Unable to load payments."}
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(list.total / list.pageSize));
  const pendingPages = Math.max(1, Math.ceil(pending.total / pending.pageSize));
  const hasActiveFilters = Boolean(
    list.query.q ||
      list.query.paymentMethod ||
      list.query.fromDate ||
      list.query.toDate ||
      list.query.vendorId,
  );

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        title="Payments"
        description="Collect and record full payments for confirmed supplies. Pending obligations appear when a supply is created; recording payment is independent of dispatch and delivery."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Pending obligations" value={String(pending.total)} />
        <SummaryCard
          label="Matching payments"
          value={String(list.summary.matchingCount)}
        />
        <SummaryCard
          label="Amount collected"
          value={formatGhs(list.summary.matchingAmount)}
        />
        <SummaryCard
          label="Collected today"
          value={formatGhs(list.summary.todayAmount)}
        />
      </div>
      <p className="text-xs text-muted">{list.summary.scopeNote}</p>

      <section className="space-y-4">
        <div>
          <h2 className="font-display text-xl text-ink">Pending payments</h2>
          <p className="mt-1 text-sm text-muted">
            Confirmed supplies awaiting full payment. Recording payment does not
            change dispatch or delivery status.
          </p>
        </div>

        {pending.obligations.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line px-6 py-10 text-center text-sm text-muted">
            No pending payment obligations.
          </div>
        ) : (
          <>
            <MobileRecordList>
              {pending.obligations.map((obligation) => (
                <RecordCard
                  key={obligation.id}
                  title={obligation.supply_ref}
                  subtitle={obligation.vendor?.business_name ?? "—"}
                  badge={
                    <span className="inline-flex rounded-md bg-line/60 px-2.5 py-1 text-xs font-medium text-muted">
                      Pending
                    </span>
                  }
                  fields={[
                    {
                      label: "Amount due",
                      value: formatGhs(obligation.grand_total),
                    },
                    {
                      label: "Supply date",
                      value: formatPaymentDate(obligation.supply_date),
                    },
                    {
                      label: "Vendor phone",
                      value: obligation.vendor?.phone ?? "—",
                    },
                  ]}
                  action={
                    <ListActionLink href={`/app/payments/record/${obligation.id}`}>
                      Record payment
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
                    <th className="px-4 py-3 font-medium">Vendor</th>
                    <th className="px-4 py-3 font-medium">Amount due</th>
                    <th className="px-4 py-3 font-medium">Supply date</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pending.obligations.map((obligation) => (
                    <tr
                      key={obligation.id}
                      className="border-b border-line/70 last:border-0"
                    >
                      <td className="px-4 py-3 font-medium">
                        {obligation.supply_ref}
                      </td>
                      <td className="px-4 py-3">
                        <div>{obligation.vendor?.business_name ?? "—"}</div>
                        <div className="text-xs text-muted">
                          {obligation.vendor?.phone ?? ""}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {formatGhs(obligation.grand_total)}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {formatPaymentDate(obligation.supply_date)}
                      </td>
                      <td className="px-4 py-3 text-muted">Pending</td>
                      <td className="px-4 py-3">
                        <ListActionLink
                          href={`/app/payments/record/${obligation.id}`}
                          variant="table"
                        >
                          Record payment
                        </ListActionLink>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DesktopTableShell>

            <ListPager
              page={pending.page}
              totalPages={pendingPages}
              total={pending.total}
              shown={pending.obligations.length}
              prevHref={
                pending.page > 1
                  ? buildPendingObligationsHref(pending.page - 1, params)
                  : null
              }
              nextHref={
                pending.page < pendingPages
                  ? buildPendingObligationsHref(pending.page + 1, params)
                  : null
              }
            />
          </>
        )}
      </section>

      {list.summary.byMethod.length > 0 ? (
        <>
          <MobileRecordList>
            {list.summary.byMethod.map((entry) => (
              <RecordCard
                key={entry.method}
                title={paymentMethodLabel(entry.method)}
                fields={[
                  { label: "Payments", value: entry.count },
                  { label: "Amount", value: formatGhs(entry.amount) },
                ]}
              />
            ))}
          </MobileRecordList>

          <DesktopTableShell className="bg-surface/90">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-line bg-paper/80 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Payment method</th>
                  <th className="px-4 py-3 font-medium">Payments</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {list.summary.byMethod.map((entry) => (
                  <tr
                    key={entry.method}
                    className="border-b border-line/70 last:border-0"
                  >
                    <td className="px-4 py-3">
                      {paymentMethodLabel(entry.method)}
                    </td>
                    <td className="px-4 py-3 text-muted">{entry.count}</td>
                    <td className="px-4 py-3 font-medium">
                      {formatGhs(entry.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DesktopTableShell>
        </>
      ) : null}

      <section className="space-y-4">
        <div>
          <h2 className="font-display text-xl text-ink">Payment history</h2>
          <p className="mt-1 text-sm text-muted">
            Completed full-payment records.
          </p>
        </div>

        <Suspense fallback={<p className="text-sm text-muted">Loading filters…</p>}>
          <PaymentFilters
            initialQ={list.query.q}
            initialPaymentMethod={list.query.paymentMethod}
            initialFromDate={list.query.fromDate}
            initialToDate={list.query.toDate}
            initialVendorId={list.query.vendorId}
            vendorOptions={vendorOptions}
          />
        </Suspense>

        {list.payments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line px-6 py-12 text-center text-sm text-muted">
            {hasActiveFilters
              ? "No payments match these filters."
              : "No completed payments yet. Record payment from a pending obligation above."}
          </div>
        ) : (
          <>
            <MobileRecordList>
              {list.payments.map((payment) => (
                <RecordCard
                  key={payment.id}
                  title={payment.payment_ref}
                  subtitle={payment.vendor?.business_name ?? "—"}
                  badge={<PaymentMethodBadge method={payment.payment_method} />}
                  fields={[
                    { label: "Amount", value: formatGhs(Number(payment.amount)) },
                    { label: "Supply", value: payment.supply?.supply_ref ?? "—" },
                    { label: "Reference", value: payment.transaction_reference },
                    { label: "Date", value: formatPaymentDate(payment.payment_date) },
                    { label: "Recorded by", value: payment.recorded_by_name ?? "—" },
                  ]}
                  action={
                    <ListActionLink href={`/app/payments/${payment.id}`}>
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
                    <th className="px-4 py-3 font-medium">Payment</th>
                    <th className="px-4 py-3 font-medium">Supply</th>
                    <th className="px-4 py-3 font-medium">Vendor</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Method</th>
                    <th className="px-4 py-3 font-medium">Reference</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Recorded by</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {list.payments.map((payment) => (
                    <tr
                      key={payment.id}
                      className="border-b border-line/70 last:border-0"
                    >
                      <td className="px-4 py-3 font-medium">{payment.payment_ref}</td>
                      <td className="px-4 py-3 text-muted">
                        {payment.supply?.supply_ref ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div>{payment.vendor?.business_name ?? "—"}</div>
                        <div className="text-xs text-muted">
                          {payment.vendor?.phone ?? ""}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {formatGhs(Number(payment.amount))}
                      </td>
                      <td className="px-4 py-3">
                        <PaymentMethodBadge method={payment.payment_method} />
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {payment.transaction_reference ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {formatPaymentDate(payment.payment_date)}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {payment.recorded_by_name ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <ListActionLink
                          href={`/app/payments/${payment.id}`}
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
              shown={list.payments.length}
              prevHref={
                list.page > 1
                  ? buildPageHref("/app/payments", list.page - 1, params)
                  : null
              }
              nextHref={
                list.page < totalPages
                  ? buildPageHref("/app/payments", list.page + 1, params)
                  : null
              }
            />
          </>
        )}
      </section>
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface/90 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl text-ink">{value}</p>
    </div>
  );
}

function buildPendingObligationsHref(
  pendingPage: number,
  params: Record<string, string | string[] | undefined>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === "pendingPage") continue;
    if (typeof value === "string" && value) {
      search.set(key, value);
    }
  }
  if (pendingPage > 1) {
    search.set("pendingPage", String(pendingPage));
  }
  const qs = search.toString();
  return qs ? `/app/payments?${qs}` : "/app/payments";
}
