"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { ProductFilterPicker } from "@/components/products/ProductPicker";
import { DeliveryFilterPicker } from "@/components/returns/DeliveryFilterPicker";
import type { ProductFilterOption } from "@/lib/products/options";
import type {
  ReturnDeliveryFilterOption,
  ReturnStaffOption,
  ReturnVendorOption,
} from "@/lib/returns/queries";
import { FilterActions } from "@/components/ui/FilterActions";
import { cn } from "@/lib/utils/cn";

const fieldClass = cn(
  "w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm",
  "outline-none focus:border-accent focus:ring-2 focus:ring-accent/30",
);

export function ReturnFilters({
  initialQ,
  initialFromDate,
  initialToDate,
  initialVendorId,
  initialStaffId,
  vendorOptions,
  staffOptions,
  selectedDelivery,
  selectedProduct,
}: {
  initialQ: string;
  initialFromDate: string;
  initialToDate: string;
  initialVendorId: string;
  initialStaffId: string;
  vendorOptions: ReturnVendorOption[];
  staffOptions: ReturnStaffOption[];
  selectedDelivery: ReturnDeliveryFilterOption | null;
  selectedProduct: ProductFilterOption | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  return (
    <form
      aria-busy={pending}
      className="grid gap-3 rounded-xl border border-line bg-surface/90 p-4 sm:grid-cols-2 lg:grid-cols-3 [&_input]:min-h-11 [&_select]:min-h-11"
      onSubmit={(event) => {
        event.preventDefault();
        if (pending) return;
        const form = new FormData(event.currentTarget);
        const params = new URLSearchParams(searchParams.toString());
        for (const key of [
          "q",
          "fromDate",
          "toDate",
          "vendorId",
          "staffId",
          "deliveryId",
          "productId",
        ]) {
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
      <label className="block space-y-1.5 sm:col-span-2 lg:col-span-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">
          Search
        </span>
        <input
          name="q"
          defaultValue={initialQ}
          placeholder="Return code, delivery, supply, vendor, phone, or product"
          className={fieldClass}
        />
      </label>

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

      <label className="block space-y-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">
          Vendor
        </span>
        <select name="vendorId" defaultValue={initialVendorId} className={fieldClass}>
          <option value="">All vendors</option>
          {vendorOptions.map((vendor) => (
            <option key={vendor.id} value={vendor.id}>
              {vendor.business_name}
              {vendor.is_active ? "" : " (inactive)"}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">
          Recorded by
        </span>
        <select name="staffId" defaultValue={initialStaffId} className={fieldClass}>
          <option value="">All staff</option>
          {staffOptions.map((staff) => (
            <option key={staff.id} value={staff.id}>
              {staff.full_name}
            </option>
          ))}
        </select>
      </label>

      <DeliveryFilterPicker
        key={selectedDelivery?.id ?? "all-deliveries"}
        name="deliveryId"
        initialSelected={selectedDelivery}
        disabled={pending}
      />

      <ProductFilterPicker
        key={selectedProduct?.id ?? "all-products"}
        name="productId"
        initialSelected={selectedProduct}
        disabled={pending}
      />

      <FilterActions
        pending={pending}
        className="sm:col-span-2 lg:col-span-3"
        onClear={() => {
          if (pending) return;
          startTransition(() => router.push(pathname));
        }}
      />
    </form>
  );
}
