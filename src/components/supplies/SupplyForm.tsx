"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  useCreateSuccessNavigation,
  useCreateWritePending,
} from "@/components/navigation/create-success";
import { VendorLinePicker } from "@/components/partners/PartnerPicker";
import { ProductLinePicker } from "@/components/products/ProductPicker";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FormActionBar } from "@/components/ui/FormActionBar";
import {
  formControlClass,
  formErrorClass,
  formLabelClass,
  formSecondaryButtonClass,
} from "@/components/ui/form-styles";
import { LoadingButton } from "@/components/ui/LoadingButton";
import { useToast } from "@/components/ui/ToastProvider";
import type { VendorOption } from "@/lib/partners/options";
import type { ProductOption } from "@/lib/products/options";
import { createPaidSupply } from "@/lib/supplies/actions";
import { formatGhs, lineTotal, sumLineTotals } from "@/lib/supplies/money";
import { PAYMENT_METHODS } from "@/lib/supplies/schemas";
import { paymentMethodLabel } from "@/lib/supplies/presentation";
import type { PaymentMethod } from "@/types/database";
import { cn } from "@/lib/utils/cn";
import { createUuid } from "@/lib/utils/id";

type LineDraft = {
  key: string;
  productId: string;
  quantity: string;
  unitPrice: string;
};

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function SupplyForm({
  hasActiveVendors,
  hasActiveProducts,
}: {
  hasActiveVendors: boolean;
  hasActiveProducts: boolean;
}) {
  const toast = useToast();
  const completeCreate = useCreateSuccessNavigation();
  const { pending, runWrite } = useCreateWritePending();
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [clientRequestId, setClientRequestId] = useState(() =>
    createUuid(),
  );
  const [selectedVendor, setSelectedVendor] = useState<VendorOption | null>(
    null,
  );
  const vendorId = selectedVendor?.id ?? "";
  const [supplyDate, setSupplyDate] = useState(todayIsoDate);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [transactionReference, setTransactionReference] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([]);
  /** Options discovered via typeahead — keeps stock/details for selected lines only. */
  const [productById, setProductById] = useState(
    () => new Map<string, ProductOption>(),
  );

  const productMap = productById;
  const excludeProductIds = useMemo(
    () => lines.map((line) => line.productId),
    [lines],
  );

  const computed = useMemo(() => {
    const parsed = lines
      .map((line) => {
        const quantity = Number(line.quantity);
        const unitPrice = Number(line.unitPrice);
        const product = productMap.get(line.productId);
        if (
          !line.productId ||
          !product ||
          !Number.isInteger(quantity) ||
          quantity <= 0 ||
          !Number.isFinite(unitPrice) ||
          unitPrice < 0
        ) {
          return null;
        }
        return {
          productId: line.productId,
          quantity,
          unitPrice,
          available: product.quantity_on_hand ?? 0,
          exceedsStock: quantity > (product.quantity_on_hand ?? 0),
        };
      })
      .filter(
        (
          line,
        ): line is {
          productId: string;
          quantity: number;
          unitPrice: number;
          available: number;
          exceedsStock: boolean;
        } => line !== null,
      );

    return {
      validLineCount: parsed.length,
      totalQuantity: parsed.reduce((sum, line) => sum + line.quantity, 0),
      grandTotal: sumLineTotals(
        parsed.map((line) => ({
          quantity: line.quantity,
          unitCost: line.unitPrice,
        })),
      ),
      stockError: parsed.find((line) => line.exceedsStock) ?? null,
      allValid: parsed.length === lines.length && parsed.length > 0,
    };
  }, [lines, productMap]);

  function addProduct(product: ProductOption) {
    if (lines.some((line) => line.productId === product.id)) {
      setError("That product is already on this supply.");
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
        unitPrice: "0.00",
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

  function openConfirm() {
    if (pending || confirmOpen) return;
    if (!vendorId) {
      setError("Select a vendor.");
      return;
    }
    if (lines.length === 0) {
      setError("Add at least one product.");
      return;
    }
    if (!computed.allValid) {
      setError("Fix product quantities and unit prices before confirming.");
      return;
    }
    if (computed.stockError) {
      setError("One or more quantities exceed available stock.");
      return;
    }
    if (computed.grandTotal <= 0) {
      setError("Supply total must be greater than zero for full payment.");
      return;
    }
    if (!paymentMethod) {
      setError("Select a payment method.");
      return;
    }
    setError(null);
    setConfirmError(null);
    setConfirmOpen(true);
  }

  function submitConfirmedSupply() {
    void runWrite(async () => {
      setConfirmError(null);
      setError(null);
      try {
        const result = await createPaidSupply({
          clientRequestId,
          vendorId,
          supplyDate,
          paymentMethod,
          transactionReference,
          notes,
          items: lines.map((line) => ({
            productId: line.productId,
            quantity: Number(line.quantity),
            unitPrice: line.unitPrice,
          })),
        });

        if (!result.ok) {
          if (result.error.code === "REQUEST_CONFLICT") {
            setClientRequestId(createUuid());
          }
          setConfirmError(result.error.message);
          setError(result.error.message);
          toast.error(result.error.message, "Supply not recorded");
          return;
        }

        setConfirmOpen(false);
        setClientRequestId(createUuid());
        completeCreate({
          listHref: "/app/supplies",
          message: result.message,
        });
      } catch {
        const message =
          "The supply response was unclear. Retry with the same request — it will not double-apply if it already succeeded.";
        setConfirmError(message);
        setError(message);
        toast.error(message, "Supply status uncertain");
      }
    });
  }

  if (!hasActiveVendors) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-surface/70 px-5 py-8 text-sm text-muted">
        Add an active vendor before recording a supply.{" "}
        <Link href="/app/vendors" className="font-medium text-accent hover:underline">
          Open vendors
        </Link>
      </div>
    );
  }

  if (!hasActiveProducts) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-surface/70 px-5 py-8 text-sm text-muted">
        Add at least one active product before recording a supply.
      </div>
    );
  }

  const lineRows = lines.map((line) => {
    const product = productMap.get(line.productId);
    const quantity = Number(line.quantity);
    const unitPrice = Number(line.unitPrice);
    const valid = Boolean(
      product &&
        Number.isInteger(quantity) &&
        quantity > 0 &&
        Number.isFinite(unitPrice) &&
        unitPrice >= 0,
    );
    const exceeds = Boolean(
      product &&
        Number.isInteger(quantity) &&
        quantity > (product.quantity_on_hand ?? 0),
    );
    return { line, product, quantity, unitPrice, valid, exceeds };
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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl text-ink">Vendor</h2>
            <p className="mt-1 text-sm text-muted">
              Wholesale customer receiving this supply.
            </p>
          </div>
          {selectedVendor ? (
            <Link
              href={`/app/vendors/${selectedVendor.id}`}
              className="text-sm font-medium text-accent hover:underline"
            >
              View vendor
            </Link>
          ) : null}
        </div>
        {selectedVendor ? (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-line bg-paper px-3 py-2 text-sm">
            <span className="min-w-0 truncate text-ink">
              {selectedVendor.business_name} · {selectedVendor.vendor_code} ·{" "}
              {selectedVendor.phone}
            </span>
            <button
              type="button"
              disabled={pending}
              className="shrink-0 text-xs font-medium text-accent hover:underline"
              onClick={() => setSelectedVendor(null)}
            >
              Change
            </button>
          </div>
        ) : (
          <VendorLinePicker
            disabled={pending}
            onPick={(vendor) => setSelectedVendor(vendor)}
          />
        )}
        <label className="block space-y-1.5 sm:max-w-xs">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">
            Supply date
          </span>
          <input
            type="date"
            value={supplyDate}
            onChange={(event) => setSupplyDate(event.target.value)}
            className={formControlClass}
            disabled={pending}
          />
        </label>
      </section>

      <section className="space-y-4 rounded-xl border border-line bg-surface/90 p-5">
        <div>
          <h2 className="font-display text-xl text-ink">Products</h2>
          <p className="mt-1 text-sm text-muted">
            Quantities cannot exceed available stock. Each product may appear once.
          </p>
        </div>

        <ProductLinePicker
          includeStock
          excludeIds={excludeProductIds}
          disabled={pending}
          onPick={addProduct}
        />

        {lines.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
            No products added yet.
          </p>
        ) : (
          <>
            {/* Mobile: one card per line */}
            <ul className="space-y-3 lg:hidden">
              {lineRows.map(({ line, product, quantity, unitPrice, valid, exceeds }) => (
                <li
                  key={line.key}
                  className="space-y-3 rounded-xl border border-line bg-paper/60 p-4"
                >
                  <div>
                    <div className="font-medium text-ink">{product?.name ?? "Product"}</div>
                    <div className="text-xs leading-5 text-muted">
                      {product?.product_code} · {product?.unit_of_measure} ·{" "}
                      {product?.quantity_on_hand ?? "—"} on hand
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
                        onChange={(event) =>
                          updateLine(line.key, { quantity: event.target.value })
                        }
                        className={cn(formControlClass, exceeds && "border-accent")}
                        disabled={pending}
                      />
                    </label>
                    <label className="block space-y-1.5">
                      <span className={formLabelClass}>Unit price</span>
                      <input
                        inputMode="decimal"
                        value={line.unitPrice}
                        onChange={(event) =>
                          updateLine(line.key, { unitPrice: event.target.value })
                        }
                        className={formControlClass}
                        disabled={pending}
                      />
                    </label>
                  </div>
                  {exceeds ? (
                    <p className={formErrorClass}>Quantity exceeds available stock.</p>
                  ) : null}
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-muted">
                      Line total{" "}
                      <span className="font-medium text-ink">
                        {valid ? formatGhs(lineTotal(quantity, unitPrice)) : "—"}
                      </span>
                    </p>
                    <button
                      type="button"
                      onClick={() => removeLine(line.key)}
                      disabled={pending}
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
                    <th className="px-3 py-2.5 font-medium">On hand</th>
                    <th className="px-3 py-2.5 font-medium">Qty</th>
                    <th className="px-3 py-2.5 font-medium">Unit price</th>
                    <th className="px-3 py-2.5 font-medium">Line total</th>
                    <th className="px-3 py-2.5 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {lineRows.map(({ line, product, quantity, unitPrice, valid, exceeds }) => (
                    <tr key={line.key} className="border-b border-line/70 last:border-0">
                      <td className="px-3 py-3">
                        <div className="font-medium text-ink">
                          {product?.name ?? "Product"}
                        </div>
                        <div className="text-xs text-muted">
                          {product?.product_code} · {product?.unit_of_measure}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-muted">
                        {product?.quantity_on_hand ?? "—"}
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          min={1}
                          step={1}
                          value={line.quantity}
                          onChange={(event) =>
                            updateLine(line.key, { quantity: event.target.value })
                          }
                          className={cn(formControlClass, "min-w-[5rem]", exceeds && "border-accent")}
                          disabled={pending}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          value={line.unitPrice}
                          onChange={(event) =>
                            updateLine(line.key, { unitPrice: event.target.value })
                          }
                          className={cn(formControlClass, "min-w-[6rem]")}
                          disabled={pending}
                        />
                      </td>
                      <td className="px-3 py-3 font-medium">
                        {valid ? formatGhs(lineTotal(quantity, unitPrice)) : "—"}
                      </td>
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          onClick={() => removeLine(line.key)}
                          disabled={pending}
                          className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-accent hover:underline disabled:opacity-60"
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
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl border border-line bg-surface/90 p-5">
          <h2 className="font-display text-xl text-ink">Full payment</h2>
          <p className="text-sm text-muted">
            Partial payments are not supported. The recorded amount equals the
            supply total.
          </p>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">
              Payment method
            </span>
            <select
              value={paymentMethod}
              onChange={(event) =>
                setPaymentMethod(event.target.value as PaymentMethod)
              }
              className={formControlClass}
              disabled={pending}
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {paymentMethodLabel(method)}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">
              Payment reference
            </span>
            <input
              value={transactionReference}
              onChange={(event) => setTransactionReference(event.target.value)}
              placeholder="Optional receipt or transfer reference"
              className={formControlClass}
              disabled={pending}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">
              Notes
            </span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              className={formControlClass}
              disabled={pending}
            />
          </label>
        </div>

        <div className="space-y-3 rounded-xl border border-line bg-surface/90 p-5">
          <h2 className="font-display text-xl text-ink">Summary</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Vendor</dt>
              <dd className="font-medium text-ink">
                {selectedVendor?.business_name ?? "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Product lines</dt>
              <dd className="font-medium text-ink">{lines.length}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Total quantity</dt>
              <dd className="font-medium text-ink">{computed.totalQuantity}</dd>
            </div>
            <div className="flex justify-between gap-3 border-t border-line pt-2">
              <dt className="text-muted">Supply total</dt>
              <dd className="font-semibold text-ink">
                {formatGhs(computed.grandTotal)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Full payment amount</dt>
              <dd className="font-semibold text-good">
                {formatGhs(computed.grandTotal)}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <FormActionBar>
        <LoadingButton
          type="button"
          pending={pending}
          idleLabel="Review supply"
          pendingLabel="Recording…"
          onClick={openConfirm}
          disabled={pending || confirmOpen}
          className="w-full sm:w-auto"
        />
      </FormActionBar>

      <ConfirmDialog
        open={confirmOpen}
        pending={pending}
        variant="warning"
        title="Confirm paid supply"
        description={
          <div className="space-y-2">
            <p>
              Record supply for{" "}
              <span className="font-medium text-ink">
                {selectedVendor?.business_name ?? "vendor"}
              </span>{" "}
              with {lines.length} product line{lines.length === 1 ? "" : "s"} totaling{" "}
              <span className="font-medium text-ink">
                {formatGhs(computed.grandTotal)}
              </span>
              .
            </p>
            <p>
              Full payment via{" "}
              <span className="font-medium text-ink">
                {paymentMethodLabel(paymentMethod)}
              </span>{" "}
              will be recorded and stock will be deducted immediately.
            </p>
            <p className="text-xs">
              Retries reuse the same request id and will not double-apply stock or
              payment if this submission already succeeded.
            </p>
          </div>
        }
        confirmLabel="Confirm supply"
        pendingLabel="Recording supply…"
        error={confirmError}
        onCancel={() => {
          if (!pending) setConfirmOpen(false);
        }}
        onConfirm={submitConfirmedSupply}
      />
    </div>
  );
}
