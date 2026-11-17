"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { VendorFilterPicker } from "@/components/partners/PartnerPicker";
import type { PartnerFilterOption } from "@/lib/partners/options";
import { FilterActions } from "@/components/ui/FilterActions";
import { cn } from "@/lib/utils/cn";

const fieldClass = cn(
  "w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm",
  "outline-none focus:border-accent focus:ring-2 focus:ring-accent/30",
);

export function SupplyFilters({
  initialQ,
  initialFromDate,
  initialToDate,
  selectedVendor,
}: {
  initialQ: string;
  initialFromDate: string;
  initialToDate: string;
  selectedVendor: PartnerFilterOption | null;
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
        for (const key of ["q", "vendorId", "fromDate", "toDate"]) {
          const text = String(form.get(key) ?? "").trim();
          if (!text) params.delete(key);
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
          placeholder="Supply code or vendor"
          className={fieldClass}
        />
      </label>
      <div className="block space-y-1.5">
        <VendorFilterPicker
          key={selectedVendor?.id ?? "all-vendors"}
          name="vendorId"
          initialSelected={selectedVendor}
          disabled={pending}
        />
      </div>
      <label className="block space-y-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">
          From date
        </span>
        <input
          type="date"
          name="fromDate"
          defaultValue={initialFromDate}
          className={fieldClass}
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">
          To date
        </span>
        <input
          type="date"
          name="toDate"
          defaultValue={initialToDate}
          className={fieldClass}
        />
      </label>
      <FilterActions
        pending={pending}
        className="sm:col-span-2 lg:col-span-4"
        onClear={() => {
          if (pending) return;
          startTransition(() => router.push(pathname));
        }}
      />
    </form>
  );
}
