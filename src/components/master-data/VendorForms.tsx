"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createVendor, updateVendor } from "@/lib/master-data/vendors/actions";
import type { VendorRow } from "@/lib/master-data/vendors/queries";
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

export function CreateVendorButton() {
  const toast = useToast();
  const completeCreate = useCreateSuccessNavigation();
  const { pending, runWrite } = useCreateWritePending();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(formData: FormData) {
    void runWrite(async () => {
      setError(null);
      const result = await createVendor(readVendorForm(formData));
      if (!result.ok) {
        setError(result.error.message);
        toast.error(result.error.message, "Vendor not created");
        return;
      }
      setOpen(false);
      completeCreate({
        listHref: "/app/vendors",
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
        Add vendor
      </button>
      {open ? (
        <FormDialog
          title="Add vendor"
          description="Vendors are wholesale buyers. A vendor code is assigned automatically when you save."
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
                idleLabel="Create vendor"
                pendingLabel="Creating vendor…"
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
          <VendorFields />
        </FormDialog>
      ) : null}
    </>
  );
}

export function EditVendorForm({ vendor }: { vendor: VendorRow }) {
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
      const result = await updateVendor({
        id: vendor.id,
        ...readVendorForm(formData),
        is_active: vendor.is_active,
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
      <h2 className="font-display text-xl text-ink">Edit vendor</h2>
      {error ? <p className="text-sm text-accent">{error}</p> : null}
      {message ? <p className="text-sm text-good">{message}</p> : null}
      <VendorFields defaults={vendor} />
      <LoadingButton
        type="submit"
        pending={pending}
        idleLabel="Save changes"
        pendingLabel="Saving changes…"
      />
    </form>
  );
}

function readVendorForm(formData: FormData) {
  return {
    business_name: String(formData.get("business_name") ?? ""),
    contact_person: String(formData.get("contact_person") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    alt_phone: String(formData.get("alt_phone") ?? ""),
    location: String(formData.get("location") ?? ""),
    digital_address: String(formData.get("digital_address") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    is_active: true,
  };
}

function VendorFields({ defaults }: { defaults?: VendorRow }) {
  return (
    <>
      <Field label="Business name" name="business_name" defaultValue={defaults?.business_name} required />
      <Field
        label="Contact person"
        name="contact_person"
        defaultValue={defaults?.contact_person}
        required
        helpText="Name of the person you deal with at this business."
      />
      <Field
        label="Phone number"
        name="phone"
        defaultValue={defaults?.phone}
        required
        helpText="Primary telephone number for the contact person or business."
      />
      <Field
        label="Alt phone number"
        name="alt_phone"
        defaultValue={defaults?.alt_phone ?? ""}
      />
      <Field label="Location" name="location" defaultValue={defaults?.location} required />
      <Field label="Digital address" name="digital_address" defaultValue={defaults?.digital_address ?? ""} />
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
