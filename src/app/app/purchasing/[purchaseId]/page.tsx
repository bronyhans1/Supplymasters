import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { formatGhs } from "@/lib/purchasing/money";
import { getPurchase } from "@/lib/purchasing/queries";
import { AppError } from "@/lib/utils/errors";

type Params = Promise<{ purchaseId: string }>;

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

export default async function PurchaseDetailPage({ params }: { params: Params }) {
  await requireAdmin();
  const { purchaseId } = await params;
  let purchase;
  try {
    purchase = await getPurchase(purchaseId);
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 404) notFound();
    return (
      <div role="alert" className="text-sm text-accent">
        {error instanceof AppError ? error.message : "Unable to load that purchase."}
      </div>
    );
  }

  return (
    <section className="mx-auto w-full max-w-5xl space-y-6">
      <div>
        <Link
          href="/app/purchasing"
          className="text-sm font-medium text-accent underline-offset-2 hover:underline"
        >
          ← Back to purchasing
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl tracking-tight text-ink">
              {purchase.purchase_ref}
            </h1>
            <p className="mt-1 text-sm text-muted">
              Received {formatDate(purchase.purchase_date)}
            </p>
          </div>
          <span className="inline-flex rounded-md bg-good/10 px-2.5 py-1 text-xs font-medium text-good">
            Received
          </span>
        </div>
      </div>

      <dl className="grid gap-4 rounded-xl border border-line bg-surface/90 p-5 sm:grid-cols-2">
        <Item label="Stock supplier" value={purchase.supplier?.name ?? "—"} />
        <Item
          label="Supplier code"
          value={purchase.supplier?.supplier_code ?? "—"}
        />
        <Item
          label="Contact person"
          value={purchase.supplier?.contact_person ?? "—"}
        />
        <Item label="Phone number" value={purchase.supplier?.phone ?? "—"} />
        <Item
          label="Supplier invoice ref"
          value={purchase.supplier_invoice_ref ?? "—"}
        />
        <Item label="Recorded" value={formatDateTime(purchase.created_at)} />
        <Item label="Purchase total" value={formatGhs(Number(purchase.total_cost))} />
        <Item label="Notes" value={purchase.notes ?? "—"} />
      </dl>

      <div className="overflow-x-auto rounded-xl border border-line bg-surface/90">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-line bg-paper/80 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">Quantity</th>
              <th className="px-4 py-3 font-medium">Unit cost</th>
              <th className="px-4 py-3 font-medium">Line total</th>
            </tr>
          </thead>
          <tbody>
            {purchase.items.map((item) => (
              <tr key={item.id} className="border-b border-line/70 last:border-0">
                <td className="px-4 py-3">
                  <div className="font-medium text-ink">
                    {item.product?.name ?? "Product"}
                  </div>
                  <div className="text-xs text-muted">
                    {item.product?.product_code} · UoM {item.product?.unit_of_measure} ·
                    Pack {item.product?.packaging_size}
                  </div>
                </td>
                <td className="px-4 py-3 text-muted">{item.quantity_boxes}</td>
                <td className="px-4 py-3 text-muted">
                  {formatGhs(Number(item.unit_purchase_cost))}
                </td>
                <td className="px-4 py-3 font-medium">
                  {formatGhs(Number(item.line_total))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-muted">
        This purchase was received into inventory when it was confirmed. Inventory
        adjustments are handled separately in a later module.
      </p>
    </section>
  );
}

function Item({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 text-sm text-ink">{value}</dd>
    </div>
  );
}
