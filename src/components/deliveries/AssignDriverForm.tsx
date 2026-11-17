"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { assignDeliveryDriver } from "@/lib/deliveries/actions";
import type { ActiveDriverOption } from "@/lib/deliveries/queries";
import type { DeliveryStatus } from "@/types/database";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LoadingButton } from "@/components/ui/LoadingButton";
import { formControlClass } from "@/components/ui/form-styles";
import { useToast } from "@/components/ui/ToastProvider";

export function AssignDriverForm({
  deliveryId,
  currentStatus,
  currentDriverId,
  drivers,
}: {
  deliveryId: string;
  currentStatus: DeliveryStatus;
  currentDriverId: string | null;
  drivers: ActiveDriverOption[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [driverId, setDriverId] = useState(currentDriverId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const nextDriverId = driverId.trim();
  const unchanged = (nextDriverId || null) === (currentDriverId || null);
  const clearing = !nextDriverId && Boolean(currentDriverId);

  return (
    <div className="space-y-3 rounded-xl border border-line bg-surface/90 p-5">
      <div>
        <h2 className="font-display text-xl text-ink">Operational driver</h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          Optional. Assigning or clearing a driver does not change delivery status.
        </p>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-accent">
          {error}
        </p>
      ) : null}

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-ink">Driver</span>
        <select
          value={driverId}
          onChange={(event) => setDriverId(event.target.value)}
          disabled={pending}
          className={formControlClass}
        >
          <option value="">Unassigned</option>
          {drivers.map((driver) => (
            <option key={driver.id} value={driver.id}>
              {driver.driver_code} · {driver.full_name}
              {driver.phone ? ` · ${driver.phone}` : ""}
            </option>
          ))}
        </select>
      </label>

      <LoadingButton
        type="button"
        pending={pending}
        disabled={pending || unchanged}
        idleLabel={clearing ? "Clear driver" : "Save driver assignment"}
        pendingLabel="Saving…"
        className="w-full sm:w-auto"
        onClick={() => {
          if (pending || unchanged) return;
          setConfirmOpen(true);
        }}
      />

      <ConfirmDialog
        open={confirmOpen}
        pending={pending}
        variant={clearing ? "warning" : "default"}
        title={clearing ? "Clear assigned driver?" : "Update assigned driver?"}
        description={
          clearing
            ? "This delivery will have no operational driver. Status will stay the same."
            : "The selected driver will be linked to this delivery. Status will stay the same."
        }
        confirmLabel={clearing ? "Clear driver" : "Save assignment"}
        pendingLabel="Saving…"
        onCancel={() => {
          if (!pending) setConfirmOpen(false);
        }}
        onConfirm={() => {
          if (pending) return;
          setError(null);
          startTransition(async () => {
            const result = await assignDeliveryDriver({
              deliveryId,
              driverId: nextDriverId || null,
              currentStatus,
            });
            if (!result.ok) {
              setError(result.error.message);
              setConfirmOpen(false);
              toast.error(result.error.message);
              return;
            }
            setConfirmOpen(false);
            toast.success(result.message);
            router.refresh();
          });
        }}
      />
    </div>
  );
}
