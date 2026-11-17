"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { assignDeliveryResponsibleStaff } from "@/lib/deliveries/actions";
import type { EligibleStaffOption } from "@/lib/deliveries/queries";
import type { DeliveryStatus } from "@/types/database";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LoadingButton } from "@/components/ui/LoadingButton";
import { formControlClass } from "@/components/ui/form-styles";
import { useToast } from "@/components/ui/ToastProvider";

export function AssignStaffForm({
  deliveryId,
  currentStatus,
  currentStaffId,
  staffOptions,
}: {
  deliveryId: string;
  currentStatus: DeliveryStatus;
  currentStaffId: string;
  staffOptions: EligibleStaffOption[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [staffId, setStaffId] = useState(currentStaffId);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const unchanged = staffId === currentStaffId;

  return (
    <div className="space-y-3 rounded-xl border border-line bg-surface/90 p-5">
      <div>
        <h2 className="font-display text-xl text-ink">Responsible staff</h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          The STAFF or ADMIN account accountable for this delivery. Reassignment
          does not change the driver or status.
        </p>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-accent">
          {error}
        </p>
      ) : null}

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-ink">Staff member</span>
        <select
          value={staffId}
          onChange={(event) => setStaffId(event.target.value)}
          disabled={pending}
          className={formControlClass}
        >
          {staffOptions.map((staff) => (
            <option key={staff.id} value={staff.id}>
              {staff.full_name} · {staff.role}
            </option>
          ))}
        </select>
      </label>

      <LoadingButton
        type="button"
        pending={pending}
        disabled={pending || unchanged || !staffId}
        idleLabel="Update responsible staff"
        pendingLabel="Updating…"
        className="w-full sm:w-auto"
        onClick={() => {
          if (pending || unchanged || !staffId) return;
          setConfirmOpen(true);
        }}
      />

      <ConfirmDialog
        open={confirmOpen}
        pending={pending}
        variant="warning"
        title="Reassign responsible staff?"
        description="This changes who is accountable for the delivery. The assigned driver and status stay the same."
        confirmLabel="Update staff"
        pendingLabel="Updating…"
        onCancel={() => {
          if (!pending) setConfirmOpen(false);
        }}
        onConfirm={() => {
          if (pending) return;
          setError(null);
          startTransition(async () => {
            const result = await assignDeliveryResponsibleStaff({
              deliveryId,
              staffId,
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
