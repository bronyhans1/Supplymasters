"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LoadingButton } from "@/components/ui/LoadingButton";
import { useToast } from "@/components/ui/ToastProvider";

type Result = { ok: true; message: string } | { ok: false; error: { message: string } };

export function StatusToggleButton({
  entityLabel,
  isActive,
  onToggle,
}: {
  entityLabel: string;
  isActive: boolean;
  onToggle: (nextActive: boolean) => Promise<Result>;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const nextActive = !isActive;
  const verb = nextActive ? "Activate" : "Deactivate";
  const pendingVerb = nextActive ? "Activating" : "Deactivating";

  return (
    <div className="space-y-2">
      {error ? (
        <p role="alert" className="text-sm text-accent">
          {error}
        </p>
      ) : null}
      {message ? (
        <p role="status" className="text-sm text-good">
          {message}
        </p>
      ) : null}
      <LoadingButton
        type="button"
        variant={isActive ? "danger" : "primary"}
        pending={pending}
        disabled={pending}
        idleLabel={`${verb} ${entityLabel}`}
        pendingLabel={`${pendingVerb} ${entityLabel}…`}
        onClick={() => {
          if (pending) return;
          setConfirmOpen(true);
        }}
      />

      <ConfirmDialog
        open={confirmOpen}
        pending={pending}
        variant={nextActive ? "default" : "destructive"}
        title={`${verb} this ${entityLabel}?`}
        description={
          nextActive
            ? `This ${entityLabel} will become available for use again.`
            : `This ${entityLabel} will no longer be available for new operations.`
        }
        confirmLabel={`${verb} ${entityLabel}`}
        pendingLabel={`${pendingVerb} ${entityLabel}…`}
        onCancel={() => {
          if (!pending) setConfirmOpen(false);
        }}
        onConfirm={() => {
          if (pending) return;
          setError(null);
          setMessage(null);
          startTransition(async () => {
            const result = await onToggle(nextActive);
            if (!result.ok) {
              setError(result.error.message);
              setConfirmOpen(false);
              toast.error(result.error.message);
              return;
            }
            setMessage(result.message);
            setConfirmOpen(false);
            toast.success(result.message);
            router.refresh();
          });
        }}
      />
    </div>
  );
}
