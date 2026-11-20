"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateDeliveryStatusAction } from "@/lib/deliveries/actions";
import { deliveryStatusLabel } from "@/lib/deliveries/presentation";
import type { DeliveryStatus } from "@/types/database";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LoadingButton } from "@/components/ui/LoadingButton";
import { formControlClass } from "@/components/ui/form-styles";
import { useToast } from "@/components/ui/ToastProvider";

export function ConfirmDispatchForm({
  deliveryId,
  currentStatus,
}: {
  deliveryId: string;
  currentStatus: DeliveryStatus;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (currentStatus !== "PENDING") {
    return (
      <div className="rounded-xl border border-line bg-surface/90 p-5">
        <h2 className="font-display text-xl text-ink">Dispatch</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          This delivery is {deliveryStatusLabel(currentStatus).toLowerCase()} and
          is no longer awaiting dispatch. Delivery confirmation happens separately
          in Deliveries.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-line bg-surface/90 p-5">
      <div>
        <h2 className="font-display text-xl text-ink">Confirm dispatch</h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          Record that goods have left for the vendor. This sets status to
          Dispatched only — it does not mark the delivery as delivered or record
          payment.
        </p>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-accent">
          {error}
        </p>
      ) : null}

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-ink">
          Dispatch notes (optional)
        </span>
        <textarea
          rows={3}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          disabled={pending}
          className={formControlClass}
          placeholder="Dispatch time, vehicle, or other operational notes"
        />
      </label>

      <LoadingButton
        className="w-full sm:w-auto"
        type="button"
        pending={pending}
        disabled={pending || confirmOpen}
        idleLabel="Confirm dispatch"
        pendingLabel="Dispatching…"
        onClick={() => {
          if (pending) return;
          setConfirmOpen(true);
        }}
      />

      <ConfirmDialog
        open={confirmOpen}
        pending={pending}
        variant="warning"
        title="Confirm dispatch?"
        description="Mark this delivery as dispatched. Goods are not marked delivered, and payment is unchanged."
        confirmLabel="Confirm dispatch"
        pendingLabel="Dispatching…"
        onCancel={() => {
          if (!pending) setConfirmOpen(false);
        }}
        onConfirm={() => {
          if (pending) return;
          setError(null);
          startTransition(async () => {
            const result = await updateDeliveryStatusAction({
              deliveryId,
              fromStatus: currentStatus,
              toStatus: "DISPATCHED",
              notes,
            });
            if (!result.ok) {
              setError(result.error.message);
              setConfirmOpen(false);
              toast.error(result.error.message);
              return;
            }
            setConfirmOpen(false);
            setNotes("");
            toast.success(result.message);
            router.refresh();
          });
        }}
      />
    </div>
  );
}
