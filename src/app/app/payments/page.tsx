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
  let vendorOptions;
  try {
    [list, vendorOptions] = await Promise.all([
      listPayments(params),
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
        description="Read-only ledger of full payments recorded with wholesale supplies. Payments are created only through the supply workflow — not from this page."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Matching payments"
          value={String(list.summary.matchingCount)}
        />
        <SummaryCard
          label="Amount collected"
          value={formatGhs(list.summary.matchingAmount)}
        />
        <SummaryCard
          label="Payments today"
          value={String(list.summary.todayCount)}
        />
        <SummaryCard
          label="Collected today"
          value={formatGhs(list.summary.todayAmount)}
        />
      </div>
      <p className="text-xs text-muted">{list.summary.scopeNote}</p>

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
                <tr key={entry.method} className="border-b border-line/70 last:border-0">
                  <td className="px-4 py-3">{paymentMethodLabel(entry.method)}</td>
                  <td className="px-4 py-3 text-muted">{entry.count}</td>
                  <td className="px-4 py-3 font-medium">{formatGhs(entry.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DesktopTableShell>
        </>
      ) : null}

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
            : "No payments yet. Payment records are created automatically when a supply is recorded."}
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
                  <tr key={payment.id} className="border-b border-line/70 last:border-0">
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
