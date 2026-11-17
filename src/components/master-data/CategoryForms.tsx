"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createCategory,
  updateCategory,
} from "@/lib/master-data/categories/actions";
import type { ProductCategoryRow } from "@/lib/master-data/categories/types";
import {
  useCreateSuccessNavigation,
  useCreateWritePending,
} from "@/components/navigation/create-success";
import { FormDialog } from "@/components/ui/FormDialog";
import {
  formControlClass,
  formLabelClass,
  formSecondaryButtonClass,
} from "@/components/ui/form-styles";
import { LoadingButton } from "@/components/ui/LoadingButton";
import { useToast } from "@/components/ui/ToastProvider";

export function CreateCategoryButton() {
  const toast = useToast();
  const completeCreate = useCreateSuccessNavigation();
  const { pending, runWrite } = useCreateWritePending();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(formData: FormData) {
    void runWrite(async () => {
      setError(null);
      const result = await createCategory({
        name: String(formData.get("name") ?? ""),
        is_active: true,
      });
      if (!result.ok) {
        setError(result.error.message);
        toast.error(result.error.message, "Category not created");
        return;
      }
      setOpen(false);
      completeCreate({
        listHref: "/app/categories",
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
        Add category
      </button>
      {open ? (
        <FormDialog
          title="Add category"
          description="Category names must be unique. Inactive categories stay visible on existing products but cannot be newly assigned."
          pending={pending}
          error={error}
          size="md"
          onClose={() => {
            if (!pending) setOpen(false);
          }}
          formAction={onSubmit}
          footer={
            <>
              <LoadingButton
                type="submit"
                pending={pending}
                idleLabel="Create category"
                pendingLabel="Creating category…"
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
          <label className="block space-y-1.5">
            <span className={formLabelClass}>Name</span>
            <input name="name" required className={formControlClass} />
          </label>
        </FormDialog>
      ) : null}
    </>
  );
}

export function EditCategoryForm({ category }: { category: ProductCategoryRow }) {
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
      const result = await updateCategory({
        id: category.id,
        name: String(formData.get("name") ?? ""),
        is_active: category.is_active,
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
      <h2 className="font-display text-xl text-ink">Edit category</h2>
      {error ? <p className="text-sm text-accent">{error}</p> : null}
      {message ? <p className="text-sm text-ink">{message}</p> : null}
      <label className="block space-y-1.5">
        <span className={formLabelClass}>Name</span>
        <input
          name="name"
          required
          defaultValue={category.name}
          className={formControlClass}
        />
      </label>
      <LoadingButton
        type="submit"
        pending={pending}
        idleLabel="Save changes"
        pendingLabel="Saving changes…"
      />
    </form>
  );
}
