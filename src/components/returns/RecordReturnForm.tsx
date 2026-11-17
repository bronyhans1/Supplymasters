"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  useCreateSuccessNavigation,
  useCreateWritePending,
} from "@/components/navigation/create-success";
import { ReturnableDeliveryPicker } from "@/components/returns/ReturnableDeliveryPicker";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FormActionBar } from "@/components/ui/FormActionBar";
import { formControlClass, formLabelClass } from "@/components/ui/form-styles";
import { LoadingButton } from "@/components/ui/LoadingButton";
import { recordDeliveryStockReturnAction } from "@/lib/returns/actions";
import type {
  EligibleReturnLine,
  ReturnEligibility,
  ReturnableDeliveryOption,
} from "@/lib/returns/queries";
import { useToast } from "@/components/ui/ToastProvider";
import { cn } from "@/lib/utils/cn";
import { createUuid } from "@/lib/utils/id";

function selectedDeliveryLabel(delivery: ReturnableDeliveryOption): string {
  const parts = [delivery.delivery_ref];
  if (delivery.vendor_name) parts.push(delivery.vendor_name);
  if (delivery.supply_ref) parts.push(delivery.supply_ref);
  parts.push(delivery.status);
  return parts.join(" · ");
}

type LineDraft = {
  productId: string;
  selected: boolean;
  quantity: string;
};

function buildDrafts(lines: EligibleReturnLine[]): LineDraft[] {
  return lines.map((line) => ({
    productId: line.productId,
    selected: false,
    quantity: line.remainingQuantity > 0 ? String(line.remainingQuantity) : "",
  }));
}

export function RecordReturnForm({
  eligibility,
  selectedDelivery,
}: {
  eligibility: ReturnEligibility | null;
  selectedDelivery: ReturnableDeliveryOption | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const completeCreate = useCreateSuccessNavigation();
  const { pending, runWrite } = useCreateWritePending();
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [clientRequestId, setClientRequestId] = useState(() =>
    createUuid(),
  );
  const [drafts, setDrafts] = useState<LineDraft[]>(() =>
    buildDrafts(eligibility?.lines ?? []),
  );
  const payloadKeyRef = useRef<string | null>(null);

  const lineByProduct = useMemo(() => {
    const map = new Map<string, EligibleReturnLine>();
    for (const line of eligibility?.lines ?? []) {
      map.set(line.productId, line);
    }
    return map;
  }, [eligibility]);

  const selectedItems = drafts
    .filter((draft) => draft.selected)
    .map((draft) => {
      const quantity = Number(draft.quantity);
      return {
        productId: draft.productId,
        quantity,
        line: lineByProduct.get(draft.productId),
      };
    });

  const payloadKey = useMemo(() => {
    const itemsKey = selectedItems
      .map((item) => `${item.productId}:${item.quantity}`)
      .sort()
      .join("|");
    return [
      eligibility?.delivery.id ?? "",
      notes.trim(),
      itemsKey,
    ].join("::");
  }, [eligibility?.delivery.id, notes, selectedItems]);

  useEffect(() => {
    if (payloadKeyRef.current === null) {
      payloadKeyRef.current = payloadKey;
      return;
    }
    if (payloadKeyRef.current !== payloadKey) {
      payloadKeyRef.current = payloadKey;
      setClientRequestId(createUuid());
    }
  }, [payloadKey]);

  const validationError = (() => {
    if (!eligibility) return "Select a FAILED or CANCELLED delivery first.";
    if (!eligibility.canRecord) return eligibility.eligibilityMessage;
    if (selectedItems.length === 0) {
      return "Select at least one product to return.";
    }
    for (const item of selectedItems) {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        return "Return quantities must be positive whole numbers.";
      }
      if (!item.line) {
        return "One or more selected products are not on this delivery.";
      }
      if (item.quantity > item.line.remainingQuantity) {
        return `${item.line.productName} exceeds remaining quantity (${item.line.remainingQuantity}).`;
      }
      if (item.line.remainingQuantity <= 0) {
        return `${item.line.productName} has nothing left to return.`;
      }
    }
    return null;
  })();

  function setLineSelected(productId: string, selected: boolean) {
    setDrafts((current) =>
      current.map((row) => (row.productId === productId ? { ...row, selected } : row)),
    );
  }

  function setLineQuantity(productId: string, quantity: string) {
    setDrafts((current) =>
      current.map((row) => (row.productId === productId ? { ...row, quantity } : row)),
    );
  }

  function openConfirm() {
    setError(null);
    if (validationError) {
      setError(validationError);
      return;
    }
    setConfirmOpen(true);
  }

  function submitConfirmed() {
    if (!eligibility || validationError) return;
    void runWrite(async () => {
      setError(null);
      try {
        const result = await recordDeliveryStockReturnAction({
          clientRequestId,
          deliveryId: eligibility.delivery.id,
          notes,
          items: selectedItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        });
        if (!result.ok) {
          if (result.error.code === "REQUEST_CONFLICT") {
            setClientRequestId(createUuid());
          }
          // Keep clientRequestId so a retry of this intentional submission stays idempotent.
          setError(result.error.message);
          setConfirmOpen(false);
          toast.error(result.error.message, "Return not recorded");
          return;
        }
        setConfirmOpen(false);
        setClientRequestId(createUuid());
        completeCreate({
          listHref: "/app/returns",
          message: result.message,
        });
      } catch {
        const message =
          "The return response was unclear. Retry with the same request — it will not double-restore stock if it already succeeded.";
        setError(message);
        setConfirmOpen(false);
        toast.error(message, "Return status uncertain");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-line bg-surface/90 p-5">
        <h2 className="font-display text-xl text-ink">1. Select delivery</h2>
        <p className="mt-1 text-sm text-muted">
          Stock returns are only allowed for FAILED or CANCELLED deliveries. Status
          changes do not restore inventory automatically.
        </p>
        <div className="mt-4">
          {selectedDelivery ? (
            <div className="space-y-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-muted">
                Delivery
              </span>
              <div className="flex items-center justify-between gap-2 rounded-lg border border-line bg-paper px-3 py-2 text-sm">
                <span className="min-w-0 truncate text-ink">
                  {selectedDeliveryLabel(selectedDelivery)}
                </span>
                <button
                  type="button"
                  disabled={pending}
                  className="shrink-0 text-xs font-medium text-accent hover:underline"
                  onClick={() => router.push("/app/returns/new")}
                >
                  Change
                </button>
              </div>
            </div>
          ) : (
            <ReturnableDeliveryPicker
              disabled={pending}
              onPick={(delivery) => {
                router.push(`/app/returns/new?deliveryId=${delivery.id}`);
              }}
            />
          )}
        </div>
      </div>

      {!eligibility ? (
        <div className="rounded-xl border border-dashed border-line px-6 py-10 text-center text-sm text-muted">
          Choose a delivery to review supply lines and remaining return quantities.
        </div>
      ) : (
        <>
          <div className="grid gap-4 rounded-xl border border-line bg-surface/90 p-5 sm:grid-cols-2">
            <Info
              label="Delivery"
              value={
                <Link
                  href={`/app/deliveries/${eligibility.delivery.id}`}
                  className="font-medium text-accent underline-offset-2 hover:underline"
                >
                  {eligibility.delivery.delivery_ref}
                </Link>
              }
            />
            <Info label="Status" value={eligibility.delivery.status} />
            <Info
              label="Supply"
              value={
                <Link
                  href={`/app/supplies/${eligibility.supply.id}`}
                  className="font-medium text-accent underline-offset-2 hover:underline"
                >
                  {eligibility.supply.supply_ref}
                </Link>
              }
            />
            <Info
              label="Vendor"
              value={
                eligibility.vendor ? (
                  <Link
                    href={`/app/vendors/${eligibility.vendor.id}`}
                    className="font-medium text-accent underline-offset-2 hover:underline"
                  >
                    {eligibility.vendor.business_name}
                  </Link>
                ) : (
                  "—"
                )
              }
            />
          </div>

          {!eligibility.canRecord ? (
            <div role="alert" className="rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-accent">
              {eligibility.eligibilityMessage}
            </div>
          ) : null}

          <div className="rounded-xl border border-line bg-surface/90 p-5">
            <h2 className="font-display text-xl text-ink">2. Select returned products</h2>
            <p className="mt-1 text-sm text-muted">
              Remaining quantities subtract prior returns for this delivery. The
              database rejects quantities above the remaining limit.
            </p>

            {eligibility.lines.length === 0 ? (
              <p className="mt-4 text-sm text-muted">
                No supply products are available for this delivery.
              </p>
            ) : (
              <>
                {/* Mobile: stacked selectable lines */}
                <ul className="mt-4 space-y-3 lg:hidden">
                  {eligibility.lines.map((line) => {
                    const draft = drafts.find((d) => d.productId === line.productId);
                    const exhausted = line.remainingQuantity <= 0;
                    const checkboxId = `return-line-${line.productId}`;
                    return (
                      <li
                        key={line.productId}
                        className="space-y-3 rounded-xl border border-line bg-paper/60 p-4"
                      >
                        <label
                          htmlFor={checkboxId}
                          className="flex min-h-11 items-start gap-3"
                        >
                          <input
                            id={checkboxId}
                            type="checkbox"
                            className="mt-0.5 size-5 shrink-0 accent-accent"
                            checked={Boolean(draft?.selected)}
                            disabled={pending || exhausted || !eligibility.canRecord}
                            onChange={(event) =>
                              setLineSelected(line.productId, event.target.checked)
                            }
                          />
                          <span className="min-w-0">
                            <span className="block font-medium text-ink">
                              {line.productName}
                            </span>
                            <span className="block text-xs text-muted">
                              {line.productCode}
                            </span>
                          </span>
                        </label>
                        <dl className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <dt className="text-xs uppercase tracking-wide text-muted">
                              Original
                            </dt>
                            <dd className="mt-0.5 text-muted">{line.originalQuantity}</dd>
                          </div>
                          <div>
                            <dt className="text-xs uppercase tracking-wide text-muted">
                              Returned
                            </dt>
                            <dd className="mt-0.5 text-muted">{line.alreadyReturned}</dd>
                          </div>
                          <div>
                            <dt className="text-xs uppercase tracking-wide text-muted">
                              Remaining
                            </dt>
                            <dd className="mt-0.5 font-medium text-ink">
                              {exhausted ? (
                                <span className="text-muted">None</span>
                              ) : (
                                line.remainingQuantity
                              )}
                            </dd>
                          </div>
                        </dl>
                        <label className="block space-y-1.5">
                          <span className={formLabelClass}>Qty now</span>
                          <input
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={line.remainingQuantity || undefined}
                            step={1}
                            value={draft?.quantity ?? ""}
                            disabled={
                              pending ||
                              exhausted ||
                              !draft?.selected ||
                              !eligibility.canRecord
                            }
                            onChange={(event) =>
                              setLineQuantity(line.productId, event.target.value)
                            }
                            className={formControlClass}
                          />
                        </label>
                      </li>
                    );
                  })}
                </ul>

                {/* Desktop: table */}
                <div className="mt-4 hidden overflow-x-auto lg:block">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-line bg-paper/80 text-xs uppercase tracking-wide text-muted">
                      <tr>
                        <th className="px-3 py-2 font-medium">Return</th>
                        <th className="px-3 py-2 font-medium">Product</th>
                        <th className="px-3 py-2 font-medium">Original</th>
                        <th className="px-3 py-2 font-medium">Already returned</th>
                        <th className="px-3 py-2 font-medium">Remaining</th>
                        <th className="px-3 py-2 font-medium">Qty now</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eligibility.lines.map((line) => {
                        const draft = drafts.find((d) => d.productId === line.productId);
                        const exhausted = line.remainingQuantity <= 0;
                        return (
                          <tr
                            key={line.productId}
                            className="border-b border-line/70 last:border-0"
                          >
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                className="size-4 accent-accent"
                                checked={Boolean(draft?.selected)}
                                disabled={pending || exhausted || !eligibility.canRecord}
                                onChange={(event) =>
                                  setLineSelected(line.productId, event.target.checked)
                                }
                              />
                            </td>
                            <td className="px-3 py-2">
                              <div className="font-medium text-ink">{line.productName}</div>
                              <div className="text-xs text-muted">{line.productCode}</div>
                            </td>
                            <td className="px-3 py-2 text-muted">{line.originalQuantity}</td>
                            <td className="px-3 py-2 text-muted">{line.alreadyReturned}</td>
                            <td className="px-3 py-2 font-medium">
                              {exhausted ? (
                                <span className="text-muted">None</span>
                              ) : (
                                line.remainingQuantity
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                min={1}
                                max={line.remainingQuantity || undefined}
                                step={1}
                                value={draft?.quantity ?? ""}
                                disabled={
                                  pending ||
                                  exhausted ||
                                  !draft?.selected ||
                                  !eligibility.canRecord
                                }
                                onChange={(event) =>
                                  setLineQuantity(line.productId, event.target.value)
                                }
                                className={cn(formControlClass, "max-w-[7rem]")}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          <div className="rounded-xl border border-line bg-surface/90 p-5">
            <h2 className="font-display text-xl text-ink">3. Notes</h2>
            <p className="mt-1 text-sm text-muted">
              Optional notes are stored on the return and used as the stock movement
              reason when provided.
            </p>
            <textarea
              rows={3}
              value={notes}
              disabled={pending || !eligibility.canRecord}
              onChange={(event) => setNotes(event.target.value)}
              className={cn(formControlClass, "mt-3")}
              placeholder="Reason or notes for this physical return"
            />
          </div>

          <div className="rounded-xl border border-line bg-surface/90 p-5">
            <h2 className="font-display text-xl text-ink">4. Review</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Selected lines</dt>
                <dd className="font-medium text-ink">{selectedItems.length}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Total quantity</dt>
                <dd className="font-medium text-ink">
                  {selectedItems.reduce(
                    (sum, item) =>
                      sum + (Number.isFinite(item.quantity) ? item.quantity : 0),
                    0,
                  )}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-muted">
              Recording a return restores inventory through{" "}
              <span className="font-medium text-ink">record_delivery_stock_return</span>{" "}
              only. It does not refund payments or change delivery status. Retries
              reuse the same request id and will not double-restore stock if this
              submission already succeeded.
            </p>
            {error ? (
              <p role="alert" className="mt-3 text-sm text-accent">
                {error}
              </p>
            ) : null}
          </div>

          <FormActionBar>
            <LoadingButton
              type="button"
              className="w-full sm:w-auto"
              pending={pending}
              idleLabel="Review return"
              pendingLabel="Recording…"
              onClick={openConfirm}
              disabled={pending || confirmOpen || !eligibility.canRecord}
            />
          </FormActionBar>
        </>
      )}

      <ConfirmDialog
        open={confirmOpen}
        pending={pending}
        variant="warning"
        title="Confirm stock return"
        description={
          <div className="space-y-2">
            <p>
              Record a physical return for{" "}
              <span className="font-medium text-ink">
                {eligibility?.delivery.delivery_ref ?? "this delivery"}
              </span>{" "}
              with {selectedItems.length} product line
              {selectedItems.length === 1 ? "" : "s"}.
            </p>
            <p>
              Inventory will be restored for the returned quantities. Payments and
              delivery status will not change.
            </p>
          </div>
        }
        confirmLabel="Confirm return"
        pendingLabel="Recording return…"
        error={error}
        onCancel={() => {
          if (!pending) setConfirmOpen(false);
        }}
        onConfirm={submitConfirmed}
      />
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-ink">{value}</dd>
    </div>
  );
}
