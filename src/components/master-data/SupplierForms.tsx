"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createSupplier,
  updateSupplier,
} from "@/lib/master-data/suppliers/actions";
import type { SupplierRow } from "@/lib/master-data/suppliers/queries";
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

export function CreateSupplierButton() {
  const toast = useToast();
  const completeCreate = useCreateSuccessNavigation();
  const { pending, runWrite } = useCreateWritePending();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(formData: FormData) {
    void runWrite(async () => {
      setError(null);
      const result = await createSupplier(readSupplierForm(formData));
      if (!result.ok) {
        setError(result.error.message);
        toast.error(result.error.message, "Supplier not created");
        return;
      }
      setOpen(false);
      completeCreate({
        listHref: "/app/suppliers",
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
        Add stock supplier
      </button>
      {open ? (
        <FormDialog
          title="Add stock supplier"
          description="Upstream suppliers for inventory purchasing. A supplier code is assigned automatically when you save."
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
                idleLabel="Create supplier"
                pendingLabel="Creating supplier…"
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
          <SupplierFields />
        </FormDialog>
      ) : null}
    </>
  );
}

export function EditSupplierForm({ supplier }: { supplier: SupplierRow }) {
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
      const result = await updateSupplier({
        id: supplier.id,
        ...readSupplierForm(formData),
        is_active: supplier.is_active,
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
      <h2 className="font-display text-xl text-ink">Edit stock supplier</h2>
      {error ? <p className="text-sm text-accent">{error}</p> : null}
      {message ? <p className="text-sm text-good">{message}</p> : null}
      <SupplierFields defaults={supplier} />
      <LoadingButton
        type="submit"
        pending={pending}
        idleLabel="Save changes"
        pendingLabel="Saving changes…"
      />
    </form>
  );
}

function readSupplierForm(formData: FormData) {
  return {
    name: String(formData.get("name") ?? ""),
    contact_person: String(formData.get("contact_person") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    location: String(formData.get("location") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    is_active: true,
  };
}

function SupplierFields({ defaults }: { defaults?: SupplierRow }) {
  return (
    <>
      <Field label="Supplier name" name="name" defaultValue={defaults?.name} required />
      <Field
        label="Contact person"
        name="contact_person"
        defaultValue={defaults?.contact_person ?? ""}
        helpText="Name of the person you deal with at this business."
      />
      <Field
        label="Phone number"
        name="phone"
        defaultValue={defaults?.phone ?? ""}
        helpText="Primary telephone number for the contact person or business."
      />
      <Field label="Location" name="location" defaultValue={defaults?.location ?? ""} />
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
}) {
  return (
    <label className="block space-y-1.5">
      <span className={formLabelClass}>{props.label}</span>
      <input
        name={props.name}
        defaultValue={props.defaultValue}
        required={props.required}
        className={formControlClass}
      />
      {props.helpText ? <span className={formHelpClass}>{props.helpText}</span> : null}
    </label>
  );
}
