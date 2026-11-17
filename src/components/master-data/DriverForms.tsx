"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createDriver, updateDriver } from "@/lib/master-data/drivers/actions";
import type { DriverRow } from "@/lib/master-data/drivers/queries";
import {
  useCreateSuccessNavigation,
  useCreateWritePending,
} from "@/components/navigation/create-success";
import { FormDialog } from "@/components/ui/FormDialog";
import {
  formControlClass,
  formHelpClass,
  formLabelClass,
  formSecondaryButtonClass,
} from "@/components/ui/form-styles";
import { LoadingButton } from "@/components/ui/LoadingButton";
import { useToast } from "@/components/ui/ToastProvider";

export function CreateDriverButton() {
  const toast = useToast();
  const completeCreate = useCreateSuccessNavigation();
  const { pending, runWrite } = useCreateWritePending();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(formData: FormData) {
    void runWrite(async () => {
      setError(null);
      const result = await createDriver(readDriverForm(formData));
      if (!result.ok) {
        setError(result.error.message);
        toast.error(result.error.message, "Driver not created");
        return;
      }
      setOpen(false);
      completeCreate({
        listHref: "/app/drivers",
        message: result.message,
      });
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className="inline-flex min-h-11 items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-paper hover:bg-accent/90"
      >
        Add driver
      </button>
      {open ? (
        <FormDialog
          title="Add driver"
          description="Operational drivers are delivery contacts only — no app login. A driver code such as NM-DRV-000001 is assigned automatically when you save."
          pending={pending}
          error={error}
          onClose={() => {
            if (!pending) setOpen(false);
          }}
          formAction={onSubmit}
          footer={
            <>
              <LoadingButton
                type="submit"
                pending={pending}
                idleLabel="Create driver"
                pendingLabel="Creating driver…"
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={pending}
                className={formSecondaryButtonClass}
              >
                Cancel
              </button>
            </>
          }
        >
          <DriverFields />
        </FormDialog>
      ) : null}
    </>
  );
}

export function EditDriverForm({ driver }: { driver: DriverRow }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function onSubmit(formData: FormData) {
    if (pending) return;
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await updateDriver({
        id: driver.id,
        ...readDriverForm(formData),
        is_active: driver.is_active,
      });
      if (!result.ok) {
        setError(result.error.message);
        toast.error(result.error.message, "Changes not saved");
        return;
      }
      setMessage(result.message);
      toast.success(result.message);
      router.refresh();
    });
  }

  return (
    <form action={onSubmit} className="space-y-4 rounded-xl border border-line bg-white/70 p-5">
      <h2 className="font-display text-xl text-ink">Edit driver</h2>
      <p className="text-sm text-muted">
        Driver code <span className="font-medium text-ink">{driver.driver_code}</span> cannot be
        changed.
      </p>
      {error ? <p className="text-sm text-accent">{error}</p> : null}
      {message ? <p className="text-sm text-good">{message}</p> : null}
      <DriverFields defaults={driver} />
      <LoadingButton
        type="submit"
        pending={pending}
        idleLabel="Save changes"
        pendingLabel="Saving changes…"
      />
    </form>
  );
}

function readDriverForm(formData: FormData) {
  return {
    full_name: String(formData.get("full_name") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    is_active: true,
  };
}

function DriverFields({ defaults }: { defaults?: DriverRow }) {
  return (
    <>
      <Field
        label="Full name"
        name="full_name"
        defaultValue={defaults?.full_name}
        required
      />
      <Field
        label="Phone number"
        name="phone"
        defaultValue={defaults?.phone ?? ""}
        required
        type="tel"
        helpText="Primary telephone number for coordinating deliveries."
      />
      <label className="block space-y-1.5">
        <span className={formLabelClass}>Notes</span>
        <textarea
          name="notes"
          rows={3}
          defaultValue={defaults?.notes ?? ""}
          className={formControlClass}
        />
      </label>
    </>
  );
}

function Field(props: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  helpText?: string;
  type?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className={formLabelClass}>{props.label}</span>
      <input
        name={props.name}
        type={props.type ?? "text"}
        defaultValue={props.defaultValue}
        required={props.required}
        className={formControlClass}
      />
      {props.helpText ? <span className={formHelpClass}>{props.helpText}</span> : null}
    </label>
  );
}
