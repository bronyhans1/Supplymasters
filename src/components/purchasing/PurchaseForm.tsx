"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useCreateSuccessNavigation,
  useCreateWritePending,
} from "@/components/navigation/create-success";
import { SupplierLinePicker } from "@/components/partners/PartnerPicker";
import { ProductLinePicker } from "@/components/products/ProductPicker";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FormActionBar } from "@/components/ui/FormActionBar";
import {
  formControlClass,
  formLabelClass,
  formSecondaryButtonClass,
} from "@/components/ui/form-styles";
import { LoadingButton } from "@/components/ui/LoadingButton";
import { useToast } from "@/components/ui/ToastProvider";
import type { SupplierOption } from "@/lib/partners/options";
import { receivePurchase } from "@/lib/purchasing/actions";
import { formatGhs, lineTotal, sumLineTotals } from "@/lib/purchasing/money";
import type { ProductOption } from "@/lib/products/options";
import { cn } from "@/lib/utils/cn";
import { createUuid } from "@/lib/utils/id";

type LineDraft = {
  key: string;
  productId: string;
  quantity: string;
  unitCost: string;
};

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function PurchaseForm({
  hasActiveSuppliers,
  hasActiveProducts,
}: {
  hasActiveSuppliers: boolean;
  hasActiveProducts: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const completeCreate = useCreateSuccessNavigation();
  const { pending, runWrite } = useCreateWritePending();
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  // Stable for this intentional form session — reused on retries; new page load = new id.
  const [clientRequestId] = useState(() => createUuid());
  const [selectedSupplier, setSelectedSupplier] =
    useState<SupplierOption | null>(null);
  const supplierId = selectedSupplier?.id ?? "";
  const [purchaseDate, setPurchaseDate] = useState(todayIsoDate);
  const [invoiceRef, setInvoiceRef] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([]);
  const [productById, setProductById] = useState(
    () => new Map<string, ProductOption>(),
  );
  const busy = pending || confirmOpen;

  const productMap = productById;
  const excludeProductIds = useMemo(
    () => lines.map((line) => line.productId),
    [lines],
  );

  const computed = useMemo(() => {
    const parsed = lines
      .map((line) => {
        const quantity = Number(line.quantity);
        const unitCost = Number(line.unitCost);
        if (
          !line.productId ||
          !Number.isInteger(quantity) ||
          quantity <= 0 ||
          !Number.isFinite(unitCost) ||
          unitCost < 0
        ) {
          return null;
        }
        return { quantity, unitCost };
      })
      .filter((line): line is { quantity: number; unitCost: number } => line !== null);

    return {
      validLineCount: parsed.length,
      grandTotal: sumLineTotals(parsed),
    };
  }, [lines]);

  function addProduct(product: ProductOption) {
    if (lines.some((line) => line.productId === product.id)) {
      setError("That product is already on this purchase.");
      return;
    }
    setError(null);
    setProductById((current) => {
      const next = new Map(current);
      next.set(product.id, product);
      return next;
    });
    setLines((current) => [
      ...current,
      {
        key: `${product.id}-${createUuid()}`,
        productId: product.id,
        quantity: "1",
        unitCost: "0.00",
      },
    ]);
  }

  function updateLine(key: string, patch: Partial<LineDraft>) {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  }

  function removeLine(key: string) {
    setLines((current) => current.filter((line) => line.key !== key));
  }

  function openReceiveConfirm() {
    if (pending || confirmOpen) return;
    if (!supplierId) {
      setError("Select a stock supplier.");
      return;
    }
    if (lines.length === 0) {
      setError("Add at least one product.");
      return;
    }
    setError(null);
    setConfirmError(null);
    setConfirmOpen(true);
  }

  function receiveConfirmedPurchase() {
    void runWrite(async () => {
      setConfirmError(null);
      setError(null);
      const result = await receivePurchase({
        clientRequestId,
        supplierId,
        purchaseDate,
        supplierInvoiceRef: invoiceRef,
        notes,
        items: lines.map((line) => ({
          productId: line.productId,
          quantity: Number(line.quantity),
          unitCost: line.unitCost,
        })),
      });

      if (!result.ok) {
        // Keep clientRequestId so a retry of this intentional submission stays idempotent.
        setConfirmError(result.error.message);
        setError(result.error.message);
        setConfirmOpen(false);
        toast.error(result.error.message, "Purchase not received");
        return;
      }

      setConfirmOpen(false);
      completeCreate({
        listHref: "/app/purchasing",
        message: `Purchase ${result.data.purchase_ref} received. Inventory has been updated.`,
      });
    });
  }

  if (!hasActiveSuppliers) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-surface/70 px-5 py-8 text-sm text-muted">
        Add an active stock supplier before receiving a purchase.
      </div>
    );
  }

  if (!hasActiveProducts) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-surface/70 px-5 py-8 text-sm text-muted">
        Add at least one active product before receiving a purchase.
      </div>
    );
  }

  const lineRows = lines.map((line) => {
    const product = productMap.get(line.productId);
    const quantity = Number(line.quantity);
    const unitCost = Number(line.unitCost);
    const total =
      Number.isInteger(quantity) &&
      quantity > 0 &&
      Number.isFinite(unitCost) &&
      unitCost >= 0
        ? formatGhs(lineTotal(quantity, unitCost))
        : "—";
    return { line, product, total };
  });

  return (
    <div className="space-y-6">
      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-sm text-accent"
        >
          {error}
        </div>
      ) : null}

      <section className="space-y-4 rounded-xl border border-line bg-surface/90 p-5">
        <div>
          <h2 className="font-display text-xl text-ink">Supplier</h2>
          <p className="mt-1 text-sm text-muted">
            Only active stock suppliers can be used for purchases.
          </p>
        </div>

        {selectedSupplier ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 rounded-lg border border-line bg-paper px-3 py-2 text-sm">
              <span className="min-w-0 truncate text-ink">
                {selectedSupplier.name} ({selectedSupplier.supplier_code})
              </span>
              <button
                type="button"
                disabled={busy}
                className="shrink-0 text-xs font-medium text-accent hover:underline"
                onClick={() => setSelectedSupplier(null)}
              >
                Change
              </button>
            </div>
            <dl className="grid gap-3 rounded-lg border border-line bg-paper/60 p-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted">
                  Contact person
                </dt>
                <dd className="mt-1 text-ink">
                  {selectedSupplier.contact_person ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted">
                  Phone number
                </dt>
                <dd className="mt-1 text-ink">{selectedSupplier.phone ?? "—"}</dd>
              </div>
            </dl>
          </div>
        ) : (
          <SupplierLinePicker
            disabled={busy}
            onPick={(supplier) => setSelectedSupplier(supplier)}
          />
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-ink">Purchase date</span>
            <input
              type="date"
              value={purchaseDate}
              disabled={busy}
              onChange={(event) => setPurchaseDate(event.target.value)}
              className={formControlClass}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-ink">Supplier invoice ref (optional)</span>
            <input
              value={invoiceRef}
              disabled={busy}
              onChange={(event) => setInvoiceRef(event.target.value)}
              className={formControlClass}
              placeholder="Supplier invoice or delivery note"
            />
          </label>
        </div>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-ink">Notes (optional)</span>
          <textarea
            rows={3}
            value={notes}
            disabled={busy}
            onChange={(event) => setNotes(event.target.value)}
            className={formControlClass}
          />
        </label>
      </section>

      <section className="space-y-4 rounded-xl border border-line bg-surface/90 p-5">
        <div>
          <h2 className="font-display text-xl text-ink">Products</h2>
          <p className="mt-1 text-sm text-muted">
            Quantity is the number of units received in the product&apos;s unit of measure.
            Packaging size describes how the product is packed — not the quantity entered here.
          </p>
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium text-ink">Add product</p>
          <ProductLinePicker
            excludeIds={excludeProductIds}
            disabled={busy}
            onPick={addProduct}
          />
        </div>

        {lines.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
            No products added yet.
          </p>
        ) : (
          <>
            {/* Mobile: one card per line */}
            <ul className="space-y-3 lg:hidden">
              {lineRows.map(({ line, product, total }) => (
                <li
                  key={line.key}
                  className="space-y-3 rounded-xl border border-line bg-paper/60 p-4"
                >
                  <div>
                    <div className="font-medium text-ink">{product?.name ?? "Product"}</div>
                    <div className="text-xs leading-5 text-muted">
                      {product?.product_code} · UoM {product?.unit_of_measure} · Pack{" "}
                      {product?.packaging_size}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block space-y-1.5">
                      <span className={formLabelClass}>Qty</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        step={1}
                        value={line.quantity}
                        disabled={busy}
                        onChange={(event) =>
                          updateLine(line.key, { quantity: event.target.value })
                        }
                        className={formControlClass}
                      />
                    </label>
                    <label className="block space-y-1.5">
                      <span className={formLabelClass}>Unit cost</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="0.01"
                        value={line.unitCost}
                        disabled={busy}
                        onChange={(event) =>
                          updateLine(line.key, { unitCost: event.target.value })
                        }
                        className={formControlClass}
                      />
                    </label>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-muted">
                      Line total{" "}
                      <span className="font-medium text-ink">{total}</span>
                    </p>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => removeLine(line.key)}
                      className={cn(formSecondaryButtonClass, "text-accent")}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            {/* Desktop: table */}
            <div className="hidden overflow-x-auto rounded-xl border border-line lg:block">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-line bg-paper/80 text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-3 py-2.5 font-medium">Product</th>
                    <th className="px-3 py-2.5 font-medium">Qty</th>
                    <th className="px-3 py-2.5 font-medium">Unit cost</th>
                    <th className="px-3 py-2.5 font-medium">Line total</th>
                    <th className="px-3 py-2.5 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {lineRows.map(({ line, product, total }) => (
                    <tr key={line.key} className="border-b border-line/70 last:border-0">
                      <td className="px-3 py-3 align-top">
                        <div className="font-medium text-ink">{product?.name ?? "Product"}</div>
                        <div className="text-xs text-muted">
                          {product?.product_code} · UoM {product?.unit_of_measure} · Pack{" "}
                          {product?.packaging_size}
                        </div>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <input
                          type="number"
                          min={1}
                          step={1}
                          value={line.quantity}
                          disabled={busy}
                          onChange={(event) =>
                            updateLine(line.key, { quantity: event.target.value })
                          }
                          className={cn(formControlClass, "w-24")}
                        />
                      </td>
                      <td className="px-3 py-3 align-top">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={line.unitCost}
                          disabled={busy}
                          onChange={(event) =>
                            updateLine(line.key, { unitCost: event.target.value })
                          }
                          className={cn(formControlClass, "w-28")}
                        />
                      </td>
                      <td className="px-3 py-3 align-top font-medium text-ink">{total}</td>
                      <td className="px-3 py-3 align-top">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => removeLine(line.key)}
                          className="inline-flex min-h-11 items-center px-2 text-sm text-accent hover:underline disabled:opacity-60"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">
            {computed.validLineCount} of {lines.length} line
            {lines.length === 1 ? "" : "s"} ready · Totals are recalculated securely on the
            server.
          </p>
          <p className="font-display text-2xl text-ink">
            Total {formatGhs(computed.grandTotal)}
          </p>
        </div>
      </section>

      <FormActionBar>
        <LoadingButton
          type="button"
          pending={pending}
          disabled={busy}
          idleLabel="Confirm and receive purchase"
          pendingLabel="Receiving purchase…"
          onClick={openReceiveConfirm}
          variant="accent"
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => router.push("/app/purchasing")}
          className={formSecondaryButtonClass}
        >
          Cancel
        </button>
      </FormActionBar>

      <ConfirmDialog
        open={confirmOpen}
        pending={pending}
        error={confirmError}
        variant="warning"
        title="Receive this purchase?"
        description={
          <>
            Receiving this purchase increases inventory immediately for every product
            line. This cannot be undone from this screen.
          </>
        }
        confirmLabel="Receive purchase"
        pendingLabel="Receiving purchase…"
        cancelLabel="Go back"
        onCancel={() => {
          if (!pending) {
            setConfirmOpen(false);
            setConfirmError(null);
          }
        }}
        onConfirm={receiveConfirmedPurchase}
      />
    </div>
  );
}
