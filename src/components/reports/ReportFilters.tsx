"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import type { ReportPeriodPreset, ReportSection } from "@/lib/reports/schemas";
import { REPORT_PERIOD_OPTIONS } from "@/lib/reports/presentation";
import { ProductFilterPicker } from "@/components/products/ProductPicker";
import { FilterActions } from "@/components/ui/FilterActions";
import { formControlSurfaceClass } from "@/components/ui/form-styles";
import { filterPaymentMethodOptions } from "@/lib/payments/presentation";
import type { ProductFilterOption } from "@/lib/products/options";

const inputClass = formControlSurfaceClass;

const SECTIONS: { value: ReportSection; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "supplies", label: "Supplies" },
  { value: "payments", label: "Payments" },
  { value: "inventory", label: "Inventory" },
  { value: "purchasing", label: "Purchasing" },
  { value: "deliveries", label: "Deliveries" },
  { value: "returns", label: "Returns" },
  { value: "vendors", label: "Vendors" },
];

const DELIVERY_STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "DISPATCHED", label: "Dispatched" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "FAILED", label: "Failed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export function ReportFilters({
  initialPeriod,
  initialFromDate,
  initialToDate,
  initialSection,
  initialVendorId,
  initialSupplierId,
  initialPaymentMethod,
  initialDeliveryStatus,
  initialStaffId,
  vendors,
  selectedProduct,
  suppliers,
  staff,
}: {
  initialPeriod: ReportPeriodPreset;
  initialFromDate: string;
  initialToDate: string;
  initialSection: ReportSection;
  initialVendorId: string;
  initialSupplierId: string;
  initialPaymentMethod: string;
  initialDeliveryStatus: string;
  initialStaffId: string;
  vendors: Array<{ id: string; label: string }>;
  selectedProduct: ProductFilterOption | null;
  suppliers: Array<{ id: string; label: string }>;
  staff: Array<{ id: string; label: string }>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function apply(formData: FormData) {
    const next = new URLSearchParams(searchParams.toString());
    const keys = [
      "period",
      "fromDate",
      "toDate",
      "section",
      "vendorId",
      "productId",
      "supplierId",
      "paymentMethod",
      "deliveryStatus",
      "staffId",
    ] as const;

    for (const key of keys) {
      const value = String(formData.get(key) ?? "").trim();
      if (value) next.set(key, value);
      else next.delete(key);
    }
    next.delete("page");

    startTransition(() => {
      router.push(`/app/reports?${next.toString()}`);
    });
  }

  return (
    <form
      aria-busy={pending}
      action={(formData) => {
        if (pending) return;
        apply(formData);
      }}
      className="space-y-4 rounded-xl border border-line bg-surface/90 p-4"
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="block text-xs font-medium uppercase tracking-wide text-muted">
          Period
          <select
            name="period"
            defaultValue={initialPeriod}
            className={`${inputClass} mt-1`}
          >
            {REPORT_PERIOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium uppercase tracking-wide text-muted">
          Section
          <select
            name="section"
            defaultValue={initialSection}
            className={`${inputClass} mt-1`}
          >
            {SECTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium uppercase tracking-wide text-muted">
          From date
          <input
            type="date"
            name="fromDate"
            defaultValue={initialFromDate}
            className={`${inputClass} mt-1`}
          />
        </label>
        <label className="block text-xs font-medium uppercase tracking-wide text-muted">
          To date
          <input
            type="date"
            name="toDate"
            defaultValue={initialToDate}
            className={`${inputClass} mt-1`}
          />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <label className="block text-xs font-medium uppercase tracking-wide text-muted">
          Vendor
          <select
            name="vendorId"
            defaultValue={initialVendorId}
            className={`${inputClass} mt-1`}
          >
            <option value="">All vendors</option>
            {vendors.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <ProductFilterPicker
          key={selectedProduct?.id ?? "all-products"}
          name="productId"
          initialSelected={selectedProduct}
          disabled={pending}
        />
        <label className="block text-xs font-medium uppercase tracking-wide text-muted">
          Supplier
          <select
            name="supplierId"
            defaultValue={initialSupplierId}
            className={`${inputClass} mt-1`}
          >
            <option value="">All suppliers</option>
            {suppliers.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium uppercase tracking-wide text-muted">
          Payment method
          <select
            name="paymentMethod"
            defaultValue={initialPaymentMethod}
            className={`${inputClass} mt-1`}
          >
            {filterPaymentMethodOptions().map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium uppercase tracking-wide text-muted">
          Delivery status
          <select
            name="deliveryStatus"
            defaultValue={initialDeliveryStatus}
            className={`${inputClass} mt-1`}
          >
            {DELIVERY_STATUS_OPTIONS.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="block text-xs font-medium uppercase tracking-wide text-muted">
          Staff
          <select
            name="staffId"
            defaultValue={initialStaffId}
            className={`${inputClass} mt-1`}
          >
            <option value="">All staff</option>
            {staff.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <FilterActions
          pending={pending}
          applyLabel="Apply filters"
          pendingApplyLabel="Updating…"
          clearLabel="Reset"
          className="md:col-span-2 xl:col-span-3"
          onClear={() => {
            if (pending) return;
            startTransition(() => {
              router.push("/app/reports");
            });
          }}
        />
      </div>
      <p className="text-xs text-muted">
        Custom range uses the From/To dates. Other presets ignore those fields unless
        you select Custom.
      </p>
    </form>
  );
}
