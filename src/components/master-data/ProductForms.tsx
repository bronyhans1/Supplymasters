"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createProduct, updateProduct } from "@/lib/master-data/products/actions";
import type { ProductRow } from "@/lib/master-data/products/queries";
import type { CategorySelectOption } from "@/lib/master-data/categories/types";
import {
  PRODUCT_FIELD_HELP,
  PRODUCT_PACKAGING_SIZE_OPTIONS,
  PRODUCT_UNIT_OF_MEASURE_OPTIONS,
} from "@/config/product-options";
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
import { SelectWithOther } from "@/components/ui/SelectWithOther";
import { LoadingButton } from "@/components/ui/LoadingButton";
import { useToast } from "@/components/ui/ToastProvider";

export function CreateProductButton({
  categories,
}: {
  categories: CategorySelectOption[];
}) {
  const toast = useToast();
  const completeCreate = useCreateSuccessNavigation();
  const { pending, runWrite } = useCreateWritePending();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(formData: FormData) {
    void runWrite(async () => {
      setError(null);
      const result = await createProduct({
        name: String(formData.get("name") ?? ""),
        brand: String(formData.get("brand") ?? ""),
        category_id: String(formData.get("category_id") ?? ""),
        packaging_size: String(formData.get("packaging_size") ?? ""),
        unit_of_measure: String(formData.get("unit_of_measure") ?? ""),
        is_active: true,
      });
      if (!result.ok) {
        setError(result.error.message);
        toast.error(result.error.message, "Product not created");
        return;
      }
      setOpen(false);
      completeCreate({
        listHref: "/app/products",
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
        Add product
      </button>
      {open ? (
        <FormDialog
          title="Add product"
          description="A product code is assigned automatically when you save."
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
                idleLabel="Create product"
                pendingLabel="Creating product…"
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
          <ProductFields categories={categories} />
        </FormDialog>
      ) : null}
    </>
  );
}

export function EditProductForm({
  product,
  categories,
}: {
  product: ProductRow;
  categories: CategorySelectOption[];
}) {
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
      const result = await updateProduct({
        id: product.id,
        name: String(formData.get("name") ?? ""),
        brand: String(formData.get("brand") ?? ""),
        category_id: String(formData.get("category_id") ?? ""),
        packaging_size: String(formData.get("packaging_size") ?? ""),
        unit_of_measure: String(formData.get("unit_of_measure") ?? ""),
        is_active: product.is_active,
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
      <h2 className="font-display text-xl text-ink">Edit product</h2>
      {error ? <Alert>{error}</Alert> : null}
      {message ? <Status>{message}</Status> : null}
      <ProductFields defaults={product} categories={categories} />
      <LoadingButton
        type="submit"
        pending={pending}
        idleLabel="Save changes"
        pendingLabel="Saving changes…"
      />
    </form>
  );
}

function ProductFields({
  defaults,
  categories,
}: {
  defaults?: ProductRow;
  categories: CategorySelectOption[];
}) {
  return (
    <>
      <Field label="Name" name="name" defaultValue={defaults?.name} required />
      <Field label="Brand" name="brand" defaultValue={defaults?.brand} required />
      <label className="block space-y-1.5">
        <span className={formLabelClass}>Category</span>
        <select
          name="category_id"
          required
          defaultValue={defaults?.category_id ?? ""}
          className={formControlClass}
        >
          <option value="" disabled>
            Select a category
          </option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.is_active
                ? category.name
                : `${category.name} (inactive)`}
            </option>
          ))}
        </select>
        <span className={formHelpClass}>{PRODUCT_FIELD_HELP.category}</span>
      </label>
      <SelectWithOther
        name="packaging_size"
        label="Packaging size"
        options={PRODUCT_PACKAGING_SIZE_OPTIONS}
        defaultValue={defaults?.packaging_size}
        required
        helpText={PRODUCT_FIELD_HELP.packaging_size}
        customPlaceholder='e.g. 40 × 70 g per carton'
      />
      <SelectWithOther
        name="unit_of_measure"
        label="Unit of measure"
        options={PRODUCT_UNIT_OF_MEASURE_OPTIONS}
        defaultValue={defaults?.unit_of_measure}
        required
        helpText={PRODUCT_FIELD_HELP.unit_of_measure}
        customPlaceholder="Enter a custom unit of measure"
      />
    </>
  );
}

function Field({
  label,
  name,
  defaultValue,
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label className="block space-y-1.5">
      <span className={formLabelClass}>{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        required={required}
        className={formControlClass}
      />
    </label>
  );
}

function Alert({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-accent">{children}</p>;
}

function Status({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-ink">{children}</p>;
}
