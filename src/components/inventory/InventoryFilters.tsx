"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { FilterActions } from "@/components/ui/FilterActions";
import { cn } from "@/lib/utils/cn";

const fieldClass = cn(
  "w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm",
  "outline-none focus:border-accent focus:ring-2 focus:ring-accent/30",
);

export function InventoryFilters({
  initialQ,
  initialCategory,
  initialStock,
}: {
  initialQ: string;
  initialCategory: string;
  initialStock: "ALL" | "IN_STOCK" | "ZERO";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  return (
    <form
      aria-busy={pending}
      className="grid gap-3 rounded-xl border border-line bg-surface/90 p-4 sm:grid-cols-2 lg:grid-cols-4 [&_input]:min-h-11 [&_select]:min-h-11"
      onSubmit={(event) => {
        event.preventDefault();
        if (pending) return;
        const form = new FormData(event.currentTarget);
        const params = new URLSearchParams(searchParams.toString());
        for (const key of ["q", "category", "stock"]) {
          const text = String(form.get(key) ?? "").trim();
          if (!text || (key === "stock" && text === "ALL")) params.delete(key);
          else params.set(key, text);
        }
        params.delete("page");
        startTransition(() => {
          const qs = params.toString();
          router.push(qs ? `${pathname}?${qs}` : pathname);
        });
      }}
    >
      <label className="block space-y-1.5 sm:col-span-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">
          Search
        </span>
        <input
          name="q"
          defaultValue={initialQ}
          placeholder="Product name or code"
          className={fieldClass}
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">
          Category
        </span>
        <input
          name="category"
          defaultValue={initialCategory}
          placeholder="Category"
          className={fieldClass}
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">
          Stock
        </span>
        <select name="stock" defaultValue={initialStock} className={fieldClass}>
          <option value="ALL">All products</option>
          <option value="IN_STOCK">In stock</option>
          <option value="ZERO">Zero stock</option>
        </select>
      </label>
      <FilterActions
        pending={pending}
        showClear={false}
        className="sm:col-span-2 lg:col-span-4"
      />
    </form>
  );
}
