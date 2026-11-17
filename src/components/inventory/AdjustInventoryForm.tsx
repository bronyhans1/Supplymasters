"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formControlClass } from "@/components/ui/form-styles";
import { LoadingButton } from "@/components/ui/LoadingButton";
import { useToast } from "@/components/ui/ToastProvider";
import { adjustInventoryStock } from "@/lib/inventory/actions";
import { cn } from "@/lib/utils/cn";
import { createUuid } from "@/lib/utils/id";

export function AdjustInventoryForm({
  productId,
  productName,
  unitOfMeasure,
  currentQuantity,
}: {
  productId: string;
  productName: string;
  unitOfMeasure: string;
  currentQuantity: number | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [direction, setDirection] = useState<"increase" | "decrease">("increase");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  // Stable for one intentional adjustment — reused on retries; rotated only after success.
  const [clientRequestId, setClientRequestId] = useState(() =>
    createUuid(),
  );

  const quantityNumber = Number(quantity);
  const quantityValid =
    Number.isInteger(quantityNumber) && quantityNumber > 0;
  const expectedBalance = useMemo(() => {
    if (currentQuantity === null || !quantityValid) return null;
    return direction === "increase"
      ? currentQuantity + quantityNumber
      : currentQuantity - quantityNumber;
  }, [currentQuantity, direction, quantityNumber, quantityValid]);

  const wouldGoNegative =
    expectedBalance !== null && expectedBalance < 0;

  function openConfirm() {
    if (pending || confirmOpen) return;
    setError(null);
    if (!quantityValid) {
      setError("Enter a whole number greater than zero.");
      return;
    }
    if (reason.trim().length < 3) {
      setError("Enter a brief reason for this adjustment.");
      return;
    }
    if (wouldGoNegative) {
      setError("That decrease would reduce stock below zero.");
      return;
    }
    setConfirmOpen(true);
  }

  function runAdjust() {
    if (pending) return;
    startTransition(async () => {
      try {
        const result = await adjustInventoryStock({
          clientRequestId,
          productId,
          direction,
          quantity: quantityNumber,
          reason: reason.trim(),
        });

        if (!result.ok) {
          // Keep clientRequestId so a retry of this intentional submission stays idempotent.
          // Conflict means the id was already used with different details — rotate.
          if (result.error.code === "REQUEST_CONFLICT") {
            setClientRequestId(createUuid());
          }
          setError(result.error.message);
          toast.error(result.error.message, "Adjustment not applied");
          return;
        }

        setConfirmOpen(false);
        setReason("");
        setQuantity("1");
        setDirection("increase");
        setError(null);
        // New intentional adjustment only after definitive success.
        setClientRequestId(createUuid());
        toast.success(result.message);
        router.refresh();
      } catch {
        // Uncertain outcome: retain the original request id for a safe retry.
        const message =
          "The adjustment response was unclear. Retry with the same request — it will not double-apply if it already succeeded.";
        setError(message);
        toast.error(message, "Adjustment status uncertain");
      }
    });
  }

  return (
    <div className="space-y-4 rounded-xl border border-line bg-surface/90 p-5">
      <div>
        <h2 className="font-display text-xl tracking-tight text-ink">
          Stock adjustment
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          Manual corrections only. Purchases, supplies, and returns must use their
          own workflows. Each confirmation uses a request id so retries do not
          double-apply stock.
        </p>
      </div>

      {currentQuantity === null ? (
        <p className="rounded-lg border border-dashed border-line px-3 py-2 text-sm text-muted">
          This product has no inventory record yet. The first authorized movement
          will create one.
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">
            Direction
          </span>
          <select
            value={direction}
            onChange={(event) =>
              setDirection(event.target.value as "increase" | "decrease")
            }
            className={formControlClass}
            disabled={pending}
          >
            <option value="increase">Increase stock</option>
            <option value="decrease">Decrease stock</option>
          </select>
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">
            Quantity ({unitOfMeasure})
          </span>
          <input
            type="number"
            min={1}
            step={1}
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            className={formControlClass}
            disabled={pending}
          />
        </label>
      </div>

      <label className="block space-y-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">
          Reason
        </span>
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Why is this adjustment needed?"
          className={formControlClass}
          disabled={pending}
        />
      </label>

      {quantityValid && expectedBalance !== null ? (
        <p className="text-sm text-muted">
          Expected balance:{" "}
          <span
            className={cn(
              "font-medium",
              wouldGoNegative ? "text-accent" : "text-ink",
            )}
          >
            {currentQuantity} → {expectedBalance} {unitOfMeasure}
          </span>
        </p>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-sm text-accent"
        >
          {error}
        </div>
      ) : null}

      <LoadingButton
        type="button"
        pending={pending}
        idleLabel="Review adjustment"
        pendingLabel="Adjusting…"
        onClick={openConfirm}
        disabled={pending || confirmOpen}
        className="w-full sm:w-auto"
      />

      <ConfirmDialog
        open={confirmOpen}
        pending={pending}
        variant={direction === "decrease" ? "warning" : "default"}
        title="Confirm stock adjustment"
        description={
          <div className="space-y-2">
            <p>
              {direction === "increase" ? "Increase" : "Decrease"}{" "}
              <span className="font-medium text-ink">{productName}</span> by{" "}
              <span className="font-medium text-ink">
                {quantityValid ? quantityNumber : "—"} {unitOfMeasure}
              </span>
              .
            </p>
            <p>
              Current balance:{" "}
              <span className="font-medium text-ink">
                {currentQuantity ?? "—"}
              </span>
              . After confirmation:{" "}
              <span className="font-medium text-ink">
                {expectedBalance ?? "—"}
              </span>
              .
            </p>
            <p className="text-xs">
              Retries reuse the same request id and will not apply stock twice if
              this adjustment already succeeded.
            </p>
          </div>
        }
        confirmLabel="Apply adjustment"
        pendingLabel="Applying…"
        error={error}
        onCancel={() => {
          if (!pending) setConfirmOpen(false);
        }}
        onConfirm={runAdjust}
      />
    </div>
  );
}
