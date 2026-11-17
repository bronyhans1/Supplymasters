import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/app/PageHeader";
import { ReportFilters } from "@/components/reports/ReportFilters";
import {
  ReportSection,
  ReportSummaryCard,
  ReportTable,
  mutedCell,
  strongCell,
} from "@/components/reports/ReportSummaryCards";
import { ListPager } from "@/components/ui/ListPager";
import { requireAdmin } from "@/lib/auth/session";
import { buildPageHref } from "@/lib/navigation/pagination";
import { getReportsCenterData } from "@/lib/reports/queries";
import {
  formatReportDate,
  formatReportQuantity,
} from "@/lib/reports/presentation";
import { formatGhs } from "@/lib/supplies/money";
import { paymentMethodLabel } from "@/lib/payments/presentation";
import { AppError } from "@/lib/utils/errors";
import type { ReportSection as SectionId } from "@/lib/reports/schemas";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function showSection(current: SectionId, target: SectionId) {
  return current === "overview" || current === target;
}

function RecordLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="font-medium text-accent underline-offset-2 hover:underline"
    >
      {children}
    </Link>
  );
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdmin();
  const params = await searchParams;

  let data;
  try {
    data = await getReportsCenterData(params);
  } catch (error) {
    return (
      <div role="alert" className="text-sm text-accent">
        {error instanceof AppError ? error.message : "Unable to load reports."}
      </div>
    );
  }

  const section = data.query.section;
  const historyTotal = Math.max(
    data.supplies.historyTotal,
    data.payments.historyTotal,
    data.purchasing.historyTotal,
    data.deliveries.historyTotal,
    data.vendors.historyTotal,
  );
  const totalPages = Math.max(1, Math.ceil(historyTotal / 20));
  const shown = Math.max(
    0,
    data.payments.historyPage.length,
    data.purchasing.history.length,
    data.deliveries.history.length,
    data.vendors.history.length,
  );

  return (
    <section className="mx-auto w-full max-w-6xl min-w-0 space-y-8">
      <div className="min-w-0">
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-muted">
          Reports Center
        </p>
        <PageHeader
          title="Operational reports"
          description={
            <>
              Period: <span className="font-medium text-ink">{data.period.label}</span>{" "}
              ({data.period.fromDate} → {data.period.toDate}). Summaries use the full
              filtered dataset. Detail tables are paginated. Cash collected uses
              payment amounts; supply value uses supply totals — they are never added
              together.
            </>
          }
        />
      </div>

      <Suspense fallback={<p className="text-sm text-muted">Loading filters…</p>}>
        <ReportFilters
          initialPeriod={data.query.period}
          initialFromDate={data.query.fromDate}
          initialToDate={data.query.toDate}
          initialSection={data.query.section}
          initialVendorId={data.query.vendorId}
          initialSupplierId={data.query.supplierId}
          initialPaymentMethod={data.query.paymentMethod}
          initialDeliveryStatus={data.query.deliveryStatus}
          initialStaffId={data.query.staffId}
          vendors={data.filterOptions.vendors}
          selectedProduct={data.filterOptions.selectedProduct}
          suppliers={data.filterOptions.suppliers}
          staff={data.filterOptions.staff}
        />
      </Suspense>

      {showSection(section, "overview") ? (
        <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 xl:grid-cols-4">
          <ReportSummaryCard
            label="Supplies"
            value={formatReportQuantity(data.supplies.supplyCount)}
            hint={formatGhs(data.supplies.totalSupplyValue)}
          />
          <ReportSummaryCard
            label="Cash collected"
            value={formatGhs(data.payments.cashCollected.totalAmount)}
            hint={`${data.payments.cashCollected.count} payments`}
          />
          <ReportSummaryCard
            label="Purchase cost"
            value={formatGhs(data.purchasing.totalPurchaseCost)}
            hint={`${data.purchasing.purchaseCount} purchases`}
          />
          <ReportSummaryCard
            label="Open-ish deliveries"
            value={formatReportQuantity(
              data.deliveries.counts.PENDING + data.deliveries.counts.DISPATCHED,
            )}
            hint={`${data.deliveries.total} in period`}
          />
        </div>
      ) : null}

      {showSection(section, "supplies") ? (
        <ReportSection
          id="supplies"
          title="Supplies"
          description="Supply count and value use supplies.grand_total. Quantities come from supply_items. Header and line money totals are not combined."
        >
          <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 sm:grid-cols-3">
            <ReportSummaryCard
              label="Supplies"
              value={formatReportQuantity(data.supplies.supplyCount)}
            />
            <ReportSummaryCard
              label="Supply value"
              value={formatGhs(data.supplies.totalSupplyValue)}
            />
            <ReportSummaryCard
              label="Quantity supplied"
              value={formatReportQuantity(data.supplies.totalQuantitySupplied)}
            />
          </div>
          <ReportTable
            headers={["Date", "Supplies", "Quantity", "Value"]}
            rows={data.supplies.byDate.slice(0, 14).map((row) => ({
              key: row.date,
              title: formatReportDate(row.date),
              fields: [
                { label: "Supplies", value: row.count },
                { label: "Quantity", value: row.quantity },
                { label: "Value", value: formatGhs(row.amount) },
              ],
              cells: [
                formatReportDate(row.date),
                mutedCell(row.count),
                mutedCell(row.quantity),
                strongCell(formatGhs(row.amount)),
              ],
            }))}
          />
          <ReportTable
            headers={["Vendor", "Supplies", "Quantity", "Value"]}
            rows={data.supplies.byVendor.slice(0, 20).map((row) => ({
              key: row.id,
              title: row.label,
              fields: [
                { label: "Supplies", value: row.count },
                { label: "Quantity", value: row.quantity },
                { label: "Value", value: formatGhs(row.amount) },
              ],
              cells: [
                row.label,
                mutedCell(row.count),
                mutedCell(row.quantity),
                strongCell(formatGhs(row.amount)),
              ],
            }))}
          />
          <ReportTable
            headers={["Product", "Lines", "Quantity"]}
            rows={data.supplies.byProduct.slice(0, 20).map((row) => ({
              key: row.id,
              title: row.label,
              fields: [
                { label: "Lines", value: row.count },
                { label: "Quantity", value: row.quantity },
              ],
              cells: [row.label, mutedCell(row.count), strongCell(row.quantity)],
            }))}
          />
        </ReportSection>
      ) : null}

      {showSection(section, "payments") ? (
        <ReportSection
          id="payments"
          title="Payments"
          description="Cash collected uses payments.amount only. Reconciliation compares each payment to its linked supply grand_total without adding the two."
        >
          <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 xl:grid-cols-4">
            <ReportSummaryCard
              label="Cash collected"
              value={formatGhs(data.payments.cashCollected.totalAmount)}
            />
            <ReportSummaryCard
              label="Payments"
              value={formatReportQuantity(data.payments.cashCollected.count)}
            />
            <ReportSummaryCard
              label="Matched to supply"
              value={formatReportQuantity(data.payments.reconciliation.matchedCount)}
            />
            <ReportSummaryCard
              label="Mismatched / missing"
              value={formatReportQuantity(
                data.payments.reconciliation.mismatchedCount +
                  data.payments.reconciliation.missingSupplyCount,
              )}
            />
          </div>
          <ReportTable
            headers={["Method", "Payments", "Amount"]}
            rows={data.payments.cashCollected.byMethod.map((row) => ({
              key: row.method,
              title: paymentMethodLabel(row.method),
              fields: [
                { label: "Payments", value: row.count },
                { label: "Amount", value: formatGhs(row.amount) },
              ],
              cells: [
                paymentMethodLabel(row.method),
                mutedCell(row.count),
                strongCell(formatGhs(row.amount)),
              ],
            }))}
          />
          <ReportTable
            headers={["Date", "Payments", "Amount"]}
            rows={data.payments.byDate.slice(0, 14).map((row) => ({
              key: row.date,
              title: formatReportDate(row.date),
              fields: [
                { label: "Payments", value: row.count },
                { label: "Amount", value: formatGhs(row.amount) },
              ],
              cells: [
                formatReportDate(row.date),
                mutedCell(row.count),
                strongCell(formatGhs(row.amount)),
              ],
            }))}
          />
          <ReportTable
            headers={["Payment", "Date", "Vendor", "Method", "Amount", "Supply total"]}
            rows={data.payments.historyPage.map((row) => {
              const supplyTotal =
                row.supply_grand_total === null
                  ? "—"
                  : formatGhs(row.supply_grand_total);
              return {
                key: row.id,
                title: (
                  <RecordLink href={`/app/payments/${row.id}`}>
                    {row.payment_ref}
                  </RecordLink>
                ),
                fields: [
                  { label: "Date", value: formatReportDate(row.payment_date) },
                  { label: "Vendor", value: row.vendor_name },
                  { label: "Method", value: paymentMethodLabel(row.payment_method) },
                  { label: "Amount", value: formatGhs(row.amount) },
                  { label: "Supply total", value: supplyTotal },
                ],
                cells: [
                  <RecordLink key="ref" href={`/app/payments/${row.id}`}>
                    {row.payment_ref}
                  </RecordLink>,
                  mutedCell(formatReportDate(row.payment_date)),
                  row.vendor_name,
                  mutedCell(paymentMethodLabel(row.payment_method)),
                  strongCell(formatGhs(row.amount)),
                  mutedCell(supplyTotal),
                ],
              };
            })}
          />
        </ReportSection>
      ) : null}

      {showSection(section, "inventory") ? (
        <ReportSection
          id="inventory"
          title="Inventory"
          description="On-hand quantities only. No inventory valuation is calculated. Adjustments and movements are listed separately from current balances."
        >
          <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 xl:grid-cols-4">
            <ReportSummaryCard
              label="Products"
              value={formatReportQuantity(data.inventory.productCount)}
            />
            <ReportSummaryCard
              label="Inventory rows"
              value={formatReportQuantity(data.inventory.inventoryRowCount)}
            />
            <ReportSummaryCard
              label="Total on hand"
              value={formatReportQuantity(data.inventory.totalOnHand)}
            />
            <ReportSummaryCard
              label="Zero-stock"
              value={formatReportQuantity(data.inventory.zeroStockCount)}
            />
          </div>
          <ReportTable
            headers={["Product", "On hand"]}
            rows={data.inventory.zeroStock.slice(0, 30).map((row) => ({
              key: row.product_id,
              title: (
                <RecordLink href={`/app/inventory/${row.product_id}`}>
                  {row.product_name}
                </RecordLink>
              ),
              fields: [{ label: "On hand", value: "0" }],
              cells: [
                <RecordLink key="product" href={`/app/inventory/${row.product_id}`}>
                  {row.product_name}
                </RecordLink>,
                strongCell("0"),
              ],
            }))}
          />
          <ReportTable
            headers={["When", "Product", "Type", "Delta"]}
            rows={data.inventory.movements.map((row) => ({
              key: row.id,
              title: row.product_name,
              subtitle: formatReportDate(row.created_at),
              fields: [
                { label: "Type", value: row.movement_type },
                { label: "Delta", value: row.quantity_delta },
              ],
              cells: [
                mutedCell(formatReportDate(row.created_at)),
                row.product_name,
                mutedCell(row.movement_type),
                strongCell(row.quantity_delta),
              ],
            }))}
          />
          <ReportTable
            headers={["When", "Product", "Adjustment", "Reason"]}
            rows={data.inventory.adjustments.map((row) => ({
              key: row.id,
              title: row.product_name,
              subtitle: formatReportDate(row.created_at),
              fields: [
                { label: "Adjustment", value: row.quantity_delta },
                { label: "Reason", value: row.reason ?? "—" },
              ],
              cells: [
                mutedCell(formatReportDate(row.created_at)),
                row.product_name,
                strongCell(row.quantity_delta),
                mutedCell(row.reason ?? "—"),
              ],
            }))}
          />
        </ReportSection>
      ) : null}

      {showSection(section, "purchasing") ? (
        <ReportSection
          id="purchasing"
          title="Purchasing"
          description="Purchase cost uses stock_purchases.total_cost. Quantities come from purchase items. Header and line costs are not combined."
        >
          <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 sm:grid-cols-3">
            <ReportSummaryCard
              label="Purchases"
              value={formatReportQuantity(data.purchasing.purchaseCount)}
            />
            <ReportSummaryCard
              label="Purchase cost"
              value={formatGhs(data.purchasing.totalPurchaseCost)}
            />
            <ReportSummaryCard
              label="Quantity purchased"
              value={formatReportQuantity(data.purchasing.totalQuantityPurchased)}
            />
          </div>
          <ReportTable
            headers={["Supplier", "Purchases", "Quantity", "Cost"]}
            rows={data.purchasing.bySupplier.map((row) => ({
              key: row.id,
              title: row.label,
              fields: [
                { label: "Purchases", value: row.count },
                { label: "Quantity", value: row.quantity },
                { label: "Cost", value: formatGhs(row.amount) },
              ],
              cells: [
                row.label,
                mutedCell(row.count),
                mutedCell(row.quantity),
                strongCell(formatGhs(row.amount)),
              ],
            }))}
          />
          <ReportTable
            headers={["Date", "Supplier", "Cost"]}
            rows={data.purchasing.history.map((row) => ({
              key: row.id,
              title: formatReportDate(row.purchase_date),
              fields: [
                { label: "Supplier", value: row.supplier_name },
                { label: "Cost", value: formatGhs(row.total_cost) },
              ],
              cells: [
                formatReportDate(row.purchase_date),
                row.supplier_name,
                strongCell(formatGhs(row.total_cost)),
              ],
            }))}
          />
        </ReportSection>
      ) : null}

      {showSection(section, "deliveries") ? (
        <ReportSection
          id="deliveries"
          title="Deliveries"
          description="Delivery status counts only. Status changes do not imply inventory or payment changes."
        >
          <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 xl:grid-cols-5">
            {(
              [
                ["Pending", data.deliveries.counts.PENDING],
                ["Dispatched", data.deliveries.counts.DISPATCHED],
                ["Delivered", data.deliveries.counts.DELIVERED],
                ["Failed", data.deliveries.counts.FAILED],
                ["Cancelled", data.deliveries.counts.CANCELLED],
              ] as const
            ).map(([label, value]) => (
              <ReportSummaryCard
                key={label}
                label={label}
                value={formatReportQuantity(value)}
              />
            ))}
          </div>
          <ReportTable
            headers={["Delivery", "Date", "Status", "Vendor", "Staff", "Driver"]}
            rows={data.deliveries.history.map((row) => ({
              key: row.id,
              title: (
                <RecordLink href={`/app/deliveries/${row.id}`}>
                  {row.delivery_ref}
                </RecordLink>
              ),
              fields: [
                { label: "Date", value: formatReportDate(row.delivery_date) },
                { label: "Status", value: row.status },
                { label: "Vendor", value: row.vendor_name ?? "—" },
                { label: "Staff", value: row.staff_name ?? "—" },
                { label: "Driver", value: row.driver_name ?? "—" },
              ],
              cells: [
                <RecordLink key="ref" href={`/app/deliveries/${row.id}`}>
                  {row.delivery_ref}
                </RecordLink>,
                mutedCell(formatReportDate(row.delivery_date)),
                row.status,
                row.vendor_name ?? "—",
                mutedCell(row.staff_name ?? "—"),
                mutedCell(row.driver_name ?? "—"),
              ],
            }))}
          />
        </ReportSection>
      ) : null}

      {showSection(section, "returns") ? (
        <ReportSection
          id="returns"
          title="Returns"
          description={data.returns.note}
        >
          <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 sm:grid-cols-3">
            <ReportSummaryCard
              label="Returns"
              value={formatReportQuantity(data.returns.returnCount)}
            />
            <ReportSummaryCard
              label="Returned quantity"
              value={formatReportQuantity(data.returns.returnedQuantity)}
            />
            <ReportSummaryCard
              label="Inventory restored"
              value={formatReportQuantity(data.returns.inventoryRestoredQuantity)}
              hint="From DELIVERY_RETURN movements"
            />
          </div>
          <ReportTable
            headers={["Product", "Returns lines", "Quantity"]}
            rows={data.returns.byProduct.slice(0, 20).map((row) => ({
              key: row.id,
              title: row.label,
              fields: [
                { label: "Returns lines", value: row.count },
                { label: "Quantity", value: row.quantity },
              ],
              cells: [row.label, mutedCell(row.count), strongCell(row.quantity)],
            }))}
          />
          <ReportTable
            headers={["Delivery", "Returns", "Quantity"]}
            rows={data.returns.byDelivery.slice(0, 20).map((row) => ({
              key: row.id,
              title: (
                <RecordLink href={`/app/deliveries/${row.id}`}>{row.label}</RecordLink>
              ),
              fields: [
                { label: "Returns", value: row.count },
                { label: "Quantity", value: row.quantity },
              ],
              cells: [
                <RecordLink key="delivery" href={`/app/deliveries/${row.id}`}>
                  {row.label}
                </RecordLink>,
                mutedCell(row.count),
                strongCell(row.quantity),
              ],
            }))}
          />
        </ReportSection>
      ) : null}

      {showSection(section, "vendors") ? (
        <ReportSection
          id="vendors"
          title="Vendors"
          description="Vendor supply value uses supplies.grand_total. Cash collected for the same period is listed separately from payments and is not an outstanding balance."
        >
          <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 xl:grid-cols-4">
            <ReportSummaryCard
              label="Vendors"
              value={formatReportQuantity(data.vendors.vendorCount)}
            />
            <ReportSummaryCard
              label="Supplies"
              value={formatReportQuantity(data.vendors.supplyCount)}
            />
            <ReportSummaryCard
              label="Supply value"
              value={formatGhs(data.vendors.totalSupplyValue)}
            />
            <ReportSummaryCard
              label="Cash collected"
              value={formatGhs(data.vendors.totalCashCollected)}
            />
          </div>
          <ReportTable
            headers={["Vendor", "Supplies", "Quantity", "Supply value"]}
            rows={data.vendors.byVendor.map((row) => ({
              key: row.id,
              title: (
                <RecordLink href={`/app/vendors/${row.id}`}>{row.label}</RecordLink>
              ),
              fields: [
                { label: "Supplies", value: row.count },
                { label: "Quantity", value: row.quantity },
                { label: "Supply value", value: formatGhs(row.amount) },
              ],
              cells: [
                <RecordLink key="vendor" href={`/app/vendors/${row.id}`}>
                  {row.label}
                </RecordLink>,
                mutedCell(row.count),
                mutedCell(row.quantity),
                strongCell(formatGhs(row.amount)),
              ],
            }))}
          />
          <ReportTable
            headers={["Date", "Vendor", "Qty", "Supply value", "Payment"]}
            rows={data.vendors.history.map((row) => {
              const payment =
                row.payment_amount === null ? "—" : formatGhs(row.payment_amount);
              return {
                key: row.supply_id,
                title: formatReportDate(row.supply_date),
                subtitle: row.vendor_name,
                fields: [
                  { label: "Qty", value: row.quantity },
                  { label: "Supply value", value: formatGhs(row.grand_total) },
                  { label: "Payment", value: payment },
                ],
                cells: [
                  formatReportDate(row.supply_date),
                  row.vendor_name,
                  mutedCell(row.quantity),
                  strongCell(formatGhs(row.grand_total)),
                  mutedCell(payment),
                ],
              };
            })}
          />
        </ReportSection>
      ) : null}

      <ListPager
        page={data.query.page}
        totalPages={totalPages}
        total={historyTotal}
        shown={shown}
        prevHref={
          data.query.page > 1
            ? buildPageHref("/app/reports", data.query.page - 1, params)
            : null
        }
        nextHref={
          data.query.page < totalPages
            ? buildPageHref("/app/reports", data.query.page + 1, params)
            : null
        }
      />
    </section>
  );
}
