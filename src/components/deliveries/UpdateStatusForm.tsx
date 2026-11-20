"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateDeliveryStatusAction } from "@/lib/deliveries/actions";
import { deliveryStatusLabel } from "@/lib/deliveries/presentation";
import {
  allowedNextStatuses,
  statusActionLabel,
  type OperationalDeliveryStatus,
} from "@/lib/deliveries/transitions";
import type { DeliveryStatus } from "@/types/database";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LoadingButton } from "@/components/ui/LoadingButton";
import { formControlClass } from "@/components/ui/form-styles";
import { useToast } from "@/components/ui/ToastProvider";

export function UpdateStatusForm({
  deliveryId,
  currentStatus,
  excludeToStatuses = [],
}: {
  deliveryId: string;
  currentStatus: DeliveryStatus;
  /** Hide transitions handled in other operational sections (e.g. Dispatch). */
  excludeToStatuses?: readonly OperationalDeliveryStatus[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<OperationalDeliveryStatus | null>(
    null,
  );

  const nextStatuses = allowedNextStatuses(currentStatus).filter(
    (status) => !excludeToStatuses.includes(status),
  );

  if (nextStatuses.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-surface/90 p-5">
        <h2 className="font-display text-xl text-ink">Status updates</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          This delivery is {deliveryStatusLabel(currentStatus).toLowerCase()} and has
          no further status transitions.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-line bg-surface/90 p-5">
      <div>
        <h2 className="font-display text-xl text-ink">Update status</h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          Current status: {deliveryStatusLabel(currentStatus)}. Status changes do not
          adjust inventory or payments.
        </p>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-accent">
          {error}
        </p>
      ) : null}

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-ink">Operational notes (optional)</span>
        <textarea
          rows={3}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          disabled={pending}
          className={formControlClass}
          placeholder="Notes recorded with this status change"
        />
      </label>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {nextStatuses.map((status) => (
          <LoadingButton
            key={status}
            className="w-full sm:w-auto"
            type="button"
            variant={status === "CANCELLED" || status === "FAILED" ? "danger" : "primary"}
            pending={pending && pendingStatus === status}
            disabled={pending}
            idleLabel={statusActionLabel(status)}
            pendingLabel="Updating…"
            onClick={() => {
              if (pending) return;
              setPendingStatus(status);
            }}
          />
        ))}
      </div>

      <ConfirmDialog
        open={pendingStatus !== null}
        pending={pending}
        variant={
          pendingStatus === "CANCELLED" || pendingStatus === "FAILED"
            ? "destructive"
            : "default"
        }
        title={
          pendingStatus
            ? `${statusActionLabel(pendingStatus)}?`
            : "Update delivery status?"
        }
        description={
          pendingStatus
            ? `Change status from ${deliveryStatusLabel(currentStatus)} to ${deliveryStatusLabel(pendingStatus)}. This does not restore stock or change payments.`
            : "Confirm this delivery status change."
        }
        confirmLabel={pendingStatus ? statusActionLabel(pendingStatus) : "Confirm"}
        pendingLabel="Updating…"
        onCancel={() => {
          if (!pending) setPendingStatus(null);
        }}
        onConfirm={() => {
          if (pending || !pendingStatus) return;
          setError(null);
          const toStatus = pendingStatus;
          startTransition(async () => {
            const result = await updateDeliveryStatusAction({
              deliveryId,
              fromStatus: currentStatus,
              toStatus,
              notes,
            });
            if (!result.ok) {
              setError(result.error.message);
              setPendingStatus(null);
              toast.error(result.error.message);
              return;
            }
            setPendingStatus(null);
            setNotes("");
            toast.success(result.message);
            router.refresh();
          });
        }}
      />
    </div>
  );
}
