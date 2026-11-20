"use client";

import { useState } from "react";
import {
  useCreateSuccessNavigation,
  useCreateWritePending,
} from "@/components/navigation/create-success";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FormActionBar } from "@/components/ui/FormActionBar";
import {
  formControlClass,
  formErrorClass,
  formLabelClass,
} from "@/components/ui/form-styles";
import { LoadingButton } from "@/components/ui/LoadingButton";
import { useToast } from "@/components/ui/ToastProvider";
import { recordFullPayment } from "@/lib/payments/actions";
import { paymentMethodLabel } from "@/lib/payments/presentation";
import { PAYMENT_METHODS } from "@/lib/payments/schemas";
import type { UnpaidSupplyForPayment } from "@/lib/payments/queries";
import { formatGhs } from "@/lib/supplies/money";
import type { PaymentMethod } from "@/types/database";

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function RecordPaymentForm({
  supply,
}: {
  supply: UnpaidSupplyForPayment;
}) {
  const toast = useToast();
  const completeCreate = useCreateSuccessNavigation();
  const { pending, runWrite } = useCreateWritePending();
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [paymentDate, setPaymentDate] = useState(todayIsoDate);
  const [transactionReference, setTransactionReference] = useState("");
  const [notes, setNotes] = useState("");

  function openConfirm() {
    if (pending || confirmOpen) return;
    if (!paymentMethod) {
      setError("Select a payment method.");
      return;
    }
    setError(null);
    setConfirmError(null);
    setConfirmOpen(true);
  }

  function submitConfirmedPayment() {
    void runWrite(async () => {
      setConfirmError(null);
      setError(null);
      try {
        const result = await recordFullPayment({
          supplyId: supply.id,
          paymentMethod,
          paymentDate,
          transactionReference,
          notes,
        });

        if (!result.ok) {
          setConfirmError(result.error.message);
          setError(result.error.message);
          toast.error(result.error.message, "Payment not recorded");
          return;
        }

        setConfirmOpen(false);
        completeCreate({
          listHref: "/app/payments",
          message: result.message,
        });
      } catch {
        const message =
          "The payment response was unclear. Check Payments before retrying — a full payment cannot be recorded twice.";
        setConfirmError(message);
        setError(message);
        toast.error(message, "Payment uncertain");
      }
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-line bg-surface/90 p-5">
        <h2 className="font-display text-xl text-ink">Amount due</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted">
              Supply
            </dt>
            <dd className="mt-1 text-sm font-medium text-ink">{supply.supply_ref}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted">
              Vendor
            </dt>
            <dd className="mt-1 text-sm font-medium text-ink">
              {supply.vendor?.business_name ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted">
              Full payment amount
            </dt>
            <dd className="mt-1 font-display text-2xl text-ink">
              {formatGhs(supply.grand_total)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted">
              Rule
            </dt>
            <dd className="mt-1 text-sm text-muted">
              Full payment only. Partial payments and credit are not supported.
            </dd>
          </div>
        </dl>
      </section>

      <section className="space-y-4 rounded-xl border border-line bg-surface/90 p-5">
        <h2 className="font-display text-xl text-ink">Record payment</h2>
        <p className="text-sm text-muted">
          Independent of dispatch and delivery status. Confirming payment marks
          this supply as paid.
        </p>

        {error ? <p className={formErrorClass}>{error}</p> : null}

        <label className="block space-y-1.5">
          <span className={formLabelClass}>Payment method</span>
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
          <span className={formLabelClass}>Payment date</span>
          <input
            type="date"
            value={paymentDate}
            onChange={(event) => setPaymentDate(event.target.value)}
            className={formControlClass}
            disabled={pending}
          />
        </label>

        <label className="block space-y-1.5">
          <span className={formLabelClass}>Payment reference</span>
          <input
            value={transactionReference}
            onChange={(event) => setTransactionReference(event.target.value)}
            placeholder="Optional receipt or transfer reference"
            className={formControlClass}
            disabled={pending}
          />
        </label>

        <label className="block space-y-1.5">
          <span className={formLabelClass}>Notes</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            className={formControlClass}
            disabled={pending}
          />
        </label>
      </section>

      <FormActionBar>
        <LoadingButton
          type="button"
          pending={pending}
          idleLabel="Review payment"
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
        title="Confirm full payment"
        description={
          <div className="space-y-2">
            <p>
              Record {formatGhs(supply.grand_total)} for{" "}
              <span className="font-medium text-ink">{supply.supply_ref}</span>{" "}
              via {paymentMethodLabel(paymentMethod)}.
            </p>
            <p className="text-xs">
              This cannot be partially applied. A supply accepts only one full
              payment.
            </p>
          </div>
        }
        confirmLabel="Confirm payment"
        pendingLabel="Recording payment…"
        error={confirmError}
        onCancel={() => {
          if (!pending) setConfirmOpen(false);
        }}
        onConfirm={submitConfirmedPayment}
      />
    </div>
  );
}
